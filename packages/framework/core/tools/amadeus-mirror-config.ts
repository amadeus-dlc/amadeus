// amadeus-mirror-config.ts — C1 Mirror configuration resolver.
//
// Resolves the `auto-mirror` mode from the three git-shared layers
// (global -> space -> intent, later layers winning). The valid values are
// exactly the strings `off | prompt | auto`; an unspecified mode defaults to
// `prompt`. Booleans and any other value are configuration errors, never
// coerced — this is a forward migration off the old boolean setting with no
// compatibility shim.
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
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { join, relative, resolve as resolvePath, sep } from "node:path";
import { activeIntent, activeSpace, workspaceRoot } from "./amadeus-lib.ts";
import type { MirrorMode } from "./amadeus-mirror-types.ts";

// A config file above this size is rejected rather than read into memory. The
// bounded reader stops one byte past the limit so growth beyond it is caught.
const MAX_CONFIG_BYTES = 1024 * 1024;

const VALID_MODES: readonly MirrorMode[] = ["off", "prompt", "auto"];
const LAYER_ORDER: readonly ConfigLayer[] = ["global", "space", "intent"];

export type ConfigLayer = "global" | "space" | "intent";

export type MirrorConfig = Readonly<{ autoMirror: MirrorMode }>;

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
      key: "auto-mirror";
      actualType: string;
      expected: "off | prompt | auto";
    }>
  | Readonly<{
      kind: "read-failure";
      layer: ConfigLayer;
      path: string;
      key: "auto-mirror";
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

// Read an already-contained regular file behind an open descriptor: reject a
// non-regular file, a file over the size limit, and any size/mtime/inode change
// between the opening and closing fstat (a symlink swap or growth during read).
function readBoundedRegularFile(realPath: string): ConfigBytes {
  let fd: number;
  try {
    fd = openSync(realPath, "r");
  } catch (error) {
    if (isEnoent(error)) return { kind: "absent" };
    return { kind: "read-failure", summary: NOT_READABLE };
  }
  try {
    const start = fstatSync(fd);
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
      end.size === start.size && end.mtimeMs === start.mtimeMs && end.ino === start.ino;
    if (!stable) {
      return { kind: "read-failure", summary: "configuration changed during read" };
    }
    return { kind: "text", text: buffer.subarray(0, total).toString("utf-8") };
  } catch {
    return { kind: "read-failure", summary: NOT_READABLE };
  } finally {
    try {
      closeSync(fd);
    } catch {
      // The descriptor may already be gone; nothing more to release.
    }
  }
}

// Read a single config path safely. Absence is the common, non-failure case.
// Anything that is not a plain, contained, stable, size-bounded regular file
// is a loud read-failure carrying only a redacted summary — never raw bytes,
// an absolute home path, or a credential.
function readConfigBytes(rootReal: string, absPath: string): ConfigBytes {
  try {
    lstatSync(absPath);
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
  return readBoundedRegularFile(realPath);
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
): MirrorConfigReadOutcome {
  const root = workspaceRoot(projectDir);
  let rootReal: string | null;
  try {
    rootReal = realpathSync(root);
  } catch {
    rootReal = null;
  }
  const space = activeSpace(projectDir);
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
        : readConfigBytes(rootReal, candidate.abs);
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

type LayerClassification =
  | { ok: true; mode?: MirrorMode }
  | { ok: false; actualType: string };

// Judge one present layer's raw value. The whole config object is validated:
// a non-object root, an unknown property, or a non-mode `auto-mirror` value is
// rejected rather than silently reduced to the mode. An empty object is valid
// and contributes no mode.
function classifyRawValue(rawValue: unknown): LayerClassification {
  if (!isPlainObject(rawValue)) {
    return { ok: false, actualType: valueKind(rawValue) };
  }
  const unknownKeys = Object.keys(rawValue).filter((key) => key !== "auto-mirror");
  if (unknownKeys.length > 0) {
    return {
      ok: false,
      actualType: `object with unknown key(s): ${unknownKeys.join(", ")}`,
    };
  }
  const raw = rawValue["auto-mirror"];
  if (raw === undefined) return { ok: true };
  if (VALID_MODES.includes(raw as MirrorMode)) {
    return { ok: true, mode: raw as MirrorMode };
  }
  return { ok: false, actualType: valueKind(raw) };
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
  for (const layer of ordered) {
    const classified = classifyRawValue(layer.rawValue);
    if (!classified.ok) {
      issues.push({
        kind: "invalid-value",
        layer: layer.layer,
        path: layer.path,
        key: "auto-mirror",
        actualType: classified.actualType,
        expected: "off | prompt | auto",
      });
      continue;
    }
    if (classified.mode !== undefined) {
      mode = classified.mode;
      sources.push(layer.path);
    }
  }

  if (issues.length > 0) return { kind: "invalid", issues };
  return {
    kind: "resolved",
    config: { autoMirror: mode ?? "prompt" },
    sources,
  };
}

// Read-only facade: collect the layers, then judge them. A read failure in any
// layer fails the whole resolution closed with the redacted read-failure
// issues; otherwise the pure parser decides.
export function resolveMirrorConfig(
  projectDir: string,
  explicitIntentDir?: string,
): MirrorConfigOutcome {
  const read = readMirrorConfigLayers(projectDir, explicitIntentDir);
  if (read.kind === "failure") return { kind: "invalid", issues: read.issues };
  return parseMirrorConfigLayers(read.layers);
}
