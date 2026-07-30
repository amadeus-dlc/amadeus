// covers: function:readJournalEntries function:journalSpanInput function:runExport
// size: medium
//
// Behavior-equivalence tests for the journal reader swap on the runtime-graph
// (OTel span graph) reader (FR-JRN-4, intent 260729-otel-upstream U6): the
// projector must build the IDENTICAL span/metric graph from v1-only, v2-only,
// and mixed-version journals (BR-2/BR-5/BR-11), tolerating v1 records'
// missing correlation IDs without synthesizing edges (BR-8/BR-16). MEDIUM
// tier: real temp workspaces + filesystem exports. Imports come from the
// shipped dist tree (t358 precedent).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  JOURNAL_SCHEMA_VERSION,
  JOURNAL_SCHEMA_VERSION_V2,
  type JournalEntryV2,
  convertV1ToV2,
  parseJournalLine,
  serializeJournalEntry,
  serializeJournalEntryV2,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { resetObservabilityConfigCache, telemetryDir } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import * as projector from "../../dist/claude/.claude/tools/amadeus-otel-projector.ts";

const { runExport } = projector;
// Namespace access so the not-yet-shipped swap surface fails as a test
// failure, not a module-load error.
const journalSpanInput = projector.journalSpanInput as (record: unknown) => {
  event: string | null;
  timestamp: string;
  intentId: string;
  cloneId: string;
  fields?: Record<string, string>;
};
import {
  DEFAULT_RECORD_DIR,
  cleanupTestProject,
  createTestProject,
  seedStateFile,
  seededAuditShard,
} from "../harness/fixtures.ts";

const CLONE = "projclone0001";
const NOW = Date.parse("2026-07-29T11:00:00Z");

const v1Line = (seq: number, event: string, ts: string, fields: Record<string, string> = {}) =>
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

const v2LineOf = (line: string): string => {
  const record = parseJournalLine(line.trim());
  const converted = convertV1ToV2(record as Parameters<typeof convertV1ToV2>[0]);
  if (!converted.ok) throw new Error(`fixture record is not convertible: ${converted.message}`);
  return serializeJournalEntryV2(converted.entry);
};

const JOURNAL_V1_LINES = [
  v1Line(1, "WORKFLOW_STARTED", "2026-07-29T10:00:00Z", { Scope: "amadeus-feature" }),
  v1Line(2, "PHASE_STARTED", "2026-07-29T10:00:01Z", { Phase: "ideation" }),
  v1Line(3, "STAGE_STARTED", "2026-07-29T10:00:02Z", { Stage: "intent-capture", Agent: "product" }),
  v1Line(4, "STAGE_COMPLETED", "2026-07-29T10:05:02Z", { Stage: "intent-capture" }),
];
const JOURNAL_V2_LINES = JOURNAL_V1_LINES.map(v2LineOf);
const JOURNAL_VARIANTS = {
  v1: JOURNAL_V1_LINES.join(""),
  v2: JOURNAL_V2_LINES.join(""),
  mixed: JOURNAL_V1_LINES.map((line, i) => (i % 2 === 0 ? line : JOURNAL_V2_LINES[i]!)).join(""),
} as const;

let proj: string | undefined;
let priorProjectDir: string | undefined;

beforeEach(() => {
  priorProjectDir = process.env.CLAUDE_PROJECT_DIR;
  resetObservabilityConfigCache();
});

afterEach(() => {
  if (priorProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = priorProjectDir;
  resetObservabilityConfigCache();
  cleanupTestProject(proj);
  proj = undefined;
});

function seedVariantProject(journal: string): string {
  const p = createTestProject();
  seedStateFile(p, "state-init-active.md");
  process.env.CLAUDE_PROJECT_DIR = p;
  writeFileSync(
    join(p, "amadeus", "config.json"),
    `${JSON.stringify({ observability: { enabled: true } })}\n`,
    "utf-8",
  );
  resetObservabilityConfigCache();
  const shard = seededAuditShard(p);
  mkdirSync(dirname(shard), { recursive: true });
  writeFileSync(shard, journal, "utf-8");
  // Buffer: one process span inside the stage window (kept v1-only — the
  // buffer store is not the journal; only the journal read is under test).
  const dir = telemetryDir(p)!;
  mkdirSync(dir, { recursive: true });
  const t0 = Date.parse("2026-07-29T10:01:00Z");
  const events = [
    { v: 1, kind: "process", name: "tool:amadeus-state:approve", startMs: t0, endMs: t0 + 900, ok: true, pid: 4242, intentId: DEFAULT_RECORD_DIR, cloneId: CLONE, harness: "claude-code" },
  ];
  writeFileSync(join(dir, `buffer-${CLONE}.jsonl`), `${events.map((e) => JSON.stringify(e)).join("\n")}\n`, "utf-8");
  return p;
}

function readExport(p: string): { spans: unknown; metrics: unknown } {
  const dir = telemetryDir(p)!;
  return {
    spans: JSON.parse(readFileSync(join(dir, "export", "traces.json"), "utf-8")),
    metrics: JSON.parse(readFileSync(join(dir, "export", "metrics.json"), "utf-8")),
  };
}

describe("runExport — identical span graph from v1-only, v2-only, and mixed journals", () => {
  test("the exported traces and metrics are byte-identical across journal versions", async () => {
    const exports: Record<string, { spans: unknown; metrics: unknown }> = {};
    for (const [variant, journal] of Object.entries(JOURNAL_VARIANTS)) {
      proj = seedVariantProject(journal);
      const summary = await runExport(proj, { force: true, now: NOW });
      expect(summary.status, `${variant} export`).toBe("exported");
      exports[variant] = readExport(proj);
      cleanupTestProject(proj);
      proj = undefined;
    }
    // The v1 export is the golden: v2-only and mixed journals must project
    // the same trace/span graph (BR-5 semantic equivalence).
    expect(exports.v2!.spans).toEqual(exports.v1!.spans);
    expect(exports.mixed!.spans).toEqual(exports.v1!.spans);
    expect(exports.v2!.metrics).toEqual(exports.v1!.metrics);
    expect(exports.mixed!.metrics).toEqual(exports.v1!.metrics);
    // Guard against a vacuous pass: the journal-derived spans must exist
    // (a skipped shard would leave only the buffer process span + root).
    const spanNames = JSON.stringify(exports.v1!.spans);
    expect(spanNames).toContain("phase ideation");
    expect(spanNames).toContain("stage intent-capture");
  });
});

describe("journalSpanInput — v2 normalization onto the span-input view", () => {
  test("maps eventName/attributes onto the v1 shape; null attributes drop, non-strings stringify", () => {
    const v2: JournalEntryV2 = {
      schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
      eventId: "evt-1",
      seq: 7,
      timestamp: "2026-07-29T10:00:02Z",
      eventName: "STAGE_STARTED",
      attributes: { Stage: "intent-capture", Attempt: 2, Skipped: null },
      intentId: DEFAULT_RECORD_DIR,
      space: "default",
      cloneId: CLONE,
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
      traceFlags: 1,
      idempotencyKey: `${DEFAULT_RECORD_DIR}:${CLONE}:7`,
      canonical: true,
    };
    const view = journalSpanInput(v2);
    expect(view.event).toBe("STAGE_STARTED");
    expect(view.timestamp).toBe("2026-07-29T10:00:02Z");
    expect(view.intentId).toBe(DEFAULT_RECORD_DIR);
    expect(view.cloneId).toBe(CLONE);
    expect(view.fields).toEqual({ Stage: "intent-capture", Attempt: "2" });
  });

  test("passes v1 records through unchanged (correlation IDs never synthesized)", () => {
    const v1 = parseJournalLine(
      v1Line(1, "STAGE_STARTED", "2026-07-29T10:00:02Z", { Stage: "intent-capture" }).trim(),
    );
    expect(journalSpanInput(v1) as unknown).toBe(v1);
  });
});
