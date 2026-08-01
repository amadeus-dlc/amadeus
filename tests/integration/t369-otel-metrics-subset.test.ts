// covers: otel:meter-provider otel:local-metric-exporter
// size: medium
//
// U9 (metrics-subset) — the Counter/Histogram subset of the Metrics API
// (FR-EXP-5) and its Trace Context correlation (FR-MLM-1).
//
// The subset is closed by construction: every instrument outside
// Counter/Histogram, and every request for arbitrary aggregation, is an
// invariant exception rather than a silent no-op (BR-1). Measurement is
// fail-open (BR-2/BR-7) except for double registration, which is an
// invariant violation like the Tracer Provider's (BR-10). Records carry the
// active trace/span ids (BR-4), empty when no span is in scope (BR-6), the
// intent identity every Signal Store record carries, and never reach the
// audit journal (BR-5).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { context, trace } from "../../dist/claude/.claude/vendor/opentelemetry/api/index.js";
import { activeIntent, birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { isFatalSet, resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalMetricExporter } from "../../dist/claude/.claude/otel/local-metric-exporter.ts";
import { emitEvent, registerLoggerProvider, resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { getAmadeusMeter, registerMeterProvider, resetMeterProviderForTests } from "../../dist/claude/.claude/otel/meter-provider.ts";
import { getAmadeusTracer, registerTracerProvider, resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetMeterProviderForTests();
  ensureContextManager();
  birthIntent(proj, "otel-u9-metrics", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetMeterProviderForTests();
});

function bootMeter(write?: (path: string, line: string) => void) {
  registerMeterProvider({
    projectDir: proj,
    metricExporter: createLocalMetricExporter({ projectDir: proj, ...(write !== undefined ? { write } : {}) }),
  });
}

function metricRecords(): Record<string, unknown>[] {
  const dir = join(docsRoot(proj), ".amadeus-otel");
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const records: Record<string, unknown>[] = [];
  for (const name of names.sort()) {
    if (!name.startsWith("metrics-") || !name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, name), "utf-8").split("\n")) {
      if (line !== "") records.push(JSON.parse(line));
    }
  }
  return records;
}

describe("Metric records carry the intent identity (Signal Store identity policy)", () => {
  test("a counter measurement lands with the active intent id resolved at the export boundary", () => {
    bootMeter();
    getAmadeusMeter().createCounter("amadeus.events.total").add(1, { event: "decision" });
    const record = metricRecords()[0]!;
    expect(record.name).toBe("amadeus.events.total");
    expect(record.intentId).toBe(activeIntent(proj));
  });

  test("a histogram measurement carries the same identity", () => {
    bootMeter();
    getAmadeusMeter().createHistogram("amadeus.span.duration").record(42);
    const record = metricRecords()[0]!;
    expect(record.kind).toBe("histogram");
    expect(record.intentId).toBe(activeIntent(proj));
  });
});

describe("Trace Context correlation (FR-MLM-1, BR-4/BR-6)", () => {
  function bootTracer() {
    registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
  }

  test("a measurement inside an active span carries that span's trace and span ids", () => {
    bootMeter();
    bootTracer();
    const span = getAmadeusTracer().startSpan("gate-wait");
    try {
      context.with(trace.setSpan(context.active(), span), () => {
        getAmadeusMeter().createCounter("amadeus.events.total").add(1);
        getAmadeusMeter().createHistogram("amadeus.span.duration").record(7);
      });
    } finally {
      span.end();
    }
    const records = metricRecords();
    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(record.traceId).toBe(span.spanContext().traceId);
      expect(record.spanId).toBe(span.spanContext().spanId);
    }
  });

  test("with no span in scope the correlation fields stay empty and the measurement still lands (BR-6)", () => {
    bootMeter();
    getAmadeusMeter().createCounter("amadeus.events.total").add(1);
    const record = metricRecords()[0]!;
    expect(record.traceId).toBeNull();
    expect(record.spanId).toBeNull();
    expect(record.value).toBe(1);
  });

  test("a Context passed explicitly to add/record is honoured rather than dropped", () => {
    bootMeter();
    bootTracer();
    const span = getAmadeusTracer().startSpan("subprocess-run");
    const ctx = trace.setSpan(context.active(), span);
    span.end();
    // Measured OUTSIDE the span's active scope: the explicit Context is the
    // only correlation source available.
    getAmadeusMeter().createCounter("amadeus.events.total").add(1, {}, ctx);
    getAmadeusMeter().createHistogram("amadeus.span.duration").record(3, {}, ctx);
    const records = metricRecords();
    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(record.traceId).toBe(span.spanContext().traceId);
      expect(record.spanId).toBe(span.spanContext().spanId);
    }
  });
});

describe("arbitrary aggregation is outside the subset (FR-EXP-5, BR-1)", () => {
  test("bucket-boundary advice on a histogram is an invariant exception, not a silent drop", () => {
    bootMeter();
    const meter = getAmadeusMeter();
    expect(() => meter.createHistogram("amadeus.span.duration", { advice: { explicitBucketBoundaries: [1, 5, 10] } })).toThrow(
      /subset/i
    );
  });

  test("aggregation advice on a counter is rejected the same way", () => {
    bootMeter();
    const meter = getAmadeusMeter();
    expect(() => meter.createCounter("amadeus.events.total", { advice: { explicitBucketBoundaries: [1] } })).toThrow(/subset/i);
  });

  test("plain descriptive options (unit, description) stay accepted", () => {
    bootMeter();
    const meter = getAmadeusMeter();
    expect(() => meter.createCounter("amadeus.events.total", { unit: "1", description: "emitted events" })).not.toThrow();
    expect(() => meter.createHistogram("amadeus.span.duration", { unit: "ms" })).not.toThrow();
  });
});

describe("the instrument subset is closed (FR-EXP-5, BR-1)", () => {
  // Every creation path outside Counter/Histogram, enumerated against the
  // Meter interface — a path that silently returned a no-op instrument would
  // drop measurements without any signal.
  test("no instrument outside Counter/Histogram can be created", () => {
    bootMeter();
    const meter = getAmadeusMeter();
    expect(() => meter.createUpDownCounter("x")).toThrow(/subset/i);
    expect(() => meter.createGauge("x")).toThrow(/subset/i);
    expect(() => meter.createObservableCounter("x")).toThrow(/subset/i);
    expect(() => meter.createObservableGauge("x")).toThrow(/subset/i);
    expect(() => meter.createObservableUpDownCounter("x")).toThrow(/subset/i);
  });

  test("batch observable callbacks cannot be registered or removed", () => {
    bootMeter();
    const meter = getAmadeusMeter();
    expect(() => meter.addBatchObservableCallback(() => {}, [])).toThrow(/subset/i);
    expect(() => meter.removeBatchObservableCallback(() => {}, [])).toThrow(/subset/i);
  });
});

describe("registration is an invariant, not a fail-open path (BR-10, NFR-3)", () => {
  test("registering the Meter Provider twice throws", () => {
    bootMeter();
    expect(() => bootMeter()).toThrow(/twice|invariant/i);
  });

  test("acquiring a Meter before registration throws", () => {
    expect(() => getAmadeusMeter()).toThrow(/invariant/i);
  });
});

describe("measurement is fail-open (BR-2, BR-7, FR-EVT-6)", () => {
  test("a store write failure never throws, never latches, and never blocks the next measurement", () => {
    let attempts = 0;
    bootMeter(() => {
      attempts += 1;
      throw new Error("store unavailable");
    });
    const counter = getAmadeusMeter().createCounter("amadeus.events.total");
    expect(() => counter.add(1)).not.toThrow();
    expect(isFatalSet()).toBe(false);
    // The dropped record is not retried or queued (BR-7) — the next
    // measurement is simply attempted on its own.
    expect(() => counter.add(1)).not.toThrow();
    expect(attempts).toBe(2);
    expect(isFatalSet()).toBe(false);
  });
});

describe("measured attributes pass the export-boundary redaction (BR-9, FR-DST-3)", () => {
  test("a sensitive attribute supplied at the measurement call never reaches the store", () => {
    bootMeter();
    getAmadeusMeter()
      .createCounter("amadeus.events.total")
      .add(1, { Prompt: "secret prompt text", Stage: "code-generation" });
    const body = JSON.stringify(metricRecords()[0]!);
    expect(body).not.toContain("secret prompt text");
    // The safe attribute survives, so the absence above is redaction rather
    // than the whole attribute bag being dropped.
    expect(body).toContain("code-generation");
  });
});

describe("Metric records stay out of the canonical journal (BR-5)", () => {
  function auditBody(): string {
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

  test("a measurement lands in the Metric Store while the populated audit journal never sees it", () => {
    bootMeter();
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    // A real canonical event first, so the journal is populated: an empty
    // journal would satisfy the absence assertion for the wrong reason.
    emitEvent("amadeus.decision.recorded", { Stage: "code-generation", Decision: "approve" });
    getAmadeusMeter().createCounter("amadeus.events.total").add(1);

    expect(metricRecords()).toHaveLength(1);
    expect(auditBody()).toContain("amadeus.decision.recorded");
    expect(auditBody()).not.toContain("amadeus.events.total");
  });
});
