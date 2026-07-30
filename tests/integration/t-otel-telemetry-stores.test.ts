// covers: otel:local-span-exporter otel:local-log-exporter otel:local-metric-exporter otel:tracer-provider
// size: medium
//
// U4 (local-exporters) — the hardened fail-open telemetry stores: the
// completed-span record carries the full FR-EXP-3 field set including links
// (BR-7), every store applies export-boundary redaction (FR-DST-3 layer 2),
// and a store write failure NEVER throws and NEVER sets the fatal latch
// (BR-5, FR-EVT-6).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SpanContext } from "../../dist/claude/.claude/vendor/opentelemetry/api/index.js";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { isFatalSet, resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalMetricExporter } from "../../dist/claude/.claude/otel/local-metric-exporter.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { getAmadeusTracer, registerTracerProvider, resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  ensureContextManager();
  birthIntent(proj, "otel-u4-stores", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
});

function storeRecords(prefix: string): Record<string, unknown>[] {
  const dir = join(docsRoot(proj), ".amadeus-otel");
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const records: Record<string, unknown>[] = [];
  for (const name of names.sort()) {
    if (!name.startsWith(prefix) || !name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, name), "utf-8").split("\n")) {
      if (line !== "") records.push(JSON.parse(line));
    }
  }
  return records;
}

const GH_TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz012345";

describe("completed Span store — full field set (FR-EXP-3, BR-7)", () => {
  test("span.end() persists links alongside ids, name/kind, timestamps, status, attributes, events, resource, scope", async () => {
    registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
    const tracer = getAmadeusTracer();
    let linkedContext: SpanContext | undefined;
    await tracer.startActiveSpan("upstream", async (upstream) => {
      linkedContext = upstream.spanContext();
      upstream.end();
    });
    await tracer.startActiveSpan("downstream", async (span) => {
      span.addLink({ context: linkedContext! });
      span.addEvent("checkpoint", { Note: "halfway" });
      span.end();
    });
    const downstream = storeRecords("spans-").find((r) => r.name === "downstream")!;
    expect(downstream.traceId).toBeTruthy();
    expect(downstream.spanId).toBeTruthy();
    expect(downstream.kind).toBeTruthy();
    expect(downstream.startMs).toBeTypeOf("number");
    expect(downstream.endMs).toBeTypeOf("number");
    expect(downstream.status).toBeDefined();
    expect(downstream.attributes).toBeDefined();
    expect(Array.isArray(downstream.events)).toBe(true);
    expect(downstream.resource).toBeDefined();
    expect(downstream.instrumentationScope).toBeDefined();
    const links = downstream.links as { traceId: string; spanId: string }[];
    expect(Array.isArray(links)).toBe(true);
    expect(links.length).toBe(1);
    expect(links[0]!.traceId).toBe(linkedContext!.traceId);
    expect(links[0]!.spanId).toBe(linkedContext!.spanId);
  });
});

describe("export-boundary redaction on telemetry stores (FR-DST-3 layer 2)", () => {
  test("the span store drops denied keys and scrubs credential values in span and event attributes", async () => {
    registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("redact-me", async (span) => {
      span.setAttribute("Prompt", "secret prompt text");
      span.setAttribute("Details", `token ${GH_TOKEN}`);
      span.addEvent("evt", { Prompt: "nested secret", Note: `uses ${GH_TOKEN}` });
      span.end();
    });
    const record = storeRecords("spans-")[0]!;
    const body = JSON.stringify(record);
    expect(body).not.toContain("secret prompt text");
    expect(body).not.toContain("nested secret");
    expect(body).not.toContain(GH_TOKEN);
  });

  test("the diagnostic log store redacts attributes at the boundary", () => {
    const exporter = createLocalLogExporter({ projectDir: proj });
    exporter.exportLog({
      name: "diag",
      timestamp: new Date().toISOString(),
      attributes: { Note: `token ${GH_TOKEN}`, Prompt: "secret prompt text" },
      traceId: null,
      spanId: null,
    });
    const body = JSON.stringify(storeRecords("logs-")[0]!);
    expect(body).not.toContain("secret prompt text");
    expect(body).not.toContain(GH_TOKEN);
    expect(body).toContain("diag");
  });

  test("the metric store redacts attributes at the boundary", () => {
    const exporter = createLocalMetricExporter({ projectDir: proj });
    exporter.exportMetric({
      name: "amadeus.events.total",
      kind: "counter",
      value: 1,
      timestamp: new Date().toISOString(),
      attributes: { Event: `fired with ${GH_TOKEN}`, Prompt: "secret prompt text" },
      traceId: null,
      spanId: null,
    });
    const body = JSON.stringify(storeRecords("metrics-")[0]!);
    expect(body).not.toContain("secret prompt text");
    expect(body).not.toContain(GH_TOKEN);
    expect(body).toContain("amadeus.events.total");
  });
});

describe("telemetry store failures are fail-open (BR-5, FR-EVT-6)", () => {
  const boom = () => {
    throw new Error("store unavailable");
  };

  test("a span store write failure never throws and never latches", () => {
    const exporter = createLocalSpanExporter({ projectDir: proj, write: boom });
    expect(() =>
      exporter.exportSpan({
        traceId: "t",
        spanId: "s",
        parentSpanId: null,
        name: "op",
        kind: "internal",
        startMs: 1,
        endMs: 2,
        status: { code: "0" },
        attributes: {},
        events: [],
        links: [],
        resource: {},
        instrumentationScope: { name: "amadeus" },
      })
    ).not.toThrow();
    expect(isFatalSet()).toBe(false);
  });

  test("a metric store write failure never throws and never latches", () => {
    const exporter = createLocalMetricExporter({ projectDir: proj, write: boom });
    expect(() =>
      exporter.exportMetric({
        name: "m",
        kind: "counter",
        value: 1,
        timestamp: new Date().toISOString(),
        attributes: {},
        traceId: null,
        spanId: null,
      })
    ).not.toThrow();
    expect(isFatalSet()).toBe(false);
  });

  test("a diagnostic log store write failure never throws and never latches", () => {
    const exporter = createLocalLogExporter({ projectDir: proj, write: boom });
    expect(() =>
      exporter.exportLog({ name: "d", timestamp: new Date().toISOString(), attributes: {}, traceId: null, spanId: null })
    ).not.toThrow();
    expect(isFatalSet()).toBe(false);
  });
});
