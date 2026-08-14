// covers: file:packages/framework/core/tools/amadeus-election-codec.ts
// size: small
import { describe, expect, test } from "bun:test";
import {
  BallotCodec,
  ElectionDefinitionCodec,
  TallyCodec,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";

// A payload shaped like the pre-multiq single-question format (electionId /
// kind / question / choices / voters, no schemaVersion). The canonical codec
// no longer decodes this shape at all — it is used only as an input that must
// be rejected, never as something the codec normalizes.
const legacyShapeDefinition = {
  electionId: "E-LEGACY",
  kind: "zero-confirm",
  question: "0件でよいか",
  choices: [{ internalNo: 1, label: "可" }],
  voters: ["alice", "bob"],
};

const multiQuestionDefinition = {
  schemaVersion: 2 as const,
  electionId: "E-V2",
  kind: "decision",
  questions: [
    {
      questionId: "q-1",
      text: "第一問",
      choices: [{ internalNo: 1, label: "A" }],
    },
    {
      questionId: "q-2",
      text: "第二問",
      choices: [{ internalNo: 1, label: "B", description: "同じ番号を別問で再利用" }],
    },
  ],
  voters: ["alice", "bob"],
};

describe("t547 canonical election codec", () => {
  test("accepts multi-question definitions and permits internalNo reuse across questions", () => {
    expect(ElectionDefinitionCodec.decode(multiQuestionDefinition)).toEqual({
      ok: true,
      value: multiQuestionDefinition,
    });
  });

  test("rejects unsupported version, unknown fields, and invalid question identifiers", () => {
    expect(
      ElectionDefinitionCodec.decode({ ...legacyShapeDefinition, schemaVersion: 2 }),
    ).toMatchObject({ ok: false, error: { category: "unknown-field", path: "$.choices" } });
    expect(
      ElectionDefinitionCodec.decode({ ...multiQuestionDefinition, schemaVersion: 3 }),
    ).toMatchObject({
      ok: false,
      error: { category: "unsupported-version", path: "$.schemaVersion" },
    });
    expect(ElectionDefinitionCodec.decode({ ...multiQuestionDefinition, extra: true })).toMatchObject({
      ok: false,
      error: { category: "unknown-field", path: "$.extra" },
    });
    for (const questionId of ["", "  "]) {
      expect(
        ElectionDefinitionCodec.decode({
          ...multiQuestionDefinition,
          questions: [{ ...multiQuestionDefinition.questions[0], questionId }],
        }),
      ).toMatchObject({
        ok: false,
        error: { category: "invalid-value", path: "$.questions[0].questionId" },
      });
    }
    expect(
      ElectionDefinitionCodec.decode({
        ...multiQuestionDefinition,
        questions: [multiQuestionDefinition.questions[0], multiQuestionDefinition.questions[0]],
      }),
    ).toMatchObject({ ok: false, error: { category: "duplicate-id", path: "$.questions" } });
    expect(
      ElectionDefinitionCodec.decode({
        ...multiQuestionDefinition,
        questions: [
          {
            ...multiQuestionDefinition.questions[0],
            choices: [
              multiQuestionDefinition.questions[0].choices[0],
              multiQuestionDefinition.questions[0].choices[0],
            ],
          },
        ],
      }),
    ).toMatchObject({
      ok: false,
      error: { category: "duplicate-id", path: "$.questions[0].choices" },
    });
  });

  test("orders responses on encode without requiring input order to match", () => {
    const definition = ElectionDefinitionCodec.decode(multiQuestionDefinition);
    if (!definition.ok) throw new Error("definition must decode");
    const raw = {
      schemaVersion: 2,
      kind: "original",
      electionId: "E-V2",
      voter: "alice",
      voterKind: "member",
      responses: [
        { questionId: "q-2", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
        { questionId: "q-1", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
      ],
      submittedAt: "2026-08-13T00:00:00Z",
    };
    const decoded = BallotCodec.decode(raw, definition.value, {
      targetQuestionIds: ["q-1", "q-2"],
    });
    if (!decoded.ok) throw new Error(`ballot must decode: ${decoded.error.category}`);
    expect(decoded.value.responses.map((response) => response.questionId)).toEqual(["q-2", "q-1"]);
    const encoded = BallotCodec.encode(decoded.value, definition.value, {
      targetQuestionIds: ["q-1", "q-2"],
    });
    if (!encoded.ok) throw new Error("ballot must encode");
    expect(JSON.parse(encoded.value).responses.map((response: { questionId: string }) => response.questionId)).toEqual(["q-1", "q-2"]);
  });

  test("rejects invalid ballot references, duplicates, and response coverage", () => {
    const definition = ElectionDefinitionCodec.decode(multiQuestionDefinition);
    if (!definition.ok) throw new Error("definition must decode");
    const base = {
      schemaVersion: 2,
      kind: "original",
      electionId: "E-V2",
      voter: "alice",
      voterKind: "member",
      responses: [
        { questionId: "q-1", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
        { questionId: "q-2", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
      ],
      submittedAt: "2026-08-13T00:00:00Z",
    };
    const context = { targetQuestionIds: ["q-1", "q-2"] };
    expect(
      BallotCodec.decode(
        { ...base, responses: [{ ...base.responses[0], questionId: "missing" }, base.responses[1]] },
        definition.value,
        context,
      ),
    ).toMatchObject({ ok: false, error: { category: "missing-reference" } });
    expect(
      BallotCodec.decode(
        { ...base, responses: [base.responses[0], base.responses[0]] },
        definition.value,
        context,
      ),
    ).toMatchObject({ ok: false, error: { category: "duplicate-id", path: "$.responses" } });
    expect(
      BallotCodec.decode(
        { ...base, responses: [base.responses[0]] },
        definition.value,
        context,
      ),
    ).toMatchObject({ ok: false, error: { category: "coverage-mismatch", path: "$.responses" } });

    const amend = {
      ...base,
      kind: "amend",
      ref: {
        electionId: "E-V2",
        voter: "alice",
        submittedAt: "2026-08-12T00:00:00Z",
      },
      responses: [base.responses[0]],
    };
    expect(
      BallotCodec.decode(amend, definition.value, {
        targetQuestionIds: ["q-1", "q-2"],
        establishedQuestionIds: ["q-1"],
      }),
    ).toMatchObject({ ok: false, error: { category: "invalid-value", path: "$.responses" } });
    expect(
      BallotCodec.decode(
        { ...amend, ref: { ...amend.ref, voter: "bob" } },
        definition.value,
        context,
      ),
    ).toMatchObject({ ok: false, error: { category: "missing-reference", path: "$.ref" } });

    const valid = BallotCodec.decode(base, definition.value, context);
    if (!valid.ok) throw new Error("baseline ballot must decode");
    expect(
      BallotCodec.encode(
        {
          ...valid.value,
          responses: [{ ...valid.value.responses[0], goa: 2, reservation: null }],
        },
        definition.value,
        { targetQuestionIds: ["q-1"] },
      ),
    ).toMatchObject({ ok: false, error: { category: "invalid-value" } });
  });

  test("canonically orders v2 results, counts, and digest input", () => {
    const definition = ElectionDefinitionCodec.decode({
      ...multiQuestionDefinition,
      questions: multiQuestionDefinition.questions.map((question) => ({
        ...question,
        choices: [
          ...question.choices,
          { internalNo: 2, label: `${question.questionId}-other` },
        ],
      })),
    });
    if (!definition.ok) throw new Error("definition must decode");
    const counts = { favor: 2, against: 0, abstain: 0, discuss: 0 };
    const established = (questionId: string, winnerLabel: string, otherLabel: string) => ({
      questionId,
      kind: "established",
      winner: { internalNo: 1, label: winnerLabel },
      choiceCounts: [
        { internalNo: 2, label: otherLabel, count: 0 },
        { internalNo: 1, label: winnerLabel, count: 2 },
      ],
      goa: counts,
    });
    const raw = {
      schemaVersion: 2,
      runId: "run-1",
      targetQuestionIds: ["q-2", "q-1"],
      results: [
        established("q-2", "B", "q-2-other"),
        established("q-1", "A", "q-1-other"),
      ],
      preservedResultDigest: null,
      talliedAt: "2026-08-13T00:01:00Z",
    };
    const decoded = TallyCodec.decode(raw, definition.value);
    if (!decoded.ok) throw new Error(`tally must decode: ${decoded.error.category}`);
    const encoded = TallyCodec.encode(decoded.value, definition.value);
    if (!encoded.ok) throw new Error("tally must encode");
    const wire = JSON.parse(encoded.value);
    expect(wire.targetQuestionIds).toEqual(["q-1", "q-2"]);
    expect(wire.results.map((result: { questionId: string }) => result.questionId)).toEqual(["q-1", "q-2"]);
    expect(wire.results[0].choiceCounts.map((count: { internalNo: number }) => count.internalNo)).toEqual([1, 2]);

    const digest = TallyCodec.establishedResultsDigest(decoded.value, definition.value);
    const changedEnvelope = {
      ...decoded.value,
      runId: "run-2",
      talliedAt: "2026-08-13T10:00:00Z",
    };
    expect(TallyCodec.establishedResultsDigest(changedEnvelope, definition.value)).toEqual(digest);
    expect(digest).toMatchObject({ ok: true, value: expect.stringMatching(/^sha256:[0-9a-f]{64}$/) });
  });

  test("rejects tally result duplicates, missing coverage, and unknown choice references", () => {
    const definition = ElectionDefinitionCodec.decode(multiQuestionDefinition);
    if (!definition.ok) throw new Error("definition must decode");
    const hold = (questionId: string) => ({
      questionId,
      kind: "hold",
      reason: "tie",
      counts: { favor: 1, against: 1, abstain: 0, discuss: 0 },
    });
    const base = {
      schemaVersion: 2,
      runId: "run-hold",
      targetQuestionIds: ["q-1", "q-2"],
      results: [hold("q-1"), hold("q-2")],
      preservedResultDigest: null,
      talliedAt: "2026-08-13T00:01:00Z",
    };
    expect(TallyCodec.decode({ ...base, results: [hold("q-1"), hold("q-1")] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "duplicate-id", path: "$.results" },
    });
    expect(TallyCodec.decode({ ...base, results: [hold("q-1")] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "coverage-mismatch", path: "$.results" },
    });
    const badEstablished = {
      questionId: "q-1",
      kind: "established",
      winner: { internalNo: 99, label: "missing" },
      choiceCounts: [{ internalNo: 1, label: "A", count: 2 }],
      goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
    };
    expect(TallyCodec.decode({ ...base, results: [badEstablished, hold("q-2")] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "missing-reference", path: "$.results[0].winner" },
    });
    const valid = TallyCodec.decode(base, definition.value);
    if (!valid.ok) throw new Error("baseline tally must decode");
    expect(
      TallyCodec.encode(
        {
          ...valid.value,
          results: [
            { ...valid.value.results[0], counts: { favor: -1, against: 0, abstain: 0, discuss: 0 } },
            valid.value.results[1],
          ],
        } as typeof valid.value,
        definition.value,
      ),
    ).toMatchObject({ ok: false, error: { category: "invalid-value" } });
  });

  test("rejects remaining definition, ballot, and tally failure arms", () => {
    expect(ElectionDefinitionCodec.decode({
      ...multiQuestionDefinition,
      questions: [{
        questionId: "q-desc",
        text: "Described?",
        choices: [{ internalNo: 1, label: "A", description: "present" }],
      }],
    }).ok).toBe(true);

    expect(ElectionDefinitionCodec.decode({
      ...multiQuestionDefinition,
      questions: [{ ...multiQuestionDefinition.questions[0], choices: [{ internalNo: 1, label: "A", description: 1 }] }],
    })).toMatchObject({ ok: false, error: { category: "shape", path: "$.questions[0].choices[0].description" } });
    expect(ElectionDefinitionCodec.decode({
      ...multiQuestionDefinition,
      questions: [{ ...multiQuestionDefinition.questions[0], choices: [] }],
    })).toMatchObject({ ok: false, error: { category: "shape", path: "$.questions[0].choices" } });
    expect(ElectionDefinitionCodec.decode({ ...multiQuestionDefinition, voters: [] })).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.voters" },
    });
    expect(ElectionDefinitionCodec.decode({ ...multiQuestionDefinition, voters: ["alice", "alice"] })).toMatchObject({
      ok: false,
      error: { category: "duplicate-id", path: "$.voters" },
    });
    expect(ElectionDefinitionCodec.decode({ ...multiQuestionDefinition, questions: [] })).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.questions" },
    });

    const definition = ElectionDefinitionCodec.decode(multiQuestionDefinition);
    if (!definition.ok) throw new Error("definition must decode");
    const context = { targetQuestionIds: ["q-1", "q-2"] };
    const response = {
      questionId: "q-1",
      choiceInternalNo: 1,
      goa: 1,
      reservation: null,
      rationale: null,
    };
    const ballot = {
      schemaVersion: 2,
      kind: "original",
      electionId: "E-V2",
      voter: "alice",
      voterKind: "member",
      responses: [response, { ...response, questionId: "q-2" }],
      submittedAt: "2026-08-13T00:00:00Z",
    };
    expect(BallotCodec.decode({
      ...ballot,
      responses: [{ ...response, choiceInternalNo: 1.5 }, ballot.responses[1]],
    }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.responses[0].choiceInternalNo" },
    });
    expect(BallotCodec.decode({
      ...ballot,
      responses: [{ ...response, goa: 1.5 }, ballot.responses[1]],
    }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.responses[0].goa" },
    });
    expect(BallotCodec.decode({
      ...ballot,
      responses: [{ ...response, reservation: 1 }, ballot.responses[1]],
    }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.responses[0].reservation" },
    });
    expect(BallotCodec.decode({
      ...ballot,
      responses: [{ ...response, rationale: 1 }, ballot.responses[1]],
    }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.responses[0].rationale" },
    });
    expect(BallotCodec.decode({
      ...ballot,
      responses: [{ ...response, choiceInternalNo: 9 }, ballot.responses[1]],
    }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "missing-reference", path: "$.responses[0].choiceInternalNo" },
    });
    expect(BallotCodec.decode({
      ...ballot,
      responses: [{ ...response, goa: 9 }, ballot.responses[1]],
    }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.responses[0].goa" },
    });
    expect(BallotCodec.decode(ballot, definition.value, { targetQuestionIds: [] })).toMatchObject({
      ok: false,
      error: { category: "coverage-mismatch" },
    });
    expect(BallotCodec.decode(ballot, definition.value, { targetQuestionIds: ["missing", "q-2"] })).toMatchObject({
      ok: false,
      error: { category: "missing-reference" },
    });
    expect(BallotCodec.decode({ ...ballot, kind: "other" }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.kind" },
    });
    expect(BallotCodec.decode({ ...ballot, kind: undefined, extraKind: true }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "unknown-field" },
    });
    expect(BallotCodec.decode({ ...ballot, ref: { electionId: "E-V2", voter: "alice", submittedAt: "2026-08-13T00:00:00Z" } }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.ref" },
    });
    expect(BallotCodec.decode({ ...ballot, responses: [] }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.responses" },
    });
    expect(BallotCodec.decode({ ...ballot, choiceInternalNo: 1 }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "unknown-field", path: "$.choiceInternalNo" },
    });
    expect(BallotCodec.decode({ ...ballot, voterKind: "robot" }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.voterKind" },
    });
    expect(BallotCodec.decode({ ...ballot, submittedAt: "yesterday" }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.submittedAt" },
    });
    expect(BallotCodec.decode({ ...ballot, receivedAt: "yesterday" }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.receivedAt" },
    });
    expect(BallotCodec.decode({ ...ballot, electionId: "OTHER" }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "missing-reference", path: "$.electionId" },
    });
    expect(BallotCodec.decode({ ...ballot, voter: "cara" }, definition.value, context)).toMatchObject({
      ok: false,
      error: { category: "missing-reference", path: "$.voter" },
    });

    const amend = {
      ...ballot,
      kind: "amend",
      ref: { electionId: "E-V2", voter: "alice", submittedAt: "not-a-timestamp" },
      responses: [response],
    };
    expect(BallotCodec.decode(amend, definition.value, { targetQuestionIds: ["q-1"] })).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.ref.submittedAt" },
    });
    const validAmend = BallotCodec.decode({
      ...amend,
      ref: { electionId: "E-V2", voter: "alice", submittedAt: "2026-08-12T00:00:00Z" },
    }, definition.value, { targetQuestionIds: ["q-1"] });
    if (!validAmend.ok) throw new Error("amend ballot must decode");
    expect(BallotCodec.encode(validAmend.value, definition.value, { targetQuestionIds: ["q-1"] }).ok).toBe(true);

    const hold = (questionId: string) => ({
      questionId,
      kind: "hold",
      reason: "tie",
      counts: { favor: 1, against: 1, abstain: 0, discuss: 0 },
    });
    const tally = {
      schemaVersion: 2,
      runId: "run-hold",
      targetQuestionIds: ["q-1", "q-2"],
      results: [hold("q-1"), hold("q-2")],
      preservedResultDigest: null,
      talliedAt: "2026-08-13T00:01:00Z",
    };
    expect(TallyCodec.decode({
      ...tally,
      results: [{ ...hold("missing") }, hold("q-2")],
    }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "missing-reference", path: "$.results[0].questionId" },
    });
    expect(TallyCodec.decode({
      ...tally,
      results: [{ ...hold("q-1"), kind: "other" }, hold("q-2")],
    }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.results[0].kind" },
    });
    expect(TallyCodec.decode({
      ...tally,
      results: [{ ...hold("q-1"), reason: "unknown" }, hold("q-2")],
    }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.results[0].reason" },
    });
    expect(TallyCodec.decode({
      ...tally,
      results: [{
        questionId: "q-1",
        kind: "established",
        winner: { internalNo: 1 },
        choiceCounts: [{ internalNo: 1, label: "A", count: 2 }],
        goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
      }, hold("q-2")],
    }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.results[0].winner" },
    });
    expect(TallyCodec.decode({
      ...tally,
      results: [{
        questionId: "q-1",
        kind: "established",
        winner: { internalNo: 1, label: "A" },
        choiceCounts: [
          { internalNo: 1, label: "A", count: 1 },
          { internalNo: 1, label: "A", count: 1 },
        ],
        goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
      }, hold("q-2")],
    }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "duplicate-id", path: "$.results[0].choiceCounts" },
    });
    expect(TallyCodec.decode({
      ...tally,
      results: [{
        questionId: "q-1",
        kind: "established",
        winner: { internalNo: 1, label: "A" },
        choiceCounts: [{ internalNo: 1, label: "A", count: -1 }],
        goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
      }, hold("q-2")],
    }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.results[0].choiceCounts[0]" },
    });
    const twoChoice = ElectionDefinitionCodec.decode({
      ...multiQuestionDefinition,
      questions: [{
        questionId: "q-1",
        text: "Two?",
        choices: [{ internalNo: 1, label: "A" }, { internalNo: 2, label: "B" }],
      }],
    });
    if (!twoChoice.ok) throw new Error("two-choice definition");
    expect(TallyCodec.decode({
      schemaVersion: 2,
      runId: "run-counts",
      targetQuestionIds: ["q-1"],
      results: [{
        questionId: "q-1",
        kind: "established",
        winner: { internalNo: 1, label: "A" },
        choiceCounts: [{ internalNo: 1, label: "A", count: 2 }],
        goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
      }],
      preservedResultDigest: null,
      talliedAt: "2026-08-13T00:01:00Z",
    }, twoChoice.value)).toMatchObject({
      ok: false,
      error: { category: "coverage-mismatch", path: "$.results[0].choiceCounts" },
    });
    expect(TallyCodec.decode({
      ...tally,
      results: [{
        questionId: "q-1",
        kind: "established",
        winner: { internalNo: 1, label: "A" },
        choiceCounts: [{ internalNo: 9, label: "Z", count: 0 }],
        goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
      }, hold("q-2")],
    }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "missing-reference", path: "$.results[0].choiceCounts[0]" },
    });
    expect(TallyCodec.decode({ ...tally, targetQuestionIds: ["q-1", "q-1"] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "duplicate-id", path: "$.targetQuestionIds" },
    });
    expect(TallyCodec.decode({ ...tally, targetQuestionIds: ["missing"] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "missing-reference", path: "$.targetQuestionIds" },
    });
    expect(TallyCodec.decode({ ...tally, targetQuestionIds: [] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.targetQuestionIds" },
    });
    expect(TallyCodec.decode({ ...tally, results: [] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "shape", path: "$.results" },
    });
    expect(TallyCodec.decode({ ...tally, preservedResultDigest: "not-a-digest" }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.preservedResultDigest" },
    });
    expect(TallyCodec.decode({ ...tally, talliedAt: "yesterday" }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.talliedAt" },
    });
    // A pre-multiq singular-result tally shape (no schemaVersion, "result"
    // instead of "results", stray "ballots"/"resolutions" fields) is rejected
    // for lacking the canonical schemaVersion stamp — it is never normalized.
    expect(TallyCodec.decode({
      result: { kind: "hold", reason: "tie", counts: { favor: 1, against: 1, abstain: 0, discuss: 0 } },
      talliedAt: "2026-08-13T00:01:00Z",
      ballots: [],
      resolutions: [],
    }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "unsupported-version", path: "$.schemaVersion" },
    });
  });
});
