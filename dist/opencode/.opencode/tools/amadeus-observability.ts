// amadeus-observability.ts — the Core-facing observability seam
// (Issue #1628, Phase 2).
//
// Design contract (issue #1628 設計裁定 Q8/Q9/Q12/Q18):
//   - Core stays OTel-free. This module only APPENDS one-line JSON telemetry
//     events to a machine-local buffer under the intent record
//     (`<record>/.amadeus-otel/buffer-<clone>.jsonl`, covered by the shipped
//     `.amadeus-*` gitignore globs). The projector (Phase 3) reads the buffer
//     plus the journal and builds spans/metrics on its own schedule.
//   - Domain events are NOT written here — they already flow through
//     appendAuditEntry into the journal. This buffer carries fine-grained
//     timing only (process spans, wrapped operations, subprocess calls).
//   - Observability is strictly opt-in via the layered config.json
//     (`observability.enabled`); when disabled every API is a no-op beyond a
//     single memoized config read.
//   - Telemetry is fail-open: a buffer write failure never throws into the
//     caller; it drops the event, best-effort notes the failure in a
//     machine-local diagnostics file, and stays silent otherwise. (The
//     journal keeps its own loud fail-closed contract — untouched here.)

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  activeIntent,
  activeSpace,
  auditCloneId,
  detectHarnessType,
  recordDir,
} from "./amadeus-lib.ts";
import { readAmadeusConfigLayers } from "./amadeus-layered-config.ts";

// --- config -----------------------------------------------------------------

export type ObservabilityConfig = {
  readonly enabled: boolean;
  // OTLP endpoint for the Phase 3 projector; the standard
  // OTEL_EXPORTER_OTLP_ENDPOINT env var wins over the config value there.
  readonly otlpEndpoint?: string;
  // Local file exporter toggle for the projector (defaults to enabled when
  // observability itself is enabled).
  readonly localExport: boolean;
  // Attribute names admitted into telemetry meta beyond the built-in
  // low-cardinality set (redaction is default-deny; see filterMeta).
  readonly redactionOptIn: readonly string[];
};

const DISABLED: ObservabilityConfig = { enabled: false, localExport: false, redactionOptIn: [] };

// Sub-parsers return null for "reject the whole observability value" and a
// wrapped value otherwise, so absence and rejection stay distinguishable.
function parseOtlpEndpoint(raw: unknown): { endpoint: string | undefined } | null {
  if (raw === undefined) return { endpoint: undefined };
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const endpoint = (raw as Record<string, unknown>).endpoint;
  if (endpoint !== undefined && typeof endpoint !== "string") return null;
  return { endpoint };
}

function parseLocalExport(raw: unknown, fallback: boolean): { localExport: boolean } | null {
  if (raw === undefined) return { localExport: fallback };
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const enabled = (raw as Record<string, unknown>).enabled;
  if (enabled !== undefined && typeof enabled !== "boolean") return null;
  return { localExport: enabled ?? fallback };
}

function parseRedactionOptIn(raw: unknown): { optIn: readonly string[] } | null {
  if (raw === undefined) return { optIn: [] };
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) return null;
  return { optIn: raw as readonly string[] };
}

function parseObservabilityValue(raw: unknown): ObservabilityConfig | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.enabled !== "boolean") return null;
  const otlp = parseOtlpEndpoint(record.otlp);
  const local = parseLocalExport(record.local, record.enabled);
  const optIn = parseRedactionOptIn(record.redactionOptIn);
  if (otlp === null || local === null || optIn === null) return null;
  return {
    enabled: record.enabled,
    otlpEndpoint: otlp.endpoint,
    localExport: local.localExport,
    redactionOptIn: optIn.optIn,
  };
}

const _configByProject = new Map<string, ObservabilityConfig>();

// Layered resolution over the same global -> space -> intent config.json
// chain the mirror uses (narrowest present observability value wins whole —
// per-key merging across layers would make the effective config unreviewable).
// A malformed observability value in ANY layer resolves to DISABLED: telemetry
// must never switch itself on off the back of a value it cannot fully parse.
export function resolveObservabilityConfig(projectDir: string): ObservabilityConfig {
  const cached = _configByProject.get(projectDir);
  if (cached !== undefined) return cached;
  let resolved: ObservabilityConfig = DISABLED;
  try {
    const outcome = readAmadeusConfigLayers(projectDir);
    if (outcome.kind !== "ok") {
      _configByProject.set(projectDir, DISABLED);
      return DISABLED;
    }
    for (const layer of outcome.layers) {
      if (!layer.present) continue;
      const raw = layer.rawValue;
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) continue;
      const value = (raw as Record<string, unknown>).observability;
      if (value === undefined) continue;
      const parsed = parseObservabilityValue(value);
      if (parsed === null) {
        resolved = DISABLED;
        break;
      }
      resolved = parsed; // later (narrower) layers overwrite earlier ones
    }
  } catch {
    resolved = DISABLED;
  }
  _configByProject.set(projectDir, resolved);
  return resolved;
}

export function observabilityEnabled(projectDir: string): boolean {
  return resolveObservabilityConfig(projectDir).enabled;
}

// Test seam: the per-process memo would otherwise pin the first fixture's
// config onto every later fixture in the same bun process (#1389 class).
export function resetObservabilityConfigCache(): void {
  _configByProject.clear();
}

// --- buffer -----------------------------------------------------------------

export const TELEMETRY_DIR = ".amadeus-otel";

// The marker a Bolt/unit fork drops into the worktree it creates, naming the
// unit of work every span from that worktree belongs to (#1868 §2). It lives
// here — beside the telemetry dir, in the harness-neutral tools layer — because
// the writer (amadeus-state fork) and the reader (otel/span-context) sit on
// opposite sides of the tree and must not learn the name from each other.
//
// NOT a state field: the state file is a tracked path shared with main, so a
// value written into one worktree reaches main when that branch merges and
// would then name that Bolt for every later process there. This name is inside
// the `.amadeus-*` ignore pattern, so it cannot travel.
export const BOLT_CONTEXT_MARKER = ".amadeus-bolt-context";

export type BoltContextKind = "bolt" | "unit";

// Which kind a fork's slug names. Only the caller knows — the swarm drives the
// same fork with a unit name, and the slug reads identically either way — so it
// says so with `--unit` and this reads the answer off argv. A function rather
// than an inline conditional at the call site: the fork handler runs only in a
// spawned CLI, where coverage cannot see it, and the decision belongs where a
// test can drive it directly.
export function boltContextKind(args: readonly string[]): BoltContextKind {
  return args.includes("--unit") ? "unit" : "bolt";
}

// Drop the marker into the record dir of the worktree a fork just created.
// Overwrites: a re-fork of the same worktree names whatever it was re-forked
// for, and a stale value would outlive the work it described.
export function writeBoltContextMarker(recordDirPath: string, slug: string, kind: BoltContextKind): void {
  mkdirSync(recordDirPath, { recursive: true });
  writeFileSync(join(recordDirPath, BOLT_CONTEXT_MARKER), `${JSON.stringify({ [kind]: slug })}\n`, "utf-8");
}

export function telemetryDir(projectDir: string, intent?: string, space?: string): string | null {
  const dir = recordDir(projectDir, intent, space);
  if (dir === null) return null;
  return join(dir, TELEMETRY_DIR);
}

function bufferPath(projectDir: string): string | null {
  const dir = telemetryDir(projectDir);
  if (dir === null) return null;
  return join(dir, `buffer-${auditCloneId(projectDir)}.jsonl`);
}

// One telemetry event: a closed-interval timing observation. Envelope mirrors
// the journal identity (intentId/cloneId) so the projector can attach buffer
// spans to the right trace without reading any other state.
export type TelemetryEvent = {
  readonly v: 1;
  readonly kind: "process" | "operation" | "subprocess";
  readonly name: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly ok: boolean;
  readonly pid: number;
  readonly intentId: string;
  readonly cloneId: string;
  readonly harness: string;
  readonly meta?: Readonly<Record<string, string>>;
};

// Built-in low-cardinality attribute names admitted into meta. Everything
// else is dropped unless the config's redactionOptIn names it (default-deny —
// 設計裁定 Q5: metadata only, free text opt-in).
const META_SAFE_KEYS: readonly string[] = [
  "stage",
  "phase",
  "event",
  "tool",
  "outcome",
  "exitCode",
  "command",
];

function filterMeta(
  meta: Record<string, string> | undefined,
  config: ObservabilityConfig,
): Record<string, string> | undefined {
  if (meta === undefined) return undefined;
  const admitted: Record<string, string> = {};
  let any = false;
  for (const [key, value] of Object.entries(meta)) {
    if (!META_SAFE_KEYS.includes(key) && !config.redactionOptIn.includes(key)) continue;
    admitted[key] = value;
    any = true;
  }
  return any ? admitted : undefined;
}

// Best-effort failure note (Q12): never throws, never touches the journal.
function noteTelemetryFailure(projectDir: string, message: string): void {
  try {
    const dir = telemetryDir(projectDir);
    if (dir === null) return;
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "diagnostics.log"), `${new Date().toISOString()} ${message}\n`, "utf-8");
  } catch {
    // fail-open all the way down
  }
}

// Lockless one-line append (recordHookDrop precedent): single-line O_APPEND
// writes interleave at line granularity, and the projector tolerates
// interleaved lines from concurrent processes.
export function appendTelemetryEvent(
  projectDir: string,
  event: Omit<TelemetryEvent, "v" | "pid" | "intentId" | "cloneId" | "harness">,
): void {
  const config = resolveObservabilityConfig(projectDir);
  if (!config.enabled) return;
  try {
    const path = bufferPath(projectDir);
    if (path === null) return; // no resolvable intent record -> nothing to attach to
    const space = activeSpace(projectDir);
    const full: TelemetryEvent = {
      v: 1,
      ...event,
      meta: filterMeta(event.meta as Record<string, string> | undefined, config),
      pid: process.pid,
      intentId: activeIntent(projectDir, space) ?? "workspace",
      cloneId: auditCloneId(projectDir),
      harness: detectHarnessType(),
    };
    mkdirSync(join(path, ".."), { recursive: true });
    appendFileSync(path, `${JSON.stringify(full)}\n`, "utf-8");
  } catch (cause) {
    noteTelemetryFailure(projectDir, `append failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

// --- seams ------------------------------------------------------------------

type ProcessObservation = {
  projectDir: string;
  name: string;
  startMs: number;
};

let _processObservation: ProcessObservation | null = null;

// Process-boundary span (裁定 Q18 tier 1). Call once from an entrypoint after
// the project dir resolves; the event is written from a process exit handler
// so the interval covers the whole run. Disabled config -> pure no-op.
export function initProcessObservability(name: string, projectDir: string): void {
  if (!observabilityEnabled(projectDir)) return;
  if (_processObservation !== null) return; // first caller wins (one span per process)
  _processObservation = { projectDir, name, startMs: Date.now() };
  process.on("exit", (code) => flushProcessObservation(code));
}

// Write the pending process span and clear it. Split out of the exit handler
// so the write path is drivable in-process (an exit handler fires after the
// coverage snapshot); the handler and this seam share one implementation.
export function flushProcessObservation(exitCode: number): void {
  const obs = _processObservation;
  if (obs === null) return;
  _processObservation = null;
  appendTelemetryEvent(obs.projectDir, {
    kind: "process",
    name: obs.name,
    startMs: obs.startMs,
    endMs: Date.now(),
    ok: exitCode === 0,
    meta: { exitCode: String(exitCode) },
  });
}

// Operation-boundary span: wrap a synchronous block. Rethrows; ok:false on
// throw. Disabled -> executes fn with zero wrapping cost beyond the memo read.
export function observe<T>(projectDir: string, name: string, fn: () => T): T {
  if (!observabilityEnabled(projectDir)) return fn();
  const startMs = Date.now();
  let ok = false;
  try {
    const result = fn();
    ok = true;
    return result;
  } finally {
    appendTelemetryEvent(projectDir, { kind: "operation", name, startMs, endMs: Date.now(), ok });
  }
}

// --- trace context attach (FR-TRC-4/5) ---------------------------------------

// Re-attach this short-lived process to the intent trace before it spawns
// children or starts spans: the W3C env carrier first (FR-TRC-5 — present
// when an Amadeus parent process injected it), else the persisted intent
// anchor (FR-TRC-4; BR-6 mints a fresh anchor for pre-migration intents).
// Fail-open end to end: any failure leaves the process to start a new root
// trace, with the diagnostic note written by the context layer (BR-5).
// Disabled config -> pure no-op beyond the memoized config read.
export async function attachProcessTraceContext(projectDir: string): Promise<void> {
  if (!observabilityEnabled(projectDir)) return;
  try {
    // Lazy import: the otel layer loads only when observability is enabled,
    // keeping the vendored API out of the module graph of every tool that
    // imports this seam (and of partial test-fixture trees that lack otel/).
    const ctx = await import("../otel/context.ts");
    ctx.ensureContextManager();
    const root = recordDir(projectDir);
    if (ctx.attachRemoteParentFromEnv(process.env, { diagDir: root })) return;
    const intent = activeIntent(projectDir);
    if (root === null || intent === null) return;
    ctx.attachIntentContext(ctx.restoreIntentContext(root, intent));
  } catch {
    // fail-open: trace attach never blocks the caller
  }
}

// Subprocess-boundary span (裁定 Q18 tier 2): wrap a spawnSync-style call.
// The command NAME is recorded (a safe token the caller chooses), never the
// argv (paths/prompts stay out of telemetry by default — Q5). Works with both
// node:child_process results (.status) and Bun.spawnSync results (.exitCode).
type SpawnLikeResult = { status?: number | null; exitCode?: number | null };

function spawnExitCode(result: SpawnLikeResult | null): number | null {
  if (result === null) return null;
  if (typeof result.status === "number") return result.status;
  if (typeof result.exitCode === "number") return result.exitCode;
  return null;
}

export function observeSubprocess<T extends SpawnLikeResult>(
  projectDir: string,
  command: string,
  fn: () => T,
): T {
  if (!observabilityEnabled(projectDir)) return fn();
  const startMs = Date.now();
  let result: T | null = null;
  try {
    result = fn();
    return result;
  } finally {
    const exitCode = spawnExitCode(result);
    appendTelemetryEvent(projectDir, {
      kind: "subprocess",
      name: command,
      startMs,
      endMs: Date.now(),
      ok: exitCode === 0,
      meta: { command, exitCode: String(exitCode ?? "spawn-failed") },
    });
  }
}
