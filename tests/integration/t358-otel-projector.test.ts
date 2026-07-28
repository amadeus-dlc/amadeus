// covers: function:runExport, function:buildSpans, function:buildOtlpTraces, function:buildOtlpMetrics
// size: medium
//
// The Phase 3 projector (Issue #1628): journal + telemetry buffer -> OTLP
// JSON with deterministic identity, exported locally and (optionally) POSTed
// to an OTLP endpoint with the fail-open contract. MEDIUM tier (filesystem +
// loopback HTTP via Bun.serve). Imports come from the shipped dist tree.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  JOURNAL_SCHEMA_VERSION,
  serializeJournalEntry,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { resetObservabilityConfigCache, telemetryDir } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import {
  parseCliArgs,
  runExport,
  spanIdFor,
  traceIdFor,
} from "../../dist/claude/.claude/tools/amadeus-otel-projector.ts";
import {
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
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

function readTraces(p: string): { spans: Array<Record<string, unknown>>; resourceAttrs: Record<string, string> } {
  const raw = JSON.parse(readFileSync(join(telemetryDir(p)!, "export", "traces.json"), "utf-8"));
  const rs = raw.resourceSpans[0];
  const resourceAttrs = Object.fromEntries(
    rs.resource.attributes.map((a: { key: string; value: { stringValue: string } }) => [a.key, a.value.stringValue]),
  );
  return { spans: rs.scopeSpans[0].spans, resourceAttrs };
}

describe("runExport — deterministic 5-level projection", () => {
  test("builds the intent->phase->stage->process->subprocess chain with derivable ids", async () => {
    proj = seedProject();
    const summary = await runExport(proj, { now: Date.parse("2026-07-28T11:00:00Z") });
    expect(summary.status).toBe("exported");
    const { spans, resourceAttrs } = readTraces(proj);
    expect(resourceAttrs["service.name"]).toBe("amadeus");
    expect(resourceAttrs["service.instance.id"]).toBe(CLONE);

    const traceId = traceIdFor(DEFAULT_SPACE, DEFAULT_RECORD_DIR);
    for (const span of spans) expect(span.traceId).toBe(traceId);

    const byName = new Map(spans.map((s) => [s.name as string, s]));
    const root = byName.get(`intent ${DEFAULT_RECORD_DIR}`)!;
    const phase = byName.get("phase ideation")!;
    const stage = byName.get("stage intent-capture")!;
    const process_ = byName.get("tool:amadeus-state:approve")!;
    const subprocess = byName.get("git")!;
    expect(root.parentSpanId).toBeUndefined();
    expect(phase.parentSpanId).toBe(root.spanId);
    expect(stage.parentSpanId).toBe(phase.spanId);
    expect(process_.parentSpanId).toBe(stage.spanId);
    expect(subprocess.parentSpanId).toBe(process_.spanId);

    // Identity is derivable without reading the export (Q3): the root span id
    // is a pure function of the trace + path.
    expect(root.spanId).toBe(spanIdFor(traceId, "intent"));
  });

  test("metrics derive from the same inputs with low-cardinality attributes (no intent id)", async () => {
    proj = seedProject();
    await runExport(proj, { now: Date.parse("2026-07-28T11:00:00Z") });
    const metrics = JSON.parse(readFileSync(join(telemetryDir(proj)!, "export", "metrics.json"), "utf-8"));
    const body = JSON.stringify(metrics);
    expect(body).toContain("amadeus.stage.executions");
    expect(body).toContain("amadeus.subprocess.duration");
    expect(body).not.toContain(DEFAULT_RECORD_DIR);
  });

  test("cursor: an unchanged input set is a no-op; --force re-exports", async () => {
    proj = seedProject();
    expect((await runExport(proj)).status).toBe("exported");
    expect((await runExport(proj)).status).toBe("unchanged");
    expect((await runExport(proj, { force: true })).status).toBe("exported");
  });

  test("disabled config refuses without touching disk", async () => {
    proj = seedProject({ enabled: false });
    const dir = telemetryDir(proj)!;
    const before = existsSync(join(dir, "export"));
    expect((await runExport(proj)).status).toBe("disabled");
    expect(existsSync(join(dir, "export"))).toBe(before);
  });

  test("a held projector lock skips the run; a stale lock is stolen", async () => {
    proj = seedProject();
    const dir = telemetryDir(proj)!;
    mkdirSync(join(dir, ".projector-lock"), { recursive: true });
    writeFileSync(join(dir, ".projector-lock", "owner.json"), JSON.stringify({ pid: 1, startedAtMs: Date.now() }), "utf-8");
    expect((await runExport(proj)).status).toBe("locked");
    writeFileSync(
      join(dir, ".projector-lock", "owner.json"),
      JSON.stringify({ pid: 1, startedAtMs: Date.now() - 11 * 60 * 1000 }),
      "utf-8",
    );
    expect((await runExport(proj)).status).toBe("exported");
  });
});

describe("resilience seams (fail-open on damaged local state)", () => {
  test("a completed phase closes the phase span at its completion event", async () => {
    proj = seedProject();
    const shard = seededAuditShard(proj);
    const body = readFileSync(shard, "utf-8");
    writeFileSync(shard, body + line(5, "PHASE_COMPLETED", "2026-07-28T10:06:00Z", { "From phase": "ideation" }), "utf-8");
    await runExport(proj, { now: Date.parse("2026-07-28T11:00:00Z") });
    const { spans } = readTraces(proj);
    const phase = spans.find((s) => s.name === "phase ideation")!;
    expect(phase.endTimeUnixNano).toBe(`${Date.parse("2026-07-28T10:06:00Z")}000000`);
  });

  test("an unreadable cursor or buffer shard falls back instead of failing", async () => {
    proj = seedProject();
    const dir = telemetryDir(proj)!;
    // Dangling symlink: listed by readdir, ENOENT on read (portable across
    // macOS/Linux, unlike readFileSync(dir)).
    symlinkSync(join(dir, "missing-target"), join(dir, "buffer-dangling.jsonl"));
    symlinkSync(join(dir, "missing-shard"), join(dirname(seededAuditShard(proj)), "host-dead00000001.jsonl"));
    writeFileSync(join(dir, "cursor.json"), "not json", "utf-8");
    const summary = await runExport(proj);
    expect(summary.status).toBe("exported");
  });

  test("an unreachable endpoint fails open: local export lands, diagnostics degrade silently", async () => {
    proj = seedProject({ otlp: "http://127.0.0.1:9" });
    const dir = telemetryDir(proj)!;
    // diagnostics.log as a directory: the append fails and is swallowed.
    mkdirSync(join(dir, "diagnostics.log"), { recursive: true });
    const summary = await runExport(proj);
    expect(summary.status).toBe("exported");
    expect(summary.otlp).toEqual({ traces: "failed", metrics: "failed" });
    expect(existsSync(join(dir, "export", "traces.json"))).toBe(true);
  });

  test("parseCliArgs reads --project-dir and --force", () => {
    expect(parseCliArgs(["--project-dir", "/x", "--force"])).toEqual({ projectDir: "/x", force: true });
    expect(parseCliArgs([])).toEqual({ projectDir: undefined, force: false });
  });
});
