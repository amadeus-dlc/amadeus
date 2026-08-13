import { describe, expect, test } from "bun:test";
import type {
  CanonicalBallot,
  CanonicalElectionDefinition,
  CanonicalTally,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import {
  buildDistributionView,
  renderElectionRecord,
  verifyElectionRecord,
} from "../../packages/framework/core/tools/amadeus-election-record.ts";
import {
  bookDelivery,
  canonicalizeDeliveryRecord,
  reportDelivery,
} from "../../packages/framework/core/tools/amadeus-election-transport.ts";

const definition: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-MULTIQ",
  kind: "decision",
  questions: [
    {
      questionId: "q-a",
      text: "Adopt A?",
      choices: [
        { internalNo: 1, label: "yes", description: "Adopt A" },
        { internalNo: 2, label: "no" },
      ],
    },
    {
      questionId: "q-b",
      text: "Adopt B?",
      choices: [
        { internalNo: 1, label: "ship" },
        { internalNo: 2, label: "wait" },
      ],
    },
  ],
  voters: ["alice", "bob"],
};

const ballots: CanonicalBallot[] = [
  {
    schemaVersion: 2,
    kind: "original",
    electionId: definition.electionId,
    voter: "alice",
    voterKind: "member",
    responses: [
      { questionId: "q-a", choiceInternalNo: 1, goa: 2, reservation: "A reservation", rationale: null },
      { questionId: "q-b", choiceInternalNo: 2, goa: 7, reservation: null, rationale: null },
    ],
    submittedAt: "2026-08-13T10:00:00Z",
    receivedAt: "2026-08-13T10:00:02Z",
  },
  {
    schemaVersion: 2,
    kind: "original",
    electionId: definition.electionId,
    voter: "bob",
    voterKind: "member",
    responses: [
      { questionId: "q-a", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
      { questionId: "q-b", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
    ],
    submittedAt: "2026-08-13T10:00:01Z",
    receivedAt: "2026-08-13T10:00:03Z",
  },
];

const tally: CanonicalTally = {
  schemaVersion: 2,
  runId: "run-1",
  targetQuestionIds: ["q-a", "q-b"],
  results: [
    {
      questionId: "q-a",
      kind: "established",
      winner: { internalNo: 1, label: "yes" },
      choiceCounts: [
        { internalNo: 1, label: "yes", count: 2 },
        { internalNo: 2, label: "no", count: 0 },
      ],
      goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
    },
    {
      questionId: "q-b",
      kind: "hold",
      reason: "split",
      counts: { favor: 1, against: 1, abstain: 0, discuss: 0 },
    },
  ],
  preservedResultDigest: null,
  talliedAt: "2026-08-13T11:00:00Z",
};

const timeline = [
  { schemaVersion: 2 as const, kind: "tallied" as const, runId: "run-1", at: "2026-08-13T11:00:00Z" },
];

describe("U4 multi-question distribution view", () => {
  test("contains every question in definition order and remains blind", () => {
    const first = buildDistributionView(definition, "alice");
    expect(first).toEqual(buildDistributionView(definition, "alice"));
    expect(first.questions.map((question) => question.questionId)).toEqual(["q-a", "q-b"]);
    expect(Object.keys(first).sort()).toEqual(["electionId", "questions", "voter"]);
    expect(Object.keys(first.questions[0]!).sort()).toEqual(["ordered", "questionId", "text"]);
    expect(JSON.stringify(first)).not.toMatch(/recommend|peer|status|response/i);
    for (const question of first.questions) {
      expect(question.ordered.map((choice) => choice.displayNo)).toEqual([1, 2]);
      expect(new Set(question.ordered.map((choice) => choice.internalNo))).toEqual(new Set([1, 2]));
    }
  });
});

describe("U4 multi-question record", () => {
  test("renders a deterministic mixed result with question-local details", () => {
    const input = {
      definition,
      tally,
      lifecycle: "partial" as const,
      materializedBallots: ballots,
      lateResponses: [
        {
          voter: "alice",
          questionId: "q-b",
          receivedAt: "2026-08-13T11:00:02Z",
          reason: "received-after-tally",
        },
      ],
      history: [tally],
      timeline,
    };
    const record = renderElectionRecord(input);
    expect(record).toBe(renderElectionRecord(input));
    expect(record.match(/^## Question q-a:/gm)).toHaveLength(1);
    expect(record.match(/^## Question q-b:/gm)).toHaveLength(1);
    expect(record.indexOf("## Question q-a:")).toBeLessThan(record.indexOf("## Question q-b:"));
    expect(record).toContain("Established: yes (choice 1)");
    expect(record).toContain("GoA frequency: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(record).toContain("Hold: split");
    expect(record).toContain("Reservation alice [original:2026-08-13T10:00:00Z] GoA 2: A reservation");
    expect(record).toContain("Late alice at 2026-08-13T11:00:02Z: received-after-tally");
    expect(record).toContain("Run lineage: run-1");
  });

  test("verifier enumerates section tampering and history/current drift", () => {
    const base = {
      definition,
      ledgerBallots: ballots,
      materializedBallots: ballots,
      history: [tally],
      currentTally: tally,
      lifecycle: "partial" as const,
      lateResponses: [],
      timeline,
    };
    const validRecord = renderElectionRecord({
      definition,
      tally,
      lifecycle: "partial",
      materializedBallots: ballots,
      lateResponses: [],
      history: [tally],
      timeline,
    });
    expect(verifyElectionRecord({ ...base, record: validRecord })).toEqual({ ok: true, value: undefined });

    const altered = validRecord.replace("## Question q-b: Adopt B?", "## Question q-a: Adopt B?");
    const changedCurrent = {
      ...tally,
      runId: "run-2",
      talliedAt: "2026-08-13T12:00:00Z",
    };
    const result = verifyElectionRecord({ ...base, currentTally: changedCurrent, record: altered });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected findings");
    expect(result.error.map((finding) => finding.kind)).toEqual(
      expect.arrayContaining(["duplicate-question", "missing-question", "history-mismatch"]),
    );
    expect(result.error.filter((finding) => finding.questionId === "q-a").length).toBeGreaterThan(0);
  });
});

describe("U4 delivery booking", () => {
  test("same run and voter is byte-idempotent while a different view conflicts", () => {
    const execution = reportDelivery("alice", "2026-08-13T12:00:00.123Z");
    const first = canonicalizeDeliveryRecord(
      execution,
      definition.electionId,
      "distribution-1",
      "/views/alice.json",
    );
    expect(Object.keys(first).sort()).toEqual([
      "at",
      "distributionRunId",
      "electionId",
      "fingerprint",
      "provenance",
      "transport",
      "viewPath",
      "voter",
    ]);
    expect(first.at).toBe("2026-08-13T12:00:00Z");

    const booked = bookDelivery([], first);
    expect(booked).toMatchObject({ ok: true, value: { status: "booked" } });
    if (!booked.ok) throw new Error("expected booking");
    const retry = bookDelivery(booked.value.records, first);
    expect(retry).toMatchObject({ ok: true, value: { status: "idempotent" } });
    if (!retry.ok) throw new Error("expected idempotent retry");
    expect(retry.value.records).toBe(booked.value.records);

    const conflict = canonicalizeDeliveryRecord(
      execution,
      definition.electionId,
      "distribution-1",
      "/views/other.json",
    );
    expect(bookDelivery(booked.value.records, conflict)).toEqual({
      ok: false,
      error: "delivery-conflict",
    });
  });
});
