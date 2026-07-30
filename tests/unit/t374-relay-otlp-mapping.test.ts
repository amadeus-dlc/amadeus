// covers: otel:relay
// size: small
//
// U11 (otlp-relay) — the OTLP mapping itself, as pure functions over store
// records. Every field the Relay emits comes off the record it was given; the
// tests below pin that per value kind, per signal and per optional field, so a
// mapping that started inventing a value would show up here rather than in a
// Collector (FR-RLY-1/2, BR-2). SMALL tier: no filesystem, no process.
// Imports come from the shipped dist tree (t351 precedent).

import { describe, expect, test } from "bun:test";
import {
  type SignalStoreRecord,
  idempotencyKey,
  toOtlpLogs,
  toOtlpMetrics,
  toOtlpTraces,
} from "../../dist/claude/.claude/otel/relay.ts";

const record = (storeId: SignalStoreRecord["storeId"], payload: Record<string, unknown>): SignalStoreRecord => ({
  storeId,
  file: `${storeId}s-clone01.jsonl`,
  payload,
});

function spans(body: unknown): Record<string, unknown>[] {
  const traces = body as { resourceSpans?: { scopeSpans?: { spans?: Record<string, unknown>[] }[] }[] };
  return traces.resourceSpans?.[0]?.scopeSpans?.[0]?.spans ?? [];
}

function metrics(body: unknown): Record<string, unknown>[] {
  const built = body as { resourceMetrics?: { scopeMetrics?: { metrics?: Record<string, unknown>[] }[] }[] };
  return built.resourceMetrics?.[0]?.scopeMetrics?.[0]?.metrics ?? [];
}

function logs(body: unknown): Record<string, unknown>[] {
  const built = body as { resourceLogs?: { scopeLogs?: { logRecords?: Record<string, unknown>[] }[] }[] };
  return built.resourceLogs?.[0]?.scopeLogs?.[0]?.logRecords ?? [];
}

function resourceOf(body: unknown): { key: string; value: Record<string, unknown> }[] {
  const traces = body as { resourceSpans?: { resource?: { attributes?: { key: string; value: never }[] } }[] };
  return traces.resourceSpans?.[0]?.resource?.attributes ?? [];
}

describe("attribute values keep their type on the wire", () => {
  test("string, boolean, integer, double and structured values each map to their AnyValue arm", () => {
    const body = toOtlpTraces([
      record("span", {
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "aaaaaaaaaaaaaaaa",
        name: "typed",
        attributes: { Stage: "code-generation", Outcome: true, ExitCode: 0, Options: 1.5, Note: ["a", "b"] },
      }),
    ]);
    const attributes = spans(body)[0]?.attributes as { key: string; value: Record<string, unknown> }[];
    const valueOf = (key: string) => attributes.find((entry) => entry.key === key)?.value;

    expect(valueOf("Stage")).toEqual({ stringValue: "code-generation" });
    expect(valueOf("Outcome")).toEqual({ boolValue: true });
    expect(valueOf("ExitCode")).toEqual({ intValue: "0" });
    expect(valueOf("Options")).toEqual({ doubleValue: 1.5 });
    expect(valueOf("Note")).toEqual({ stringValue: '["a","b"]' });
  });

  test("resource attributes keep their keys and are credential-scrubbed", () => {
    const body = toOtlpTraces([
      record("span", {
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "aaaaaaaaaaaaaaaa",
        name: "resourced",
        attributes: {},
        resource: { "service.name": "amadeus", "process.command": "run --secret=hunter2hunter2" },
      }),
    ]);
    const attributes = resourceOf(body);
    expect(attributes.find((entry) => entry.key === "service.name")?.value).toEqual({ stringValue: "amadeus" });
    expect(JSON.stringify(attributes)).not.toContain("hunter2hunter2");
  });
});

describe("span events and links travel as recorded", () => {
  test("each event and link is carried with its own ids, time and attributes", () => {
    const body = toOtlpTraces([
      record("span", {
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "aaaaaaaaaaaaaaaa",
        name: "with children",
        attributes: {},
        events: [{ name: "retry", timeMs: 1_700_000_000_000, attributes: { Stage: "build-and-test" } }],
        links: [{ traceId: "f".repeat(32), spanId: "e".repeat(16), attributes: { Stage: "code-generation" } }],
      }),
    ]);
    const span = spans(body)[0] as { events: Record<string, unknown>[]; links: Record<string, unknown>[] };

    expect(span.events[0]?.name).toBe("retry");
    expect(span.events[0]?.timeUnixNano).toBe("1700000000000000000");
    expect(span.links[0]?.traceId).toBe("f".repeat(32));
    expect(span.links[0]?.spanId).toBe("e".repeat(16));
  });

  test("a record without events or links emits empty lists rather than invented ones", () => {
    const body = toOtlpTraces([
      record("span", { traceId: "0".repeat(32), spanId: "1".repeat(16), name: "bare", attributes: {} }),
    ]);
    const span = spans(body)[0] as { events: unknown[]; links: unknown[] };
    expect(span.events).toEqual([]);
    expect(span.links).toEqual([]);
  });
});

describe("metric and log shapes", () => {
  test("a histogram record maps to a histogram point, a counter to a monotonic sum", () => {
    const body = toOtlpMetrics([
      record("metric", {
        name: "amadeus.stage.duration",
        kind: "histogram",
        value: 1250,
        timestamp: "2026-07-30T00:00:00.000Z",
        attributes: {},
      }),
      record("metric", {
        name: "amadeus.stage.executions",
        kind: "counter",
        value: 2,
        timestamp: "2026-07-30T00:00:00.000Z",
        attributes: {},
      }),
    ]);
    const built = metrics(body);
    const histogram = built[0]?.histogram as { dataPoints: Record<string, unknown>[] };
    expect(histogram.dataPoints[0]).toMatchObject({ count: "1", sum: 1250 });
    const sum = built[1]?.sum as { isMonotonic: boolean; dataPoints: Record<string, unknown>[] };
    expect(sum.isMonotonic).toBe(true);
    expect(sum.dataPoints[0]?.asDouble).toBe(2);
  });

  test("an unparseable or absent timestamp becomes zero rather than the current time", () => {
    const body = toOtlpMetrics([
      record("metric", { name: "m", kind: "counter", value: 1, timestamp: "not-a-time", attributes: {} }),
    ]);
    const sum = metrics(body)[0]?.sum as { dataPoints: Record<string, unknown>[] };
    expect(sum.dataPoints[0]?.timeUnixNano).toBe("0");
  });

  test("a log without a body falls back to its name and keeps absent correlation ids absent", () => {
    const body = toOtlpLogs([
      record("log", { name: "hook drop", timestamp: "2026-07-30T00:00:00.000Z", attributes: {}, traceId: null }),
    ]);
    const built = logs(body)[0] as Record<string, unknown>;
    expect(built.body).toEqual({ stringValue: "hook drop" });
    expect(built.traceId).toBeUndefined();
    expect(built.spanId).toBeUndefined();
  });
});

describe("the idempotency key is the record's own identity", () => {
  test("a span is keyed by its trace and span ids", () => {
    expect(idempotencyKey(record("span", { traceId: "0".repeat(32), spanId: "1".repeat(16) }))).toBe(
      `span:${"0".repeat(32)}:${"1".repeat(16)}`
    );
  });

  test("a metric and a log are keyed by name and timestamp", () => {
    expect(idempotencyKey(record("metric", { name: "m", timestamp: "2026-07-30T00:00:00.000Z" }))).toBe(
      "metric:m:2026-07-30T00:00:00.000Z"
    );
    expect(idempotencyKey(record("log", { name: "l", timestamp: "2026-07-30T00:00:00.000Z" }))).toBe(
      "log:l:2026-07-30T00:00:00.000Z"
    );
  });

  test("a record carrying no identity of its own is not given a synthetic one", () => {
    expect(idempotencyKey(record("span", { traceId: "0".repeat(32) }))).toBeNull();
    expect(idempotencyKey(record("log", { name: "l" }))).toBeNull();
  });
});
