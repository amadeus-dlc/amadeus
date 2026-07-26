// packages/framework/core/tools/amadeus-plugin.ts — C1 Plugin CLI (U2).
//
// The harness-neutral CLI over the composition engine (amadeus-plugin-compose.ts,
// C2). Ships to every harness via coreDirs projection so each
// <harnessDir>/tools/amadeus-plugin.ts drives the same engine (BR-U2-1 single
// implementation — this file re-implements NO composition logic).
//
// Verbs (C1): compose [--if-stale] [--project-root <dir>], doctor, drop <name>,
// status. Unknown verb / unknown flag / surplus argument fail closed BEFORE any
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
// HOST MODEL. The engine's shared-file surface for stage seams is the
// serializeStageSeams byte form (amadeus-plugin-compose.ts: "the real frontmatter
// serializer is U11+"). buildHostSnapshot reads that native form from disk; a
// full-frontmatter-stage host is out of the mechanism's current scope.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
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
  recordPluginDrops,
  type HostSnapshot,
  type HostStage,
  inspectPlugin,
  ownedStageDigests,
  planPluginDrop,
  type PluginDescriptor,
  type PluginManifest,
  type PluginDiagnostic,
  SEAM_NAMES,
  type SeamName,
  type StageSeams,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "./amadeus-plugin-compose.ts";

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
  | { kind: "compose"; ifStale: boolean; projectRoot?: string }
  | { kind: "doctor"; projectRoot?: string }
  | { kind: "drop"; name: string; projectRoot?: string }
  | { kind: "status"; projectRoot?: string };

export type CliParseError = { message: string };
export type CliParseResult = { ok: true; command: PluginCliCommand } | { ok: false; error: CliParseError };

// ---------------------------------------------------------------------------
// Result surface (domain-entities.md). Returned by handlePluginCli for tests to
// assert on; the process-boundary maps each to an exit code + stdout/stderr.
// ---------------------------------------------------------------------------
export type DoctorLineState = "ok" | "drift" | "degraded" | "advisory" | "recovery-pending" | "unknown";
export type DoctorLine = { plugin: string; state: DoctorLineState; detail: string };

export type PluginCliResult =
  | { kind: "composed"; applied: number; recompiled: true }
  | { kind: "noop"; reason: "record-current" }
  | { kind: "dropped"; plugin: string; baselineRestored: boolean; recompiled: true }
  | { kind: "doctor"; lines: readonly DoctorLine[]; degraded: boolean }
  | { kind: "status"; installed: number; composed: number; revision: number }
  | { kind: "usage-error"; message: string }
  | { kind: "failure"; stage: "discover" | "trust" | "plan" | "apply" | "recover"; message: string };

// ---------------------------------------------------------------------------
// Argument parsing (fail-closed). Every verb enumerates its allowed flags and
// argument count; anything else is a usage error, never a silent read-past.
// ---------------------------------------------------------------------------
const USAGE = [
  "usage: amadeus-plugin.ts <verb> [flags]",
  "  compose [--if-stale] [--project-root <dir>]",
  "  doctor  [--project-root <dir>]",
  "  drop <plugin-name> [--project-root <dir>]",
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
  const leftover: string[] = [];
  for (const a of pr.rest) {
    if (a === "--if-stale") ifStale = true;
    else leftover.push(a);
  }
  if (leftover.length > 0) return { ok: false, error: { message: `compose: unexpected argument(s): ${leftover.join(" ")}` } };
  return { ok: true, command: { kind: "compose", ifStale, projectRoot: pr.projectRoot } };
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
  recordDrops: (hostRoot: string, plugin: string, entries: readonly DropEntry[]) => void;
  clearDrops: (hostRoot: string, plugin: string) => void;
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
      const stage = parseHostStageSeams(rel, bytes);
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

function spawnRecompile(projectRoot: string): boolean {
  const runtime = join(THIS_DIR, "amadeus-runtime.ts");
  const res = spawnSync("bun", [runtime, "compile"], { cwd: projectRoot, stdio: "ignore", env: process.env });
  return res.status === 0;
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
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    out: (l) => console.log(l),
    err: (l) => console.error(l),
  };
}

function resolveProjectRoot(cmd: PluginCliCommand): string {
  const raw = cmd.projectRoot ?? process.cwd();
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
}

// The install/discovery staging root: where a user drops a plugin bundle's
// `<name>/` content before composing. A `.amadeus-plugin-` dot-dir so it stays
// out of the composed `plugins/` area and out of the host snapshot (the engine
// keeps discovery and host separate — t254). Composed owned stages land under
// `<host>/plugins/<name>/`, which IS compile-visible.
function pluginSourceRootOf(hostRoot: string): string {
  return join(hostRoot, ".amadeus-plugin-src");
}

// Is the composition record already current for every installed plugin? Reads
// the record + discovers plugins and compares owned-stage digests. Reaches NO
// mutation stage (inspect/plan/apply/recompile) — the no-op fast path predicate.
export function isRecordCurrent(hostRoot: string, deps: PluginCliDeps): boolean {
  const backend = deps.makeBackend(hostRoot);
  const record = backend.readComposition();
  const discovered = deps.discoverPlugins(pluginSourceRootOf(hostRoot));
  const valid = discovered.filter((d): d is DiscoveredPlugin => d.manifest !== null);
  if (valid.length !== record.plugins.size) return false;
  for (const plugin of valid) {
    const recorded = record.plugins.get(plugin.name);
    if (recorded === undefined) return false;
    if (!digestsEqual(ownedStageDigests(plugin), recorded.ownedContentDigests)) return false;
  }
  return true;
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
  return !digestsEqual(ownedStageDigests(plugin), recorded.ownedContentDigests);
}

// ---------------------------------------------------------------------------
// Verb handlers
// ---------------------------------------------------------------------------
function handleCompose(cmd: Extract<PluginCliCommand, { kind: "compose" }>, deps: PluginCliDeps): PluginCliResult {
  const hostRoot = resolveProjectRoot(cmd);
  if (cmd.ifStale && isRecordCurrent(hostRoot, deps)) {
    return { kind: "noop", reason: "record-current" };
  }
  const backend = deps.makeBackend(hostRoot);
  const discovered = deps.discoverPlugins(pluginSourceRootOf(hostRoot));
  const record = backend.readComposition();
  const stale = discovered
    .filter((d): d is DiscoveredPlugin => d.manifest !== null)
    .filter((d) => isStale(d, record));
  let applied = 0;
  for (const plugin of stale) {
    const host = deps.buildHostSnapshot(hostRoot, backend);
    const inspected = deps.inspectPlugin(plugin, host);
    if (inspected.kind !== "ready") {
      return { kind: "failure", stage: "plan", message: `plugin "${plugin.name}" rejected: ${inspected.errors.map((e) => e.message).join("; ")}` };
    }
    const result = deps.applyPluginPlan(inspected.plan, deps.makeTx(hostRoot, backend));
    if (result.kind !== "committed") {
      return { kind: "failure", stage: "apply", message: `plugin "${plugin.name}" apply ${result.kind}` };
    }
    // Write the plugin's DropsRecord entry (U2 skeleton: empty — the engine has
    // no drop-with-log path yet, BR-U2-11). Plugin-separated.
    deps.recordDrops(hostRoot, plugin.name, []);
    applied += 1;
  }
  if (!deps.recompile(hostRoot)) {
    return { kind: "failure", stage: "apply", message: "recompile failed after compose" };
  }
  return { kind: "composed", applied, recompiled: true };
}

function handleDrop(cmd: Extract<PluginCliCommand, { kind: "drop" }>, deps: PluginCliDeps): PluginCliResult {
  const hostRoot = resolveProjectRoot(cmd);
  const backend = deps.makeBackend(hostRoot);
  const host = deps.buildHostSnapshot(hostRoot, backend);
  const record = host.composition.plugins.get(cmd.name);
  if (record === undefined) {
    return { kind: "failure", stage: "plan", message: `plugin "${cmd.name}" is not composed` };
  }
  const plan = deps.planPluginDrop(record, host);
  if (plan.rejections.length > 0) {
    return { kind: "failure", stage: "plan", message: `drop rejected: ${plan.rejections.map((e) => e.message).join("; ")}` };
  }
  const result = deps.applyPluginDrop(plan, deps.makeTx(hostRoot, backend));
  if (result.kind !== "committed") {
    return { kind: "failure", stage: "apply", message: `drop ${result.kind}` };
  }
  // Remove the plugin's DropsRecord entry (symmetric with the compose-time write).
  deps.clearDrops(hostRoot, cmd.name);
  if (!deps.recompile(hostRoot)) {
    return { kind: "failure", stage: "apply", message: "recompile failed after drop" };
  }
  const baselineRestored = backend.readComposition().plugins.size === 0;
  return { kind: "dropped", plugin: cmd.name, baselineRestored, recompiled: true };
}

function diagStateOf(status: PluginDiagnostic["status"]): DoctorLineState {
  if (status === "composed") return "ok";
  if (status === "drift") return "drift";
  if (status === "recovery-pending") return "recovery-pending";
  return "unknown";
}

function handleDoctor(cmd: Extract<PluginCliCommand, { kind: "doctor" }>, deps: PluginCliDeps): PluginCliResult {
  const hostRoot = resolveProjectRoot(cmd);
  const backend = deps.makeBackend(hostRoot);
  const host = deps.buildHostSnapshot(hostRoot, backend);
  const journalPending = backend.readJournal() !== undefined;
  const lines = deps.diagnosePlugins(host, journalPending).map((d): DoctorLine => ({
    plugin: d.plugin,
    state: diagStateOf(d.status),
    detail: d.observations.join("; "),
  }));
  const degraded = lines.some((l) => l.state === "degraded" || l.state === "recovery-pending" || l.state === "unknown");
  return { kind: "doctor", lines, degraded };
}

function handleStatus(cmd: Extract<PluginCliCommand, { kind: "status" }>, deps: PluginCliDeps): PluginCliResult {
  const hostRoot = resolveProjectRoot(cmd);
  const backend = deps.makeBackend(hostRoot);
  const record = backend.readComposition();
  const installed = deps.discoverPlugins(pluginSourceRootOf(hostRoot)).filter((d) => d.manifest !== null).length;
  return { kind: "status", installed, composed: record.plugins.size, revision: backend.auditCount() };
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
  if (cmd.kind === "doctor") return handleDoctor(cmd, deps);
  return handleStatus(cmd, deps);
}

// The exit code + stdout/stderr rendering for one result.
export function renderPluginCliResult(result: PluginCliResult, deps: PluginCliDeps): number {
  switch (result.kind) {
    case "composed":
      deps.out(`composed ${result.applied} plugin(s), recompiled`);
      return 0;
    case "noop":
      deps.out("compose: record already current (no-op)");
      return 0;
    case "dropped":
      deps.out(`dropped ${result.plugin}${result.baselineRestored ? " (baseline restored)" : ""}, recompiled`);
      return 0;
    case "doctor":
      for (const l of result.lines) deps.out(`  - ${l.plugin} [${l.state}]${l.detail ? `: ${l.detail}` : ""}`);
      return result.degraded ? 1 : 0;
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
