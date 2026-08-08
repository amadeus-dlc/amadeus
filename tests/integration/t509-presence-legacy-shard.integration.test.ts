// covers: function:humanActedSinceGate, function:humanActedSinceLastAnswer, function:presenceLedgerShards
// size: medium
//
// t509 - human-presence grounding on a legacy (pre-JSONL) Markdown-only record
// (Issue #2582).
//
// THE BUG. auditShards() enumerates `*.jsonl` only. On a record whose audit
// shards were never converted by amadeus-journal-convert.ts, that enumeration is
// empty, so scanPresenceLedger's merged buffer is empty and it returns null —
// the "no ledger at all → no presence tracking" fail-open signal. Both presence
// predicates then answer `true` unconditionally, so gate approve/reject,
// delegate issuance and answer recording all pass with no human turn on record.
//
// The consumer side of the SAME ledger is fail-closed: verifyDelegatedProvenance
// normalises a referenced `.md` shard leaf to `.jsonl` and denies when the read
// fails. The defect is that asymmetry — issuer fail-open, consumer fail-closed,
// on identical on-disk data.
//
// THE FIX. The presence scan enumerates legacy `.md` shards alongside the
// converted `.jsonl` ones (a `.md` whose normalised leaf already exists as
// `.jsonl` is superseded and skipped — the same normalisation the consumer
// uses). A record that HAS a ledger on disk therefore never reads as "no ledger",
// and since splitAuditRecords deliberately yields no records from Markdown
// lines, an unconverted shard grounds nothing: the predicates deny until the
// record is converted. This matches the consumer's verdict on the same bytes.
//
// Mechanism: in-process (the predicates are exported pure functions of the audit
// shards on disk). Technique: known-answer control (converted JSONL) against the
// legacy `.md`-only reproduction, plus non-regression of the genuine no-ledger
// fail-open and of the converted-shard behaviour.

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
const GATE_TS = "2026-07-10T12:00:05Z";

// One JSONL journal record line, the shape the converted shards carry.
function jsonlRecord(event: string, ts: string, seq: number, fields: Record<string, string> = {}): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "testclone0001",
    intentId: "test-intent",
    timestamp: ts,
    heading: event,
    event,
    fields,
  })}\n`;
}

// The legacy Markdown rendering of the same record, as amadeus-journal-convert
// consumes it: a `# AI-DLC Audit Log` header followed by `\n## <heading>\n
// **Timestamp**: …\n**Event**: …\n` blocks separated by `\n---\n`.
function legacyBlock(event: string, ts: string, fields: Record<string, string> = {}): string {
  const fieldLines = Object.entries(fields)
    .map(([k, v]) => `**${k}**: ${v}\n`)
    .join("");
  return `\n## ${event}\n**Timestamp**: ${ts}\n**Event**: ${event}\n${fieldLines}\n---\n`;
}

function writeShard(proj: string, leaf: string, body: string): void {
  const dir = seededAuditDir(proj);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, leaf), body, "utf-8");
}

let proj: string;

describe("t509: presence grounding on a legacy Markdown-only audit ledger (#2582)", () => {
  beforeEach(() => {
    resetAidlcEnv();
    proj = createTestProject();
    // recordDir/auditShardDir resolve the active intent only when its record
    // holds an amadeus-state.md — seed one so the shards below are read.
    seedStateFile(proj, "state-mid-ideation.md");
  });
  afterEach(() => cleanupTestProject(proj));

  // --- The control: the SAME ledger, converted. A HUMAN_TURN consumed by a
  // later GATE_APPROVED leaves no outstanding presence, so both predicates deny.

  test("converted JSONL shard (control): a consumed HUMAN_TURN grounds nothing", () => {
    writeShard(
      proj,
      "host-testclone0001.jsonl",
      jsonlRecord("HUMAN_TURN", HUMAN_TS, 1) +
        jsonlRecord("GATE_APPROVED", GATE_TS, 2, { Stage: "feasibility" }),
    );
    expect(humanActedSinceGate(proj, "approve")).toBe(false);
    expect(humanActedSinceLastAnswer(proj)).toBe(false);
  });

  // --- The reproduction: byte-for-byte the same events, still in Markdown.
  // Pre-fix both predicates answered `true` (fail-open) because the `.jsonl`-only
  // enumeration saw no ledger. Post-fix they match the control.

  test("legacy .md-only shard: the same ledger must not fail open", () => {
    writeShard(
      proj,
      "host-testclone0001.md",
      `# AI-DLC Audit Log\n${legacyBlock("HUMAN_TURN", HUMAN_TS)}${legacyBlock("GATE_APPROVED", GATE_TS, { Stage: "feasibility" })}`,
    );
    expect(humanActedSinceGate(proj, "approve")).toBe(false);
    expect(humanActedSinceLastAnswer(proj)).toBe(false);
  });

  // An unconverted shard grounds nothing at all — not even a HUMAN_TURN that no
  // resolution has consumed. The record must be converted before its presence
  // can be read, which is exactly the verdict verifyDelegatedProvenance already
  // returns for a `.md`-only issuer shard.
  test("legacy .md-only shard: an UNCONSUMED HUMAN_TURN still does not open the gate", () => {
    writeShard(
      proj,
      "host-testclone0001.md",
      `# AI-DLC Audit Log\n${legacyBlock("HUMAN_TURN", HUMAN_TS)}`,
    );
    expect(humanActedSinceGate(proj, "approve")).toBe(false);
    expect(humanActedSinceGate(proj)).toBe(false);
    expect(humanActedSinceLastAnswer(proj)).toBe(false);
  });

  // --- Non-regression.

  test("no audit dir at all: the genuine no-ledger fail-open is preserved", () => {
    expect(humanActedSinceGate(proj, "approve")).toBe(true);
    expect(humanActedSinceGate(proj)).toBe(true);
    expect(humanActedSinceLastAnswer(proj)).toBe(true);
  });

  test("converted JSONL shard: a fresh HUMAN_TURN still opens the gate", () => {
    writeShard(proj, "host-testclone0001.jsonl", jsonlRecord("HUMAN_TURN", HUMAN_TS, 1));
    expect(humanActedSinceGate(proj, "approve")).toBe(true);
    expect(humanActedSinceLastAnswer(proj)).toBe(true);
  });

  // A converted record that kept its pre-conversion `.md` beside the `.jsonl`:
  // the legacy leaf normalises onto the converted one, so it is superseded and
  // contributes nothing — the JSONL shard alone decides, exactly as before.
  test("converted .jsonl beside its superseded .md twin: the JSONL shard decides", () => {
    writeShard(proj, "host-testclone0001.jsonl", jsonlRecord("HUMAN_TURN", HUMAN_TS, 1));
    writeShard(
      proj,
      "host-testclone0001.md",
      `# AI-DLC Audit Log\n${legacyBlock("HUMAN_TURN", HUMAN_TS)}`,
    );
    expect(humanActedSinceGate(proj, "approve")).toBe(true);
    expect(humanActedSinceLastAnswer(proj)).toBe(true);
  });

  // Mixed record: one clone converted, another clone's shard still Markdown.
  // The converted shard answers; the unconverted one neither grounds nor masks.
  test("mixed record: a converted shard answers alongside an unconverted twin from another clone", () => {
    writeShard(
      proj,
      "host-testclone0001.jsonl",
      jsonlRecord("HUMAN_TURN", HUMAN_TS, 1) +
        jsonlRecord("GATE_APPROVED", GATE_TS, 2, { Stage: "feasibility" }),
    );
    writeShard(
      proj,
      "otherhost-testclone0002.md",
      `# AI-DLC Audit Log\n${legacyBlock("HUMAN_TURN", HUMAN_TS)}`,
    );
    expect(humanActedSinceGate(proj, "approve")).toBe(false);
    expect(humanActedSinceLastAnswer(proj)).toBe(false);
  });
});
