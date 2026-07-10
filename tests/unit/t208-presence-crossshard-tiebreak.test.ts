// covers: function:humanActedSinceGate, function:humanActedSinceLastAnswer
//
// t208 - human-presence cross-shard same-second tie-break (#779, election
// E-779Q1 verdict A).
//
// THE BUG. scanPresenceLedger orders ledger events by (Timestamp, buffer
// position). isoTimestamp is SECOND-granular (the audit-visible format is fixed
// and NOT changed by the fix), and the buffer position tie-break is the
// FILENAME-sort order of the per-clone audit shards. So a HUMAN_TURN and a
// consuming resolution (GATE_APPROVED / GATE_REJECTED / QUESTION_ANSWERED)
// emitted in the SAME second but living in DIFFERENT shards had an order that
// flipped purely on shard filename — a false-open (a consumed HUMAN_TURN ranked
// AFTER its resolution, so the gate re-read it as fresh presence).
//
// THE FIX (verdict A). The presence predicates treat any same-second, cross-shard
// resolution as ordered AFTER a human act (the human side loses the tie →
// consumed). Fail-closed: whichever filename order the two shards land in, a
// same-second HUMAN_TURN + resolution across shards yields NO outstanding
// presence. isoTimestamp is untouched; same-shard order and strictly-different
// seconds are unchanged.
//
// Mechanism: in-process (the predicates are exported pure functions of the audit
// shards on disk). Technique: known-answer + fault-injection (both filename
// orderings) + non-regression of the unaffected cases.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seededAuditDir,
  seedStateFile,
} from "../harness/fixtures.ts";
import {
  humanActedSinceGate,
  humanActedSinceLastAnswer,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const HUMAN_TS = "2026-07-10T12:00:00Z";

function block(event: string, ts: string, extra = ""): string {
  return `\n## ${event}\n**Timestamp**: ${ts}\n**Event**: ${event}\n${extra}\n---\n`;
}

// Write one audit shard file (`<leaf>`) holding the given `\n---\n`-separated
// blocks. Two shards let us reproduce the cross-shard same-second race.
function writeShard(proj: string, leaf: string, body: string): void {
  const dir = seededAuditDir(proj);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, leaf), `# AI-DLC Audit Log\n${body}`, "utf-8");
}

let proj: string;

describe("t208: presence cross-shard same-second tie-break (#779)", () => {
  beforeEach(() => {
    resetAidlcEnv();
    proj = createTestProject();
    // recordDir/auditShardDir resolve the active intent only when its record
    // holds an amadeus-state.md — seed one so the shards below are read.
    seedStateFile(proj, "state-mid-ideation.md");
  });
  afterEach(() => cleanupTestProject(proj));

  // --- The reproduction: a HUMAN_TURN and its GATE_APPROVED land in the same
  // second but different shards. The gate must be CLOSED (no outstanding
  // presence) regardless of which shard sorts first. Before the fix, the buffer-
  // position tie-break flipped the answer on filename order.

  test("HUMAN_TURN in the lexically-FIRST shard, resolution in the later shard → fail-closed", () => {
    writeShard(proj, "aaa-clone.md", block("HUMAN_TURN", HUMAN_TS));
    writeShard(proj, "bbb-clone.md", block("GATE_APPROVED", HUMAN_TS, "**Stage**: feasibility"));
    // Pre-fix: HUMAN_TURN (aaa, lower position) sorts BEFORE the resolution →
    // read as consumed → false (this ordering already returned false pre-fix).
    expect(humanActedSinceGate(proj)).toBe(false);
  });

  test("HUMAN_TURN in the lexically-LATER shard, resolution in the earlier shard → fail-closed (the false-open)", () => {
    writeShard(proj, "aaa-clone.md", block("GATE_APPROVED", HUMAN_TS, "**Stage**: feasibility"));
    writeShard(proj, "zzz-clone.md", block("HUMAN_TURN", HUMAN_TS));
    // Pre-fix: HUMAN_TURN (zzz, higher position) sorts AFTER the resolution →
    // read as FRESH → true. This is the #779 false-open. Post-fix: fail-closed.
    expect(humanActedSinceGate(proj)).toBe(false);
  });

  // The interview-path twin has the same tie-break.
  test("answer predicate: same-second cross-shard HUMAN_TURN + QUESTION_ANSWERED → fail-closed both orders", () => {
    writeShard(proj, "aaa-clone.md", block("QUESTION_ANSWERED", HUMAN_TS, "**Stage**: feasibility"));
    writeShard(proj, "zzz-clone.md", block("HUMAN_TURN", HUMAN_TS));
    expect(humanActedSinceLastAnswer(proj)).toBe(false);
  });

  // An unreadable audit-dir entry (here: a DIRECTORY named *.md — readFileSync
  // throws EISDIR) is skipped, not fatal: the predicates keep answering from the
  // readable shards (scanPresenceLedger's vanished-shard tolerance).
  test("an unreadable *.md entry in the audit dir is skipped, remaining shards still answer", () => {
    writeShard(proj, "aaa-clone.md", block("HUMAN_TURN", "2026-07-10T12:00:02Z"));
    mkdirSync(join(seededAuditDir(proj), "bbb-dir.md"), { recursive: true });
    expect(humanActedSinceGate(proj)).toBe(true); // fresh HUMAN_TURN, no resolution
  });

  // --- Non-regression: the unaffected cases keep their exact prior behaviour.

  test("same-shard order is UNCHANGED: HUMAN_TURN appended AFTER the resolution is still outstanding", () => {
    // One shard, real append order: resolution then a fresh HUMAN_TURN after it.
    writeShard(
      proj,
      "aaa-clone.md",
      block("GATE_APPROVED", HUMAN_TS, "**Stage**: feasibility") + block("HUMAN_TURN", HUMAN_TS),
    );
    expect(humanActedSinceGate(proj)).toBe(true);
  });

  test("same-shard order is UNCHANGED: HUMAN_TURN BEFORE the resolution is consumed", () => {
    writeShard(
      proj,
      "aaa-clone.md",
      block("HUMAN_TURN", HUMAN_TS) + block("GATE_APPROVED", HUMAN_TS, "**Stage**: feasibility"),
    );
    expect(humanActedSinceGate(proj)).toBe(false);
  });

  test("strictly-earlier cross-shard resolution does NOT mask a later HUMAN_TURN (scenario G preserved)", () => {
    writeShard(proj, "aaa-clone.md", block("HUMAN_TURN", HUMAN_TS));
    writeShard(
      proj,
      "zzz-oldclone.md",
      block("GATE_APPROVED", "2020-01-01T00:00:00Z", "**Stage**: feasibility"),
    );
    expect(humanActedSinceGate(proj)).toBe(true);
  });

  test("a lone fresh HUMAN_TURN across shards with an OLDER cross-shard resolution stays outstanding both orders", () => {
    // The HUMAN_TURN's second is strictly later than the resolution's, so no
    // tie exists — presence is genuinely outstanding regardless of filenames.
    writeShard(proj, "zzz-clone.md", block("HUMAN_TURN", HUMAN_TS));
    writeShard(
      proj,
      "aaa-clone.md",
      block("GATE_APPROVED", "2026-07-10T11:59:59Z", "**Stage**: feasibility"),
    );
    expect(humanActedSinceGate(proj)).toBe(true);
  });
});
