// covers: otel:audit-log-exporter otel:local-span-exporter otel:local-log-exporter otel:local-metric-exporter otel:meter-provider otel:tracer-provider otel:logger-provider
//
// U1 (otel-walking-skeleton) test-first order 3/4 — the Exporter contract
// (VER-3): an emitted canonical event is readable from the audit JSONL the
// moment emit returns (FR-JRN-3); a completed Span record survives span.end()
// (FR-EXP-3); an immediately-exiting short-lived process still leaves its
// records behind (NFR-2); telemetry stores never touch the network
// (FR-EXP-2/6); redaction filters attributes before storage (FR-DST-3
// write-time layer, minimal); the vendored API is a singleton in the bundle
// (NFR-3).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SpanKind, trace } from "../../dist/claude/.claude/vendor/opentelemetry/api/index.js";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { createLocalMetricExporter } from "../../dist/claude/.claude/otel/local-metric-exporter.ts";
import { emitEvent, registerLoggerProvider, resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { getAmadeusMeter, registerMeterProvider, resetMeterProviderForTests } from "../../dist/claude/.claude/otel/meter-provider.ts";
import { getAmadeusTracer, registerTracerProvider, resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const BUN = process.execPath;
const CHILD = join(__dirname, "..", "helpers", "otel-emit-child.ts");

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetMeterProviderForTests();
  ensureContextManager();
});
afterEach(() => {
  cleanupTestProject(proj);
});

function readShards(dir: string): string {
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

function storeDir(): string {
  return join(docsRoot(proj), ".amadeus-otel");
}

function bootAll() {
  birthIntent(proj, "otel-contract", "default", "feature");
  registerLoggerProvider({
    projectDir: proj,
    auditExporter: createAuditLogExporter({ projectDir: proj }),
    logExporter: createLocalLogExporter({ projectDir: proj }),
  });
  registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
  registerMeterProvider({ projectDir: proj, metricExporter: createLocalMetricExporter({ projectDir: proj }) });
}

describe("canonical emit is synchronously observable (FR-JRN-3)", () => {
  test("an emitted canonical event is readable from the audit JSONL the moment emitEvent returns", () => {
    bootAll();
    emitEvent("amadeus.decision.recorded", { Stage: "code-generation", Decision: "approve" });
    const body = readShards(join(docsRoot(proj), "audit"));
    // U4: canonical records persist through the schema v2 codec (BR-13) —
    // the OTel event name, not the v1 audit event type.
    expect(body).toContain("amadeus.decision.recorded");
    expect(body).toContain("code-generation");
  });

  test("the record carries the active trace/span ids when emitted inside a span (causality, FR-TRC-6)", async () => {
    bootAll();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("gate-wait", async (span) => {
      try {
        emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "d" });
        const body = readShards(join(docsRoot(proj), "audit"));
        expect(body).toContain(span.spanContext().traceId);
        expect(body).toContain(span.spanContext().spanId);
      } finally {
        span.end();
      }
    });
  });

  test("redaction drops non-safe attributes before storage (write-time layer, BR-10)", () => {
    bootAll();
    emitEvent("amadeus.question.answered", { Stage: "s", Details: "d", Prompt: "secret prompt text" });
    const body = readShards(join(docsRoot(proj), "audit"));
    expect(body).toContain("amadeus.question.answered");
    expect(body).not.toContain("secret prompt text");
  });
});

describe("completed Span records survive span.end() (FR-EXP-3)", () => {
  test("span.end() synchronously appends a completed-span record with ids, name, timestamps, status", async () => {
    bootAll();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("subprocess-run", { kind: SpanKind.INTERNAL }, async (span) => {
      span.end();
    });
    const body = readShards(storeDir());
    expect(body).toContain("subprocess-run");
    const record = JSON.parse(body.trim().split("\n")[0]!);
    expect(record.traceId).toBeTruthy();
    expect(record.spanId).toBeTruthy();
    expect(record.endMs).toBeGreaterThanOrEqual(record.startMs);
    expect(record.status).toBeDefined();
  });
});

describe("Counter/Histogram subset (FR-EXP-5)", () => {
  test("counter.add and histogram.record land synchronously in the metric store, trace-correlated", async () => {
    bootAll();
    const meter = getAmadeusMeter();
    const counter = meter.createCounter("amadeus.events.total");
    counter.add(1, { event: "decision" });
    const histogram = meter.createHistogram("amadeus.span.duration");
    histogram.record(42);
    const body = readShards(storeDir());
    expect(body).toContain("amadeus.events.total");
    expect(body).toContain("amadeus.span.duration");
  });

  test("observable instruments are outside the initial subset — invariant exception", () => {
    bootAll();
    const meter = getAmadeusMeter();
    expect(() => meter.createObservableCounter("x")).toThrow(/scope|unsupported|invariant/i);
  });
});

describe("immediate process exit leaves records behind (NFR-2)", () => {
  test("a child that emits and exits with no flush still lands audit + span records", () => {
    birthIntent(proj, "otel-nfr2", "default", "feature");
    const r = Bun.spawnSync({
      cmd: [BUN, CHILD, proj],
      stdout: "ignore",
      stderr: "ignore",
      env: { ...process.env },
    });
    expect(r.exitCode).toBe(0);
    expect(readShards(join(docsRoot(proj), "audit"))).toContain("amadeus.decision.recorded");
    expect(readShards(storeDir())).toContain("child-operation");
  });
});

describe("no network dependency in the shipped exporter path (FR-EXP-2/6, BR-6)", () => {
  test("otel modules import no network builtins", () => {
    const otelDir = join(__dirname, "..", "..", "packages", "framework", "core", "otel");
    for (const name of readdirSync(otelDir)) {
      if (!name.endsWith(".ts")) continue;
      const src = readFileSync(join(otelDir, name), "utf-8");
      expect(src).not.toMatch(/node:(http|https|net|dgram)/);
      expect(src).not.toMatch(/from "(@opentelemetry\/sdk|@opentelemetry\/exporter)/);
    }
  });
});

describe("API singleton inside the bundle (NFR-3)", () => {
  test("exactly one vendored api copy exists under the framework source tree", () => {
    const coreDir = join(__dirname, "..", "..", "packages", "framework", "core");
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (name === "api" && dir.endsWith("opentelemetry")) {
          hits.push(p);
          continue;
        }
        try {
          readdirSync(p);
        } catch {
          continue; // not a directory
        }
        walk(p);
      }
    };
    walk(coreDir);
    expect(hits.length).toBe(1);
  });

  test("the provider registered through otel/ is the one the vendored api hands out (same global)", () => {
    bootAll();
    // `trace` here is imported directly from the vendored api in THIS test
    // module — a different import path than otel/tracer-provider.ts uses.
    const tracer = trace.getTracer("singleton-probe");
    const span = tracer.startSpan("via-global-api");
    span.end();
    expect(readShards(storeDir())).toContain("via-global-api");
  });
});
