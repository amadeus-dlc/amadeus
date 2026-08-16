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
  type PluginSettingsOverrides,
  type SettingScalar,
  settingsKeyViolation,
} from "./amadeus-plugin-settings.ts";
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
import type { AutonomyMode } from "./amadeus-intent-autonomy.ts";

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
  | "intent-mirror.github.issue.consent"
  | "intent-mirror.github.project.targets"
  | "finding.github.issue.creation.consent"
  | "swarm.unit.concurrency.limit"
  | "plugin.activation.names"
  | "plugin.scope-bindings"
  | "plugin.settings"
  | "subagent.dispatch.enforced-models";

// RFC-0001 ADR-8: `solo-election.trigger.mode` is not a config leaf — it is
// DERIVED from Intent Autonomy Mode (state, not config). The value domain is
// unchanged from the retired config leaf; only its source moved.
export type SoloElectionTriggerMode = "manual" | "auto";

// Pure: no config read, no I/O. `none` requires an explicit human trigger;
// `semi`/`full` already carry standing delegation, so the election itself
// may fire automatically too.
export function deriveSoloElectionTrigger(mode: AutonomyMode): SoloElectionTriggerMode {
  return mode === "none" ? "manual" : "auto";
}

export type PluginScopeBindings = Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
>;

export function requiredPluginStagesForScope(
  bindings: PluginScopeBindings,
  scope: string,
): string[] {
  const required = new Set<string>();
  for (const stages of Object.values(bindings)) {
    for (const [slug, scopes] of Object.entries(stages)) {
      if (scopes.includes(scope)) required.add(slug);
    }
  }
  return [...required].sort();
}

export type AmadeusConfig = Readonly<{
  intentMirror: Readonly<{
    github: Readonly<{
      issue: Readonly<{ consent: MirrorMode }>;
      project: Readonly<{ targets: readonly MirrorProjectTarget[] }>;
    }>;
  }>;
  finding: Readonly<{
    github: Readonly<{
      issue: Readonly<{ creation: Readonly<{ consent: MirrorMode }> }>;
    }>;
  }>;
  swarm: Readonly<{
    unit: Readonly<{ concurrency: Readonly<{ limit: number }> }>;
  }>;
  plugin: Readonly<{
    activation: Readonly<{ names: readonly string[] }>;
    scopeBindings: PluginScopeBindings;
    settings: PluginSettingsOverrides;
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
    key: "intent-mirror.github.issue.consent",
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
  | number
  | readonly MirrorProjectTarget[]
  | readonly string[]
  | PluginScopeBindings
  | PluginSettingsOverrides;

type LeafParseOutcome =
  | { ok: true; value: ConfigLeafValue }
  | { ok: false; actualType: string; expected: string };

export type AmadeusConfigRegistryEntry = Readonly<{
  path: AmadeusConfigKey;
  domain: string;
  layers: readonly ConfigLayer[];
  // How a later layer combines with an earlier one. "replace" takes the
  // highest layer whole; "plugin-settings" merges per plugin per key so a space
  // or intent can retune one value without restating the project's map.
  merge: "replace" | "plugin-settings";
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

const STAGE_OR_SCOPE_RE = /^[a-z][a-z0-9-]*$/;

function parsePluginScopeBindings(value: unknown): LeafParseOutcome {
  const expected = "object mapping plugin names to stage slugs and unique scope slug arrays";
  if (!isPlainObject(value)) return { ok: false, actualType: valueKind(value), expected };
  const bindings: Record<string, Record<string, readonly string[]>> = {};
  for (const [plugin, stages] of Object.entries(value)) {
    if (!PLUGIN_NAME_RE.test(plugin) || !isPlainObject(stages)) {
      return { ok: false, actualType: valueKind(stages), expected };
    }
    const stageBindings: Record<string, readonly string[]> = {};
    for (const [stage, scopes] of Object.entries(stages)) {
      if (!STAGE_OR_SCOPE_RE.test(stage) || !Array.isArray(scopes) || scopes.length === 0) {
        return { ok: false, actualType: valueKind(scopes), expected };
      }
      const unique = new Set<string>();
      for (const scope of scopes) {
        if (typeof scope !== "string" || !STAGE_OR_SCOPE_RE.test(scope) || unique.has(scope)) {
          return { ok: false, actualType: valueKind(scope), expected };
        }
        unique.add(scope);
      }
      stageBindings[stage] = [...unique].sort();
    }
    bindings[plugin] = stageBindings;
  }
  return { ok: true, value: bindings };
}

// #2997: per-plugin runtime settings. Only the LEXICON is judged here — a
// config read can precede compose, so no declaration is available to match a
// value against. The type and closed-vocabulary check happens at sensor fire
// time, where a mismatch aborts the sensor instead of defaulting silently.
function parsePluginSettings(value: unknown): LeafParseOutcome {
  const expected =
    "object mapping plugin names to non-secret setting keys with string, number or boolean values";
  if (!isPlainObject(value)) return { ok: false, actualType: valueKind(value), expected };
  const settings: Record<string, Record<string, SettingScalar>> = {};
  for (const [plugin, kvs] of Object.entries(value)) {
    if (!PLUGIN_NAME_RE.test(plugin) || !isPlainObject(kvs)) {
      return { ok: false, actualType: valueKind(kvs), expected };
    }
    const entries: Record<string, SettingScalar> = {};
    for (const [key, scalar] of Object.entries(kvs)) {
      if (settingsKeyViolation(key) !== null) {
        return { ok: false, actualType: `key ${key}`, expected };
      }
      if (typeof scalar !== "string" && typeof scalar !== "number" && typeof scalar !== "boolean") {
        return { ok: false, actualType: valueKind(scalar), expected };
      }
      entries[key] = scalar;
    }
    settings[plugin] = entries;
  }
  return { ok: true, value: settings };
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
    path: "intent-mirror.github.issue.consent",
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
    path: "finding.github.issue.creation.consent",
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
    path: "plugin.scope-bindings",
    domain: "plugin",
    layers: ["project"],
    merge: "replace",
    defaultValue: {},
    parse: parsePluginScopeBindings,
  },
  {
    path: "plugin.settings",
    domain: "plugin",
    layers: ALL_LAYERS,
    merge: "plugin-settings",
    defaultValue: {},
    parse: parsePluginSettings,
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

// A legacy key either has a renamed structured replacement (case: consent-axis
// keys, `.mode` -> `.consent` — the RFC-0001 ADR-8 "keep vocabulary, rename
// path" case) or was abolished outright with no replacement leaf at all (case:
// `solo-election.trigger.mode` — ADR-8 "derive from Intent Autonomy Mode,
// don't configure it"). The two carry different `expected` text: a renamed
// key's message names the new path; an abolished key's message never does,
// so the reader isn't sent looking for a config leaf that doesn't exist.
type LegacyReplacement =
  | Readonly<{ kind: "renamed"; path: AmadeusConfigKey; valueConversion: string }>
  | Readonly<{ kind: "abolished"; explanation: string }>;

const SOLO_ELECTION_ABOLISHED_EXPLANATION =
  "derived automatically from Intent Autonomy Mode (none -> manual, semi/full -> auto); this key no longer exists and is not configurable";

// Flat aliases (no dots) and legacy full-path spellings of keys ABOLISHED
// outright, matched only at the top of an object (prefix === "") — see
// appendUnknownPathIssue. Keyed by the raw JSON key as written, which for a
// flat-dotted key IS the full path (`key.includes(".")` in
// collectSchemaIssues routes straight here without descending).
const LEGACY_KEY_REPLACEMENTS = new Map<string, LegacyReplacement>([
  ...AMADEUS_CONFIG_REGISTRY.flatMap((entry) =>
    entry.legacy === undefined
      ? []
      : [
          [
            entry.legacy.key,
            { kind: "renamed", path: entry.path, valueConversion: entry.legacy.valueConversion } as const,
          ] as const,
        ],
  ),
  ["auto-solo-election", { kind: "abolished", explanation: SOLO_ELECTION_ABOLISHED_EXPLANATION }],
  // The nested spelling's own top segment: no registry entry carries a
  // "solo-election" prefix any more, so collectSchemaIssues' recursion never
  // reaches deeper than this segment for `{"solo-election": {...}}` input.
  ["solo-election", { kind: "abolished", explanation: SOLO_ELECTION_ABOLISHED_EXPLANATION }],
  ["solo-election.trigger.mode", { kind: "abolished", explanation: SOLO_ELECTION_ABOLISHED_EXPLANATION }],
]);

// Old NESTED path spellings of keys that were RENAMED (not abolished). Unlike
// LEGACY_KEY_REPLACEMENTS this is checked regardless of nesting depth — the
// full reconstructed dotted `path`, not just the raw JSON `key` — because the
// old leaf's own prefix chain (`intent-mirror.github.issue`) is still valid
// (the sibling `.consent` leaf keeps it registered), so a nested `{"mode":
// ...}` naturally recurses all the way down to a full path match.
const LEGACY_PATH_REPLACEMENTS = new Map<string, LegacyReplacement>([
  [
    "intent-mirror.github.issue.mode",
    { kind: "renamed", path: "intent-mirror.github.issue.consent", valueConversion: "unchanged" },
  ],
  [
    "finding.github.issue.creation.mode",
    { kind: "renamed", path: "finding.github.issue.creation.consent", valueConversion: "unchanged" },
  ],
]);

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
  const replacement =
    LEGACY_PATH_REPLACEMENTS.get(path) ?? (prefix === "" ? LEGACY_KEY_REPLACEMENTS.get(key) : undefined);
  if (replacement === undefined) {
    issues.push({
      key: "intent-mirror.github.issue.consent",
      actualType: `unknown key ${path}`,
      expected: "documented structured configuration path",
    });
    return;
  }
  issues.push({
    key: replacement.kind === "renamed" ? replacement.path : "intent-mirror.github.issue.consent",
    actualType: `legacy key ${key}`,
    expected:
      replacement.kind === "renamed"
        ? `use ${replacement.path}; value conversion: ${replacement.valueConversion}`
        : replacement.explanation,
  });
}

function appendPrefixTypeIssue(path: string, child: unknown, issues: LayerIssue[]): void {
  const descendant = AMADEUS_CONFIG_REGISTRY.find((entry) =>
    entry.path.startsWith(`${path}.`),
  );
  issues.push({
    key: descendant?.path ?? "intent-mirror.github.issue.consent",
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
        key: "intent-mirror.github.issue.consent",
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

// Combine a lower layer's value with a higher one according to the registry's
// declared merge mode. The mode is data, not prose: this is the only place it
// is read, so a new entry's declaration decides its precedence behaviour.
function mergeLeaf(
  path: AmadeusConfigKey,
  lower: ConfigLeafValue | undefined,
  higher: ConfigLeafValue,
): ConfigLeafValue {
  const entry = AMADEUS_CONFIG_REGISTRY.find((candidate) => candidate.path === path);
  if (entry === undefined) throw new Error(`Missing config registry entry: ${path}`);
  if (entry.merge === "replace" || lower === undefined) return higher;
  return mergePluginSettings(
    lower as PluginSettingsOverrides,
    higher as PluginSettingsOverrides,
  );
}

function mergePluginSettings(
  lower: PluginSettingsOverrides,
  higher: PluginSettingsOverrides,
): PluginSettingsOverrides {
  const merged: Record<string, Record<string, SettingScalar>> = {};
  for (const [plugin, kvs] of Object.entries(lower)) merged[plugin] = { ...kvs };
  for (const [plugin, kvs] of Object.entries(higher)) {
    merged[plugin] = { ...(merged[plugin] ?? {}), ...kvs };
  }
  return merged;
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
        issue: { consent: value("intent-mirror.github.issue.consent") as MirrorMode },
        project: {
          targets: value("intent-mirror.github.project.targets") as readonly MirrorProjectTarget[],
        },
      },
    },
    finding: {
      github: {
        issue: {
          creation: {
            consent: value("finding.github.issue.creation.consent") as MirrorMode,
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
      scopeBindings: value("plugin.scope-bindings") as PluginScopeBindings,
      settings: value("plugin.settings") as PluginSettingsOverrides,
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
      for (const [path, value] of parsed.values) {
        resolved.set(path, mergeLeaf(path, resolved.get(path), value));
      }
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
