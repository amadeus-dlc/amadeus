// packages/framework/core/tools/amadeus-plugin-activation.ts — C6 activation
// policy (U6). The Amadeus-independent spec-hash mechanism behind ADR-1 option A
// (spec-hash advisory, NO automatic run): compute a deterministic hash of the
// formal-model-check spec files, compare it against the last recorded verdict,
// and derive an ActivationJudgment. The engine renders that judgment as a
// stderr-only advisory before build-and-test and U5 doctor renders it as an
// activation line; NEITHER writes state and NEITHER starts TLC (BR-U6-2 — the
// ADR-1 option-A vs option-D boundary).
//
// This module is the in-process seam: every function is a pure computation over
// an injectable filesystem port (ActivationFs), so a unit/integration test drives
// every branch WITHOUT spawning a child (bun --coverage does not instrument
// spawned children — seam-export-handler-amend). It re-implements NO composition
// logic; it only READS the composition record (formal-model-check presence) and
// the spec files.
//
// FR-7(d) / BR-U6-9 — the judgment depends ONLY on this spec-hash machinery. It
// does NOT evaluate the upstream `when:` predicate or any plugin-scope mechanism
// (both are unimplemented/brittle upstream surfaces the intent deliberately does
// not depend on).

import { createHash, randomUUID } from "node:crypto";
import {
  existsSync as fsExistsSync,
  readdirSync as fsReaddirSync,
  readFileSync as fsReadFileSync,
  renameSync as fsRenameSync,
  statSync as fsStatSync,
  writeFileSync as fsWriteFileSync,
} from "node:fs";
import { join, posix, relative, sep } from "node:path";

// The formal-model-check plugin is the sole activation target of this intent.
export const ACTIVATION_PLUGIN = "formal-model-check";

// The watched spec globs. This is the Amadeus-independent watch declaration for
// the formal-model-check plugin (BR-U6-9): a fixed default, NOT read from the
// upstream `when:`/scope manifest surface. Only the `<dir>/**` recursive form is
// used (and supported); the spec files live under specs/tla/.
export const ACTIVATION_WATCH_GLOBS: readonly string[] = ["specs/tla/**"];

// The persisted state file — composition-record-adjacent, machine-local. The
// `.amadeus-plugin-` prefix keeps it out of the host snapshot (isEngineDotfile)
// and matches the sibling engine dot-files (composition/audit/journal/drops).
export const ACTIVATION_STATE_FILE = ".amadeus-plugin-activation.json";

// The persisted verdict state (domain-entities.md SpecHashState). Absent file =
// never-run. `schema` pins the shape for a future migration; only lastVerdictHash
// drives the comparison.
export type SpecHashState = {
  schema: 1;
  lastVerdictHash: string;
  recordedAt: string;
};

// The deterministic judgment (domain-entities.md ActivationJudgment). `changed`
// and `never-run` fire the advisory; `current` is silent.
export type ActivationJudgment =
  | { kind: "changed"; currentHash: string; lastHash: string }
  | { kind: "current"; hash: string }
  | { kind: "never-run"; currentHash: string };

// A spec-hash computation result. fail-closed: an unreadable spec file yields
// `{ ok: false }` rather than a silently-omitted file that could hash-collide a
// changed set back to "current" (reliability-design fail-open ban).
export type SpecHashResult = { ok: true; hash: string } | { ok: false; reason: string };

// The injectable filesystem port. Defaults to node:fs; tests inject a throwing
// reader to drive the fail-closed branch in-process (no platform-specific
// EISDIR/empty-read divergence — bun-readfilesync-dir-platform-divergence).
export type ActivationFs = {
  existsSync: (path: string) => boolean;
  readdirSync: (path: string) => string[];
  statSync: (path: string) => { isDirectory: () => boolean };
  readFileSync: (path: string) => Buffer;
  writeFileSync: (path: string, data: string) => void;
  renameSync: (from: string, to: string) => void;
};

export const defaultActivationFs: ActivationFs = {
  existsSync: fsExistsSync,
  readdirSync: (p) => [...fsReaddirSync(p)],
  statSync: (p) => fsStatSync(p),
  readFileSync: (p) => fsReadFileSync(p),
  writeFileSync: (p, data) => fsWriteFileSync(p, data),
  renameSync: (a, b) => fsRenameSync(a, b),
};

function toPosixRel(root: string, abs: string): string {
  return relative(root, abs).split(sep).join(posix.sep);
}

// Expand a single `<dir>/**` glob into the sorted list of host-relative POSIX
// file paths under <dir>. A non-existent base yields the empty list (a deleted
// spec set is a determinate, hashable state). Only the recursive `/**` form is
// supported — the sole form ACTIVATION_WATCH_GLOBS uses.
function expandGlob(hostRoot: string, glob: string, fs: ActivationFs): string[] {
  const suffix = "/**";
  const base = glob.endsWith(suffix) ? glob.slice(0, -suffix.length) : glob;
  const baseAbs = join(hostRoot, base);
  if (!fs.existsSync(baseAbs)) return [];
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const name of [...fs.readdirSync(dir)].sort()) {
      const abs = join(dir, name);
      if (fs.statSync(abs).isDirectory()) walk(abs);
      else found.push(toPosixRel(hostRoot, abs));
    }
  };
  walk(baseAbs);
  return found;
}

// The sorted union of every glob's expansion (dedup + deterministic order —
// glob/FS enumeration order does not leak into the hash).
function expandGlobs(hostRoot: string, globs: readonly string[], fs: ActivationFs): string[] {
  const set = new Set<string>();
  for (const g of globs) for (const rel of expandGlob(hostRoot, g, fs)) set.add(rel);
  return [...set].sort();
}

// computeSpecHash — sha256 over the sorted (relative-path, content) pairs. Path
// is folded in so a rename with unchanged content is still `changed` (set
// identity is part of the judgment). fail-closed: any read error returns
// `{ ok: false }` (reliability-design — never hash a partial set to a false
// match). Deterministic: sorted paths, content bytes, no time/env/mtime input.
export function computeSpecHash(
  hostRoot: string,
  globs: readonly string[],
  fs: ActivationFs = defaultActivationFs,
): SpecHashResult {
  const rels = expandGlobs(hostRoot, globs, fs);
  const hash = createHash("sha256");
  for (const rel of rels) {
    let bytes: Buffer;
    try {
      bytes = fs.readFileSync(join(hostRoot, rel));
    } catch (err) {
      return { ok: false, reason: `unreadable spec file "${rel}": ${String(err)}` };
    }
    hash.update(rel);
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return { ok: true, hash: `sha256:${hash.digest("hex")}` };
}

function activationStatePath(hostRoot: string): string {
  return join(hostRoot, ACTIVATION_STATE_FILE);
}

// readActivationState — the persisted verdict, or null for BOTH absence and
// corruption. A corrupt state maps to null so judgeActivation treats it as
// never-run (fail-closed toward the advisory side — a broken state must not
// silence the nudge). readonly consumer: never writes (BR-U6-6).
export function readActivationState(
  hostRoot: string,
  fs: ActivationFs = defaultActivationFs,
): SpecHashState | null {
  const path = activationStatePath(hostRoot);
  if (!fs.existsSync(path)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(path).toString("utf-8")) as Partial<SpecHashState>;
    if (typeof parsed.lastVerdictHash !== "string" || parsed.lastVerdictHash.length === 0) return null;
    return {
      schema: 1,
      lastVerdictHash: parsed.lastVerdictHash,
      recordedAt: typeof parsed.recordedAt === "string" ? parsed.recordedAt : "",
    };
  } catch {
    return null;
  }
}

// writeActivationState — atomic temp+rename replace so a crash mid-write never
// leaves a half-written state. The ONLY writer of SpecHashState (BR-U6-6),
// reached solely from the verdict-record path (recordActivationVerdict).
export function writeActivationState(
  hostRoot: string,
  state: SpecHashState,
  fs: ActivationFs = defaultActivationFs,
): void {
  const target = activationStatePath(hostRoot);
  const tmp = `${target}.tmp-${randomUUID()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(tmp, target);
}

// judgeActivation — the pure 3-value map (hash string × recorded hash → kind).
// A null currentHash (spec unreadable) or null lastHash (state absent/corrupt)
// both fall to `never-run`, the advisory-firing side (fail-closed: prefer an
// over-nudge to a missed change).
export function judgeActivation(currentHash: string | null, lastHash: string | null): ActivationJudgment {
  if (currentHash === null) return { kind: "never-run", currentHash: "" };
  if (lastHash === null) return { kind: "never-run", currentHash };
  if (currentHash === lastHash) return { kind: "current", hash: currentHash };
  return { kind: "changed", currentHash, lastHash };
}

// The 1-line stderr advisory for a judgment (domain-entities.md AdvisoryLine).
// `current` is silent (null). Two variants — changed / never-run — each a single
// fixed line naming the explicit reach command (never an auto-run).
export function activationAdvisoryLine(judgment: ActivationJudgment): string | null {
  switch (judgment.kind) {
    case "current":
      return null;
    case "changed":
      return `advisory: ${ACTIVATION_PLUGIN} spec hash CHANGED (specs/tla) — run /amadeus --stage ${ACTIVATION_PLUGIN}`;
    case "never-run":
      return `advisory: ${ACTIVATION_PLUGIN} has no recorded verdict (specs/tla) — run /amadeus --stage ${ACTIVATION_PLUGIN}`;
  }
}

// The composition record's plugin entries: [name, record][]. We only need the
// names, so the record half is opaque.
type CompositionJson = { plugins?: [string, unknown][] };

function readCompositionPlugins(hostRoot: string, fs: ActivationFs): [string, unknown][] {
  const path = join(hostRoot, ".amadeus-plugin-composition.json");
  if (!fs.existsSync(path)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(path).toString("utf-8")) as CompositionJson;
    return parsed.plugins ?? [];
  } catch {
    return [];
  }
}

// Is formal-model-check compose-installed? The advisory's FIRST gate: when false
// the engine does nothing (0-plugin zero-impact — BR-U6-4). Read-only, total
// (a missing/corrupt record reads as "not composed").
export function formalModelCheckComposed(hostRoot: string, fs: ActivationFs = defaultActivationFs): boolean {
  return readCompositionPlugins(hostRoot, fs).some(([name]) => name === ACTIVATION_PLUGIN);
}

// Is `slug` a composed plugin stage on this host? FR-7(a): a composed plugin
// stage is reachable via `--stage <slug>` WITHOUT `--single`. Read-only, total
// (does NOT verify the trust index — that stays the emission-time job; this is
// only the routing predicate). The record's plugin entries carry a stageIndex
// of `{ slug }` entries.
export function isComposedPluginStage(
  hostRoot: string,
  slug: string,
  fs: ActivationFs = defaultActivationFs,
): boolean {
  for (const [, record] of readCompositionPlugins(hostRoot, fs)) {
    const stageIndex = (record as { stageIndex?: { slug?: string }[] }).stageIndex ?? [];
    if (stageIndex.some((entry) => entry.slug === slug)) return true;
  }
  return false;
}

// resolveActivationJudgment — compute the current hash, read the recorded state,
// and judge. The read-only judgment U5 doctor renders and the engine advisory
// consumes (fires nothing, writes nothing).
export function resolveActivationJudgment(
  hostRoot: string,
  globs: readonly string[] = ACTIVATION_WATCH_GLOBS,
  fs: ActivationFs = defaultActivationFs,
): ActivationJudgment {
  const current = computeSpecHash(hostRoot, globs, fs);
  const state = readActivationState(hostRoot, fs);
  return judgeActivation(current.ok ? current.hash : null, state === null ? null : state.lastVerdictHash);
}

// activationAdvisoryForHost — the whole engine-side advisory decision as one
// total function. Returns null (no advisory) when formal-model-check is not
// composed — the 0-plugin fast return that touches NO spec file (BR-U6-4 /
// performance-design) — otherwise the judgment's advisory line (null on
// `current`). Never writes state (BR-U6-6). Never throws.
export function activationAdvisoryForHost(
  hostRoot: string,
  fs: ActivationFs = defaultActivationFs,
): string | null {
  if (!formalModelCheckComposed(hostRoot, fs)) return null;
  return activationAdvisoryLine(resolveActivationJudgment(hostRoot, ACTIVATION_WATCH_GLOBS, fs));
}

// recordActivationVerdict — flow 4: persist the current spec hash as the last
// verdict. The SOLE writer of SpecHashState (BR-U6-6), reached only from an
// explicit formal-model-check stage completion. A fail-closed hash (unreadable
// spec) writes nothing — a verdict over an unreadable spec is meaningless.
// Returns whether it wrote.
export function recordActivationVerdict(
  hostRoot: string,
  globs: readonly string[] = ACTIVATION_WATCH_GLOBS,
  now: string = new Date().toISOString(),
  fs: ActivationFs = defaultActivationFs,
): boolean {
  const current = computeSpecHash(hostRoot, globs, fs);
  if (!current.ok) return false;
  writeActivationState(hostRoot, { schema: 1, lastVerdictHash: current.hash, recordedAt: now }, fs);
  return true;
}
