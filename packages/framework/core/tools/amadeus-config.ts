// amadeus-config.ts — shared layered configuration resolver.
//
// Resolves structured settings from the three git-shared layers
// (project -> space -> intent, later layers winning per leaf). The registry
// below is the machine-readable source for paths, defaults, allowed layers,
// replacement merge semantics, and domain parsers. Invalid values are
// configuration errors and are never coerced.
//
// Responsibilities are split:
//   - readAmadeusConfigLayers — the ONLY filesystem owner. Resolves the three
//     candidate paths through the existing workspace selectors and reads each
//     at most once behind a bounded, containment-checked reader. It never
//     writes, caches, spawns, or calls GitHub.
//   - parseAmadeusConfigLayers — a pure function that judges schema and
//     precedence over already-collected layer inputs.
//   - resolveAmadeusConfig    — a thin read-only facade composing the two.

import { realpathSync } from "node:fs";
import { join, relative } from "node:path";
import {
  type ContainedFileFailureReason,
  readContainedFile,
} from "./amadeus-contained-file.ts";
import { activeIntent, activeSpace, workspaceRoot } from "./amadeus-lib.ts";
import {
  DEFAULT_PROJECT_PHASE_FIELD,
  mirrorProjectKey,
  normalizeMirrorProjectIdentity,
} from "./amadeus-mirror-project-contract.ts";
import type {
  MirrorMode,
  MirrorPhaseKey,
  MirrorProjectRef,
  MirrorProjectStatusNames,
  MirrorProjectTarget,
} from "./amadeus-mirror-types.ts";

// A config file above this size is rejected rather than read into memory. The
// bounded reader stops one byte past the limit so growth beyond it is caught.
const MAX_CONFIG_BYTES = 1024 * 1024;

const VALID_MODES: readonly MirrorMode[] = ["off", "prompt", "auto"];
const LAYER_ORDER: readonly ConfigLayer[] = ["project", "space", "intent"];

const VALID_PHASE_KEYS: readonly MirrorPhaseKey[] = [
  "ideation",
  "inception",
  "construction",
  "operation",
  "done",
];

const PROJECTS_EXPECTED =
  'array of { project: "<owner>/<number>", phase-field?: string, status-names?: { <phase>: string } }';

export type ConfigLayer = "project" | "space" | "intent";

export type AmadeusConfigKey =
  | "intent-mirror.github.issue.mode"
  | "intent-mirror.github.project.targets"
  | "solo-election.trigger.mode"
  | "finding.github.issue.creation.mode"
  | "swarm.unit.concurrency.limit"
  | "plugin.activation.names"
  | "subagent.dispatch.enforced-models";

export type SoloElectionTriggerMode = "manual" | "auto";

export type AmadeusConfig = Readonly<{
  intentMirror: Readonly<{
    github: Readonly<{
      issue: Readonly<{ mode: MirrorMode }>;
      project: Readonly<{ targets: readonly MirrorProjectTarget[] }>;
    }>;
  }>;
  soloElection: Readonly<{
    trigger: Readonly<{ mode: SoloElectionTriggerMode }>;
  }>;
  finding: Readonly<{
    github: Readonly<{
      issue: Readonly<{ creation: Readonly<{ mode: MirrorMode }> }>;
    }>;
  }>;
  swarm: Readonly<{
    unit: Readonly<{ concurrency: Readonly<{ limit: number }> }>;
  }>;
  plugin: Readonly<{
    activation: Readonly<{ names: readonly string[] }>;
  }>;
  subagent: Readonly<{
    dispatch: Readonly<{ enforcedModels: readonly string[] }>;
  }>;
}>;

export type AmadeusConfigLayerInput = Readonly<{
  layer: ConfigLayer;
  path: string;
  present: boolean;
  rawValue: unknown;
}>;

export type AmadeusConfigIssue =
  | Readonly<{
      kind: "invalid-value";
      layer: ConfigLayer;
      path: string;
      key: AmadeusConfigKey;
      actualType: string;
      expected: string;
    }>
  | Readonly<{
      kind: "read-failure";
      layer: ConfigLayer;
      path: string;
      // A read failure is file-level, not key-level: an unreadable layer blocks
      // every key it could have carried. The field is retained for a uniform
      // issue shape and reports the primary key.
      key: AmadeusConfigKey;
      summary: string;
      expected: "readable configuration";
    }>;

export type AmadeusConfigReadOutcome =
  | { kind: "ok"; layers: readonly AmadeusConfigLayerInput[] }
  | {
      kind: "failure";
      issues: readonly Extract<AmadeusConfigIssue, { kind: "read-failure" }>[];
    };

export type AmadeusConfigOutcome =
  | { kind: "resolved"; config: AmadeusConfig; sources: readonly string[] }
  | { kind: "invalid"; issues: readonly AmadeusConfigIssue[] };

function valueKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ConfigBytes =
  | { kind: "absent" }
  | { kind: "text"; text: string }
  | { kind: "read-failure"; summary: string };

const NOT_READABLE = "configuration path is not readable";

export type AmadeusConfigReadHooks = Readonly<{
  beforeOpen?: (path: string) => void;
}>;

type ConfigReadFailureMap = Readonly<Record<ContainedFileFailureReason, string>>;

const CONFIG_READ_FAILURES: ConfigReadFailureMap = {
  "no-nofollow": "configuration cannot be verified without O_NOFOLLOW",
  symlink: "configuration path must not be a symlink",
  "outside-root": "configuration path escapes the workspace root",
  "not-regular": "configuration path is not a regular file",
  "too-large": "configuration exceeds the size limit",
  "changed-before-open": "configuration changed before open",
  "changed-during-read": "configuration changed during read",
  empty: NOT_READABLE,
  "not-readable": NOT_READABLE,
};

function configReadFailure(reason: ContainedFileFailureReason): string {
  return CONFIG_READ_FAILURES[reason];
}

// Read a single config path safely. Absence is the common, non-failure case.
// Anything that is not a plain, contained, stable, size-bounded regular file
// is a loud read-failure carrying only a redacted summary — never raw bytes,
// an absolute home path, or a credential.
function readConfigBytes(
  rootReal: string,
  absPath: string,
  hooks: AmadeusConfigReadHooks,
): ConfigBytes {
  const outcome = readContainedFile({
    rootDir: rootReal,
    path: absPath,
    maxBytes: MAX_CONFIG_BYTES,
    hooks,
  });
  if (outcome.kind !== "failure") return outcome;
  return {
    kind: "read-failure",
    summary: configReadFailure(outcome.reason),
  };
}

function readFailure(
  layer: ConfigLayer,
  path: string,
  summary: string,
): Extract<AmadeusConfigIssue, { kind: "read-failure" }> {
  return {
    kind: "read-failure",
    layer,
    path,
    key: "intent-mirror.github.issue.mode",
    summary,
    expected: "readable configuration",
  };
}

// Collect the three candidate layers through the existing selectors. Each
// present file is read at most once; paths are reported workspace-relative so
// no absolute home path leaks into diagnostics or resolved sources.
export function readAmadeusConfigLayers(
  projectDir: string,
  explicitIntentDir?: string,
  explicitSpace?: string,
  hooks: AmadeusConfigReadHooks = {},
): AmadeusConfigReadOutcome {
  const root = workspaceRoot(projectDir);
  let rootReal: string | null;
  try {
    rootReal = realpathSync(root);
  } catch {
    rootReal = null;
  }
  const space = explicitSpace ?? activeSpace(projectDir);
  const intent = activeIntent(projectDir, space, explicitIntentDir);

  const candidates: { layer: ConfigLayer; abs: string }[] = [
    { layer: "project", abs: join(root, "config.json") },
    { layer: "space", abs: join(root, "spaces", space, "config.json") },
  ];
  if (intent !== null) {
    candidates.push({
      layer: "intent",
      abs: join(root, "spaces", space, "intents", intent, "config.json"),
    });
  }

  const layers: AmadeusConfigLayerInput[] = [];
  const failures: Extract<AmadeusConfigIssue, { kind: "read-failure" }>[] = [];
  for (const candidate of candidates) {
    const path = relative(projectDir, candidate.abs);
    // An absent workspace root means every candidate is absent.
    const bytes =
      rootReal === null
        ? ({ kind: "absent" } as const)
        : readConfigBytes(rootReal, candidate.abs, hooks);
    if (bytes.kind === "absent") {
      layers.push({ layer: candidate.layer, path, present: false, rawValue: undefined });
      continue;
    }
    if (bytes.kind === "read-failure") {
      failures.push(readFailure(candidate.layer, path, bytes.summary));
      continue;
    }
    let rawValue: unknown;
    try {
      rawValue = JSON.parse(bytes.text);
    } catch {
      failures.push(
        readFailure(candidate.layer, path, "configuration is not valid JSON"),
      );
      continue;
    }
    layers.push({ layer: candidate.layer, path, present: true, rawValue });
  }

  if (failures.length > 0) return { kind: "failure", issues: failures };
  return { kind: "ok", layers };
}

// Parse `"<owner>/<number>"`. The owner class excludes whitespace and slash and
// the number must be a positive safe integer, so a padded or float value is
// rejected without coercion (fail-closed, FR-5).
const PROJECT_REF_RE = /^([A-Za-z0-9._-]+)\/([0-9]+)$/;

function parseProjectRef(value: unknown): MirrorProjectRef | null {
  if (typeof value !== "string") return null;
  const match = PROJECT_REF_RE.exec(value);
  if (match === null) return null;
  const number = Number(match[2]);
  if (
    !Number.isSafeInteger(number) ||
    number <= 0 ||
    match[2] !== String(number)
  ) {
    return null;
  }
  return normalizeMirrorProjectIdentity({ owner: match[1], number });
}

type StatusNamesParse =
  | { ok: true; statusNames: MirrorProjectStatusNames }
  | { ok: false; actualType: string };

// `status-names` overrides the default phase -> column-name table. Keys are the
// closed phase vocabulary; an unknown phase is an error, never ignored.
function parseStatusNames(value: unknown): StatusNamesParse {
  if (value === undefined) return { ok: true, statusNames: {} };
  if (!isPlainObject(value)) {
    return { ok: false, actualType: `status-names is ${valueKind(value)}` };
  }
  const unknown = Object.keys(value).filter(
    (key) => !VALID_PHASE_KEYS.includes(key as MirrorPhaseKey),
  );
  if (unknown.length > 0) {
    return {
      ok: false,
      actualType: `status-names has unknown phase(s): ${unknown.join(", ")}`,
    };
  }
  const statusNames: Record<string, string> = {};
  for (const key of Object.keys(value)) {
    const name = value[key];
    if (typeof name !== "string" || name.length === 0) {
      return {
        ok: false,
        actualType: `status-names.${key} is ${valueKind(name)}`,
      };
    }
    statusNames[key] = name;
  }
  return { ok: true, statusNames };
}

type ProjectsParse =
  | { ok: true; projects: readonly MirrorProjectTarget[] }
  | { ok: false; actualType: string };

function parseProjectTarget(element: unknown): ProjectsParse {
  if (!isPlainObject(element)) {
    return { ok: false, actualType: `element is ${valueKind(element)}` };
  }
  const unknown = Object.keys(element).filter(
    (key) =>
      key !== "project" && key !== "phase-field" && key !== "status-names",
  );
  if (unknown.length > 0) {
    return {
      ok: false,
      actualType: `element has unknown key(s): ${unknown.join(", ")}`,
    };
  }
  const project = parseProjectRef(element.project);
  if (project === null) {
    return {
      ok: false,
      actualType: `project is ${valueKind(element.project)} (expected "<owner>/<number>")`,
    };
  }
  const rawPhaseField = element["phase-field"];
  if (
    rawPhaseField !== undefined &&
    (typeof rawPhaseField !== "string" || rawPhaseField.length === 0)
  ) {
    return {
      ok: false,
      actualType: `phase-field is ${valueKind(rawPhaseField)}`,
    };
  }
  const phaseField = rawPhaseField ?? DEFAULT_PROJECT_PHASE_FIELD;
  const statusNames = parseStatusNames(element["status-names"]);
  if (!statusNames.ok) return statusNames;
  return {
    ok: true,
    projects: [{ project, phaseField, statusNames: statusNames.statusNames }],
  };
}

// Any number of Projects may be configured: the list is the complete set of
// targets for the layer that wins, and one malformed element rejects the whole
// layer rather than contributing a partial list.
function parseProjects(value: unknown): ProjectsParse {
  if (!Array.isArray(value)) {
    return { ok: false, actualType: valueKind(value) };
  }
  const projects: MirrorProjectTarget[] = [];
  const seen = new Set<string>();
  for (const element of value) {
    const parsed = parseProjectTarget(element);
    if (!parsed.ok) return parsed;
    for (const target of parsed.projects) {
      const identity = mirrorProjectKey(target.project);
      if (seen.has(identity)) {
        return {
          ok: false,
          actualType: `duplicate project ${identity}`,
        };
      }
      seen.add(identity);
      projects.push(target);
    }
  }
  return { ok: true, projects };
}

const PLUGIN_NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function parsePlugins(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  const names: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string" || !PLUGIN_NAME_RE.test(candidate) || names.includes(candidate)) return null;
    names.push(candidate);
  }
  return names.sort();
}

type ConfigLeafValue =
  | MirrorMode
  | SoloElectionTriggerMode
  | number
  | readonly MirrorProjectTarget[]
  | readonly string[];

type LeafParseOutcome =
  | { ok: true; value: ConfigLeafValue }
  | { ok: false; actualType: string; expected: string };

export type AmadeusConfigRegistryEntry = Readonly<{
  path: AmadeusConfigKey;
  domain: string;
  layers: readonly ConfigLayer[];
  merge: "replace";
  defaultValue: ConfigLeafValue;
  parse: (value: unknown) => LeafParseOutcome;
  // Absent for keys born structured: they never had a flat legacy spelling.
  legacy?: Readonly<{
    key: string;
    valueConversion: string;
  }>;
}>;

function parseMode(value: unknown): LeafParseOutcome {
  return VALID_MODES.includes(value as MirrorMode)
    ? { ok: true, value: value as MirrorMode }
    : { ok: false, actualType: valueKind(value), expected: "off | prompt | auto" };
}

function parseElectionMode(value: unknown): LeafParseOutcome {
  return value === "manual" || value === "auto"
    ? { ok: true, value }
    : { ok: false, actualType: valueKind(value), expected: "manual | auto" };
}

function parseTargets(value: unknown): LeafParseOutcome {
  const parsed = parseProjects(value);
  return parsed.ok
    ? { ok: true, value: parsed.projects }
    : { ok: false, actualType: parsed.actualType, expected: PROJECTS_EXPECTED };
}

function parseConcurrencyLimit(value: unknown): LeafParseOutcome {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 4
    ? { ok: true, value: Number(value) }
    : {
        ok: false,
        actualType: valueKind(value),
        expected: "integer from 1 through 4",
      };
}

function parsePluginNames(value: unknown): LeafParseOutcome {
  const parsed = parsePlugins(value);
  return parsed === null
    ? {
        ok: false,
        actualType: valueKind(value),
        expected: "unique array of valid plugin names",
      }
    : { ok: true, value: parsed };
}

// #2438: the models a subagent dispatch may run on. Malformed sets are
// rejected rather than defaulted — an empty set would deny every dispatch and
// a duplicate or blank entry is a typo, not a model.
function parseEnforcedModels(value: unknown): LeafParseOutcome {
  const expected = "non-empty array of unique, non-blank model names";
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, actualType: valueKind(value), expected };
  }
  const models: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") return { ok: false, actualType: valueKind(candidate), expected };
    const model = candidate.trim();
    if (model === "" || models.includes(model)) return { ok: false, actualType: "string", expected };
    models.push(model);
  }
  return { ok: true, value: models };
}

const ALL_LAYERS: readonly ConfigLayer[] = ["project", "space", "intent"];

export const AMADEUS_CONFIG_REGISTRY: readonly AmadeusConfigRegistryEntry[] = [
  {
    path: "intent-mirror.github.issue.mode",
    domain: "intent-mirror",
    layers: ALL_LAYERS,
    merge: "replace",
    defaultValue: "prompt",
    parse: parseMode,
    legacy: { key: "auto-mirror", valueConversion: "unchanged" },
  },
  {
    path: "intent-mirror.github.project.targets",
    domain: "intent-mirror",
    layers: ALL_LAYERS,
    merge: "replace",
    defaultValue: [],
    parse: parseTargets,
    legacy: { key: "mirror-projects", valueConversion: "unchanged" },
  },
  {
    path: "solo-election.trigger.mode",
    domain: "solo-election",
    layers: ALL_LAYERS,
    merge: "replace",
    defaultValue: "manual",
    parse: parseElectionMode,
    legacy: {
      key: "auto-solo-election",
      valueConversion: "false -> manual; true -> auto",
    },
  },
  {
    path: "finding.github.issue.creation.mode",
    domain: "finding",
    layers: ALL_LAYERS,
    merge: "replace",
    defaultValue: "prompt",
    parse: parseMode,
    legacy: { key: "auto-file-findings", valueConversion: "unchanged" },
  },
  {
    path: "swarm.unit.concurrency.limit",
    domain: "swarm",
    layers: ALL_LAYERS,
    merge: "replace",
    defaultValue: 4,
    parse: parseConcurrencyLimit,
    legacy: { key: "max-parallel-units", valueConversion: "unchanged" },
  },
  {
    path: "plugin.activation.names",
    domain: "plugin",
    layers: ["project"],
    merge: "replace",
    defaultValue: [],
    parse: parsePluginNames,
    legacy: { key: "plugins", valueConversion: "unchanged" },
  },
  {
    path: "subagent.dispatch.enforced-models",
    domain: "subagent",
    layers: ALL_LAYERS,
    merge: "replace",
    defaultValue: ["opus", "sonnet"],
    parse: parseEnforcedModels,
  },
];

const LEGACY_KEY_REPLACEMENTS = new Map(
  AMADEUS_CONFIG_REGISTRY.flatMap((entry) =>
    entry.legacy === undefined
      ? []
      : [[entry.legacy.key, { path: entry.path, valueConversion: entry.legacy.valueConversion }] as const],
  ),
);

type LayerIssue = Readonly<{
  key: AmadeusConfigKey;
  actualType: string;
  expected: string;
}>;

const CONFIG_LEAF_PATHS = new Set(
  AMADEUS_CONFIG_REGISTRY.map((entry) => entry.path),
);
const CONFIG_PREFIX_PATHS = new Set<string>();
for (const leaf of CONFIG_LEAF_PATHS) {
  const segments = leaf.split(".");
  for (let index = 1; index < segments.length; index += 1) {
    CONFIG_PREFIX_PATHS.add(segments.slice(0, index).join("."));
  }
}

function rawLeaf(root: Record<string, unknown>, path: AmadeusConfigKey): unknown {
  let value: unknown = root;
  for (const segment of path.split(".")) {
    if (!isPlainObject(value)) return undefined;
    value = value[segment];
  }
  return value;
}

function appendUnknownPathIssue(
  key: string,
  path: string,
  prefix: string,
  issues: LayerIssue[],
): void {
  const replacement = prefix === "" ? LEGACY_KEY_REPLACEMENTS.get(key) : undefined;
  issues.push({
    key: replacement?.path ?? "intent-mirror.github.issue.mode",
    actualType:
      replacement === undefined ? `unknown key ${path}` : `legacy key ${key}`,
    expected:
      replacement === undefined
        ? "documented structured configuration path"
        : `use ${replacement.path}; value conversion: ${replacement.valueConversion}`,
  });
}

function appendPrefixTypeIssue(path: string, child: unknown, issues: LayerIssue[]): void {
  const descendant = AMADEUS_CONFIG_REGISTRY.find((entry) =>
    entry.path.startsWith(`${path}.`),
  );
  issues.push({
    key: descendant?.path ?? "intent-mirror.github.issue.mode",
    actualType: valueKind(child),
    expected: "object",
  });
}

function collectSchemaIssues(
  value: Record<string, unknown>,
  prefix: string,
  issues: LayerIssue[],
): void {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (path === "observability") {
      continue;
    }
    if (key.includes(".")) {
      appendUnknownPathIssue(key, path, prefix, issues);
      continue;
    }
    if (CONFIG_LEAF_PATHS.has(path as AmadeusConfigKey)) continue;
    if (!CONFIG_PREFIX_PATHS.has(path)) {
      appendUnknownPathIssue(key, path, prefix, issues);
      continue;
    }
    if (!isPlainObject(child)) {
      appendPrefixTypeIssue(path, child, issues);
      continue;
    }
    collectSchemaIssues(child, path, issues);
  }
}

function schemaIssues(rawValue: unknown): LayerIssue[] {
  if (!isPlainObject(rawValue)) {
    return [
      {
        key: "intent-mirror.github.issue.mode",
        actualType: valueKind(rawValue),
        expected: "object",
      },
    ];
  }

  const issues: LayerIssue[] = [];
  collectSchemaIssues(rawValue, "", issues);
  return issues;
}

function parseLayer(
  layer: AmadeusConfigLayerInput,
): { values: Map<AmadeusConfigKey, ConfigLeafValue>; issues: LayerIssue[] } {
  const issues = schemaIssues(layer.rawValue);
  const values = new Map<AmadeusConfigKey, ConfigLeafValue>();
  if (!isPlainObject(layer.rawValue)) return { values, issues };

  for (const entry of AMADEUS_CONFIG_REGISTRY) {
    const raw = rawLeaf(layer.rawValue, entry.path);
    if (raw === undefined) continue;
    if (!entry.layers.includes(layer.layer)) {
      issues.push({
        key: entry.path,
        actualType: `${layer.layer}-layer value`,
        expected: `${entry.path} may be configured only in amadeus/config.json`,
      });
      continue;
    }
    const parsed = entry.parse(raw);
    if (parsed.ok) values.set(entry.path, parsed.value);
    else {
      issues.push({
        key: entry.path,
        actualType: parsed.actualType,
        expected: parsed.expected,
      });
    }
  }
  return { values, issues };
}

function resolvedConfig(values: ReadonlyMap<AmadeusConfigKey, ConfigLeafValue>): AmadeusConfig {
  function value(path: AmadeusConfigKey): ConfigLeafValue {
    const entry = AMADEUS_CONFIG_REGISTRY.find((candidate) => candidate.path === path);
    if (entry === undefined) throw new Error(`Missing config registry entry: ${path}`);
    return values.get(path) ?? entry.defaultValue;
  }
  return {
    intentMirror: {
      github: {
        issue: { mode: value("intent-mirror.github.issue.mode") as MirrorMode },
        project: {
          targets: value("intent-mirror.github.project.targets") as readonly MirrorProjectTarget[],
        },
      },
    },
    soloElection: {
      trigger: {
        mode: value("solo-election.trigger.mode") as SoloElectionTriggerMode,
      },
    },
    finding: {
      github: {
        issue: {
          creation: {
            mode: value("finding.github.issue.creation.mode") as MirrorMode,
          },
        },
      },
    },
    swarm: {
      unit: {
        concurrency: {
          limit: value("swarm.unit.concurrency.limit") as number,
        },
      },
    },
    plugin: {
      activation: {
        names: value("plugin.activation.names") as readonly string[],
      },
    },
    subagent: {
      dispatch: {
        enforcedModels: value("subagent.dispatch.enforced-models") as readonly string[],
      },
    },
  };
}

// Pure schema + precedence over collected layers. Every invalid layer is
// reported (never a partial config or a fallback), and only when all layers
// are valid is a mode resolved with the highest present layer winning.
// `sources` lists every layer that specified a valid value, in
// project -> space -> intent order; the last one is the winner.
export function parseAmadeusConfigLayers(
  layers: readonly AmadeusConfigLayerInput[],
): AmadeusConfigOutcome {
  const ordered = [...layers]
    .filter((layer) => layer.present)
    .sort(
      (a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer),
    );

  const issues: AmadeusConfigIssue[] = [];
  const sources: string[] = [];
  const resolved = new Map<AmadeusConfigKey, ConfigLeafValue>();
  for (const layer of ordered) {
    const parsed = parseLayer(layer);
    const layerIssues: AmadeusConfigIssue[] = parsed.issues.map((issue) => ({
      kind: "invalid-value",
      layer: layer.layer,
      path: layer.path,
      key: issue.key,
      actualType: issue.actualType,
      expected: issue.expected,
    }));
    issues.push(...layerIssues);
    if (layerIssues.length === 0 && parsed.values.size > 0) {
      for (const [path, value] of parsed.values) resolved.set(path, value);
      sources.push(layer.path);
    }
  }

  if (issues.length > 0) return { kind: "invalid", issues };
  return {
    kind: "resolved",
    config: resolvedConfig(resolved),
    sources,
  };
}

// Read-only facade: collect the layers, then judge them. A read failure in any
// layer fails the whole resolution closed with the redacted read-failure
// issues; otherwise the pure parser decides.
export function resolveAmadeusConfig(
  projectDir: string,
  explicitIntentDir?: string,
  explicitSpace?: string,
  hooks: AmadeusConfigReadHooks = {},
): AmadeusConfigOutcome {
  const read = readAmadeusConfigLayers(
    projectDir,
    explicitIntentDir,
    explicitSpace,
    hooks,
  );
  if (read.kind === "failure") return { kind: "invalid", issues: read.issues };
  return parseAmadeusConfigLayers(read.layers);
}
