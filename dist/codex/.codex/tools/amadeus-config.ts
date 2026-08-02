// amadeus-config.ts — shared layered configuration resolver.
//
// Resolves the supported settings from the three git-shared layers
// (global -> space -> intent, later layers winning per key). `auto-mirror`
// accepts exactly `off | prompt | auto` and defaults to `prompt`;
// `auto-file-findings` uses the same modes and default;
// `auto-solo-election` accepts only a boolean and defaults to `false`.
// Invalid values are configuration errors and are never coerced.
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
const LAYER_ORDER: readonly ConfigLayer[] = ["global", "space", "intent"];

// The complete allowlist of configuration keys. A key outside this set is a
// configuration error in every layer.
const AUTO_MIRROR_KEY = "auto-mirror";
const MIRROR_PROJECTS_KEY = "mirror-projects";
const AUTO_SOLO_ELECTION_KEY = "auto-solo-election";
const AUTO_FILE_FINDINGS_KEY = "auto-file-findings";
const PLUGINS_KEY = "plugins";
// "observability" is owned by amadeus-observability.ts (Issue #1628 Phase 2):
// the mirror parser must tolerate the key so both subsystems can share the
// layered config.json files, but it never interprets the value.
const ALLOWED_KEYS: readonly string[] = [
  AUTO_MIRROR_KEY,
  MIRROR_PROJECTS_KEY,
  AUTO_SOLO_ELECTION_KEY,
  AUTO_FILE_FINDINGS_KEY,
  "observability",
  PLUGINS_KEY,
];

const VALID_PHASE_KEYS: readonly MirrorPhaseKey[] = [
  "ideation",
  "inception",
  "construction",
  "operation",
  "done",
];

const MODE_EXPECTED = "off | prompt | auto";
const PROJECTS_EXPECTED =
  'array of { project: "<owner>/<number>", phase-field?: string, status-names?: { <phase>: string } }';
const BOOLEAN_EXPECTED = "boolean";

export type ConfigLayer = "global" | "space" | "intent";

export type AmadeusConfigKey =
  | "auto-mirror"
  | "mirror-projects"
  | "auto-solo-election"
  | "auto-file-findings"
  | "plugins";

export type AmadeusConfig = Readonly<{
  autoMirror: MirrorMode;
  projects: readonly MirrorProjectTarget[];
  autoSoloElection: boolean;
  autoFileFindings: MirrorMode;
  plugins: readonly string[];
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
    key: "auto-mirror",
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
    { layer: "global", abs: join(root, "config.json") },
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

type LayerIssue = Readonly<{
  key: AmadeusConfigKey;
  actualType: string;
  expected: string;
}>;

type LayerClassification = Readonly<{
  mode?: MirrorMode;
  projects?: readonly MirrorProjectTarget[];
  autoSoloElection?: boolean;
  autoFileFindings?: MirrorMode;
  plugins?: readonly string[];
  issues: readonly LayerIssue[];
}>;

type ResolvedLayerValues = {
  mode?: MirrorMode;
  projects?: readonly MirrorProjectTarget[];
  autoSoloElection?: boolean;
  autoFileFindings?: MirrorMode;
  plugins?: readonly string[];
};

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

function parseOptionalPlugins(rawValue: unknown, issues: LayerIssue[]): readonly string[] | undefined {
  if (rawValue === undefined) return undefined;
  const parsed = parsePlugins(rawValue);
  if (parsed !== null) return parsed;
  issues.push({
    key: PLUGINS_KEY,
    actualType: valueKind(rawValue),
    expected: "unique array of valid plugin names",
  });
  return undefined;
}

function parseOptionalMode(
  rawValue: unknown,
  key: Extract<AmadeusConfigKey, "auto-mirror" | "auto-file-findings">,
  issues: LayerIssue[],
): MirrorMode | undefined {
  if (rawValue === undefined) return undefined;
  if (VALID_MODES.includes(rawValue as MirrorMode)) {
    return rawValue as MirrorMode;
  }
  issues.push({
    key,
    actualType: valueKind(rawValue),
    expected: MODE_EXPECTED,
  });
  return undefined;
}

// Judge one present layer's raw value. The whole config object is validated: a
// non-object root, an unknown property, or an invalid value for either key is
// rejected rather than silently reduced. An empty object is valid and
// contributes nothing. Both keys are judged independently so one layer can
// report both errors at once.
function classifyRawValue(rawValue: unknown): LayerClassification {
  if (!isPlainObject(rawValue)) {
    return {
      issues: [
        {
          key: AUTO_MIRROR_KEY,
          actualType: valueKind(rawValue),
          expected: MODE_EXPECTED,
        },
      ],
    };
  }
  const unknownKeys = Object.keys(rawValue).filter(
    (key) => !ALLOWED_KEYS.includes(key),
  );
  if (unknownKeys.length > 0) {
    return {
      issues: [
        {
          key: AUTO_MIRROR_KEY,
          actualType: `object with unknown key(s): ${unknownKeys.join(", ")}`,
          expected: MODE_EXPECTED,
        },
      ],
    };
  }

  const issues: LayerIssue[] = [];
  const mode = parseOptionalMode(
    rawValue[AUTO_MIRROR_KEY],
    AUTO_MIRROR_KEY,
    issues,
  );

  let projects: readonly MirrorProjectTarget[] | undefined;
  const rawProjects = rawValue[MIRROR_PROJECTS_KEY];
  if (rawProjects !== undefined) {
    const parsed = parseProjects(rawProjects);
    if (parsed.ok) {
      projects = parsed.projects;
    } else {
      issues.push({
        key: MIRROR_PROJECTS_KEY,
        actualType: parsed.actualType,
        expected: PROJECTS_EXPECTED,
      });
    }
  }

  let autoSoloElection: boolean | undefined;
  const rawAutoSoloElection = rawValue[AUTO_SOLO_ELECTION_KEY];
  if (rawAutoSoloElection !== undefined) {
    if (typeof rawAutoSoloElection === "boolean") {
      autoSoloElection = rawAutoSoloElection;
    } else {
      issues.push({
        key: AUTO_SOLO_ELECTION_KEY,
        actualType: valueKind(rawAutoSoloElection),
        expected: BOOLEAN_EXPECTED,
      });
    }
  }

  const autoFileFindings = parseOptionalMode(
    rawValue[AUTO_FILE_FINDINGS_KEY],
    AUTO_FILE_FINDINGS_KEY,
    issues,
  );

  const plugins = parseOptionalPlugins(rawValue[PLUGINS_KEY], issues);

  return {
    issues,
    ...(mode === undefined ? {} : { mode }),
    ...(projects === undefined ? {} : { projects }),
    ...(autoSoloElection === undefined ? {} : { autoSoloElection }),
    ...(autoFileFindings === undefined ? {} : { autoFileFindings }),
    ...(plugins === undefined ? {} : { plugins }),
  };
}

function mergeLayerValues(
  target: ResolvedLayerValues,
  classified: LayerClassification,
): boolean {
  let contributed = false;
  if (classified.mode !== undefined) {
    target.mode = classified.mode;
    contributed = true;
  }
  if (classified.projects !== undefined) {
    target.projects = classified.projects;
    contributed = true;
  }
  if (classified.autoSoloElection !== undefined) {
    target.autoSoloElection = classified.autoSoloElection;
    contributed = true;
  }
  if (classified.autoFileFindings !== undefined) {
    target.autoFileFindings = classified.autoFileFindings;
    contributed = true;
  }
  if (classified.plugins !== undefined) {
    target.plugins = classified.plugins;
    contributed = true;
  }
  return contributed;
}

function layerConfigIssues(
  layer: AmadeusConfigLayerInput,
  classified: LayerClassification,
): AmadeusConfigIssue[] {
  return classified.issues.map((issue) => ({
    kind: "invalid-value",
    layer: layer.layer,
    path: layer.path,
    key: issue.key,
    actualType: issue.actualType,
    expected: issue.expected,
  }));
}

function mergeConfigLayer(
  layer: AmadeusConfigLayerInput,
  resolved: ResolvedLayerValues,
): { issues: AmadeusConfigIssue[]; contributed: boolean } {
  const classified = classifyRawValue(layer.rawValue);
  const issues = layerConfigIssues(layer, classified);
  if (layer.layer !== "global" && classified.plugins !== undefined) {
    issues.push({
      kind: "invalid-value",
      layer: layer.layer,
      path: layer.path,
      key: PLUGINS_KEY,
      actualType: "project-only key",
      expected: "plugins may be configured only in amadeus/config.json",
    });
  }
  return {
    issues,
    contributed: issues.length === 0 && mergeLayerValues(resolved, classified),
  };
}

// Pure schema + precedence over collected layers. Every invalid layer is
// reported (never a partial config or a fallback), and only when all layers
// are valid is a mode resolved with the highest present layer winning.
// `sources` lists every layer that specified a valid value, in
// global -> space -> intent order; the last one is the winner.
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
  const resolved: ResolvedLayerValues = {};
  for (const layer of ordered) {
    const merged = mergeConfigLayer(layer, resolved);
    issues.push(...merged.issues);
    if (merged.contributed) sources.push(layer.path);
  }

  if (issues.length > 0) return { kind: "invalid", issues };
  return {
    kind: "resolved",
    config: {
      autoMirror: resolved.mode ?? "prompt",
      projects: resolved.projects ?? [],
      autoSoloElection: resolved.autoSoloElection ?? false,
      autoFileFindings: resolved.autoFileFindings ?? "prompt",
      plugins: resolved.plugins ?? [],
    },
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
