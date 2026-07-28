// covers: function:runExport
// size: large
//
// The Phase 3 projector OTLP endpoint contract (Issue #1628): POST to a
// loopback collector (Bun.serve) with the fail-open guarantee. LARGE tier —
// the loopback HTTP hop is a network signal. Filesystem-only projection
// behaviour lives in tests/integration/t358-otel-projector.test.ts.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  JOURNAL_SCHEMA_VERSION,
  serializeJournalEntry,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { resetObservabilityConfigCache, telemetryDir } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import {
  runExport,
} from "../../dist/claude/.claude/tools/amadeus-otel-projector.ts";
import {
  DEFAULT_RECORD_DIR,
  cleanupTestProject,
  createTestProject,
  seedStateFile,
  seededAuditShard,
} from "../harness/fixtures.ts";
import { dirname } from "node:path";

let proj: string | undefined;
let priorProjectDir: string | undefined;

beforeEach(() => {
  priorProjectDir = process.env.CLAUDE_PROJECT_DIR;
  resetObservabilityConfigCache();
});

afterEach(() => {
  if (priorProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = priorProjectDir;
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  resetObservabilityConfigCache();
  cleanupTestProject(proj);
  proj = undefined;
});

const CLONE = "projclone0001";
const line = (seq: number, event: string, ts: string, fields: Record<string, string> = {}) =>
  serializeJournalEntry({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    seq,
    cloneId: CLONE,
    intentId: DEFAULT_RECORD_DIR,
    timestamp: ts,
    heading: event,
    event,
    fields,
  });

function seedProject(opts: { enabled?: boolean; otlp?: string } = {}): string {
  const p = createTestProject();
  seedStateFile(p, "state-init-active.md");
  process.env.CLAUDE_PROJECT_DIR = p;
  if (opts.enabled !== false) {
    writeFileSync(
      join(p, "amadeus", "config.json"),
      `${JSON.stringify({ observability: { enabled: true, ...(opts.otlp ? { otlp: { endpoint: opts.otlp } } : {}) } })}\n`,
      "utf-8",
    );
  }
  resetObservabilityConfigCache();

  // Journal: workflow -> ideation phase -> intent-capture stage (completed).
  const shard = seededAuditShard(p);
  mkdirSync(dirname(shard), { recursive: true });
  writeFileSync(
    shard,
    line(1, "WORKFLOW_STARTED", "2026-07-28T10:00:00Z", { Scope: "amadeus-feature" }) +
      line(2, "PHASE_STARTED", "2026-07-28T10:00:01Z", { Phase: "ideation" }) +
      line(3, "STAGE_STARTED", "2026-07-28T10:00:02Z", { Stage: "intent-capture", Agent: "product" }) +
      line(4, "STAGE_COMPLETED", "2026-07-28T10:05:02Z", { Stage: "intent-capture" }),
    "utf-8",
  );

  // Buffer: one process span inside the stage window + one subprocess inside it.
  const dir = telemetryDir(p)!;
  mkdirSync(dir, { recursive: true });
  const t0 = Date.parse("2026-07-28T10:01:00Z");
  const events = [
    { v: 1, kind: "process", name: "tool:amadeus-state:approve", startMs: t0, endMs: t0 + 900, ok: true, pid: 4242, intentId: DEFAULT_RECORD_DIR, cloneId: CLONE, harness: "claude-code" },
    { v: 1, kind: "subprocess", name: "git", startMs: t0 + 100, endMs: t0 + 200, ok: true, pid: 4242, intentId: DEFAULT_RECORD_DIR, cloneId: CLONE, harness: "claude-code" },
  ];
  writeFileSync(join(dir, `buffer-${CLONE}.jsonl`), `${events.map((e) => JSON.stringify(e)).join("\n")}\n`, "utf-8");
  return p;
}


describe("OTLP endpoint contract (fail-open)", () => {
  test("POSTs traces and metrics to a live endpoint; env var beats config", async () => {
    const received: string[] = [];
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        received.push(new URL(request.url).pathname);
        return new Response("{}", { status: 200 });
      },
    });
    try {
      proj = seedProject({ otlp: "http://127.0.0.1:9" }); // config points at a dead port
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://127.0.0.1:${server.port}`;
      resetObservabilityConfigCache();
      const summary = await runExport(proj);
      expect(summary.status).toBe("exported");
      expect(summary.otlp).toEqual({ traces: "posted", metrics: "posted" });
      expect(received.sort()).toEqual(["/v1/metrics", "/v1/traces"]);
    } finally {
      server.stop(true);
    }
  });

  test("a non-2xx collector reply is a failed export, not a throw", async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Response("nope", { status: 500 }) });
    try {
      proj = seedProject({ otlp: `http://127.0.0.1:${server.port}` });
      const summary = await runExport(proj);
      expect(summary.status).toBe("exported");
      expect(summary.otlp).toEqual({ traces: "failed", metrics: "failed" });
    } finally {
      server.stop(true);
    }
  });
});
