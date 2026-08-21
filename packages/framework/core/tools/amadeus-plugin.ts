// packages/framework/core/tools/amadeus-plugin.ts — C1 Plugin CLI (U2).
//
// The harness-neutral CLI over the composition engine (amadeus-plugin-compose.ts,
// C2). Ships to every harness via coreDirs projection so each
// <harnessDir>/tools/amadeus-plugin.ts drives the same engine (BR-U2-1 single
// implementation — this file re-implements NO composition logic).
//
// Verbs (C1): compose [--if-stale] [--all-harnesses] [--project-root <dir>], doctor, drop <name>,
// install <path> [--force], status. Unknown verb / unknown flag / surplus argument fail closed BEFORE any
// mutation with usage on stderr and exit 2 (ADR-3, BR-U2-4). A failed manual
// compose exits 1 loud; the SessionStart hook wraps the call so a hook failure is
// a single stderr warning that never blocks the session (BR-U2-4, wired in
// settings.json.example with `|| true`).
//
// TESTABILITY. handlePluginCli(argv, deps) takes an injected dependency bag so a
// unit/integration test drives every branch IN-PROCESS (bun --coverage does not
// instrument spawned children — seam-export-handler-amend). The no-op fast path
// (compose --if-stale on a current record) is asserted through an apply-counter
// dep proving applyPluginPlan is never reached (performance-design).
//
// HOST MODEL. buildHostSnapshot reads two stage byte forms: the engine's native
// serializeStageSeams form, and — through the frontmatter seam bridge (U1,
// amadeus-plugin-compose.ts) — the REAL `---` frontmatter stage documents under
// amadeus-common/stages/. A stage document the bridge cannot address stops
// loudly rather than being skipped.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { harnessStageEntry, isHarnessDirName, KNOWN_HARNESS_DIRS, rulesSubdirFor } from "./amadeus-harness.ts";
import type { GraphStage } from "./amadeus-graph.ts";
import {
  activeIntent,
  activeSpace,
  probeStateResyncToStageGraph,
  resolveProjectDirFromHook,
  resyncStateToStageGraph,
  type StageEntry,
  type StateResyncOutcome,
} from "./amadeus-lib.ts";
import { observeSubprocessSpan } from "../otel/subprocess-span.ts";
import {
  createPluginInstallSnapshot,
  observePluginSelection,
  type PluginInstallSnapshot,
  type PluginSelection,
  resolvePluginSelection,
  type PluginSelectionOutcome,
  writeProjectPlugins,
} from "./amadeus-plugin-selection.ts";
import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  type CompositionRecord,
  diagnosePlugins,
  discoverPlugins,
  type DropEntry,
  type DropsRecord,
  readDropsRecord,
  recordPluginDrops,
  type HostSnapshot,
  type HostStage,
  inspectPlugin,
  ownedRecordDigests,
  planPluginDrop,
  type PluginDescriptor,
  type PluginManifest,
  type PluginDiagnostic,
  type PluginRecord,
  parseStageFrontmatter,
  PLUGIN_MANIFEST,
  SEAM_NAMES,
  type SeamName,
  type StageSeams,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "./amadeus-plugin-compose.ts";
import { renderStageRunner } from "./amadeus-runner-gen.ts";

// A discovered plugin whose manifest parsed (non-null). Distinct from the
// engine's branded ValidPlugin (an inspect-time cast); the CLI only needs the
// manifest shape for digest comparison, so this narrow is enough.
type DiscoveredPlugin = PluginDescriptor & { manifest: PluginManifest };

// ---------------------------------------------------------------------------
// Parsed CLI command (parse-don't-validate). Only these shapes reach dispatch —
// the parser returns Err for anything else, so the mutation body never inspects
// raw argv again.
// ---------------------------------------------------------------------------
export type PluginCliCommand =
  | { kind: "compose"; ifStale: boolean; allHarnesses: boolean; projectRoot?: string }
  | { kind: "doctor"; projectRoot?: string }
  | { kind: "drop"; name: string; projectRoot?: string }
  | { kind: "install"; sourcePath: string; force: boolean; projectRoot?: string }
  | { kind: "status"; projectRoot?: string };

export type CliParseError = { message: string };
export type CliParseResult = { ok: true; command: PluginCliCommand } | { ok: false; error: CliParseError };

// ---------------------------------------------------------------------------
// Result surface (domain-entities.md). Returned by handlePluginCli for tests to
// assert on; the process-boundary maps each to an exit code + stdout/stderr.
// ---------------------------------------------------------------------------
// One harness tree `compose --all-harnesses` could not bring up to date. The
// aggregate carries every one of them: a failing tree never stops the fan-out,
// it only makes the exit code non-zero (fail-closed aggregate).
export type BulkComposeFailure = { hostRoot: string; message: string };

export type DoctorLineState = "ok" | "drift" | "degraded" | "advisory" | "recovery-pending" | "unknown";
export type DoctorLine = { plugin: string; state: DoctorLineState; detail: string };

export type PluginCliResult =
  | {
      kind: "composed";
      applied: number;
      recompiled: true;
      resynced: readonly string[];
      /** Intents whose state re-sync FAILED loudly (`section-unrecognized`): the
       * Stage Progress section was not recognized, no rows were inserted, and
       * the state file was left untouched (#1963). Rendered on stderr, exit 1. */
      resyncFailed: readonly string[];
      /** Non-null when the host's compiled stage-graph.json was invalid and the
       * state re-sync was skipped entirely (#1993): distinguishable from
       * "nothing to resync", rendered on stderr through the injected err seam,
       * exit 1 — the same face as resyncFailed (#1970). */
      resyncSkipped: { path: string; reason: string } | null;
    }
  | { kind: "composed-all"; total: number; succeeded: number; failures: readonly BulkComposeFailure[] }
  | { kind: "noop"; reason: "record-current" }
  | { kind: "dropped"; plugin: string; baselineRestored: boolean; recompiled: true }
  | { kind: "doctor"; section: DoctorPluginSection; degraded: boolean }
  | { kind: "installed"; name: string; composeOutcome: "composed" | "noop" }
  | { kind: "status"; installed: number; composed: number; revision: number }
  | { kind: "usage-error"; message: string }
  | { kind: "failure"; stage: "discover" | "trust" | "plan" | "apply" | "recover" | "install"; message: string };

// ---------------------------------------------------------------------------
// Argument parsing (fail-closed). Every verb enumerates its allowed flags and
// argument count; anything else is a usage error, never a silent read-past.
// ---------------------------------------------------------------------------
const USAGE = [
  "usage: amadeus-plugin.ts <verb> [flags]",
  "  compose [--if-stale] [--all-harnesses] [--project-root <dir>]",
  "  doctor  [--project-root <dir>]",
  "  drop <plugin-name> [--project-root <dir>]",
  "  install <path> [--force] [--project-root <dir>]",
  "  status  [--project-root <dir>]",
].join("\n");

function takeProjectRoot(rest: string[]): { projectRoot?: string; rest: string[]; error?: string } {
  const idx = rest.indexOf("--project-root");
  if (idx === -1) return { rest };
  const value = rest[idx + 1];
  if (value === undefined || value.startsWith("--")) return { rest, error: "--project-root requires a directory" };
  return { projectRoot: value, rest: [...rest.slice(0, idx), ...rest.slice(idx + 2)] };
}

function parseCompose(rest: string[]): CliParseResult {
  const pr = takeProjectRoot(rest);
  if (pr.error) return { ok: false, error: { message: pr.error } };
  let ifStale = false;
  let allHarnesses = false;
  const leftover: string[] = [];
  for (const a of pr.rest) {
    if (a === "--if-stale") ifStale = true;
    else if (a === "--all-harnesses") allHarnesses = true;
    else leftover.push(a);
  }
  if (leftover.length > 0) return { ok: false, error: { message: `compose: unexpected argument(s): ${leftover.join(" ")}` } };
  return { ok: true, command: { kind: "compose", ifStale, allHarnesses, projectRoot: pr.projectRoot } };
}

function parseDrop(rest: string[]): CliParseResult {
  const pr = takeProjectRoot(rest);
  if (pr.error) return { ok: false, error: { message: pr.error } };
  const positionals = pr.rest.filter((a) => !a.startsWith("--"));
  const flags = pr.rest.filter((a) => a.startsWith("--"));
  if (flags.length > 0) return { ok: false, error: { message: `drop: unknown flag(s): ${flags.join(" ")}` } };
  if (positionals.length !== 1) return { ok: false, error: { message: "drop: expects exactly one <plugin-name>" } };
  return { ok: true, command: { kind: "drop", name: positionals[0], projectRoot: pr.projectRoot } };
}

// `install <path> [--force]`: exactly one positional (the plugin source folder)
// and one optional known flag. Anything else is a usage error before any FS work.
function parseInstall(rest: string[]): CliParseResult {
  const pr = takeProjectRoot(rest);
  if (pr.error) return { ok: false, error: { message: pr.error } };
  let force = false;
  const positionals: string[] = [];
  const unknown: string[] = [];
  for (const a of pr.rest) {
    if (a === "--force") force = true;
    else if (a.startsWith("--")) unknown.push(a);
    else positionals.push(a);
  }
  if (unknown.length > 0) return { ok: false, error: { message: `install: unknown flag(s): ${unknown.join(" ")}` } };
  if (positionals.length !== 1) return { ok: false, error: { message: "install: expects exactly one <path>" } };
  return { ok: true, command: { kind: "install", sourcePath: positionals[0], force, projectRoot: pr.projectRoot } };
}

function parseNoArgVerb(kind: "doctor" | "status", rest: string[]): CliParseResult {
  const pr = takeProjectRoot(rest);
  if (pr.error) return { ok: false, error: { message: pr.error } };
  if (pr.rest.length > 0) return { ok: false, error: { message: `${kind}: unexpected argument(s): ${pr.rest.join(" ")}` } };
  return { ok: true, command: { kind, projectRoot: pr.projectRoot } };
}

export function parsePluginCliArgs(argv: readonly string[]): CliParseResult {
  const [verb, ...rest] = argv;
  if (verb === undefined) return { ok: false, error: { message: "no verb given" } };
  if (verb === "compose") return parseCompose(rest);
  if (verb === "drop") return parseDrop(rest);
  if (verb === "install") return parseInstall(rest);
  if (verb === "doctor" || verb === "status") return parseNoArgVerb(verb, rest);
  return { ok: false, error: { message: `unknown verb: ${verb}` } };
}

// ---------------------------------------------------------------------------
// Dependency bag (in-process seam). defaultPluginCliDeps wires the real engine +
// a spawned recompile; tests inject counters/stubs.
// ---------------------------------------------------------------------------
export type PluginCliDeps = {
  discoverPlugins: (root: string) => readonly PluginDescriptor[];
  inspectPlugin: typeof inspectPlugin;
  applyPluginPlan: typeof applyPluginPlan;
  planPluginDrop: typeof planPluginDrop;
  applyPluginDrop: typeof applyPluginDrop;
  diagnosePlugins: typeof diagnosePlugins;
  buildHostSnapshot: (hostRoot: string, backend: WorkspaceBackend) => HostSnapshot;
  makeBackend: (hostRoot: string) => WorkspaceBackend;
  makeTx: (hostRoot: string, backend: WorkspaceBackend) => WorkspaceTransaction;
  recompile: (projectRoot: string) => boolean;
  generateRunners: (projectRoot: string) => boolean;
  derivedProjectionCurrent?: (hostRoot: string, record: PluginRecord) => boolean;
  recordDrops: (hostRoot: string, plugin: string, entries: readonly DropEntry[]) => void;
  clearDrops: (hostRoot: string, plugin: string) => void;
  stagingEntryState: (dst: string, src: string) => StagingEntryState;
  copyPluginSource: (src: string, dst: string) => void;
  listHarnessTrees: (projectDir: string) => readonly string[];
  listPluginSourceDirs: (root: string) => readonly string[];
  writeProjectPlugins?: (projectDir: string, plugins: readonly string[]) => void;
  // Post-compose Stage Progress re-sync (#1849). Optional so a stub deps bag
  // stays a pure compose harness; defaultPluginCliDeps always wires the real
  // writer, which is what production composes run. Returns a discriminated
  // outcome (#1993): the invalid-host-graph case is a first-class result, not
  // an empty list, so callers can tell "nothing to resync" from "could not
  // resync at all".
  resyncIntentStates?: (hostRoot: string) => StateResyncRun;
  // Read-only resync completeness probe for compose --if-stale (#1976).
  resyncComplete?: (hostRoot: string) => boolean;
  out: (line: string) => void;
  err: (line: string) => void;
};

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

// A host stage file in the engine's native serializeStageSeams byte form:
//   stage: <slug>\nproduces: [..]\nconsumes: [..]\nsensors: [..]\nrequired_sections: [..]
// Returns the parsed HostStage, or null when the bytes are not that form.
export function parseHostStageSeams(hostRelPath: string, bytes: Buffer): HostStage | null {
  const lines = bytes.toString("utf-8").split("\n");
  const stageLine = lines[0]?.match(/^stage: (.+)$/);
  if (!stageLine) return null;
  const seams: Record<SeamName, string[]> = { produces: [], consumes: [], sensors: [], required_sections: [] };
  for (const name of SEAM_NAMES) {
    const line = lines.find((l) => l.startsWith(`${name}: [`));
    if (line === undefined) return null;
    const inner = line.slice(`${name}: [`.length, -1).trim();
    seams[name] = inner === "" ? [] : inner.split(",").map((s) => s.trim());
  }
  return { slug: stageLine[1], path: hostRelPath, seams: seams as StageSeams };
}

// Where a HOST stage lives. Only files under this prefix are read as real
// frontmatter stages: a plugin's own stages live under plugins/<name>/stages/
// and stay out of the host stage set, so no seam contribution can ever rewrite
// plugin bytes (the trust layers own those). Agent/skill/rule markdown carries
// frontmatter too, and none of it is a stage — the prefix is what keeps their
// slug-less frontmatter out of the loud path below.
const HOST_STAGE_DIR = "amadeus-common/stages/";

// A host stage file in its REAL markdown form (`---` frontmatter + body). Null
// when the file is not a stage document at all (no frontmatter); a stage-placed
// document the seam bridge cannot address throws — a stage the mechanism cannot
// read back is a defect, never a silent skip (BR-U1-6).
export function parseHostStageFrontmatter(hostRelPath: string, bytes: Buffer): HostStage | null {
  if (!hostRelPath.startsWith(HOST_STAGE_DIR) || !hostRelPath.endsWith(".md")) return null;
  const parsed = parseStageFrontmatter(bytes);
  if (parsed.ok) return { slug: parsed.value.slug, path: hostRelPath, seams: parsed.value.seams };
  if (parsed.error.kind === "no-frontmatter") return null;
  const detail = parsed.error.kind === "seam-span-ambiguous" ? `${parsed.error.kind} (${parsed.error.seam})` : parsed.error.kind;
  throw new Error(`host stage ${hostRelPath} cannot be read as a stage document: ${detail}`);
}

function isEngineDotfile(name: string): boolean {
  return name.startsWith(".amadeus-plugin-") || name === ".git";
}

// Walk `hostRoot` into a HostSnapshot: every file (POSIX host-relative) becomes a
// path+bytes entry, and every serializeStageSeams-form file becomes a HostStage.
// The composed area `plugins/` IS included (so doctor/drop see owned files); the
// discovery/install staging area is a `.amadeus-plugin-` dot-dir (excluded by
// isEngineDotfile) so a freshly installed source is never seen as a clobber of
// its own owned landing path (the engine keeps discovery and host separate —
// t254). Engine dot-state is skipped.
export function buildHostSnapshot(hostRoot: string, backend: WorkspaceBackend): HostSnapshot {
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  const stages = new Map<string, HostStage>();
  const walk = (dir: string): void => {
    for (const name of [...readdirSync(dir)].sort()) {
      if (dir === hostRoot && isEngineDotfile(name)) continue;
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      const rel = toPosixRel(hostRoot, abs);
      const bytes = readFileSync(abs);
      paths.add(rel);
      files.set(rel, bytes);
      const stage = parseHostStageSeams(rel, bytes) ?? parseHostStageFrontmatter(rel, bytes);
      if (stage) stages.set(stage.slug, stage);
    }
  };
  if (existsSync(hostRoot)) walk(hostRoot);
  return { stages, paths, files, composition: backend.readComposition() };
}

function toPosixRel(root: string, abs: string): string {
  return relative(root, abs).split(sep).join(posix.sep);
}

// A transaction whose verify is a no-op OK: the engine's atomic mechanism is
// unchanged (BR-U2-1); the post-apply recompile is a separate CLI step.
function nodeTx(hostRoot: string, backend: WorkspaceBackend): WorkspaceTransaction {
  let n = 0;
  return {
    backend,
    verify: () => ({ ok: true }),
    lock: createNodeLock(hostRoot),
    newTxnId: () => `plugin-cli-${Date.now()}-${++n}`,
  };
}

// The project dir a subprocess span attaches to. `projectRoot` here is the HOST
// root — the harness dir (.claude/.kiro/...) under the project — so strip that
// last segment when it is one. Telemetry-only: an unresolvable root yields a
// path whose config read fails closed to disabled, never an error.
function telemetryProjectDir(projectRoot: string): string {
  return isHarnessDirName(basename(projectRoot)) ? dirname(projectRoot) : projectRoot;
}

// Post-apply recompile (#1592): BOTH compiled artifacts, in dependency order.
// `amadeus-graph.ts compile` is the only writer of stage-graph.json + scope-grid
// — the join that makes a composed plugin stage visible to `next` — and
// `amadeus-runtime.ts compile` derives the runtime graph from it. Compiling only
// the runtime left the composed stage off the stage graph, so auto-compose alone
// never reached a run-stage directive. Fails loud: the first non-zero exit stops
// the chain and the caller reports the recompile failure.
// Which installed tools/ dir the post-apply steps spawn from. Normally this
// file's own dir — the CLI is composing the tree it was installed into. Under
// `compose --all-harnesses` it is composing SIBLING trees, and each of those
// carries its own tools/: compiling a sibling with the caller's copy would
// recompile the CALLER's graph, leaving the composed stage unreachable in the
// tree that just received it. A host root with no tools of its own (the
// canonical source layout) falls back to the caller's dir.
export function resolveHarnessToolsDir(hostRoot: string, scriptDir: string = THIS_DIR): string {
  const own = join(hostRoot, "tools");
  return existsSync(join(own, "amadeus-graph.ts")) ? own : scriptDir;
}

function spawnRecompile(projectRoot: string): boolean {
  const toolsDir = resolveHarnessToolsDir(projectRoot);
  for (const tool of ["amadeus-graph.ts", "amadeus-runtime.ts"]) {
    const res = observeSubprocessSpan(
      telemetryProjectDir(projectRoot),
      `${tool.replace(/\.ts$/, "")}:compile`,
      () =>
        spawnSync("bun", [join(toolsDir, tool), "compile"], {
          cwd: projectRoot,
          stdio: "ignore",
          env: process.env,
        }),
    );
    if (res.status !== 0) return false;
  }
  return true;
}

// Post-recompile stage-runner regeneration (#1598). The compiled graph is what
// the generator reads, so this runs AFTER spawnRecompile: `write` emits one
// `skills/amadeus-<slug>/SKILL.md` per runnable compiled stage — which now
// includes the composed plugin stage — and prunes the runner of a stage the
// graph no longer has, which is what makes `drop` remove it again. Same spawn
// shape and same loud contract as spawnRecompile: a non-zero exit returns false
// and the caller reports an apply-stage failure rather than leaving the host
// with a composed stage nobody can type.
function spawnRunnerGen(projectRoot: string): boolean {
  const entry = harnessStageEntry(join(projectRoot, "tools", "data"));
  if (entry?.kind === "command") return true;
  const projectDir = projectDirOfHostRoot(projectRoot);
  const runnerRoot = entry?.kind === "runner"
    ? join(projectDir, ...entry.root.split("/"))
    : join(projectRoot, "skills");
  const res = observeSubprocessSpan(
    telemetryProjectDir(projectRoot),
    "amadeus-runner-gen:write",
    () =>
      spawnSync("bun", [join(resolveHarnessToolsDir(projectRoot), "amadeus-runner-gen.ts"), "write", "--out", runnerRoot], {
        cwd: projectRoot,
        stdio: "ignore",
        env: process.env,
      }),
  );
  return res.status === 0;
}

// The amadeus workspace root for a plugin host root. The host root is the
// HARNESS dir (<project>/.claude — see defaultPluginHostRoot), and the workspace
// (amadeus/spaces/…/intents) lives one level above it. In the canonical source
// layout there is no harness leaf, so the host root already IS the project dir.
export function projectDirOfHostRoot(hostRoot: string): string {
  return isHarnessDirName(basename(hostRoot)) ? dirname(hostRoot) : hostRoot;
}

// The host's OWN compiled graph, read fresh off disk. Not lib's cached
// loadStageGraph(): that resolves relative to the EXECUTING copy of the tools
// (wrong when `--project-root` names another harness) and its module cache
// could predate the recompile this re-sync follows. Falls back to the cached
// loader ONLY when the host carries no compiled graph of its own (`absent`).
// A file that exists but does not parse to a stage-entry array is `invalid`
// (#1962): it must neither crash the compose that already committed nor fall
// through to the cached loader — `null` would slip past a nullish fallback
// into exactly the wrong-graph read this function exists to avoid.
type HostStageGraphRead =
  | { kind: "graph"; graph: StageEntry[] }
  | { kind: "absent" }
  | { kind: "invalid"; reason: string };

function hostStageGraph(hostRoot: string): HostStageGraphRead {
  const p = join(hostRoot, "tools", "data", "stage-graph.json");
  if (!existsSync(p)) return { kind: "absent" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(p, "utf-8"));
  } catch (error) {
    return { kind: "invalid", reason: String(error) };
  }
  if (!Array.isArray(parsed)) return { kind: "invalid", reason: "not a JSON array" };
  // A recompile that SUCCEEDED never emits an empty graph, so `[]` here is a
  // broken copy, not a small one — letting it through would classify every
  // intent's rows as foreign and silently drop the whole re-sync (#1992).
  if (parsed.length === 0) {
    return { kind: "invalid", reason: "empty array — a compiled stage graph is never empty" };
  }
  // Validate exactly the fields the re-sync path consumes per entry — `slug`
  // (row identity / foreign-row detection), `phase` (renderStageProgressSection
  // buckets rows by it; a phase-less entry silently drops out of the rendered
  // section), `number` (rebuildDerivedPlanFields writes it into the derived
  // plan fields; a number-less entry writes the literal "undefined") — not the
  // full StageEntry schema (#1992).
  for (const field of ["slug", "phase", "number"] as const) {
    if (!parsed.every((e) => typeof e === "object" && e !== null && typeof (e as Record<string, unknown>)[field] === "string")) {
      return { kind: "invalid", reason: `entries are not stage entries (missing string ${field})` };
    }
  }
  return { kind: "graph", graph: parsed as StageEntry[] };
}

// The discriminated result of the post-compose state re-sync (#1993). The
// invalid-graph case carries the path + reason so the RENDER layer can warn
// through the injected err seam — the dep itself never prints.
export type StateResyncRun =
  | { kind: "ran"; outcomes: readonly StateResyncOutcome[] }
  | { kind: "invalid-graph"; path: string; reason: string };

function resyncIntentStates(hostRoot: string): StateResyncRun {
  const read = hostStageGraph(hostRoot);
  if (read.kind === "invalid") {
    // The plugin apply + recompile already committed; a broken graph copy only
    // forfeits the re-sync — surfaced as a first-class outcome, never a resync
    // against the WRONG graph, never an empty list masquerading as success.
    return {
      kind: "invalid-graph",
      path: join(hostRoot, "tools", "data", "stage-graph.json"),
      reason: read.reason,
    };
  }
  const projectDir = projectDirOfHostRoot(hostRoot);
  const space = activeSpace(projectDir);
  const intent = activeIntent(projectDir, space);
  if (intent === null) return { kind: "ran", outcomes: [] };
  return {
    kind: "ran",
    outcomes: resyncStateToStageGraph(projectDir, {
      graph: read.kind === "graph" ? read.graph : undefined,
      space,
      intent,
    }),
  };
}

function resyncIsComplete(hostRoot: string): boolean {
  const read = hostStageGraph(hostRoot);
  if (read.kind === "invalid") return false;
  const projectDir = projectDirOfHostRoot(hostRoot);
  const space = activeSpace(projectDir);
  const intent = activeIntent(projectDir, space);
  if (intent === null) return true;
  const outcomes = probeStateResyncToStageGraph(projectDir, {
    graph: read.kind === "graph" ? read.graph : undefined,
    space,
    intent,
  });
  return outcomes.length === 1 && outcomes[0].complete;
}

export function defaultPluginCliDeps(): PluginCliDeps {
  return {
    discoverPlugins: (root) => discoverPlugins(root),
    inspectPlugin,
    applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: (hostRoot) => createNodeBackend(hostRoot),
    makeTx: nodeTx,
    recompile: spawnRecompile,
    generateRunners: spawnRunnerGen,
    derivedProjectionCurrent,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst),
    listHarnessTrees,
    listPluginSourceDirs,
    writeProjectPlugins,
    resyncIntentStates,
    resyncComplete: resyncIsComplete,
    out: (l) => console.log(l),
    err: (l) => console.error(l),
  };
}

// The plugin host root when the caller names none (#1591 ruling B): the HARNESS
// directory, i.e. the same root the engine reads back
// (amadeus-orchestrate.ts:pluginHostRoot and
// amadeus-graph.ts:pluginsHostRoot both resolve to the harness dir). Derived
// from THIS file's own installed location, so the compose command the shipped
// INSTALL doc prints — run from the project root, through the harness copy of
// this CLI — targets that harness dir no matter what the cwd is. In the
// canonical source layout there is no harness leaf above `tools/`, so the cwd
// stands in.
export function defaultPluginHostRoot(scriptDir: string = THIS_DIR, cwd: string = process.cwd()): string {
  if (basename(scriptDir) !== "tools") return cwd;
  const harnessRoot = dirname(scriptDir);
  return isHarnessDirName(basename(harnessRoot)) ? harnessRoot : cwd;
}

// The plugin host root for a SessionStart auto-compose hook. The project dir
// comes from the shared hook ladder (payload cwd / CLAUDE_PROJECT_DIR / marker
// ancestor / script path), then the harness leaf of the hook's OWN installed
// path is appended — a hook shipped at `<project>/.claude/hooks/` composes into
// `<project>/.claude/`. In the canonical source layout (`.../core/hooks/`) there
// is no harness leaf, so the resolved project dir is the host root.
export function pluginHostRootFromHook(importMetaUrl: string, payloadCwd?: string | null): string {
  const projectDir = resolveProjectDirFromHook(importMetaUrl, payloadCwd);
  const hookDir = dirname(fileURLToPath(importMetaUrl));
  if (basename(hookDir) !== "hooks") return projectDir;
  const harnessName = basename(dirname(hookDir));
  return isHarnessDirName(harnessName) ? join(projectDir, harnessName) : projectDir;
}

function resolveProjectRoot(cmd: PluginCliCommand): string {
  const raw = cmd.projectRoot ?? defaultPluginHostRoot();
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
}

// The dot-dir under a host/project root where a user stages a plugin bundle's
// `<name>/` content before composing. Defined in the runtime leaf and re-exported
// here so the packager's INSTALL.md generator points users at the SAME directory
// the CLI scans — the install instruction and discovery must not drift (#1569).
import { PLUGIN_SOURCE_DIR_NAME } from "./amadeus-plugin-runtime.ts";
export { PLUGIN_SOURCE_DIR_NAME };

// The install/discovery staging root: where a user drops a plugin bundle's
// `<name>/` content before composing. A `.amadeus-plugin-` dot-dir so it stays
// out of the composed `plugins/` area and out of the host snapshot (the engine
// keeps discovery and host separate — t254). Composed owned stages land under
// `<host>/plugins/<name>/`, which IS compile-visible.
function pluginSourceRootOf(hostRoot: string): string {
  return join(hostRoot, PLUGIN_SOURCE_DIR_NAME);
}

// The project-root directory a plugin is AUTHORED in, and the one
// `--all-harnesses` seeds an absent staging dir from. Distinct from the
// same-named composed area inside a harness tree: this one sits beside the
// harness dirs, not under one.
export const PLUGIN_AUTHORING_DIR_NAME = "plugins";

// The harness trees that actually exist under `projectDir`, in the framework's
// canonical probe order so the fan-out is deterministic. Detection only — a
// missing tree is never created (domain-entities E3).
export function listHarnessTrees(projectDir: string): readonly string[] {
  return KNOWN_HARNESS_DIRS.map((name) => join(projectDir, name)).filter(
    (dir) => existsSync(dir) && statSync(dir).isDirectory(),
  );
}

// The plugin-bearing subdirectories of `root` (each holding a plugin.json),
// sorted. An absent root yields [] — a project with no plugins is not an error.
export function listPluginSourceDirs(root: string): readonly string[] {
  if (!existsSync(root)) return [];
  return [...readdirSync(root)]
    .sort()
    .filter((name) => existsSync(join(root, name, PLUGIN_MANIFEST)));
}

// ---------------------------------------------------------------------------
// install staging (U2). `install <path>` is the one-operation form of the manual
// folder-drop the shipped INSTALL doc describes: stage the source folder under
// PLUGIN_SOURCE_DIR_NAME, then compose. Everything it writes lives under the
// staging root — the verb never touches the composed `plugins/` area (compose
// owns that) and never writes outside <host>/PLUGIN_SOURCE_DIR_NAME.
// ---------------------------------------------------------------------------

// What is already staged at the landing path, relative to the source being
// installed. `identical` is the idempotent-retry signal (skip the copy);
// `different` is the collision --force replaces.
export type StagingEntryState = "absent" | "identical" | "different";

// The scratch dirs the copy swaps through. Dot-prefixed and named per plugin so
// two installs of different plugins never share scratch state.
function installTmpDirOf(stagingRoot: string, name: string): string {
  return join(stagingRoot, `.amadeus-plugin-install-tmp-${name}`);
}
function installOldDirOf(stagingRoot: string, name: string): string {
  return join(stagingRoot, `.amadeus-plugin-install-old-${name}`);
}

// Every regular file under `root`, POSIX-relative → bytes. Symlinks are SKIPPED
// (lstat, not stat) so this reads the same set of entries copyPluginSource
// writes — otherwise a symlinked source would compare `different` forever.
function readTreeFiles(root: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const walk = (dir: string): void => {
    for (const name of [...readdirSync(dir)].sort()) {
      const abs = join(dir, name);
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) walk(abs);
      else if (st.isFile()) files.set(toPosixRel(root, abs), readFileSync(abs));
    }
  };
  walk(root);
  return files;
}

// ---------------------------------------------------------------------------
// Harness-neutral → harness-specific prose, applied at the STAGING SEED (#2790).
//
// Plugin prose is authored harness-neutral, exactly like core prose: a path that
// names the harness directory is written `{{HARNESS_DIR}}/…`. The build-time
// packager resolves the token per face with its own prose transform, but the
// runtime path — seeding a harness tree's staging dir from the project's
// authoring `plugins/` — copied bytes verbatim, so a dogfood compose from a
// repo-root `plugins/` shipped the raw token into every tree.
//
// The substitution belongs HERE, at the seed, not in the composition engine:
// compose stays a byte-faithful copier over whatever staging holds, and the
// staleness digests it computes keep comparing like against like.
// ---------------------------------------------------------------------------

const HARNESS_TOKEN = /\{\{HARNESS_DIR\}\}/g;

// The harness dir a staging landing path belongs to, or null when `dst` is not
// `<harnessTree>/.amadeus-plugin-src/<name>`. The authoring `plugins/<name>`
// dir (an install --force write target) is deliberately NOT a match: the
// authoring tree must stay harness-neutral.
export function stagingHarnessDirOf(dst: string): string | null {
  const stagingRoot = dirname(dst);
  if (basename(stagingRoot) !== PLUGIN_SOURCE_DIR_NAME) return null;
  const host = basename(dirname(stagingRoot));
  return isHarnessDirName(host) ? host : null;
}

// One prose file's bytes, resolved for `harnessDir`. Mirrors the packager's
// transform(): Markdown prose only (.md / .md.example), everything else — the
// plugin manifest, any shipped .ts — byte-for-byte verbatim.
export function seedBytesForHarness(relPath: string, bytes: Buffer, harnessDir: string | null): Buffer {
  if (harnessDir === null) return bytes;
  if (!relPath.endsWith(".md") && !relPath.endsWith(".md.example")) return bytes;
  const rules = rulesSubdirFor(harnessDir);
  const text = bytes.toString("utf-8").replace(HARNESS_TOKEN, harnessDir);
  return Buffer.from(text.replaceAll(`${harnessDir}/rules/`, `${harnessDir}/${rules}/`), "utf-8");
}

// Compare the staged landing path against the source it would be replaced by.
// The source is read THROUGH the same seed transform the copy applies, so a
// correctly-seeded tree reads `identical` instead of drifting forever against
// its own harness-neutral source.
export function stagingEntryState(dst: string, src: string): StagingEntryState {
  if (!existsSync(dst)) return "absent";
  const harnessDir = stagingHarnessDirOf(dst);
  const staged = readTreeFiles(dst);
  const source = readTreeFiles(src);
  if (staged.size !== source.size) return "different";
  for (const [rel, bytes] of source) {
    const other = staged.get(rel);
    if (other === undefined || !other.equals(seedBytesForHarness(rel, bytes, harnessDir))) return "different";
  }
  return "identical";
}

// Copy `src` onto the staging landing path `dst` so `dst` is only ever observed
// absent, wholly-old, or wholly-new:
//   (a) copy real files into a fresh tmp dir (symlinks skipped, warned once each),
//   (b) rename an existing dst aside into an old dir,
//   (c) rename tmp into place,
//   (d) delete the old dir.
// tmp/old are destroyed and recreated on entry, so residue from an interrupted
// run converges on the next attempt instead of poisoning it.
export function copyPluginSource(src: string, dst: string, warn: (line: string) => void = (l) => console.error(l)): void {
  const stagingRoot = dirname(dst);
  const name = basename(dst);
  const tmp = installTmpDirOf(stagingRoot, name);
  const old = installOldDirOf(stagingRoot, name);
  rmSync(tmp, { recursive: true, force: true });
  rmSync(old, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  copyRealFiles(src, tmp, src, warn, stagingHarnessDirOf(dst));
  if (existsSync(dst)) renameSync(dst, old);
  renameSync(tmp, dst);
  rmSync(old, { recursive: true, force: true });
}

// Recursive real-file copy. Symlinks (of any target kind) are skipped with one
// stderr line each rather than followed — an install must not import whatever a
// symlink happens to point at. `harnessDir` non-null means the destination is a
// harness tree's staging dir, so prose is resolved for that harness on the way
// in (#2790); null copies every byte verbatim, as before.
function copyRealFiles(
  dir: string,
  outDir: string,
  srcRoot: string,
  warn: (line: string) => void,
  harnessDir: string | null = null,
): void {
  mkdirSync(outDir, { recursive: true });
  for (const name of [...readdirSync(dir)].sort()) {
    const abs = join(dir, name);
    const st = lstatSync(abs);
    if (st.isSymbolicLink()) {
      warn(`amadeus-plugin: install skipped symlink ${toPosixRel(srcRoot, abs)}`);
      continue;
    }
    if (st.isDirectory()) copyRealFiles(abs, join(outDir, name), srcRoot, warn, harnessDir);
    else if (st.isFile()) {
      writeFileSync(join(outDir, name), seedBytesForHarness(toPosixRel(srcRoot, abs), readFileSync(abs), harnessDir));
    }
  }
}

// A plugin name derived from a source path must be a single ordinary directory
// segment — an empty, dot, or separator-bearing basename would escape the
// staging root, so it is refused before any FS write.
function isSafePluginDirName(name: string): boolean {
  if (name === "" || name === "." || name === "..") return false;
  return !name.includes("/") && !name.includes(sep);
}

// Is the composition record already current for every installed plugin? Reads
// the record + discovers plugins and compares owned-stage digests. Reaches NO
// mutation stage (inspect/plan/apply/recompile) — the no-op fast path predicate.
export function isRecordCurrent(
  hostRoot: string,
  deps: PluginCliDeps,
  selectionOverride?: ResolvedPluginSelection,
): boolean {
  const selection = selectionOverride ?? resolvePluginSelection(hostRoot);
  if (selection.kind === "invalid") return false;
  const backend = deps.makeBackend(hostRoot);
  const record = backend.readComposition();
  const discovered = deps.discoverPlugins(pluginSourceRootOf(hostRoot))
    .filter((plugin) => !selection.explicit || selection.plugins.includes(plugin.name));
  const valid = discovered.filter((d): d is DiscoveredPlugin => d.manifest !== null);
  if (selection.explicit) {
    if (selection.plugins.length !== valid.length) return false;
    if (selection.plugins.some((name) => !valid.some((plugin) => plugin.name === name))) return false;
  }
  if (valid.length !== record.plugins.size) return false;
  for (const plugin of valid) {
    const recorded = record.plugins.get(plugin.name);
    if (recorded === undefined) return false;
    if (!digestsEqual(ownedRecordDigests(plugin), recorded.ownedContentDigests)) return false;
    if (!hostProjectionCurrent(backend, recorded)) return false;
    if (!(deps.derivedProjectionCurrent?.(hostRoot, recorded) ?? true)) return false;
  }
  return deps.resyncComplete?.(hostRoot) ?? true;
}

function hostProjectionCurrent(backend: WorkspaceBackend, record: PluginRecord): boolean {
  for (const [path, digest] of record.ownedContentDigests) {
    const bytes = backend.readHost(path);
    if (bytes === undefined) return false;
    const actual = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    if (actual !== digest) return false;
  }
  return true;
}

function derivedProjectionCurrent(hostRoot: string, record: PluginRecord): boolean {
  const graphPath = join(hostRoot, "tools", "data", "stage-graph.json");
  let graphNodes: Map<string, GraphStage>;
  try {
    const graph = JSON.parse(readFileSync(graphPath, "utf-8")) as Array<GraphStage & { slug?: unknown }>;
    if (!Array.isArray(graph)) return false;
    graphNodes = new Map(graph.flatMap((node) => typeof node.slug === "string" ? [[node.slug, node]] : []));
  } catch {
    return false;
  }
  const slugs = record.stageIndex.map((stage) => stage.slug);
  if (slugs.some((slug) => !graphNodes.has(slug))) return false;
  const entry = harnessStageEntry(join(hostRoot, "tools", "data"));
  if (entry?.kind === "command") return existsSync(join(projectDirOfHostRoot(hostRoot), ...entry.path.split("/")));
  const root = entry?.kind === "runner" ? entry.root : `${basename(hostRoot)}/skills`;
  const projectDir = projectDirOfHostRoot(hostRoot);
  return slugs.every((slug) => {
    const node = graphNodes.get(slug);
    const path = join(projectDir, ...root.split("/"), `amadeus-${slug}`, "SKILL.md");
    return node !== undefined && existsSync(path) && readFileSync(path, "utf-8") === renderStageRunner(node);
  });
}

function digestsEqual(a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

// A plugin is stale (needs composing) when it is absent from the record or its
// owned-stage digests differ. Idempotency: an already-current plugin is skipped,
// so a bare re-compose is byte-identical and never double-appends contributions.
function isStale(plugin: DiscoveredPlugin, record: CompositionRecord): boolean {
  const recorded = record.plugins.get(plugin.name);
  if (recorded === undefined) return true;
  return !digestsEqual(ownedRecordDigests(plugin), recorded.ownedContentDigests);
}

// ---------------------------------------------------------------------------
// Verb handlers
// ---------------------------------------------------------------------------
// `compose --all-harnesses`: run the SAME single-tree compose against every
// harness tree that exists under the project, seeding an ABSENT staging dir from
// the project's authoring `plugins/` first. Staging that already exists is left
// untouched — replacing a differing staged bundle is `install --force`'s
// decision, not this verb's. A failing tree is recorded and the fan-out
// continues; the aggregate exits non-zero (fail-closed).
function handleComposeAll(cmd: Extract<PluginCliCommand, { kind: "compose" }>, deps: PluginCliDeps): PluginCliResult {
  const base = resolveProjectRoot(cmd);
  const projectDir = isHarnessDirName(basename(base)) ? dirname(base) : base;
  const trees = deps.listHarnessTrees(projectDir);
  if (trees.length === 0) {
    return { kind: "failure", stage: "discover", message: `no harness tree found under ${projectDir}` };
  }
  const sources = collectPluginSources(projectDir, trees, deps);
  const failures: BulkComposeFailure[] = [];
  let succeeded = 0;
  for (const hostRoot of trees) {
    const seedError = seedStaging(hostRoot, sources, deps);
    if (seedError !== null) {
      failures.push({ hostRoot, message: seedError });
      continue;
    }
    const result = handleCompose({ kind: "compose", ifStale: cmd.ifStale, allHarnesses: false, projectRoot: hostRoot }, deps);
    if (result.kind === "composed" && result.resyncSkipped !== null) {
      failures.push({
        hostRoot,
        message: `${result.resyncSkipped.path} is invalid (${result.resyncSkipped.reason}); state re-sync skipped — recompile the host graph and re-run compose (#1993)`,
      });
    } else if (result.kind === "composed" && result.resyncFailed.length > 0) {
      failures.push({
        hostRoot,
        message: `state re-sync failed for ${result.resyncFailed.join(", ")}: Stage Progress section not recognized (#1963)`,
      });
    } else if (result.kind === "composed" || result.kind === "noop") succeeded += 1;
    else failures.push({ hostRoot, message: describeTreeFailure(result) });
  }
  return { kind: "composed-all", total: trees.length, succeeded, failures };
}

// Where each plugin name can be seeded FROM: the project's authoring dir first,
// then any tree that already stages it (so a project without an authoring dir
// still propagates what one tree already has).
function collectPluginSources(
  projectDir: string,
  trees: readonly string[],
  deps: PluginCliDeps,
): ReadonlyMap<string, string> {
  const sources = new Map<string, string>();
  const authoringRoot = join(projectDir, PLUGIN_AUTHORING_DIR_NAME);
  for (const name of deps.listPluginSourceDirs(authoringRoot)) sources.set(name, join(authoringRoot, name));
  for (const hostRoot of trees) {
    const stagingRoot = pluginSourceRootOf(hostRoot);
    for (const name of deps.listPluginSourceDirs(stagingRoot)) {
      if (!sources.has(name)) sources.set(name, join(stagingRoot, name));
    }
  }
  return sources;
}

// Place every known plugin into this tree's staging area IF it is absent there.
// Returns a message on the first copy failure so the tree is reported rather
// than composed from a half-written staging dir.
function seedStaging(hostRoot: string, sources: ReadonlyMap<string, string>, deps: PluginCliDeps): string | null {
  for (const [name, src] of [...sources].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    const dst = join(pluginSourceRootOf(hostRoot), name);
    if (dst === src) continue;
    if (deps.stagingEntryState(dst, src) !== "absent") continue;
    try {
      deps.copyPluginSource(src, dst);
    } catch (error) {
      return `staging seed failed for "${name}": ${String(error)}`;
    }
  }
  return null;
}

function describeTreeFailure(result: PluginCliResult): string {
  return result.kind === "failure" ? `${result.stage}: ${result.message}` : result.kind;
}

type ResolvedPluginSelection = Extract<PluginSelectionOutcome, { kind: "resolved" }>;
type ReconcileStep = {
  failure: PluginCliResult | null;
  changed: boolean;
  preservedGrantTimestamps?: ReadonlyMap<string, string>;
};

function validateSelectedSources(selection: ResolvedPluginSelection, hostRoot: string): PluginCliResult | null {
  for (const name of selection.plugins) {
    const source = join(selection.projectDir, PLUGIN_AUTHORING_DIR_NAME, name);
    if (!existsSync(source)) {
      return {
        kind: "failure",
        stage: "discover",
        message: `host ${basename(hostRoot)} plugin "${name}": source missing at plugins/${name}`,
      };
    }
  }
  return null;
}

// #3414 — is this composed plugin's SOURCE gone?
//
// Two faces can supply a plugin, and which one is canonical depends on the
// layout the project uses:
//   * AUTHORING layout — <projectDir>/plugins/ exists (this repository, and any
//     project the install verb persists into). That tree is canonical and the
//     staged bundle is only a materialized copy of it, so a plugin the tree no
//     longer carries is retired even while its stale copy is still staged.
//   * CONSUMER layout — no authoring tree at all; the staged bundle IS the
//     source, so a plugin is retired exactly when that bundle is gone.
// Neither arm ever calls a plugin retired while the layout it lives in still
// supplies it, which is what keeps this safe to run on every compose.
function pluginSourceRetired(projectDir: string, hostRoot: string, name: string): boolean {
  const authoringRoot = join(projectDir, PLUGIN_AUTHORING_DIR_NAME);
  if (existsSync(authoringRoot)) return !existsSync(join(authoringRoot, name));
  return !existsSync(join(pluginSourceRootOf(hostRoot), name));
}

function dropDeselectedCompositions(
  selection: ResolvedPluginSelection,
  hostRoot: string,
  deps: PluginCliDeps,
): ReconcileStep {
  const composed = deps.makeBackend(hostRoot).readComposition();
  let changed = false;
  for (const name of [...composed.plugins.keys()].sort()) {
    // #3414: a composition entry whose source is gone is deletion drift, not a
    // selection choice, so it is shed on EVERY project. The deselection arm
    // below stays explicit-only — without a `plugin` key the project selects
    // everything, so nothing there is deselected.
    const retired = pluginSourceRetired(selection.projectDir, hostRoot, name);
    if (!retired && (!selection.explicit || selection.plugins.includes(name))) continue;
    const dropped = handleDrop(
      { kind: "drop", name, projectRoot: hostRoot },
      deps,
      { updateSelection: false, removeManagedStaging: true },
    );
    if (dropped.kind !== "dropped") return { failure: dropped, changed };
    changed = true;
  }
  return { failure: null, changed };
}

function materializeSelectedSources(
  selection: ResolvedPluginSelection,
  hostRoot: string,
  deps: PluginCliDeps,
): void {
  for (const name of selection.plugins) {
    const source = join(selection.projectDir, PLUGIN_AUTHORING_DIR_NAME, name);
    const target = join(pluginSourceRootOf(hostRoot), name);
    if (deps.stagingEntryState(target, source) !== "identical") deps.copyPluginSource(source, target);
  }
}

function dropChangedCompositions(
  selection: ResolvedPluginSelection,
  hostRoot: string,
  deps: PluginCliDeps,
): ReconcileStep {
  if (!selection.explicit) return { failure: null, changed: false };
  const backend = deps.makeBackend(hostRoot);
  const record = backend.readComposition();
  const discovered = deps.discoverPlugins(pluginSourceRootOf(hostRoot));
  let changed = false;
  const preservedGrantTimestamps = new Map<string, string>();
  for (const plugin of discovered.filter((candidate): candidate is DiscoveredPlugin => candidate.manifest !== null)) {
    const composed = record.plugins.get(plugin.name);
    if (composed === undefined) continue;
    const sourceCurrent = digestsEqual(ownedRecordDigests(plugin), composed.ownedContentDigests);
    const hostCurrent = hostProjectionCurrent(backend, composed);
    const derivedCurrent = deps.derivedProjectionCurrent?.(hostRoot, composed) ?? true;
    if (sourceCurrent && hostCurrent && derivedCurrent) continue;
    if (sourceCurrent && composed.trustGrant !== null) {
      preservedGrantTimestamps.set(plugin.name, composed.trustGrant.grantTimestamp);
    }
    const dropped = handleDrop(
      { kind: "drop", name: plugin.name, projectRoot: hostRoot },
      deps,
      { updateSelection: false, removeManagedStaging: false, allowOwnedDrift: !hostCurrent },
    );
    if (dropped.kind !== "dropped") return { failure: dropped, changed, preservedGrantTimestamps };
    changed = true;
  }
  return { failure: null, changed, preservedGrantTimestamps };
}

function applyStalePlugins(
  stale: readonly DiscoveredPlugin[],
  hostRoot: string,
  backend: WorkspaceBackend,
  deps: PluginCliDeps,
  preservedGrantTimestamps: ReadonlyMap<string, string> = new Map(),
): PluginCliResult | number {
  let applied = 0;
  for (const plugin of stale) {
    const inspected = deps.inspectPlugin(plugin, deps.buildHostSnapshot(hostRoot, backend));
    if (inspected.kind !== "ready") {
      return {
        kind: "failure",
        stage: "plan",
        message: `plugin "${plugin.name}" rejected: ${inspected.errors.map((error) => error.message).join("; ")}`,
      };
    }
    const tx = deps.makeTx(hostRoot, backend);
    const preservedTimestamp = preservedGrantTimestamps.get(plugin.name);
    if (preservedTimestamp !== undefined) tx.now = () => preservedTimestamp;
    const result = deps.applyPluginPlan(inspected.plan, tx);
    if (result.kind !== "committed") {
      return { kind: "failure", stage: "apply", message: `plugin "${plugin.name}" apply ${result.kind}` };
    }
    deps.recordDrops(hostRoot, plugin.name, []);
    applied += 1;
  }
  return applied;
}

function finishCompose(hostRoot: string, applied: number, deps: PluginCliDeps): PluginCliResult {
  if (!deps.recompile(hostRoot)) return { kind: "failure", stage: "apply", message: "recompile failed after compose" };
  if (!deps.generateRunners(hostRoot)) {
    return { kind: "failure", stage: "apply", message: "stage-runner generation failed after compose" };
  }
  const resync = deps.resyncIntentStates?.(hostRoot) ?? { kind: "ran" as const, outcomes: [] };
  const outcomes = resync.kind === "ran" ? resync.outcomes : [];
  return {
    kind: "composed",
    applied,
    recompiled: true,
    resynced: outcomes.filter((outcome) => outcome.status === "resynced").map((outcome) => outcome.intent),
    resyncFailed: outcomes
      .filter((outcome) => outcome.status === "section-unrecognized")
      .map((outcome) => `${outcome.space}/${outcome.intent}`),
    resyncSkipped: resync.kind === "invalid-graph" ? { path: resync.path, reason: resync.reason } : null,
  };
}

function handleCompose(
  cmd: Extract<PluginCliCommand, { kind: "compose" }>,
  deps: PluginCliDeps,
  desiredOverride?: readonly string[],
): PluginCliResult {
  if (cmd.allHarnesses) return handleComposeAll(cmd, deps);
  const hostRoot = resolveProjectRoot(cmd);
  const resolvedSelection = resolvePluginSelection(hostRoot);
  const selection =
    desiredOverride === undefined || resolvedSelection.kind === "invalid"
      ? resolvedSelection
      : { ...resolvedSelection, plugins: [...new Set(desiredOverride)].sort(), explicit: true };
  if (selection.kind === "invalid") return { kind: "failure", stage: "discover", message: selection.message };
  const invalidSource = validateSelectedSources(selection, hostRoot);
  if (invalidSource !== null) return invalidSource;
  const deselected = dropDeselectedCompositions(selection, hostRoot, deps);
  if (deselected.failure !== null) return deselected.failure;
  materializeSelectedSources(selection, hostRoot, deps);
  const changed = dropChangedCompositions(selection, hostRoot, deps);
  if (changed.failure !== null) return changed.failure;
  const reconciled = deselected.changed || changed.changed;
  if (cmd.ifStale && !reconciled && isRecordCurrent(hostRoot, deps, selection)) {
    return { kind: "noop", reason: "record-current" };
  }
  const backend = deps.makeBackend(hostRoot);
  const discovered = deps.discoverPlugins(pluginSourceRootOf(hostRoot))
    .filter((plugin) => !selection.explicit || selection.plugins.includes(plugin.name));
  const record = backend.readComposition();
  const stale = discovered
    .filter((d): d is DiscoveredPlugin => d.manifest !== null)
    .filter((d) => {
      const recorded = record.plugins.get(d.name);
      return isStale(d, record) || recorded === undefined ||
        !hostProjectionCurrent(backend, recorded) ||
        !(deps.derivedProjectionCurrent?.(hostRoot, recorded) ?? true);
    });
  const applied = applyStalePlugins(stale, hostRoot, backend, deps, changed.preservedGrantTimestamps);
  return typeof applied === "number" ? finishCompose(hostRoot, applied, deps) : applied;
}

// `install <path>`: stage the source folder under PLUGIN_SOURCE_DIR_NAME, then
// delegate to the SAME compose path the manual instruction runs (trust layers and
// the two-stage recompile included — this verb re-implements none of it). A
// compose failure is returned unchanged so the stage that failed stays visible.
type InstallContext = {
  kind: "ready";
  hostRoot: string;
  src: string;
  name: string;
  selected: ResolvedPluginSelection;
  projectSource: string;
  persistentInstall: boolean;
  state: "absent" | "identical" | "different";
};

function prepareInstall(
  cmd: Extract<PluginCliCommand, { kind: "install" }>,
  deps: PluginCliDeps,
): InstallContext | PluginCliResult {
  const hostRoot = resolveProjectRoot(cmd);
  const src = isAbsolute(cmd.sourcePath) ? cmd.sourcePath : resolve(process.cwd(), cmd.sourcePath);
  if (!existsSync(src) || !statSync(src).isDirectory()) {
    return { kind: "failure", stage: "install", message: `source is not a directory: ${cmd.sourcePath}` };
  }
  const name = basename(src);
  if (!isSafePluginDirName(name)) {
    return { kind: "failure", stage: "install", message: `cannot derive a plugin name from: ${cmd.sourcePath}` };
  }
  const selected = resolvePluginSelection(hostRoot);
  if (selected.kind === "invalid") return { kind: "failure", stage: "install", message: selected.message };
  const projectSource = join(selected.projectDir, PLUGIN_AUTHORING_DIR_NAME, name);
  const persistentInstall = selected.projectDir !== hostRoot;
  const comparisonTarget = persistentInstall ? projectSource : join(pluginSourceRootOf(hostRoot), name);
  const state = deps.stagingEntryState(comparisonTarget, src);
  if (state === "different" && !cmd.force) {
    return {
      kind: "failure",
      stage: "install",
      message: `a different plugin named "${name}" is already supplied. Re-run with --force to replace it, or drop it first.`,
    };
  }
  return { kind: "ready", hostRoot, src, name, selected, projectSource, persistentInstall, state };
}

function commitInstallOutcome(
  context: InstallContext,
  composed: PluginCliResult,
  snapshot: PluginInstallSnapshot | null,
  deps: PluginCliDeps,
): PluginCliResult {
  if (composed.kind === "composed" && (composed.resyncFailed.length > 0 || composed.resyncSkipped !== null)) {
    snapshot?.rollback();
    return composed;
  }
  if (composed.kind !== "composed" && composed.kind !== "noop") {
    snapshot?.rollback();
    return composed;
  }
  if (context.persistentInstall) {
    (deps.writeProjectPlugins ?? writeProjectPlugins)(context.selected.projectDir, [
      ...context.selected.plugins,
      context.name,
    ]);
  }
  return { kind: "installed", name: context.name, composeOutcome: composed.kind === "composed" ? "composed" : "noop" };
}

function handleInstall(cmd: Extract<PluginCliCommand, { kind: "install" }>, deps: PluginCliDeps): PluginCliResult {
  const context = prepareInstall(cmd, deps);
  if (context.kind !== "ready") return context;
  const { hostRoot, src, name, selected, projectSource, persistentInstall, state } = context;
  const snapshot = createPluginInstallSnapshot(selected.projectDir, hostRoot, name);
  try {
    if (persistentInstall && state !== "identical") deps.copyPluginSource(src, projectSource);
    const stagingSource = persistentInstall ? projectSource : src;
    const dst = join(pluginSourceRootOf(hostRoot), name);
    if (deps.stagingEntryState(dst, stagingSource) !== "identical") deps.copyPluginSource(stagingSource, dst);
    const desired = persistentInstall ? [...selected.plugins, name] : undefined;
    const composed = handleCompose(
      { kind: "compose", ifStale: true, allHarnesses: false, projectRoot: cmd.projectRoot },
      deps,
      desired,
    );
    // A compose whose state re-sync failed loudly (#1963) or was skipped over an
    // invalid host graph (#1993) must stay loud: commitInstallOutcome returns it
    // unchanged after restoring every persistent surface.
    return commitInstallOutcome(context, composed, snapshot, deps);
  } catch (error) {
    snapshot?.rollback();
    return { kind: "failure", stage: "install", message: String(error) };
  } finally {
    snapshot?.dispose();
  }
}

function removeManagedPluginStaging(
  selected: ResolvedPluginSelection,
  hostRoot: string,
  name: string,
  deps: PluginCliDeps,
): void {
  const staged = join(pluginSourceRootOf(hostRoot), name);
  if (!existsSync(staged)) return;
  // #3414: cleanup used to require the authoring source to still exist, so the
  // moment a plugin was retired the staged copy became permanently unreachable
  // — and a staged manifest is a face resolvePluginManifest reads, so the
  // retired plugin kept supplying advisories out of it. Retirement is now the
  // trigger it always should have been: the copy has no upstream left to be
  // compared against, and nothing to belong to.
  if (pluginSourceRetired(selected.projectDir, hostRoot, name)) {
    rmSync(staged, { recursive: true, force: true });
    return;
  }
  const supplied = join(selected.projectDir, PLUGIN_AUTHORING_DIR_NAME, name);
  if (!existsSync(supplied)) return;
  if (deps.stagingEntryState(staged, supplied) !== "identical") return;
  rmSync(staged, { recursive: true, force: true });
}

function persistDropSelection(
  selected: ResolvedPluginSelection,
  name: string,
  updateSelection: boolean,
  deps: PluginCliDeps,
): string | null {
  if (!updateSelection || !selected.explicit) return null;
  try {
    (deps.writeProjectPlugins ?? writeProjectPlugins)(
      selected.projectDir,
      selected.plugins.filter((plugin) => plugin !== name),
    );
    return null;
  } catch (error) {
    return `config update failed after drop: ${String(error)}`;
  }
}

function handleDrop(
  cmd: Extract<PluginCliCommand, { kind: "drop" }>,
  deps: PluginCliDeps,
  options: { updateSelection: boolean; removeManagedStaging: boolean; allowOwnedDrift?: boolean } = {
    updateSelection: true,
    removeManagedStaging: true,
  },
): PluginCliResult {
  const hostRoot = resolveProjectRoot(cmd);
  const selected = resolvePluginSelection(hostRoot);
  if (selected.kind === "invalid") return { kind: "failure", stage: "plan", message: selected.message };
  const snapshot = options.updateSelection
    ? createPluginInstallSnapshot(selected.projectDir, hostRoot, cmd.name)
    : null;
  const fail = (result: PluginCliResult): PluginCliResult => {
    snapshot?.rollback();
    snapshot?.dispose();
    return result;
  };
  const backend = deps.makeBackend(hostRoot);
  const host = deps.buildHostSnapshot(hostRoot, backend);
  const record = host.composition.plugins.get(cmd.name);
  if (record === undefined) {
    return fail({ kind: "failure", stage: "plan", message: `plugin "${cmd.name}" is not composed` });
  }
  const plan = deps.planPluginDrop(record, host, { allowOwnedDrift: options.allowOwnedDrift });
  if (plan.rejections.length > 0) {
    return fail({ kind: "failure", stage: "plan", message: `drop rejected: ${plan.rejections.map((e) => e.message).join("; ")}` });
  }
  const result = deps.applyPluginDrop(plan, deps.makeTx(hostRoot, backend));
  if (result.kind !== "committed") {
    return fail({ kind: "failure", stage: "apply", message: `drop ${result.kind}` });
  }
  // Remove the plugin's DropsRecord entry (symmetric with the compose-time write).
  deps.clearDrops(hostRoot, cmd.name);
  if (!deps.recompile(hostRoot)) {
    return fail({ kind: "failure", stage: "apply", message: "recompile failed after drop" });
  }
  // Symmetric with compose (BR-U3-3): the same regeneration that ADDS the plugin
  // stage's runner PRUNES it once the graph no longer carries the slug.
  if (!deps.generateRunners(hostRoot)) {
    return fail({ kind: "failure", stage: "apply", message: "stage-runner generation failed after drop" });
  }
  const baselineRestored = backend.readComposition().plugins.size === 0 && pluginArtifactsAbsent(hostRoot, record);
  if (options.removeManagedStaging) removeManagedPluginStaging(selected, hostRoot, cmd.name, deps);
  const configError = persistDropSelection(selected, cmd.name, options.updateSelection, deps);
  if (configError !== null) return fail({ kind: "failure", stage: "apply", message: configError });
  snapshot?.dispose();
  return { kind: "dropped", plugin: cmd.name, baselineRestored, recompiled: true };
}

// FS-measured restore (#1586): the record no longer carries the plugin AND the
// filesystem agrees — every owned path is gone and none of the directories that
// carried them survives as an empty shell. A directory that still holds content
// is NOT a restore failure (it carries something the plugin does not own), and
// the .amadeus-plugin-drops.json audit file is deliberately out of scope: it is
// engine dot-state, not host surface, and its survival never denies restore.
function pluginArtifactsAbsent(hostRoot: string, record: PluginRecord): boolean {
  for (const p of record.ownedPaths) {
    const abs = join(hostRoot, p);
    if (existsSync(abs)) return false;
    if (hasEmptyAncestorDir(hostRoot, abs)) return false;
  }
  return true;
}

// True when any directory between `abs` and the host root still exists and is
// empty — the observable residue of the mkdir⇔rm asymmetry.
function hasEmptyAncestorDir(hostRoot: string, abs: string): boolean {
  const stopAt = `${hostRoot}${sep}`;
  let dir = dirname(abs);
  while (dir !== hostRoot && dir.startsWith(stopAt)) {
    if (existsSync(dir) && readdirSync(dir).length === 0) return true;
    dir = dirname(dir);
  }
  return false;
}

// The standalone `doctor` verb projects the SAME observation the integrated
// `/amadeus --doctor` reads and hands it to the SAME pure projection + renderer
// (buildDoctorPluginSection → doctorPluginRows). One vocabulary, one 0-plugin
// degrade: a pristine host reports "Plugins: 0 installed" here too (#1585).
function handleDoctor(cmd: Extract<PluginCliCommand, { kind: "doctor" }>, deps: PluginCliDeps): PluginCliResult {
  const hostRoot = resolveProjectRoot(cmd);
  const backend = deps.makeBackend(hostRoot);
  const host = deps.buildHostSnapshot(hostRoot, backend);
  const journalPending = backend.readJournal() !== undefined;
  const engineSection = buildDoctorPluginSection({
    diagnostics: deps.diagnosePlugins(host, journalPending),
    drops: readDropsRecord(hostRoot),
    revision: backend.auditCount(),
  });
  const selected = resolvePluginSelection(hostRoot);
  if (selected.kind === "invalid") {
    const section: DoctorPluginSection = {
      ...engineSection,
      lines: [
        ...engineSection.lines,
        { plugin: basename(hostRoot), state: "unknown", detail: `configuration invalid: ${selected.message}` },
      ],
    };
    return { kind: "doctor", section, degraded: true };
  }
  const selectionLines = !selected.explicit
    ? []
    : selectionDoctorLines(selected.projectDir, hostRoot, selected.plugins, deps, backend.readComposition());
  const normalized = new Set(selectionLines.map((line) => line.plugin));
  const section: DoctorPluginSection = {
    ...engineSection,
    lines: [...selectionLines, ...engineSection.lines.filter((line) => !normalized.has(line.plugin))],
  };
  const degraded = section.lines.some((l) => isFailingPluginState(l.state));
  return { kind: "doctor", section, degraded };
}

function selectionDoctorLines(
  projectDir: string,
  hostRoot: string,
  selected: readonly string[],
  deps: PluginCliDeps,
  composition: CompositionRecord,
): DoctorLine[] {
  const host = basename(hostRoot);
  const discovered = deps.discoverPlugins(pluginSourceRootOf(hostRoot));
  const valid = new Map(
    discovered.filter((plugin): plugin is DiscoveredPlugin => plugin.manifest !== null).map((plugin) => [plugin.name, plugin]),
  );
  const staged = new Set(deps.listPluginSourceDirs(pluginSourceRootOf(hostRoot)));
  const composed = new Set(composition.plugins.keys());
  const stale = new Set<string>();
  const failed = new Set<string>();
  const pending = deps.makeBackend(hostRoot).readJournal();
  if (pending !== undefined) failed.add(pending.writeSet.audit.plugin);
  for (const plugin of selected) {
    const source = join(projectDir, PLUGIN_AUTHORING_DIR_NAME, plugin);
    const staging = join(pluginSourceRootOf(hostRoot), plugin);
    const descriptor = valid.get(plugin);
    const record = composition.plugins.get(plugin);
    if (existsSync(source) && existsSync(staging) && deps.stagingEntryState(staging, source) !== "identical") {
      stale.add(plugin);
    } else if (descriptor !== undefined && record !== undefined
      && !digestsEqual(ownedRecordDigests(descriptor), record.ownedContentDigests)) {
      stale.add(plugin);
    } else if (staged.has(plugin) && descriptor === undefined) {
      failed.add(plugin);
    }
  }
  return observePluginSelection(projectDir, hostRoot, selected, staged, composed, stale, failed)
    .map((selection) => pluginSelectionDoctorLine(selection, host));
}

export function pluginSelectionDoctorLine(selection: PluginSelection, host: string): DoctorLine {
  switch (selection.code) {
    case "not-selected":
      return { plugin: selection.plugin, state: "advisory", detail: `${host} not-selected` };
    case "source-missing":
      return { plugin: selection.plugin, state: "degraded", detail: `${host} source-missing: plugins/${selection.plugin}` };
    case "not-installed":
      return { plugin: selection.plugin, state: "degraded", detail: `${host} not-installed: staging or composition missing` };
    case "stale":
      return { plugin: selection.plugin, state: "drift", detail: `${host} stale: staging or composition differs from source` };
    case "current":
      return { plugin: selection.plugin, state: "ok", detail: `${host} current` };
    case "failed":
      return { plugin: selection.plugin, state: "degraded", detail: `${host} failed: recovery or manifest error` };
  }
}

function handleStatus(cmd: Extract<PluginCliCommand, { kind: "status" }>, deps: PluginCliDeps): PluginCliResult {
  const hostRoot = resolveProjectRoot(cmd);
  const backend = deps.makeBackend(hostRoot);
  const record = backend.readComposition();
  const installed = deps.discoverPlugins(pluginSourceRootOf(hostRoot)).filter((d) => d.manifest !== null).length;
  return { kind: "status", installed, composed: record.plugins.size, revision: backend.auditCount() };
}

// ---------------------------------------------------------------------------
// U5 doctor-observability — the plugin section of `/amadeus --doctor`.
//
// A read-only PROJECTION of three existing engine reads (business-logic-model.md
// branch table is the authoritative source — BR-U5-8): diagnosePlugins' return
// value, the composition record's revision, and the DropsRecord. The doctor makes
// NO new judgment and NO new scan (BR-U5-1): every line is a mechanical mapping,
// and any state value outside the mapping is surfaced loudly as an `unknown` line
// that fails the check (fail-closed — never a silent read-past, BR-U5-8).
//
// Design-signature reconciliation (declared): functional-design names the pure
// projection `buildDoctorPluginSection(diag, record, judgment)`. The authoritative
// 8-row branch table also requires the DropsRecord (the SOLE source of the
// degraded/advisory states — domain-entities.md) and the record's revision (the
// `composed@<rev>` line). Those two inputs cannot be realized from `record` alone,
// so the observation bundles diagnostics, drops, and revision. Bundling keeps
// the function a pure port-free projection (performance-design's structural
// acceptance — it reads nothing beyond its argument).
// ---------------------------------------------------------------------------

// Read-only observation of the host's plugin state (the projection input). No
// Buffers / composition ledger — only the fields the branch table maps.
export type DoctorPluginObservation = {
  readonly diagnostics: readonly PluginDiagnostic[];
  readonly drops: DropsRecord;
  readonly revision: number;
};

// The projected --doctor plugin section. `installed` is the discovered-plugin
// count (diagnosePlugins-derived — no invented count); `lines` is one DoctorLine
// per plugin diagnostic plus one per DropsRecord entry; `activation` is the U6
// display line (null when absent). The exit contribution is carried per row (a
// failing DoctorLine state → a pass:false row that feeds the existing doctor
// failed-count aggregate), so no separate exitContribution field is stored — an
// unconsumed field would be documentation-fiction (construction.md).
export type DoctorPluginSection = {
  readonly installed: number;
  readonly lines: readonly DoctorLine[];
  readonly activation: string | null;
};

// A rendered doctor row (structurally the {pass,label} prefix of DoctorCheck).
export type DoctorPluginRow = { readonly pass: boolean; readonly label: string };

// The engine's real diagnostic statuses and drop severities. Membership is checked
// at RUNTIME, not by the compile-time union: dropsFromJson casts on-disk JSON
// without validating `severity`, and a future engine could add a status — either
// path can carry a value outside the union, which must map to `unknown` (fail-
// closed) rather than be trusted or silently dropped.
const KNOWN_DIAG_STATUSES: ReadonlySet<string> = new Set(["composed", "drift", "recovery-pending"]);
const KNOWN_DROP_SEVERITIES: ReadonlySet<string> = new Set(["degraded", "advisory"]);

// A DoctorLine state fails the doctor check when it signals an unresolved or
// unrecognized condition. drift and advisory are visible-but-passing; ok passes.
function isFailingPluginState(state: DoctorLineState): boolean {
  return state === "degraded" || state === "recovery-pending" || state === "unknown";
}

function diagnosticToDoctorLine(d: PluginDiagnostic, revision: number): DoctorLine {
  if (!KNOWN_DIAG_STATUSES.has(d.status)) {
    return { plugin: d.plugin, state: "unknown", detail: `status ${d.status}` };
  }
  if (d.status === "composed") return { plugin: d.plugin, state: "ok", detail: `composed@${revision}` };
  if (d.status === "recovery-pending") {
    return { plugin: d.plugin, state: "recovery-pending", detail: "run compose to recover" };
  }
  return { plugin: d.plugin, state: "drift", detail: d.observations.join("; ") };
}

function dropEntryToDoctorLine(plugin: string, entry: DropEntry): DoctorLine {
  if (!KNOWN_DROP_SEVERITIES.has(entry.severity)) {
    return { plugin, state: "unknown", detail: `severity ${entry.severity}: ${entry.surface}` };
  }
  return { plugin, state: entry.severity, detail: entry.surface };
}

// Pure projection: observation → doctor plugin section (business-logic-model
// branch table). Reads nothing beyond its argument; the frozen observation is
// never mutated (drop entries are copied into a fresh sorted array).
export function buildDoctorPluginSection(obs: DoctorPluginObservation): DoctorPluginSection {
  const lines: DoctorLine[] = [];
  for (const d of obs.diagnostics) lines.push(diagnosticToDoctorLine(d, obs.revision));
  const dropPlugins = [...obs.drops.plugins.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [plugin, entries] of dropPlugins) {
    for (const entry of entries) lines.push(dropEntryToDoctorLine(plugin, entry));
  }
  return { installed: obs.diagnostics.length, lines, activation: null };
}

// The display string for one plugin DoctorLine (branch table display forms).
// Exhaustive over DoctorLineState — the compiler proves every state is rendered.
export function formatDoctorPluginLine(line: DoctorLine): string {
  switch (line.state) {
    case "ok":
      return `Plugin ${line.plugin}: ${line.detail} [ok]`;
    case "drift":
      return `Plugin ${line.plugin}: [drift: ${line.detail}]`;
    case "recovery-pending":
      return `Plugin ${line.plugin}: [recovery-pending: ${line.detail}]`;
    case "degraded":
      return `Plugin ${line.plugin}: [degraded: ${line.detail}]`;
    case "advisory":
      return `Plugin ${line.plugin}: [advisory: ${line.detail}]`;
    case "unknown":
      return `Plugin ${line.plugin}: [unknown: ${line.detail}]`;
  }
}

// Pure render: section → doctor rows for the --doctor report. A 0-plugin host
// (no diagnostics and no drops) degrades to a single passing line (BR-U5-4), so
// the plugin section adds exactly one row and never flips a healthy exit.
export function doctorPluginRows(section: DoctorPluginSection): readonly DoctorPluginRow[] {
  if (section.lines.length === 0) {
    return [{ pass: true, label: "Plugins: 0 installed" }];
  }
  const rows: DoctorPluginRow[] = section.lines.map((line) => ({
    pass: !isFailingPluginState(line.state),
    label: formatDoctorPluginLine(line),
  }));
  if (section.activation !== null) {
    rows.push({ pass: true, label: `Plugins (activation) ${section.activation}` });
  }
  return rows;
}

// Read the plugin observation for a host root (read-only). The composition,
// journal, and drops reads are all existsSync-guarded (createNodeBackend /
// readDropsRecord), so a pristine project creates nothing. The full host walk
// (buildHostSnapshot) is skipped unless a plugin is composed or a recovery
// journal exists — the 0-plugin common case pays only three existsSync probes
// (BR-U5-4 / performance-design).
export function readDoctorPluginObservation(hostRoot: string): DoctorPluginObservation {
  const backend = createNodeBackend(hostRoot);
  const record = backend.readComposition();
  const journalPending = backend.readJournal() !== undefined;
  const revision = backend.auditCount();
  const drops = readDropsRecord(hostRoot);
  const diagnostics = record.plugins.size > 0 || journalPending
    ? diagnosePlugins(buildHostSnapshot(hostRoot, backend), journalPending)
    : [];
  return { diagnostics, drops, revision };
}

// ---------------------------------------------------------------------------
// Entry: parse → dispatch → render → exit code. `deps` is injected for tests.
// ---------------------------------------------------------------------------
export function runPluginCli(argv: readonly string[], deps: PluginCliDeps = defaultPluginCliDeps()): PluginCliResult {
  const parsed = parsePluginCliArgs(argv);
  if (!parsed.ok) return { kind: "usage-error", message: parsed.error.message };
  const cmd = parsed.command;
  if (cmd.kind === "compose") return handleCompose(cmd, deps);
  if (cmd.kind === "drop") return handleDrop(cmd, deps);
  if (cmd.kind === "install") return handleInstall(cmd, deps);
  if (cmd.kind === "doctor") return handleDoctor(cmd, deps);
  return handleStatus(cmd, deps);
}

// The exit code + stdout/stderr rendering for one result.
export function renderPluginCliResult(result: PluginCliResult, deps: PluginCliDeps): number {
  switch (result.kind) {
    case "composed":
      deps.out(
        `composed ${result.applied} plugin(s), recompiled` +
          (result.resynced.length > 0 ? `, re-synced ${result.resynced.join(", ")}` : ""),
      );
      for (const failed of result.resyncFailed) {
        deps.err(
          `amadeus-plugin: state re-sync FAILED for ${failed}: Stage Progress section not recognized — no rows inserted, state file left untouched (#1963)`,
        );
      }
      if (result.resyncSkipped !== null) {
        deps.err(
          `amadeus-plugin: ${result.resyncSkipped.path} is invalid (${result.resyncSkipped.reason}); state re-sync skipped — recompile the host graph and re-run compose`,
        );
      }
      return result.resyncFailed.length > 0 || result.resyncSkipped !== null ? 1 : 0;
    case "composed-all": {
      deps.out(`compose --all-harnesses: ${result.succeeded}/${result.total} harness tree(s) up to date`);
      for (const failure of result.failures) deps.err(`amadeus-plugin: ${failure.hostRoot}: ${failure.message}`);
      return result.failures.length > 0 ? 1 : 0;
    }
    case "noop":
      deps.out("compose: record already current (no-op)");
      return 0;
    case "dropped":
      deps.out(`dropped ${result.plugin}${result.baselineRestored ? " (baseline restored)" : ""}, recompiled`);
      return 0;
    case "doctor":
      for (const row of doctorPluginRows(result.section)) deps.out(`  - ${row.label}`);
      return result.degraded ? 1 : 0;
    case "installed":
      deps.out(`installed ${result.name} into ${PLUGIN_SOURCE_DIR_NAME}/${result.name}, compose: ${result.composeOutcome}`);
      return 0;
    case "status":
      deps.out(`Plugins: ${result.installed} installed, ${result.composed} composed, revision ${result.revision}`);
      return 0;
    case "usage-error":
      deps.err(result.message);
      deps.err(USAGE);
      return 2;
    case "failure":
      deps.err(`amadeus-plugin: ${result.stage} failed: ${result.message}`);
      return 1;
  }
}

// The in-process entrypoint a test drives: parse → run → render, returning the
// exit code. Kept separate from import.meta.main so coverage sees every branch.
export function handlePluginCli(argv: readonly string[], deps: PluginCliDeps = defaultPluginCliDeps()): number {
  return renderPluginCliResult(runPluginCli(argv, deps), deps);
}

if (import.meta.main) process.exit(handlePluginCli(process.argv.slice(2)));
