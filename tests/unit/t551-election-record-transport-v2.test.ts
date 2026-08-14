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

  test("renders the latest reservation by receipt time rather than ballot array order", () => {
    const original = ballots[0]!;
    const latestAmend: CanonicalBallot = {
      ...original,
      kind: "amend",
      ref: {
        electionId: original.electionId,
        voter: original.voter,
        submittedAt: original.submittedAt,
      },
      responses: [
        {
          questionId: "q-a",
          choiceInternalNo: 1,
          goa: 3,
          reservation: "Latest reservation",
          rationale: null,
        },
      ],
      submittedAt: "2026-08-13T10:00:04Z",
      receivedAt: "2026-08-13T10:00:05Z",
    };
    const record = renderElectionRecord({
      definition,
      tally,
      lifecycle: "partial",
      materializedBallots: [latestAmend, ...ballots],
      lateResponses: [],
      history: [tally],
      timeline,
    });

    expect(record).toContain(
      "Reservation alice [amend:2026-08-13T10:00:04Z] GoA 3: Latest reservation",
    );
    expect(record).not.toContain("GoA 2: A reservation");
  });

  test("verifier rejects a current hold that cannot be independently reproduced", () => {
    const forgedTally: CanonicalTally = {
      ...tally,
      results: tally.results.map((result) =>
        result.questionId === "q-a"
          ? {
              questionId: "q-a",
              kind: "hold" as const,
              reason: "quorum-short" as const,
              counts: { favor: 2, against: 0, abstain: 0, discuss: 0 },
            }
          : result,
      ),
    };
    const record = renderElectionRecord({
      definition,
      tally: forgedTally,
      lifecycle: "partial",
      materializedBallots: ballots,
      lateResponses: [],
      history: [forgedTally],
      timeline,
    });
    const result = verifyElectionRecord({
      definition,
      ledgerBallots: ballots,
      materializedBallots: ballots,
      history: [forgedTally],
      currentTally: forgedTally,
      lifecycle: "partial",
      lateResponses: [],
      timeline,
      record,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected findings");
    expect(result.error).toContainEqual(
      expect.objectContaining({ kind: "result-mismatch", questionId: "q-a" }),
    );
  });

  test("verifier enumerates remaining mismatch arms without rewriting the record", () => {
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

    const unknownSection = `${validRecord}\n\n## Question q-z: Unknown?\nHold: tie\n`;
    const unknownSectionResult = verifyElectionRecord({ ...base, record: unknownSection });
    expect(unknownSectionResult.ok).toBe(false);
    if (!unknownSectionResult.ok) {
      expect(unknownSectionResult.error).toContainEqual(
        expect.objectContaining({ kind: "result-mismatch" }),
      );
    }

    const swappedOrder = validRecord
      .replace("## Question q-a:", "## Question q-tmp:")
      .replace("## Question q-b:", "## Question q-a:")
      .replace("## Question q-tmp:", "## Question q-b:");
    const swappedOrderResult = verifyElectionRecord({ ...base, record: swappedOrder });
    expect(swappedOrderResult.ok).toBe(false);
    if (!swappedOrderResult.ok) {
      expect(swappedOrderResult.error).toContainEqual(
        expect.objectContaining({ kind: "result-mismatch" }),
      );
    }

    const timelineTamper = validRecord.replace("## Timeline", "## Timeline\n- extra");
    const timelineTamperResult = verifyElectionRecord({ ...base, record: timelineTamper });
    expect(timelineTamperResult.ok).toBe(false);
    if (!timelineTamperResult.ok) {
      expect(timelineTamperResult.error).toContainEqual(
        expect.objectContaining({ kind: "timeline-order" }),
      );
    }

    const leftover = validRecord.replace("GoA frequency:", "GoA frequencies:");
    const leftoverResult = verifyElectionRecord({ ...base, record: leftover });
    expect(leftoverResult.ok).toBe(false);
    if (!leftoverResult.ok) {
      expect(leftoverResult.error).toContainEqual(expect.objectContaining({ kind: "count-mismatch" }));
    }

    const ledgerOnly = ballots.slice(0, 1);
    const ledgerOnlyResult = verifyElectionRecord({
      ...base,
      ledgerBallots: ledgerOnly,
      materializedBallots: ballots,
      record: validRecord,
    });
    expect(ledgerOnlyResult.ok).toBe(false);
    if (!ledgerOnlyResult.ok) {
      expect(ledgerOnlyResult.error).toContainEqual(expect.objectContaining({ kind: "result-mismatch" }));
    }

    const countTamper: CanonicalTally = {
      ...tally,
      results: tally.results.map((result) =>
        result.kind === "established"
          ? { ...result, goa: { ...result.goa, favor: 99 }, choiceCounts: result.choiceCounts.map((count) => ({ ...count, count: count.internalNo === 1 ? 99 : 0 })) }
          : result,
      ),
    };
    const countTamperResult = verifyElectionRecord({
      ...base,
      currentTally: countTamper,
      history: [countTamper],
      record: renderElectionRecord({
        definition,
        tally: countTamper,
        lifecycle: "partial",
        materializedBallots: ballots,
        lateResponses: [],
        history: [countTamper],
        timeline,
      }),
    });
    expect(countTamperResult.ok).toBe(false);
    if (!countTamperResult.ok) {
      expect(countTamperResult.error).toContainEqual(expect.objectContaining({ kind: "count-mismatch" }));
    }

    const winnerTamper: CanonicalTally = {
      ...tally,
      results: tally.results.map((result) =>
        result.kind === "established"
          ? { ...result, winner: { internalNo: 2, label: "no" } }
          : result,
      ),
    };
    const winnerTamperResult = verifyElectionRecord({
      ...base,
      currentTally: winnerTamper,
      history: [winnerTamper],
      record: renderElectionRecord({
        definition,
        tally: winnerTamper,
        lifecycle: "partial",
        materializedBallots: ballots,
        lateResponses: [],
        history: [winnerTamper],
        timeline,
      }),
    });
    expect(winnerTamperResult.ok).toBe(false);
    if (!winnerTamperResult.ok) {
      expect(winnerTamperResult.error).toContainEqual(expect.objectContaining({ kind: "result-mismatch" }));
    }

    const missingResult: CanonicalTally = {
      ...tally,
      results: tally.results.filter((result) => result.questionId !== "q-b"),
    };
    const missingResultResult = verifyElectionRecord({
      ...base,
      currentTally: missingResult,
      history: [missingResult],
      record: validRecord,
    });
    expect(missingResultResult.ok).toBe(false);
    if (!missingResultResult.ok) {
      expect(missingResultResult.error).toContainEqual(expect.objectContaining({ kind: "result-mismatch" }));
    }

    const lifecycleTalliedResult = verifyElectionRecord({
      ...base,
      lifecycle: "tallied",
      record: validRecord,
    });
    expect(lifecycleTalliedResult.ok).toBe(false);
    if (!lifecycleTalliedResult.ok) {
      expect(lifecycleTalliedResult.error).toContainEqual(expect.objectContaining({ kind: "result-mismatch" }));
    }

    const prior = {
      ...tally,
      runId: "run-0",
      talliedAt: "2026-08-13T10:00:00Z",
      results: tally.results.map((result) =>
        result.questionId === "q-a"
          ? {
              questionId: "q-a",
              kind: "established" as const,
              winner: { internalNo: 2, label: "no" },
              choiceCounts: [
                { internalNo: 1, label: "yes", count: 0 },
                { internalNo: 2, label: "no", count: 2 },
              ],
              goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
            }
          : result,
      ),
    };
    const rerun: CanonicalTally = {
      ...tally,
      runId: "run-2",
      targetQuestionIds: ["q-b"],
      preservedResultDigest: "sha256:" + "0".repeat(64),
      talliedAt: "2026-08-13T12:00:00Z",
    };
    const digestMismatchResult = verifyElectionRecord({
      ...base,
      history: [prior, rerun],
      currentTally: rerun,
      record: renderElectionRecord({
        definition,
        tally: rerun,
        lifecycle: "partial",
        materializedBallots: ballots,
        lateResponses: [],
        history: [prior, rerun],
        timeline: [
          { schemaVersion: 2, kind: "tallied", runId: "run-0", at: "2026-08-13T10:00:00Z" },
          { schemaVersion: 2, kind: "tallied", runId: "run-2", at: "2026-08-13T12:00:00Z" },
        ],
      }),
    });
    expect(digestMismatchResult.ok).toBe(false);
    if (!digestMismatchResult.ok) {
      expect(digestMismatchResult.error).toContainEqual(expect.objectContaining({ kind: "digest-mismatch" }));
    }

    const timelineFinalResult = verifyElectionRecord({
      ...base,
      record: validRecord,
      timeline: [
        { schemaVersion: 2, kind: "tallied", runId: "run-1", at: "2026-08-13T12:00:00Z" },
        { schemaVersion: 2, kind: "tallied", runId: "missing-run", at: "2026-08-13T11:00:00Z", questionIds: ["q-z"] },
      ],
    });
    expect(timelineFinalResult.ok).toBe(false);
    if (!timelineFinalResult.ok) {
      expect(timelineFinalResult.error).toContainEqual(expect.objectContaining({ kind: "timeline-order" }));
    }

    const discussBallots: CanonicalBallot[] = ballots.map((entry) => ({
      ...entry,
      responses: entry.responses.map((response) => ({ ...response, goa: 5 })),
    }));
    const discussTally: CanonicalTally = {
      ...tally,
      results: tally.results.map((result) =>
        result.kind === "established"
          ? { ...result, goa: { favor: 0, against: 0, abstain: 0, discuss: 2 } }
          : { ...result, counts: { favor: 0, against: 0, abstain: 0, discuss: 2 } },
      ),
    };
    const discussResult = verifyElectionRecord({
      ...base,
      ledgerBallots: discussBallots,
      materializedBallots: discussBallots,
      currentTally: discussTally,
      history: [discussTally],
      record: renderElectionRecord({
        definition,
        tally: discussTally,
        lifecycle: "partial",
        materializedBallots: discussBallots,
        lateResponses: [],
        history: [discussTally],
        timeline,
      }),
    });
    expect(discussResult.ok).toBe(false);
    if (!discussResult.ok) {
      expect(discussResult.error).toContainEqual(expect.objectContaining({ kind: "result-mismatch" }));
    }

    const emptyTargetsResult = verifyElectionRecord({
      ...base,
      currentTally: { ...tally, targetQuestionIds: [] },
      record: validRecord,
    });
    expect(emptyTargetsResult.ok).toBe(false);
    if (!emptyTargetsResult.ok) {
      expect(emptyTargetsResult.error).toContainEqual(expect.objectContaining({ kind: "result-mismatch" }));
    }
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
