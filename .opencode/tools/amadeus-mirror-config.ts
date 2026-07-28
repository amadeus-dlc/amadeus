// amadeus-mirror-config.ts — shared layered configuration resolver.
//
// Resolves the supported settings from the three git-shared layers
// (global -> space -> intent, later layers winning per key). `auto-mirror`
// accepts exactly `off | prompt | auto` and defaults to `prompt`;
// `auto-solo-election` accepts only a boolean and defaults to `false`.
// Invalid values are configuration errors and are never coerced.
//
// Responsibilities are split:
//   - readMirrorConfigLayers  — the ONLY filesystem owner. Resolves the three
//     candidate paths through the existing workspace selectors and reads each
//     at most once behind a bounded, containment-checked reader. It never
//     writes, caches, spawns, or calls GitHub.
//   - parseMirrorConfigLayers — a pure function that judges schema and
//     precedence over already-collected layer inputs.
//   - resolveMirrorConfig     — a thin read-only facade composing the two.

import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { join, relative, resolve as resolvePath, sep } from "node:path";
import { activeIntent, activeSpace, workspaceRoot } from "./amadeus-lib.ts";
import { DEFAULT_PROJECT_PHASE_FIELD } from "./amadeus-mirror-project-contract.ts";
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
// "observability" is owned by amadeus-observability.ts (Issue #1628 Phase 2):
// the mirror parser must tolerate the key so both subsystems can share the
// layered config.json files, but it never interprets the value.
const ALLOWED_KEYS: readonly string[] = [
  AUTO_MIRROR_KEY,
  MIRROR_PROJECTS_KEY,
  AUTO_SOLO_ELECTION_KEY,
  "observability",
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

export type MirrorConfigKey =
  | "auto-mirror"
  | "mirror-projects"
  | "auto-solo-election";

export type MirrorConfig = Readonly<{
  autoMirror: MirrorMode;
  projects: readonly MirrorProjectTarget[];
  autoSoloElection: boolean;
}>;

export type MirrorConfigLayerInput = Readonly<{
  layer: ConfigLayer;
  path: string;
  present: boolean;
  rawValue: unknown;
}>;

export type MirrorConfigIssue =
  | Readonly<{
      kind: "invalid-value";
      layer: ConfigLayer;
      path: string;
      key: MirrorConfigKey;
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
      key: MirrorConfigKey;
      summary: string;
      expected: "readable configuration";
    }>;

export type MirrorConfigReadOutcome =
  | { kind: "ok"; layers: readonly MirrorConfigLayerInput[] }
  | {
      kind: "failure";
      issues: readonly Extract<MirrorConfigIssue, { kind: "read-failure" }>[];
    };

export type MirrorConfigOutcome =
  | { kind: "resolved"; config: MirrorConfig; sources: readonly string[] }
  | { kind: "invalid"; issues: readonly MirrorConfigIssue[] };

function valueKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

// The realpath of a candidate must stay inside the realpath of the workspace
// root. This rejects symlinks that escape the workspace even when both ends
// exist.
function isContained(rootReal: string, targetReal: string): boolean {
  const root = resolvePath(rootReal);
  const target = resolvePath(targetReal);
  return target === root || target.startsWith(root + sep);
}

type ConfigBytes =
  | { kind: "absent" }
  | { kind: "text"; text: string }
  | { kind: "read-failure"; summary: string };

const NOT_READABLE = "configuration path is not readable";

export type MirrorConfigReadHooks = Readonly<{
  beforeOpen?: (path: string) => void;
}>;

type OpenConfigFile =
  | { kind: "open"; fd: number }
  | Exclude<ConfigBytes, { kind: "text" }>;

function openConfigFile(path: string): OpenConfigFile {
  const noFollow = fsConstants.O_NOFOLLOW as number | undefined;
  if (typeof noFollow !== "number") {
    return {
      kind: "read-failure",
      summary: "configuration cannot be verified without O_NOFOLLOW",
    };
  }
  try {
    return {
      kind: "open",
      fd: openSync(path, fsConstants.O_RDONLY | noFollow),
    };
  } catch (error) {
    if (isEnoent(error)) return { kind: "absent" };
    return { kind: "read-failure", summary: NOT_READABLE };
  }
}

function readConfigDescriptor(
  fd: number,
  expectedIdentity: Readonly<{ dev: number; ino: number }>,
): ConfigBytes {
  const start = fstatSync(fd);
  if (
    start.dev !== expectedIdentity.dev ||
    start.ino !== expectedIdentity.ino
  ) {
    return {
      kind: "read-failure",
      summary: "configuration changed before open",
    };
  }
  if (!start.isFile()) {
    return { kind: "read-failure", summary: "configuration path is not a regular file" };
  }
  if (start.size > MAX_CONFIG_BYTES) {
    return { kind: "read-failure", summary: "configuration exceeds the size limit" };
  }
  const buffer = Buffer.alloc(MAX_CONFIG_BYTES + 1);
  let total = 0;
  for (let read = 1; read !== 0 && total <= MAX_CONFIG_BYTES; total += read) {
    read = readSync(fd, buffer, total, buffer.length - total, total);
  }
  if (total > MAX_CONFIG_BYTES) {
    return { kind: "read-failure", summary: "configuration exceeds the size limit" };
  }
  const end = fstatSync(fd);
  const stable =
    end.size === start.size &&
    end.mtimeMs === start.mtimeMs &&
    end.dev === start.dev &&
    end.ino === start.ino;
  if (!stable) {
    return { kind: "read-failure", summary: "configuration changed during read" };
  }
  return { kind: "text", text: buffer.subarray(0, total).toString("utf-8") };
}

// Read an already-contained regular file behind an open descriptor: reject a
// non-regular file, a file over the size limit, and any size/mtime/inode change
// between the opening and closing fstat (a symlink swap or growth during read).
function readBoundedRegularFile(
  path: string,
  expectedIdentity: Readonly<{ dev: number; ino: number }>,
): ConfigBytes {
  const opened = openConfigFile(path);
  if (opened.kind !== "open") return opened;
  try {
    return readConfigDescriptor(opened.fd, expectedIdentity);
  } catch {
    return { kind: "read-failure", summary: NOT_READABLE };
  } finally {
    try {
      closeSync(opened.fd);
    } catch {
      // The descriptor may already be gone; nothing more to release.
    }
  }
}

// Read a single config path safely. Absence is the common, non-failure case.
// Anything that is not a plain, contained, stable, size-bounded regular file
// is a loud read-failure carrying only a redacted summary — never raw bytes,
// an absolute home path, or a credential.
function readConfigBytes(
  rootReal: string,
  absPath: string,
  hooks: MirrorConfigReadHooks,
): ConfigBytes {
  let expectedIdentity: Readonly<{ dev: number; ino: number }>;
  try {
    const candidate = lstatSync(absPath);
    if (candidate.isSymbolicLink()) {
      return {
        kind: "read-failure",
        summary: "configuration path must not be a symlink",
      };
    }
    expectedIdentity = { dev: candidate.dev, ino: candidate.ino };
  } catch (error) {
    if (isEnoent(error)) return { kind: "absent" };
    return { kind: "read-failure", summary: NOT_READABLE };
  }

  let realPath: string;
  try {
    realPath = realpathSync(absPath);
  } catch (error) {
    // A dangling symlink resolves to nothing: treat it as an absent optional
    // file rather than a failure.
    if (isEnoent(error)) return { kind: "absent" };
    return { kind: "read-failure", summary: NOT_READABLE };
  }
  if (!isContained(rootReal, realPath)) {
    return {
      kind: "read-failure",
      summary: "configuration path escapes the workspace root",
    };
  }
  hooks.beforeOpen?.(absPath);
  return readBoundedRegularFile(absPath, expectedIdentity);
}

function readFailure(
  layer: ConfigLayer,
  path: string,
  summary: string,
): Extract<MirrorConfigIssue, { kind: "read-failure" }> {
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
export function readMirrorConfigLayers(
  projectDir: string,
  explicitIntentDir?: string,
  explicitSpace?: string,
  hooks: MirrorConfigReadHooks = {},
): MirrorConfigReadOutcome {
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

  const layers: MirrorConfigLayerInput[] = [];
  const failures: Extract<MirrorConfigIssue, { kind: "read-failure" }>[] = [];
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
  if (!Number.isSafeInteger(number) || number <= 0) return null;
  return { owner: match[1], number };
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
  for (const element of value) {
    const parsed = parseProjectTarget(element);
    if (!parsed.ok) return parsed;
    projects.push(...parsed.projects);
  }
  return { ok: true, projects };
}

type LayerIssue = Readonly<{
  key: MirrorConfigKey;
  actualType: string;
  expected: string;
}>;

type LayerClassification = Readonly<{
  mode?: MirrorMode;
  projects?: readonly MirrorProjectTarget[];
  autoSoloElection?: boolean;
  issues: readonly LayerIssue[];
}>;

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
  let mode: MirrorMode | undefined;
  const rawMode = rawValue[AUTO_MIRROR_KEY];
  if (rawMode !== undefined) {
    if (VALID_MODES.includes(rawMode as MirrorMode)) {
      mode = rawMode as MirrorMode;
    } else {
      issues.push({
        key: AUTO_MIRROR_KEY,
        actualType: valueKind(rawMode),
        expected: MODE_EXPECTED,
      });
    }
  }

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

  return {
    issues,
    ...(mode === undefined ? {} : { mode }),
    ...(projects === undefined ? {} : { projects }),
    ...(autoSoloElection === undefined ? {} : { autoSoloElection }),
  };
}

// Pure schema + precedence over collected layers. Every invalid layer is
// reported (never a partial config or a fallback), and only when all layers
// are valid is a mode resolved with the highest present layer winning.
// `sources` lists every layer that specified a valid value, in
// global -> space -> intent order; the last one is the winner.
export function parseMirrorConfigLayers(
  layers: readonly MirrorConfigLayerInput[],
): MirrorConfigOutcome {
  const ordered = [...layers]
    .filter((layer) => layer.present)
    .sort(
      (a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer),
    );

  const issues: MirrorConfigIssue[] = [];
  const sources: string[] = [];
  let mode: MirrorMode | undefined;
  let projects: readonly MirrorProjectTarget[] | undefined;
  let autoSoloElection: boolean | undefined;
  for (const layer of ordered) {
    const classified = classifyRawValue(layer.rawValue);
    for (const issue of classified.issues) {
      issues.push({
        kind: "invalid-value",
        layer: layer.layer,
        path: layer.path,
        key: issue.key,
        actualType: issue.actualType,
        expected: issue.expected,
      });
    }
    if (classified.issues.length > 0) continue;
    // Each key resolves independently: the last layer carrying a valid value for
    // that key wins, and `mirror-projects` fully replaces the previous layer's
    // target list rather than merging into it.
    let contributed = false;
    if (classified.mode !== undefined) {
      mode = classified.mode;
      contributed = true;
    }
    if (classified.projects !== undefined) {
      projects = classified.projects;
      contributed = true;
    }
    if (classified.autoSoloElection !== undefined) {
      autoSoloElection = classified.autoSoloElection;
      contributed = true;
    }
    if (contributed) sources.push(layer.path);
  }

  if (issues.length > 0) return { kind: "invalid", issues };
  return {
    kind: "resolved",
    config: {
      autoMirror: mode ?? "prompt",
      projects: projects ?? [],
      autoSoloElection: autoSoloElection ?? false,
    },
    sources,
  };
}

// Read-only facade: collect the layers, then judge them. A read failure in any
// layer fails the whole resolution closed with the redacted read-failure
// issues; otherwise the pure parser decides.
export function resolveMirrorConfig(
  projectDir: string,
  explicitIntentDir?: string,
  explicitSpace?: string,
  hooks: MirrorConfigReadHooks = {},
): MirrorConfigOutcome {
  const read = readMirrorConfigLayers(
    projectDir,
    explicitIntentDir,
    explicitSpace,
    hooks,
  );
  if (read.kind === "failure") return { kind: "invalid", issues: read.issues };
  return parseMirrorConfigLayers(read.layers);
}
