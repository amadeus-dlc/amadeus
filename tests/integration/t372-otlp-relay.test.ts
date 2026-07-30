// covers: otel:relay
// size: medium
//
// U11 (otlp-relay) — the Relay the old Projector degrades into (FR-RLY-1/2/3).
//
// The Relay forwards what the Local Signal Stores already hold: it reads from
// the cursor, converts each record to OTLP, posts best-effort to a local
// Collector, and advances the cursor only for what was delivered (BR-2/BR-7).
// A Collector that is down is not a failure (BR-3/BR-10), a lock it cannot
// take ends the flush immediately (BR-9), and retention never removes a
// record the cursor has not passed (BR-11). MEDIUM tier: real temp workspaces
// and real store files. Imports come from the shipped dist tree (t369
// precedent).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { resetObservabilityConfigCache } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import { flushSignals, resolveEndpoint, runRelay } from "../../dist/claude/.claude/otel/relay.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;

beforeEach(() => {
  proj = createTestProject();
  birthIntent(proj, "otel-u11-relay", "default", "feature");
});

afterEach(() => {
  cleanupTestProject(proj);
  resetObservabilityConfigCache();
});

// The workspace opt-in every telemetry surface is guarded by (t358 precedent).
function enableObservability(endpoint?: string): void {
  writeFileSync(
    join(proj, "amadeus", "config.json"),
    `${JSON.stringify({ observability: { enabled: true, ...(endpoint !== undefined ? { otlp: { endpoint } } : {}) } })}\n`,
    "utf-8"
  );
  resetObservabilityConfigCache();
}

function storeDir(): string {
  const dir = join(docsRoot(proj), ".amadeus-otel");
  mkdirSync(dir, { recursive: true });
  return dir;
}

type Posted = { url: string; body: unknown };

// The Collector stand-in: a port, so a test drives delivery and refusal
// without a loopback listener (the real fetch path is exercised by the
// endpoint e2e).
function collector(outcome: (url: string) => boolean = () => true) {
  const posted: Posted[] = [];
  return {
    posted,
    post: async (url: string, body: unknown) => {
      posted.push({ url, body });
      return outcome(url) ? { ok: true, detail: "" } : { ok: false, detail: "refused" };
    },
  };
}

function writeStore(name: string, records: readonly unknown[]): void {
  const path = join(storeDir(), name);
  writeFileSync(path, `${records.map((r) => JSON.stringify(r)).join("\n")}\n`, "utf-8");
}

// Safe navigation into a posted OTLP body: a shape mismatch shows up as an
// empty list in the assertion rather than as a throw inside the helper.
function postedSpans(body: unknown): Record<string, unknown>[] {
  const traces = body as { resourceSpans?: { scopeSpans?: { spans?: Record<string, unknown>[] }[] }[] };
  return traces.resourceSpans?.[0]?.scopeSpans?.[0]?.spans ?? [];
}

function postedMetrics(body: unknown): Record<string, unknown>[] {
  const metrics = body as { resourceMetrics?: { scopeMetrics?: { metrics?: Record<string, unknown>[] }[] }[] };
  return metrics.resourceMetrics?.[0]?.scopeMetrics?.[0]?.metrics ?? [];
}

function postedLogs(body: unknown): Record<string, unknown>[] {
  const logs = body as { resourceLogs?: { scopeLogs?: { logRecords?: Record<string, unknown>[] }[] }[] };
  return logs.resourceLogs?.[0]?.scopeLogs?.[0]?.logRecords ?? [];
}

const spanRecord = (spanId: string, name: string) => ({
  traceId: "0123456789abcdef0123456789abcdef",
  spanId,
  parentSpanId: null,
  name,
  kind: "INTERNAL",
  // Current time so the retention pass leaves these alone; the retention
  // suite builds its own aged records.
  startMs: Date.now(),
  endMs: Date.now(),
  status: { code: "OK" },
  attributes: { Stage: "code-generation" },
  events: [],
  links: [],
  resource: { "service.name": "amadeus" },
  instrumentationScope: { name: "amadeus" },
});

describe("relay flush over empty stores", () => {
  test("reports nothing sent and does not advance the cursor", async () => {
    storeDir();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:1/v1" });
    expect(result.sent).toBe(0);
    expect(result.cursorAdvanced).toBe(false);
  });
});

describe("the session-end entry point", () => {
  test("takes the endpoint from the environment ahead of the observability config", () => {
    enableObservability("http://config:4318");
    expect(resolveEndpoint(proj, { OTEL_EXPORTER_OTLP_ENDPOINT: "http://env:4318" })).toBe("http://env:4318");
  });

  test("refuses when observability is off without touching the store dir", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    const sink = collector();
    const summary = await runRelay(proj, { post: sink.post });
    expect(summary.status).toBe("disabled");
    expect(sink.posted).toHaveLength(0);
    // Nothing was read, sent, compacted or recorded: the opt-in is checked
    // before any store work happens.
    expect(existsSync(join(storeDir(), "relay-cursor.json"))).toBe(false);
    expect(existsSync(join(storeDir(), "relay-idempotency.json"))).toBe(false);
  });

  test("stops at no-endpoint when observability is on but no Collector is configured", async () => {
    enableObservability();
    const summary = await runRelay(proj, { post: collector().post, env: {} });
    expect(summary.status).toBe("no-endpoint");
  });

  test("flushes when observability and an endpoint are both configured", async () => {
    enableObservability("http://127.0.0.1:4318");
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    const sink = collector();
    const summary = await runRelay(proj, { post: sink.post, env: {} });
    expect(summary.status).toBe("flushed");
    expect(summary.result?.sent).toBe(1);
    expect(sink.posted[0]?.url).toBe("http://127.0.0.1:4318/v1/traces");
  });
});

describe("degraded inputs never stop a flush", () => {
  test("an unreadable cursor file replays instead of failing", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    writeFileSync(join(storeDir(), "relay-cursor.json"), "{ not json", "utf-8");
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });
    expect(result.sent).toBe(1);
  });

  test("an unreadable duplicate-tracking file is rebuilt rather than fatal", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    writeFileSync(join(storeDir(), "relay-idempotency.json"), "{ not json", "utf-8");
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });
    expect(result.sent).toBe(1);
    expect(Object.keys(JSON.parse(readFileSync(join(storeDir(), "relay-idempotency.json"), "utf-8")))).toHaveLength(1);
  });

  test("a torn store line is skipped and its neighbours still travel", async () => {
    writeFileSync(
      join(storeDir(), "spans-clone01.jsonl"),
      `${JSON.stringify(spanRecord("aaaaaaaaaaaaaaaa", "before"))}\n{ torn\n${JSON.stringify(spanRecord("bbbbbbbbbbbbbbbb", "after"))}\n`,
      "utf-8"
    );
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });
    expect(result.sent).toBe(2);
    expect(postedSpans(sink.posted[0]?.body).map((span) => span.name)).toEqual(["before", "after"]);
  });

  test("a torn line does not shift the cursor onto a record that already travelled", async () => {
    writeFileSync(
      join(storeDir(), "spans-clone01.jsonl"),
      `${JSON.stringify(spanRecord("aaaaaaaaaaaaaaaa", "before"))}\n{ torn\n${JSON.stringify(spanRecord("bbbbbbbbbbbbbbbb", "after"))}\n`,
      "utf-8"
    );
    const first = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: first.post });

    // The cursor has to count what it CONSUMED, not what it parsed: counting
    // records would leave it one line short for every torn line and re-send
    // the tail on the next flush.
    const second = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: second.post });
    expect(result.sent).toBe(0);
    expect(second.posted).toHaveLength(0);
  });

  test("with no endpoint configured nothing is sent and nothing is lost", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    const result = await flushSignals({ projectDir: proj });
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.cursorAdvanced).toBe(false);
    expect(result.diagnostics.join(" ")).toContain("no collector endpoint");
  });

  test("a store shard that cannot be read is skipped while its siblings travel", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "readable")]);
    // A dangling symlink is the portable way to make the read throw: the name
    // is listed by readdir, and the open fails with ENOENT on every platform
    // (cid:code-generation:bun-readfilesync-dir-platform-divergence).
    symlinkSync(join(storeDir(), "nowhere.jsonl"), join(storeDir(), "spans-broken.jsonl"));
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });
    expect(result.sent).toBe(1);
  });

  test("a cursor naming a store file that is gone does not break the retention pass", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    writeFileSync(
      join(storeDir(), "relay-cursor.json"),
      JSON.stringify({
        span: { storeId: "span", position: { "spans-vanished.jsonl": 3 }, updatedAt: "2026-07-30T00:00:00.000Z" },
      }),
      "utf-8"
    );
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });
    expect(result.sent).toBe(1);
  });

  test("a torn line inside the delivered prefix is compacted away with it", async () => {
    writeFileSync(
      join(storeDir(), "spans-clone01.jsonl"),
      `${JSON.stringify(spanRecord("aaaaaaaaaaaaaaaa", "delivered"))}\n{ torn\n`,
      "utf-8"
    );
    const sink = collector();
    await flushSignals({
      projectDir: proj,
      endpoint: "http://127.0.0.1:4318",
      post: sink.post,
      retentionMs: 0,
      now: Date.now() + 1000,
    });
    expect(readFileSync(join(storeDir(), "spans-clone01.jsonl"), "utf-8").trim()).toBe("");
  });

  test("a store file that cannot be rewritten keeps its records and its cursor", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "delivered")]);
    const sink = collector();
    const path = join(storeDir(), "spans-clone01.jsonl");
    chmodSync(path, 0o444);
    try {
      // Retention wants this record gone, but the rewrite fails: the store is
      // left exactly as it was rather than half-written.
      await flushSignals({
        projectDir: proj,
        endpoint: "http://127.0.0.1:4318",
        post: sink.post,
        retentionMs: 0,
        now: Date.now() + 1000,
      });
      expect(readFileSync(path, "utf-8").trim().split("\n")).toHaveLength(1);
    } finally {
      chmodSync(path, 0o644);
    }
  });

  test("a record with no usable timestamp is kept by the retention pass", async () => {
    writeStore("spans-clone01.jsonl", [{ traceId: "0".repeat(32), spanId: "1".repeat(16), name: "timeless" }]);
    const sink = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post, retentionMs: 0 });
    expect(readFileSync(join(storeDir(), "spans-clone01.jsonl"), "utf-8").trim().split("\n")).toHaveLength(1);
  });
});

describe("the flush lock", () => {
  test("reclaims a lock whose owner is long gone", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    const lock = join(storeDir(), ".relay-lock");
    mkdirSync(lock, { recursive: true });
    writeFileSync(
      join(lock, "owner.json"),
      JSON.stringify({ pid: 999_999, startedAtMs: Date.now() - 60 * 60 * 1000 }),
      "utf-8"
    );
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });
    expect(result.sent).toBe(1);
  });

  test("treats a lock with an unreadable owner stamp as held", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    mkdirSync(join(storeDir(), ".relay-lock"), { recursive: true });
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });
    expect(result.sent).toBe(0);
    expect(sink.posted).toHaveLength(0);
  });
});

describe("the flush lock, continued", () => {
  test("a held lock ends the flush at once instead of waiting or forcing it", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    mkdirSync(join(storeDir(), ".relay-lock"), { recursive: true });
    writeFileSync(
      join(storeDir(), ".relay-lock", "owner.json"),
      JSON.stringify({ pid: process.pid, startedAtMs: Date.now() }),
      "utf-8"
    );
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });

    expect(sink.posted).toHaveLength(0);
    expect(result.sent).toBe(0);
    expect(result.cursorAdvanced).toBe(false);
    expect(result.diagnostics.join(" ")).toContain("lock");
  });

  test("releases the lock so the next flush can take it", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    const first = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: first.post });
    expect(existsSync(join(storeDir(), ".relay-lock"))).toBe(false);
  });
});

describe("a Collector that is not there", () => {
  test("is not a failure: nothing is lost, the cursor stays put, the reason is recorded", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    const down = collector(() => false);
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: down.post });

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.cursorAdvanced).toBe(false);
    expect(result.diagnostics.join(" ")).toContain("span");
    expect(readFileSync(join(storeDir(), "diagnostics.log"), "utf-8")).toContain("relay:");

    // The record is still pending, so the next flush delivers it.
    const up = collector();
    const retry = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: up.post });
    expect(retry.sent).toBe(1);
  });

  test("advances only the signals that were delivered when one of them is refused", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    writeStore("logs-clone01.jsonl", [
      { name: "note", timestamp: "2026-07-30T00:00:00.000Z", attributes: {}, traceId: null, spanId: null },
    ]);
    const partial = collector((url) => !url.endsWith("/v1/traces"));
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: partial.post });

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);

    const again = collector();
    const retry = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: again.post });
    expect(retry.sent).toBe(1);
    expect(again.posted[0]?.url).toBe("http://127.0.0.1:4318/v1/traces");
  });
});

describe("duplicate tracking", () => {
  test("a replayed record is re-sent and reported, never silently deduplicated", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    const first = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: first.post });

    // A cursor lost between flushes is the replay case at-least-once tolerates.
    rmSync(join(storeDir(), "relay-cursor.json"), { force: true });
    const second = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: second.post });

    expect(result.sent).toBe(1);
    expect(second.posted).toHaveLength(1);
    expect(result.diagnostics.join(" ")).toContain("duplicate");

    const tracked = JSON.parse(readFileSync(join(storeDir(), "relay-idempotency.json"), "utf-8")) as Record<
      string,
      string
    >;
    expect(Object.keys(tracked)).toHaveLength(1);
  });
});

describe("the export boundary", () => {
  test("re-filters attributes on the way out and sends no authorization header", async () => {
    writeStore("spans-clone01.jsonl", [
      {
        ...spanRecord("aaaaaaaaaaaaaaaa", "stage one"),
        // A store record that predates a policy tightening: the write-time
        // layer did not remove these, so the export boundary must (FR-DST-3).
        attributes: { Stage: "code-generation", HomeDir: "/Users/someone", Note: "api_key=abcd1234efgh" },
      },
    ]);
    const sink = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });

    const spans = postedSpans(sink.posted[0]?.body);
    const attributes = spans[0]?.attributes as { key: string; value: { stringValue?: string } }[];
    const keys = attributes.map((entry) => entry.key);
    expect(keys).toContain("Stage");
    expect(keys).not.toContain("HomeDir");
    expect(attributes.find((entry) => entry.key === "Note")?.value.stringValue).not.toContain("abcd1234efgh");

    // NFR-4: the Relay speaks to a local Collector and carries no credential.
    expect(JSON.stringify(sink.posted[0]?.body)).not.toContain("Authorization");
  });
});

describe("retention and rotation", () => {
  const NOW = Date.parse("2026-07-30T00:00:00.000Z");
  const oldSpan = (spanId: string) => ({
    ...spanRecord(spanId, "old"),
    startMs: NOW - 30 * 24 * 60 * 60 * 1000,
    endMs: NOW - 30 * 24 * 60 * 60 * 1000,
  });
  const freshSpan = (spanId: string) => ({ ...spanRecord(spanId, "fresh"), startMs: NOW, endMs: NOW });
  const storeLines = (name: string) =>
    readFileSync(join(storeDir(), name), "utf-8")
      .split("\n")
      .filter((line) => line.trim() !== "");

  test("removes delivered records past their retention and keeps the undelivered ones", async () => {
    writeStore("spans-clone01.jsonl", [oldSpan("aaaaaaaaaaaaaaaa")]);
    const up = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: up.post, now: NOW });
    expect(storeLines("spans-clone01.jsonl")).toHaveLength(0);

    // A record written after the retention pass, never delivered, survives it.
    writeStore("spans-clone01.jsonl", [freshSpan("bbbbbbbbbbbbbbbb")]);
    const down = collector(() => false);
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: down.post, now: NOW });
    expect(storeLines("spans-clone01.jsonl")).toHaveLength(1);
  });

  test("a record the retention pass removed is not re-sent by the next flush", async () => {
    writeStore("spans-clone01.jsonl", [oldSpan("aaaaaaaaaaaaaaaa")]);
    const first = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: first.post, now: NOW });

    // The compacted file starts over at line 1: a cursor that did not shrink
    // with it would replay this record forever.
    writeStore("spans-clone01.jsonl", [freshSpan("bbbbbbbbbbbbbbbb")]);
    const second = collector();
    const result = await flushSignals({
      projectDir: proj,
      endpoint: "http://127.0.0.1:4318",
      post: second.post,
      now: NOW,
    });
    expect(result.sent).toBe(1);

    const spans = postedSpans(second.posted[0]?.body);
    expect(spans.map((span) => span.spanId)).toEqual(["bbbbbbbbbbbbbbbb"]);
  });
});

describe("metric and log forwarding", () => {
  test("posts metric records to /v1/metrics with the record's own kind and value", async () => {
    writeStore("metrics-clone01.jsonl", [
      {
        name: "amadeus.stage.executions",
        kind: "counter",
        value: 3,
        timestamp: "2026-07-30T00:00:00.000Z",
        attributes: { Stage: "code-generation" },
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "aaaaaaaaaaaaaaaa",
        intentId: "fixture",
      },
    ]);
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });

    expect(result.sent).toBe(1);
    expect(sink.posted[0]?.url).toBe("http://127.0.0.1:4318/v1/metrics");
    const metrics = postedMetrics(sink.posted[0]?.body);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.name).toBe("amadeus.stage.executions");
    const points = (metrics[0]?.sum as { dataPoints?: Record<string, unknown>[] } | undefined)?.dataPoints ?? [];
    expect(points[0]?.asDouble).toBe(3);
  });

  test("posts log records to /v1/logs carrying their correlation ids", async () => {
    writeStore("logs-clone01.jsonl", [
      {
        name: "hook drop",
        body: "session-end hook dropped",
        timestamp: "2026-07-30T00:00:00.000Z",
        attributes: { Stage: "code-generation" },
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "aaaaaaaaaaaaaaaa",
      },
    ]);
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });

    expect(result.sent).toBe(1);
    expect(sink.posted[0]?.url).toBe("http://127.0.0.1:4318/v1/logs");
    const logs = postedLogs(sink.posted[0]?.body);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.traceId).toBe("0123456789abcdef0123456789abcdef");
    expect(logs[0]?.spanId).toBe("aaaaaaaaaaaaaaaa");
    expect(logs[0]?.body).toEqual({ stringValue: "session-end hook dropped" });
  });
});

describe("span forwarding", () => {
  test("posts one OTLP span per store record and advances the cursor", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage code-generation")]);
    const sink = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });

    expect(result.sent).toBe(1);
    expect(result.cursorAdvanced).toBe(true);
    expect(sink.posted).toHaveLength(1);
    expect(sink.posted[0]?.url).toBe("http://127.0.0.1:4318/v1/traces");

    const spans = postedSpans(sink.posted[0]?.body);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.traceId).toBe("0123456789abcdef0123456789abcdef");
    expect(spans[0]?.spanId).toBe("aaaaaaaaaaaaaaaa");
    expect(spans[0]?.name).toBe("stage code-generation");
  });

  test("carries the record's own status and parent, and adds no span of its own", async () => {
    writeStore("spans-clone01.jsonl", [
      { ...spanRecord("aaaaaaaaaaaaaaaa", "parent"), status: { code: "ERROR", message: "boom" } },
      { ...spanRecord("bbbbbbbbbbbbbbbb", "child"), parentSpanId: "aaaaaaaaaaaaaaaa" },
    ]);
    const sink = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: sink.post });

    const spans = postedSpans(sink.posted[0]?.body);
    expect(spans).toHaveLength(2);
    expect(spans[0]?.status).toEqual({ code: 2, message: "boom" });
    expect(spans[0]?.parentSpanId).toBeUndefined();
    expect(spans[1]?.parentSpanId).toBe("aaaaaaaaaaaaaaaa");
  });

  test("a second flush re-sends nothing once the cursor has passed the record", async () => {
    writeStore("spans-clone01.jsonl", [spanRecord("aaaaaaaaaaaaaaaa", "stage one")]);
    const first = collector();
    await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: first.post });
    const second = collector();
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:4318", post: second.post });

    expect(result.sent).toBe(0);
    expect(second.posted).toHaveLength(0);
  });
});
