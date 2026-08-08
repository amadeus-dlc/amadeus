// covers: audit:formatAuditRecord audit:fork-merge-seams state:compaction-detect
//
// In-process coverage for the format seams around the audit ledger after the
// JSONL switchover (Issue #1628 PR-3): the legacy Markdown renderer (kept for
// the converter's lossless proof), the shared record splitter and field
// accessor over JSONL lines, the fork/merge physical helpers (record-line
// boundary), and the structured compaction detector. All pure functions — no
// filesystem, no spawn. Imports come from the shipped dist tree (t219
// precedent).

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  auditPrefixMismatch,
  countDeltaRecords,
  extractPostForkDelta,
  findForkAnchor,
  formatAuditRecord,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  JOURNAL_SCHEMA_VERSION,
  serializeJournalEntry,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import {
  auditBlockField,
  splitAuditRecords,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { compactionPendingFromAudit } from "../../dist/claude/.claude/tools/amadeus-state.ts";

const IDENTITY = { schemaVersion: JOURNAL_SCHEMA_VERSION, cloneId: "abc123def456", intentId: "260728-demo-1234abcd" };

const line = (seq: number, event: string, ts: string, fields: Record<string, string> = {}) =>
  serializeJournalEntry({ ...IDENTITY, seq, timestamp: ts, heading: event, event, fields });

describe("formatAuditRecord — the legacy renderer kept for the converter", () => {
  test("event + fields render the historical Markdown block byte-exactly", () => {
    const block = formatAuditRecord({
      heading: "Stage Start",
      timestamp: "2026-07-28T10:00:00Z",
      event: "STAGE_STARTED",
      fields: { Stage: "code-generation", Agent: "developer" },
    });
    expect(block).toBe(
      "\n## Stage Start\n**Timestamp**: 2026-07-28T10:00:00Z\n**Event**: STAGE_STARTED\n**Stage**: code-generation\n**Agent**: developer\n\n---\n",
    );
  });

  test("rawBody renders the append-raw shape (no Event line)", () => {
    const block = formatAuditRecord({
      heading: "Custom Note",
      timestamp: "2026-07-28T10:00:00Z",
      rawBody: "**Note**: free-form",
    });
    expect(block).toBe(
      "\n## Custom Note\n**Timestamp**: 2026-07-28T10:00:00Z\n**Note**: free-form\n\n---\n",
    );
  });
});

describe("splitAuditRecords + auditBlockField over JSONL", () => {
  test("splits a shard buffer into record lines and normalises CRLF", () => {
    const a = line(1, "HUMAN_TURN", "t1");
    const b = line(2, "STAGE_STARTED", "t2", { Stage: "feasibility" });
    const crlf = (a + b).replace(/\n/g, "\r\n");
    const blocks = splitAuditRecords(crlf);
    expect(blocks.length).toBe(2);
    expect(auditBlockField(blocks[0]!, "Event")).toBe("HUMAN_TURN");
    expect(auditBlockField(blocks[1]!, "Stage")).toBe("feasibility");
    expect(auditBlockField(blocks[1]!, "Timestamp")).toBe("t2");
  });

  test("a raw record's body is scanned like the legacy format", () => {
    const raw = serializeJournalEntry({
      ...IDENTITY,
      seq: 1,
      timestamp: "t1",
      heading: "Custom Note",
      event: null,
      rawBody: "**Detail**: kept verbatim\nplain line",
    });
    const block = splitAuditRecords(raw)[0]!;
    expect(auditBlockField(block, "Detail")).toBe("kept verbatim");
    expect(auditBlockField(block, "Event")).toBeNull();
    expect(auditBlockField(block, "Timestamp")).toBe("t1");
  });

  test("legacy state-file lines still resolve through the line-scan fallback", () => {
    expect(auditBlockField("- **Status**: InProgress", "Status")).toBe("InProgress");
  });
});

// A worktree shard: two prefix records + AUDIT_FORKED anchor + two delta records.
const prefix = line(1, "WORKFLOW_STARTED", "2026-07-28T10:00:00Z") + line(2, "HUMAN_TURN", "2026-07-28T10:01:00Z");
const anchorLine = line(3, "AUDIT_FORKED", "2026-07-28T11:00:00Z", {
  "Bolt slug": "u1-demo",
  "Source Audit Hash": "ab12cd34".repeat(8),
  "Fork Boundary": "2",
});
const deltaA = line(4, "BOLT_STARTED", "2026-07-28T11:01:00Z", { "Bolt slug": "u1-demo" });
const deltaB = line(5, "BOLT_COMPLETED", "2026-07-28T11:02:00Z", { "Bolt slug": "u1-demo" });
const WT_SHARD = prefix + anchorLine + deltaA + deltaB;

describe("findForkAnchor — AUDIT_FORKED anchor recovery (record-line units)", () => {
  test("recovers boundary, source hash, and fork timestamp for the slug", () => {
    const anchor = findForkAnchor(WT_SHARD, "u1-demo");
    expect(anchor).not.toBeNull();
    expect(anchor!.boundary).toBe(2);
    expect(anchor!.sourceHash).toBe("ab12cd34".repeat(8));
    expect(anchor!.forkTs).toBe("2026-07-28T11:00:00Z");
  });

  test("returns null when no AUDIT_FORKED entry matches the slug", () => {
    expect(findForkAnchor(WT_SHARD, "other-slug")).toBeNull();
    expect(findForkAnchor("", "u1-demo")).toBeNull();
  });

  test("throws on a present-but-malformed anchor (missing Fork Boundary)", () => {
    const malformed = line(1, "AUDIT_FORKED", "2026-07-28T11:00:00Z", {
      "Bolt slug": "u1-demo",
      "Source Audit Hash": "ab12cd34".repeat(8),
    });
    expect(() => findForkAnchor(malformed, "u1-demo")).toThrow(/missing Fork Boundary/);
  });
});

describe("extractPostForkDelta / countDeltaRecords", () => {
  test("extracts everything after the anchor record, verbatim", () => {
    const anchor = findForkAnchor(WT_SHARD, "u1-demo")!;
    const delta = extractPostForkDelta(WT_SHARD, anchor.forkBlock);
    expect(delta).toBe(deltaA + deltaB);
    expect(countDeltaRecords(delta!)).toBe(2);
  });

  test("returns null when the anchor line is absent or unterminated", () => {
    expect(extractPostForkDelta(prefix, line(9, "AUDIT_FORKED", "x"))).toBeNull();
    const unterminated = anchorLine.slice(0, -1); // no trailing newline in the shard
    expect(extractPostForkDelta(unterminated, unterminated)).toBeNull();
  });

  test("counts zero records in a whitespace-only delta", () => {
    expect(countDeltaRecords("\n\n")).toBe(0);
  });

  // Issue #2584: findForkAnchor scans from the tail (LAST AUDIT_FORKED for the
  // slug); the delta cut must name the SAME occurrence. A shard carrying two
  // byte-identical anchor rows is the case where a first-occurrence cut over-
  // merges — it drags the duplicate anchor and the records between the two
  // forks into the delta appended to the main ledger.
  test("cuts at the same (last) anchor occurrence findForkAnchor names", () => {
    const dupA = line(4, "BOLT_STARTED", "2026-07-28T11:01:00Z", { "Bolt slug": "u1-demo" });
    const dupB = line(5, "STEP", "2026-07-28T11:02:00Z", { "Bolt slug": "u1-demo" });
    const duplicated = prefix + anchorLine + dupA + dupB + anchorLine + deltaA + deltaB;

    const anchor = findForkAnchor(duplicated, "u1-demo")!;
    expect(anchor.forkBlock).toBe(anchorLine.slice(0, -1));

    const delta = extractPostForkDelta(duplicated, anchor.forkBlock);
    expect(delta).toBe(deltaA + deltaB);
    expect(countDeltaRecords(delta!)).toBe(2);
    expect(delta).not.toContain("AUDIT_FORKED");
  });
});

describe("auditPrefixMismatch — prefix integrity classification (record lines)", () => {
  const mainText = prefix + anchorLine;
  const boundary = 2; // the two prefix records
  const prefixBytes = prefix; // exactly the first two lines
  const goodHash = createHash("sha256").update(prefixBytes, "utf-8").digest("hex");

  test("returns null when the prefix hash matches", () => {
    expect(auditPrefixMismatch(mainText, boundary, goodHash)).toBeNull();
  });

  test("classifies a too-short main shard as truncation", () => {
    const message = auditPrefixMismatch(line(1, "HUMAN_TURN", "t"), boundary, goodHash);
    expect(message).toMatch(/truncation suspected/);
  });

  test("classifies a same-length hash mismatch as tampering", () => {
    const tampered = line(1, "HUMAN_TURN", "tX") + line(2, "HUMAN_TURN", "tY") + anchorLine;
    const message = auditPrefixMismatch(tampered, boundary, goodHash);
    expect(message).toMatch(/tampering suspected/);
  });
});

describe("compactionPendingFromAudit — structured compaction detection", () => {
  const compacted = line(1, "SESSION_COMPACTED", "2026-07-28T12:00:00Z");
  const progress = line(2, "STAGE_STARTED", "2026-07-28T12:01:00Z", { Stage: "code-generation" });

  test("false on an empty or compaction-free buffer", () => {
    expect(compactionPendingFromAudit("")).toBe(false);
    expect(compactionPendingFromAudit(progress)).toBe(false);
  });

  test("true when the latest SESSION_COMPACTED has no later activity", () => {
    expect(compactionPendingFromAudit(progress + compacted)).toBe(true);
  });

  test("false when stage activity follows the latest SESSION_COMPACTED", () => {
    expect(compactionPendingFromAudit(compacted + progress)).toBe(false);
  });
});
