// covers: otel:bootstrap otel:logger-provider otel:tracer-provider
// size: medium
//
// The shared one-per-process OTel bootstrap seam. Every short-lived Amadeus
// process that emits a canonical Event has to stand the Logger Provider up
// first (emitEvent throws unregistered), and registerLoggerProvider throws on
// a second registration (NFR-3) — so a per-process bootstrap that each entry
// point calls blindly MUST be idempotent, must reuse a provider someone else
// already registered, and must keep the amadeus-log behaviour it is extracted
// from: intent-anchor restore (FR-TRC-4) and the journal health probe that
// latches the process on an inconsistent shard (FR-EVT-5).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { auditFilePath, birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  ensureOtelBootstrap,
  ensureTracerBootstrap,
  resetOtelBootstrapForTests,
} from "../../dist/claude/.claude/otel/bootstrap.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import {
  clearIntentContextForTests,
  currentIntentContext,
  ensureContextManager,
} from "../../dist/claude/.claude/otel/context.ts";
import { isFatalSet, resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import {
  emitEvent,
  registerLoggerProvider,
  resetLoggerProviderForTests,
} from "../../dist/claude/.claude/otel/logger-provider.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
  resetTracerProviderForTests,
} from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  clearIntentContextForTests();
  ensureContextManager();
  birthIntent(proj, "otel-bootstrap", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  clearIntentContextForTests();
});

function journalText(): string {
  const dir = join(docsRoot(proj), "audit");
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return "";
  }
  return names
    .filter((n) => n.endsWith(".jsonl"))
    .sort()
    .map((n) => readFileSync(join(dir, n), "utf-8"))
    .join("\n");
}

describe("ensureOtelBootstrap — the canonical emit path stands up", () => {
  test("emitEvent throws before bootstrap and reaches the audit journal after it", () => {
    expect(() => emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "before" })).toThrow();
    ensureOtelBootstrap(proj);
    emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "after" });
    expect(journalText()).toContain("after");
  });

  test("a second call is a no-op — no double-registration throw, emit still works", () => {
    ensureOtelBootstrap(proj);
    expect(() => ensureOtelBootstrap(proj)).not.toThrow();
    emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "twice" });
    expect(journalText()).toContain("twice");
  });

  test("a provider registered directly is reused, not re-registered", () => {
    const seen: string[] = [];
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: {
        exportCanonicalEvent: (record: { attributes: Record<string, unknown> }) => {
          seen.push(String(record.attributes.Decision));
          return { timestamp: new Date().toISOString() };
        },
      } as never,
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    expect(() => ensureOtelBootstrap(proj)).not.toThrow();
    emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "reused" });
    expect(seen).toEqual(["reused"]);
  });

  test("bootstrapping a second project dir in one process is an invariant violation", () => {
    ensureOtelBootstrap(proj);
    const other = createTestProject();
    try {
      expect(() => ensureOtelBootstrap(other)).toThrow(/project/i);
    } finally {
      cleanupTestProject(other);
    }
  });

  // The reuse path has to police the SAME invariant as the repeat-call path.
  // Adopting a provider registered for another workspace would leave exports
  // and intent resolution pointed at that workspace while the caller believes
  // its own is in force — the silent misattribution this migration exists to
  // rule out.
  test("a provider registered for a DIFFERENT project dir is refused, not adopted", () => {
    const other = createTestProject();
    try {
      registerLoggerProvider({
        projectDir: other,
        auditExporter: createAuditLogExporter({ projectDir: other }),
        logExporter: createLocalLogExporter({ projectDir: other }),
      });
      expect(() => ensureOtelBootstrap(proj)).toThrow(/project/i);
    } finally {
      cleanupTestProject(other);
    }
  });

  // Registration state lives in the API singleton, not in this module: a memo
  // that short-circuits ahead of the query reports "already bootstrapped" for
  // a process that no longer holds a provider, and the next emit throws.
  test("a provider dropped after bootstrap is re-registered on the next call", () => {
    ensureOtelBootstrap(proj);
    resetLoggerProviderForTests();
    ensureOtelBootstrap(proj);
    expect(() => emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "re-registered" })).not.toThrow();
    expect(journalText()).toContain("re-registered");
  });
});

describe("ensureOtelBootstrap — the amadeus-log behaviour it replaces", () => {
  test("the intent trace anchor is restored and attached (FR-TRC-4)", () => {
    expect(currentIntentContext()).toBeNull();
    ensureOtelBootstrap(proj);
    expect(currentIntentContext()).not.toBeNull();
  });

  test("an inconsistent journal shard latches the process fatal (FR-EVT-5)", () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "seed" });
    resetLoggerProviderForTests();
    appendFileSync(auditFilePath(proj), "{ not a journal line\n", "utf-8");
    expect(isFatalSet()).toBe(false);
    ensureOtelBootstrap(proj);
    expect(isFatalSet()).toBe(true);
  });
});

describe("ensureTracerBootstrap", () => {
  test("the tracer becomes usable and a second call does not throw", () => {
    expect(() => getAmadeusTracer()).toThrow();
    ensureTracerBootstrap(proj);
    expect(() => ensureTracerBootstrap(proj)).not.toThrow();
    const span = getAmadeusTracer().startSpan("probe");
    span.end();
    expect(span.spanContext().traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  test("a tracer registered for a DIFFERENT project dir is refused, not adopted", () => {
    const other = createTestProject();
    try {
      registerTracerProvider({
        projectDir: other,
        spanExporter: createLocalSpanExporter({ projectDir: other }),
      });
      expect(() => ensureTracerBootstrap(proj)).toThrow(/project/i);
    } finally {
      cleanupTestProject(other);
    }
  });

  test("a tracer dropped after bootstrap is re-registered on the next call", () => {
    ensureTracerBootstrap(proj);
    resetTracerProviderForTests();
    ensureTracerBootstrap(proj);
    expect(() => getAmadeusTracer()).not.toThrow();
  });
});
