// covers: function:journalRecordField function:auditBlockField function:splitAuditRecords function:findAllEvents function:findForkAnchor function:compactionPendingFromAudit function:targetedApprovalEvidence function:parseDoctorAuditSuffix
//
// Behavior-equivalence tests for the journal reader swap (FR-JRN-4, intent
// 260729-otel-upstream U6): every journal/audit reader in tools + hooks —
// doctor, recovery/state recovery, presence, grant, shard merge, the runtime
// graph compile input, and learnings — funnels through the shared record
// accessor (splitAuditRecords + auditBlockField + findAllEvents) or the
// fork/merge anchor reader. Those readers must consume v1-only, v2-only, and
// mixed-version journals IDENTICALLY (BR-2/BR-3/BR-11), with the v2-only run
// doubling as the v1-codec-absent proof that gates v1 reader deletion
// (BR-7, FR-MIG-4(a)). All pure functions over in-memory buffers — SMALL.
// Imports come from the shipped dist tree (t351 precedent); the journal
// module is namespace-imported so the not-yet-shipped swap surface fails as a
// test failure, not a module-load error.

import { describe, expect, test } from "bun:test";
import {
  findForkAnchor,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import * as journal from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import {
  auditBlockField,
  findAllEvents,
  splitAuditRecords,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  type PresenceReservation,
  targetedApprovalEvidence,
} from "../../dist/claude/.claude/tools/amadeus-presence-reservation.ts";
import { compactionPendingFromAudit } from "../../dist/claude/.claude/tools/amadeus-state.ts";

const {
  JOURNAL_SCHEMA_VERSION,
  convertV1ToV2,
  parseJournalLine,
  serializeJournalEntry,
  serializeJournalEntryV2,
} = journal;

const CLONE = "abc123def456";
const INTENT = "260729-demo-deadbeef";
const TS = (minute: number) => `2026-07-29T10:${String(minute).padStart(2, "0")}:00Z`;

const v1Line = (seq: number, event: string, ts: string, fields: Record<string, string> = {}) =>
  serializeJournalEntry({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    seq,
    cloneId: CLONE,
    intentId: INTENT,
    timestamp: ts,
    heading: event,
    event,
    fields,
  });

// The v2 twin of one v1 line: the U3 converter is the normative mapping, so
// the fixtures exercise exactly the records a converted shard would carry.
const v2LineOf = (line: string): string => {
  const record = parseJournalLine(line.trim());
  if (journal.isJournalEntryV2(record)) throw new Error("fixture builder expects a v1 line");
  const converted = convertV1ToV2(record);
  if (!converted.ok) throw new Error(`fixture record is not convertible: ${converted.message}`);
  return serializeJournalEntryV2(converted.entry);
};

// One shared scenario every consumer reads: workflow lifecycle, presence
// (HUMAN_TURN + gate rows), grant, learnings, merge anchor, and recovery
// (SESSION_COMPACTED) events.
const SCENARIO: Array<[string, Record<string, string>]> = [
  ["WORKFLOW_STARTED", { Scope: "amadeus-feature" }],
  ["HUMAN_TURN", { "Presence Reservation Id": "res-1" }],
  ["STAGE_AWAITING_APPROVAL", { Stage: "code-generation" }],
  ["GATE_APPROVED", { Stage: "code-generation", "Presence Reservation Id": "res-1" }],
  ["STAGE_STARTED", { Stage: "code-generation", "Bolt slug": "bolt-x" }],
  ["STAGE_COMPLETED", { Stage: "code-generation", "Presence Reservation Id": "res-1" }],
  ["RULE_LEARNED", { Stage: "code-generation", "Candidate-ID": "cand-1" }],
  ["AUDIT_FORKED", { "Bolt slug": "bolt-x", "Source Audit Hash": "ab".repeat(32), "Fork Boundary": "2" }],
  ["SESSION_COMPACTED", {}],
  ["GRANT_ISSUED", { "Grant Id": "grant-1" }],
  ["WORKFLOW_COMPLETED", {}],
];

const V1_LINES = SCENARIO.map(([event, fields], i) => v1Line(i + 1, event, TS(i), fields));
const V2_LINES = V1_LINES.map(v2LineOf);
const V1_BUFFER = V1_LINES.join("");
const V2_BUFFER = V2_LINES.join("");
const MIXED_BUFFER = V1_LINES.map((line, i) => (i % 2 === 0 ? line : V2_LINES[i]!)).join("");
const VARIANTS = { v1: V1_BUFFER, v2: V2_BUFFER, mixed: MIXED_BUFFER } as const;

// Compare findAllEvents results across versions by FIELD PROJECTION, never by
// raw block text: the same record serializes differently per schema version.
function eventProjection(buffer: string, event: string, slug?: string) {
  return findAllEvents(buffer, event, slug).map(({ timestamp, block }) => ({
    timestamp,
    event: auditBlockField(block, "Event"),
    stage: auditBlockField(block, "Stage"),
    slug: auditBlockField(block, "Bolt slug"),
    grantId: auditBlockField(block, "Grant Id"),
  }));
}

describe("splitAuditRecords — record boundaries are version-agnostic", () => {
  test("v1-only, v2-only, and mixed buffers split into the same record count", () => {
    const count = splitAuditRecords(V1_BUFFER).length;
    expect(count).toBe(SCENARIO.length);
    expect(splitAuditRecords(V2_BUFFER).length).toBe(count);
    expect(splitAuditRecords(MIXED_BUFFER).length).toBe(count);
  });
});

describe("auditBlockField — normalized field access across schema versions", () => {
  test("every scenario record serves identical Event/Timestamp/payload fields in all variants", () => {
    const v1Blocks = splitAuditRecords(V1_BUFFER);
    const v2Blocks = splitAuditRecords(V2_BUFFER);
    const mixedBlocks = splitAuditRecords(MIXED_BUFFER);
    for (let i = 0; i < SCENARIO.length; i += 1) {
      const [event, fields] = SCENARIO[i]!;
      for (const name of ["Event", "Timestamp", ...Object.keys(fields)]) {
        const expected = auditBlockField(v1Blocks[i]!, name);
        expect(auditBlockField(v2Blocks[i]!, name), `v2 ${event} field ${name}`).toBe(expected);
        expect(auditBlockField(mixedBlocks[i]!, name), `mixed ${event} field ${name}`).toBe(expected);
      }
      expect(auditBlockField(v2Blocks[i]!, "Event")).toBe(event);
      expect(auditBlockField(v2Blocks[i]!, "Timestamp")).toBe(TS(i));
    }
  });

  test("journalRecordField normalizes v2 typed attributes to the v1 string form", () => {
    expect(typeof journal.journalRecordField).toBe("function");
    const record = parseJournalLine(
      serializeJournalEntryV2({
        schemaVersion: journal.JOURNAL_SCHEMA_VERSION_V2,
        eventId: "evt-1",
        seq: 1,
        timestamp: TS(0),
        eventName: "SENSOR_FIRED",
        attributes: { Stage: "build-and-test", Retries: 2, Ok: true, Note: null },
        intentId: INTENT,
        space: "default",
        cloneId: CLONE,
        traceId: null,
        spanId: null,
        traceFlags: 0,
        idempotencyKey: `${INTENT}:${CLONE}:1`,
        canonical: true,
      }).trim(),
    );
    const field = journal.journalRecordField as (r: journal.JournalRecord, name: string) => string | null;
    expect(field(record, "Timestamp")).toBe(TS(0));
    expect(field(record, "Event")).toBe("SENSOR_FIRED");
    expect(field(record, "Stage")).toBe("build-and-test");
    expect(field(record, "Retries")).toBe("2");
    expect(field(record, "Ok")).toBe("true");
    // A null attribute is absent, and a missing field stays absent.
    expect(field(record, "Note")).toBeNull();
    expect(field(record, "Missing")).toBeNull();
  });

  test("journalRecordField serves the stamped Event attribute on a live-exporter v2 row", () => {
    // The AuditLogExporter writes eventName = the registry's OTel name and
    // stamps the v1 audit event type into the Event attribute — the accessor
    // must serve the attribute, not the OTel name (findAllEvents matches on
    // v1 event types like QUESTION_ANSWERED).
    const record = parseJournalLine(
      serializeJournalEntryV2({
        schemaVersion: journal.JOURNAL_SCHEMA_VERSION_V2,
        eventId: "evt-live-1",
        seq: 2,
        timestamp: TS(1),
        eventName: "amadeus.question.answered",
        attributes: { Event: "QUESTION_ANSWERED", Stage: "intent-capture", Details: "ok" },
        intentId: INTENT,
        space: "default",
        cloneId: CLONE,
        traceId: null,
        spanId: null,
        traceFlags: 0,
        idempotencyKey: `${INTENT}:${CLONE}:2`,
        canonical: true,
      }).trim(),
    );
    const field = journal.journalRecordField as (r: journal.JournalRecord, name: string) => string | null;
    expect(field(record, "Event")).toBe("QUESTION_ANSWERED");
  });
});

describe("findAllEvents — the doctor / learnings / runtime-graph event scan", () => {
  test("event matches (with and without the slug filter) are identical across variants", () => {
    for (const [event, slug] of [
      ["STAGE_STARTED", undefined],
      ["STAGE_STARTED", "bolt-x"],
      ["STAGE_STARTED", "other-slug"],
      ["HUMAN_TURN", undefined],
      ["GRANT_ISSUED", undefined],
      ["WORKFLOW_COMPLETED", undefined],
      ["RULE_LEARNED", undefined],
    ] as Array<[string, string | undefined]>) {
      const expected = eventProjection(V1_BUFFER, event, slug);
      expect(eventProjection(V2_BUFFER, event, slug), `v2 ${event}/${slug}`).toEqual(expected);
      expect(eventProjection(MIXED_BUFFER, event, slug), `mixed ${event}/${slug}`).toEqual(expected);
    }
  });

  test("the v2-only journal yields every event class the v1 journal yields (FR-MIG-4(a) proof)", () => {
    const v1Events = findAllEvents(V1_BUFFER, "STAGE_COMPLETED").map((r) => r.timestamp);
    expect(v1Events.length).toBe(1);
    expect(findAllEvents(V2_BUFFER, "STAGE_COMPLETED").map((r) => r.timestamp)).toEqual(v1Events);
    for (const [event] of SCENARIO) {
      expect(findAllEvents(V2_BUFFER, event).length, `v2-only ${event}`).toBe(
        findAllEvents(V1_BUFFER, event).length,
      );
    }
  });
});

describe("findForkAnchor — the shard-merge anchor read", () => {
  const anchorFields = (anchor: { boundary: number; sourceHash: string; forkTs: string } | null) =>
    anchor === null ? null : { boundary: anchor.boundary, sourceHash: anchor.sourceHash, forkTs: anchor.forkTs };

  test("recovers the same anchor from v1, v2, and mixed worktree shards", () => {
    const expected = anchorFields(findForkAnchor(V1_BUFFER, "bolt-x"));
    expect(expected).toEqual({ boundary: 2, sourceHash: "ab".repeat(32), forkTs: TS(7) });
    expect(anchorFields(findForkAnchor(V2_BUFFER, "bolt-x"))).toEqual(expected);
    expect(anchorFields(findForkAnchor(MIXED_BUFFER, "bolt-x"))).toEqual(expected);
  });

  test("a malformed anchor stays a loud error on a v2 shard", () => {
    const malformed = v2LineOf(
      v1Line(1, "AUDIT_FORKED", TS(0), { "Bolt slug": "bolt-x", "Source Audit Hash": "ab".repeat(32) }),
    );
    expect(() => findForkAnchor(malformed, "bolt-x")).toThrow(/missing Fork Boundary/);
  });
});

describe("compactionPendingFromAudit — the state-recovery read", () => {
  const progressLine = (variant: "v1" | "v2") => {
    const line = v1Line(99, "STAGE_STARTED", TS(30), { Stage: "build-and-test" });
    return variant === "v1" ? line : v2LineOf(line);
  };

  test("pending/not-pending verdicts are identical across variants", () => {
    // SCENARIO's SESSION_COMPACTED is followed only by non-progress rows
    // (GRANT_ISSUED, WORKFLOW_COMPLETED), so the verdict is pending — and it
    // must not depend on the records' schema versions.
    const expected = compactionPendingFromAudit(V1_BUFFER);
    expect(expected).toBe(true);
    expect(compactionPendingFromAudit(V2_BUFFER)).toBe(expected);
    expect(compactionPendingFromAudit(MIXED_BUFFER)).toBe(expected);
    // A progress event after the last compacted row clears the verdict, in
    // every variant and whichever version the progress row itself carries.
    for (const variant of ["v1", "v2"] as const) {
      for (const buffer of Object.values(VARIANTS)) {
        expect(compactionPendingFromAudit(buffer + progressLine(variant))).toBe(false);
      }
    }
    const compactedOnlyV1 = v1Line(1, "SESSION_COMPACTED", TS(0));
    expect(compactionPendingFromAudit(compactedOnlyV1)).toBe(true);
    expect(compactionPendingFromAudit(v2LineOf(compactedOnlyV1))).toBe(true);
  });
});

describe("targetedApprovalEvidence — the presence reservation read", () => {
  const marker: PresenceReservation = {
    version: 1,
    reservationId: "res-1",
    sessionDigest: "digest",
    space: "default",
    targetIntentId: INTENT,
    targetIntentDir: "demo-dir",
    stage: "code-generation",
    routeId: "route-1",
    state: "minted",
    armedAt: TS(1),
    humanTurnTimestamp: TS(1),
    humanTurnShard: "host-clone.jsonl",
  };

  test("gate/stage census and freshness are identical across variants", () => {
    const expected = targetedApprovalEvidence(V1_BUFFER, marker);
    expect(expected).toEqual({ gateApproved: 1, stageCompleted: 1, humanTurnIsFresh: false });
    expect(targetedApprovalEvidence(V2_BUFFER, marker)).toEqual(expected);
    expect(targetedApprovalEvidence(MIXED_BUFFER, marker)).toEqual(expected);
  });
});

describe("parseDoctorAuditSuffix — the doctor migration-evidence read", () => {
  const suffix = () =>
    v1Line(1, "GUARDRAIL_LOADED", TS(0)) + v1Line(2, "HEALTH_CHECKED", TS(1));
  const parse = journal.parseDoctorAuditSuffix as
    | ((input: string, allowHeader: boolean) => string[] | null)
    | undefined;

  test("accepts the doctor health events from v1, v2, and mixed appends", () => {
    expect(typeof parse).toBe("function");
    const v1 = suffix();
    const v2 = v1
      .split("\n")
      .filter((l) => l !== "")
      .map(v2LineOf)
      .join("");
    expect(parse!(v1, false)).toEqual(["GUARDRAIL_LOADED", "HEALTH_CHECKED"]);
    expect(parse!(v2, false)).toEqual(["GUARDRAIL_LOADED", "HEALTH_CHECKED"]);
    expect(parse!(v1 + v2, false)).toEqual([
      "GUARDRAIL_LOADED",
      "HEALTH_CHECKED",
      "GUARDRAIL_LOADED",
      "HEALTH_CHECKED",
    ]);
  });

  test("non-doctor events and non-journal lines stay a refusal", () => {
    expect(parse!(v1Line(1, "STAGE_STARTED", TS(0)), false)).toBeNull();
    expect(parse!("not json\n", false)).toBeNull();
  });
});
