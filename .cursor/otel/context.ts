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
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { context, trace, ROOT_CONTEXT } from "../vendor/opentelemetry/api/index.js";
import type { Context, ContextManager } from "../vendor/opentelemetry/api/index.js";

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

export type IntentTraceContext = {
  readonly traceId: string;
  readonly anchorSpanId: string;
  readonly intentId: string;
};

// The intent anchor is process-wide (one intent per short-lived process), so
// a module-level holder is the faithful model — async isolation concerns
// apply to span contexts, which the ContextManager above handles.
let holder: IntentTraceContext | null = null;

export function attachIntentContext(ctx: IntentTraceContext): void {
  holder = ctx;
}

export function currentIntentContext(): IntentTraceContext | null {
  return holder;
}

export function clearIntentContextForTests(): void {
  holder = null;
}

const CONTEXT_FILE = "intent-context.json";

// Persist under <dir>/.amadeus-otel/ — callers pass the intent record dir so
// the anchor lives beneath the record (domain-entities.md §IntentTraceContext).
export function persistIntentContext(dir: string, ctx: IntentTraceContext): void {
  const store = join(dir, ".amadeus-otel");
  mkdirSync(store, { recursive: true });
  appendFileSync(join(store, CONTEXT_FILE), `${JSON.stringify(ctx)}\n`, "utf-8");
}

// Restore the anchor for a later short-lived process (remote-parent join).
// A malformed or mismatched record yields null — never a guessed context.
export function restoreIntentContext(dir: string, intentId: string): IntentTraceContext | null {
  const path = join(dir, ".amadeus-otel", CONTEXT_FILE);
  if (!existsSync(path)) return null;
  try {
    const lines = readFileSync(path, "utf-8").split("\n").filter((l) => l.trim() !== "");
    for (let i = lines.length - 1; i >= 0; i--) {
      const raw: unknown = JSON.parse(lines[i]!);
      if (
        raw !== null &&
        typeof raw === "object" &&
        (raw as IntentTraceContext).intentId === intentId &&
        typeof (raw as IntentTraceContext).traceId === "string" &&
        typeof (raw as IntentTraceContext).anchorSpanId === "string"
      ) {
        return raw as IntentTraceContext;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// --- W3C Trace Context propagation (FR-TRC-5 minimal) ------------------------

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

// Inject the active span context (or, failing that, the attached intent
// anchor) into a child-process environment as W3C traceparent. With neither
// present the env is returned untouched — propagation never fabricates ids.
export function injectToSubprocess(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const spanCtx = trace.getSpan(context.active())?.spanContext();
  if (spanCtx !== undefined && spanCtx.traceId !== "0".repeat(32)) {
    env.TRACEPARENT = `00-${spanCtx.traceId}-${spanCtx.spanId}-0${spanCtx.traceFlags & 1}`;
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
  return { traceId: match[1]!, spanId: match[2]!, traceFlags: parseInt(match[3]!, 16) };
}
