// context.ts — Context management, Intent Trace Context persistence, and W3C
// subprocess propagation (FR-TRC-3/4/5).
//
// ContextManager: the spike verified @opentelemetry/context-async-hooks works
// on Bun, but its published build is CommonJS with a bare
// require("@opentelemetry/api") that cannot resolve against the vendored
// tree unpached. The manager is therefore implemented directly on
// node:async_hooks AsyncLocalStorage against the OTel ContextManager
// interface (Phase 1 ADR, decisions.md) — the same mechanism
// context-async-hooks uses, kept swappable behind the interface.
//
// W3C propagation is implemented by hand (the traceparent format is fixed and
// tiny) to keep the vendored bundle free of @opentelemetry/core.
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { context, trace, ROOT_CONTEXT } from "../vendor/opentelemetry/api/index.js";
import type { Context, ContextManager, SpanContext } from "../vendor/opentelemetry/api/index.js";

class AmadeusContextManager implements ContextManager {
  private readonly als = new AsyncLocalStorage<Context>();
  active(): Context {
    return this.als.getStore() ?? ROOT_CONTEXT;
  }
  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    ctx: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    const cb = thisArg == null ? fn : fn.bind(thisArg);
    return this.als.run(ctx, cb, ...args);
  }
  bind<T>(ctx: Context, target: T): T {
    if (typeof target === "function") {
      const manager = this;
      const wrapper = function (this: unknown, ...args: unknown[]) {
        return manager.with(ctx, () => (target as (...a: unknown[]) => unknown).apply(this, args));
      };
      return wrapper as T;
    }
    return target;
  }
  enable(): this {
    return this;
  }
  disable(): this {
    this.als.disable();
    return this;
  }
}

let managerRegistered = false;

// Idempotent global registration. Called once per short-lived process before
// any provider registration.
export function ensureContextManager(): void {
  if (managerRegistered) return;
  context.setGlobalContextManager(new AmadeusContextManager().enable());
  managerRegistered = true;
}

// --- Intent Trace Context (FR-TRC-4) -----------------------------------------

// Persisted-record schema version (BR-6 mixed-period compatibility): records
// written by the U1 spike carry no version and are read as version 1; an
// unknown newer version is rejected and falls into the mint-new-anchor path.
export const INTENT_CONTEXT_SCHEMA_VERSION = 1;

export type IntentTraceContext = {
  readonly traceId: string;
  readonly anchorSpanId: string;
  readonly intentId: string;
  readonly schemaVersion: number;
};

// The intent anchor is process-wide (one intent per short-lived process), so
// a module-level holder is the faithful model — async isolation concerns
// apply to span contexts, which the ContextManager above handles.
let holder: IntentTraceContext | null = null;

// Process-level remote parent: the span context this short-lived process
// attaches beneath, set from the subprocess env carrier (FR-TRC-5) or seeded
// from the restored intent anchor (FR-TRC-4). The tracer provider consults it
// when the active context holds no span, so every root span started in this
// process joins the intent trace instead of opening an orphan trace (BR-3).
let processParent: SpanContext | null = null;

export function attachIntentContext(ctx: IntentTraceContext): void {
  holder = ctx;
  if (processParent === null) {
    processParent = {
      traceId: ctx.traceId,
      spanId: ctx.anchorSpanId,
      traceFlags: 1,
      isRemote: true,
    };
  }
}

export function currentIntentContext(): IntentTraceContext | null {
  return holder;
}

// Read by the tracer provider when the active context carries no span.
export function processParentSpanContext(): SpanContext | null {
  return processParent;
}

export function clearIntentContextForTests(): void {
  holder = null;
  processParent = null;
}

const STORE_DIR = ".amadeus-otel";
const DIAGNOSTICS_FILE = "diagnostics.log";

// Best-effort diagnostic note (BR-5/BR-6: extraction and persistence failures
// are never silent, never fatal). Lives next to the context record so no
// caller wiring is required; fail-open all the way down.
function noteContextDiagnostic(dir: string, message: string): void {
  try {
    const store = join(dir, STORE_DIR);
    mkdirSync(store, { recursive: true });
    appendFileSync(join(store, DIAGNOSTICS_FILE), `${new Date().toISOString()} ${message}\n`, "utf-8");
  } catch {
    // fail-open all the way down
  }
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

// One record per intent (scalability-design: no append-log proliferation).
function contextFilePath(dir: string, intentId: string): string {
  return join(dir, STORE_DIR, `intent-context-${intentId}.json`);
}

// Legacy U1 spike format: a shared append-only JSONL. Read-only fallback so
// intents born before the per-intent file existed still restore (BR-6).
const LEGACY_CONTEXT_FILE = "intent-context.json";

function isIntentTraceContext(raw: unknown, intentId: string): raw is IntentTraceContext {
  if (raw === null || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  const version = r.schemaVersion;
  return (
    r.intentId === intentId &&
    typeof r.traceId === "string" &&
    typeof r.anchorSpanId === "string" &&
    // Absent version = U1-era record, read as the current version; a known
    // version passes; anything else is rejected into the mint-new path.
    (version === undefined || version === INTENT_CONTEXT_SCHEMA_VERSION)
  );
}

// Persist under <dir>/.amadeus-otel/ — callers pass the intent record dir so
// the anchor lives beneath the record (domain-entities.md §IntentTraceContext).
// One file per intent, written tmp+rename. A write failure is telemetry-only:
// fail-open with a diagnostic note, never a throw (reliability-design).
export function persistIntentContext(dir: string, ctx: IntentTraceContext): void {
  try {
    const store = join(dir, STORE_DIR);
    mkdirSync(store, { recursive: true });
    const path = contextFilePath(dir, ctx.intentId);
    const tmp = `${path}.tmp-${process.pid}`;
    writeFileSync(tmp, `${JSON.stringify({ ...ctx, schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION })}\n`, "utf-8");
    renameSync(tmp, path);
  } catch (cause) {
    noteContextDiagnostic(
      dir,
      `intent-context persist failed: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
}

function readPersisted(dir: string, intentId: string): IntentTraceContext | null {
  const path = contextFilePath(dir, intentId);
  if (existsSync(path)) {
    try {
      const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
      if (isIntentTraceContext(raw, intentId)) {
        return { ...raw, schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION };
      }
    } catch {
      // fall through to the legacy scan, then the mint-new path
    }
  }
  const legacyPath = join(dir, STORE_DIR, LEGACY_CONTEXT_FILE);
  if (!existsSync(legacyPath)) return null;
  try {
    const lines = readFileSync(legacyPath, "utf-8").split("\n").filter((l) => l.trim() !== "");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line === undefined) continue;
      const raw: unknown = JSON.parse(line);
      if (isIntentTraceContext(raw, intentId)) {
        return { ...raw, schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Restore the anchor for a later short-lived process (remote-parent join).
// BR-6 mixed-period contract: when no valid record exists (pre-migration
// intent, corrupt record, unknown schema version) a NEW anchor is minted,
// persisted, and noted in the diagnostic log — the restore never returns
// null and never throws.
export function restoreIntentContext(dir: string, intentId: string): IntentTraceContext {
  const persisted = readPersisted(dir, intentId);
  if (persisted !== null) return persisted;
  const minted: IntentTraceContext = {
    traceId: randomHex(16),
    anchorSpanId: randomHex(8),
    intentId,
    schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION,
  };
  noteContextDiagnostic(dir, `intent-context record missing for ${intentId}: minted a new anchor (BR-6)`);
  persistIntentContext(dir, minted);
  return minted;
}

// --- W3C Trace Context propagation (FR-TRC-5) --------------------------------

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

// Inject the active span context (or, failing that, the process remote parent
// or the attached intent anchor) into a child-process environment as a W3C
// traceparent. The carrier is correlation IDs only (BR-4): TRACEPARENT is
// written here and an inherited TRACESTATE passes through untouched — no
// vendor entries are ever added. With no context present the env is returned
// untouched — propagation never fabricates ids.
export function injectToSubprocess(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const spanCtx = trace.getSpan(context.active())?.spanContext();
  if (spanCtx !== undefined && spanCtx.traceId !== "0".repeat(32)) {
    env.TRACEPARENT = `00-${spanCtx.traceId}-${spanCtx.spanId}-0${spanCtx.traceFlags & 1}`;
    return env;
  }
  if (processParent !== null) {
    env.TRACEPARENT = `00-${processParent.traceId}-${processParent.spanId}-0${processParent.traceFlags & 1}`;
    return env;
  }
  if (holder !== null) {
    env.TRACEPARENT = `00-${holder.traceId}-${holder.anchorSpanId}-01`;
  }
  return env;
}

export function extractTraceparent(
  env: NodeJS.ProcessEnv
): { traceId: string; spanId: string; traceFlags: number } | null {
  const raw = env.TRACEPARENT;
  if (raw === undefined) return null;
  const match = TRACEPARENT_RE.exec(raw);
  if (match === null) return null;
  const [, traceId, spanId, flags] = match;
  if (traceId === undefined || spanId === undefined || flags === undefined) return null;
  return { traceId, spanId, traceFlags: parseInt(flags, 16) };
}

// Child-side entry (FR-TRC-5, BR-3): re-attach the env carrier as this
// process's remote parent so every span started here joins the parent trace.
// Fail-open (BR-5): a present-but-malformed traceparent is rejected by W3C
// shape validation, noted in the diagnostic log (diagDir = the intent record
// dir, when the caller can resolve one), and the process starts a new root
// trace — the failure never throws into the caller. An absent traceparent is
// the normal harness-spawn case and stays silent.
export function attachRemoteParentFromEnv(
  env: NodeJS.ProcessEnv,
  opts?: { diagDir?: string | null }
): boolean {
  const raw = env.TRACEPARENT;
  if (raw === undefined) return false;
  const extracted = extractTraceparent(env);
  if (extracted === null) {
    if (opts?.diagDir != null) {
      noteContextDiagnostic(
        opts.diagDir,
        "traceparent extraction failed: malformed W3C carrier — starting a new root trace (BR-5)"
      );
    }
    return false;
  }
  processParent = {
    traceId: extracted.traceId,
    spanId: extracted.spanId,
    traceFlags: extracted.traceFlags,
    isRemote: true,
  };
  return true;
}
