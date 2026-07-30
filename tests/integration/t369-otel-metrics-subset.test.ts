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
import { createLocalMetricExporter } from "../../dist/claude/.claude/otel/local-metric-exporter.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
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
  resetTracerProviderForTests();
  resetMeterProviderForTests();
});

function bootMeter(write?: (path: string, line: string) => void) {
  registerMeterProvider({
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
    registerTracerProvider({ spanExporter: createLocalSpanExporter({ projectDir: proj }) });
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
