// covers: object:ElectionDefinitionCodec
// size: small
import { describe, expect, test } from "bun:test";
import {
  BallotV2Codec,
  ElectionDefinitionCodec,
  LEGACY_QUESTION_ID,
  TallyV2Codec,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";

const legacyDefinition = {
  electionId: "E-LEGACY",
  kind: "zero-confirm",
  question: "0件でよいか",
  choices: [{ internalNo: 1, label: "可" }],
  voters: ["alice", "bob"],
};

const v2Definition = {
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
  test("normalizes a strict legacy scalar definition into one canonical question", () => {
    const decoded = ElectionDefinitionCodec.decode(legacyDefinition);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value).toEqual({
      schemaVersion: 2,
      electionId: "E-LEGACY",
      kind: "zero-confirm",
      questions: [
        {
          questionId: LEGACY_QUESTION_ID,
          text: "0件でよいか",
          choices: [{ internalNo: 1, label: "可" }],
        },
      ],
      voters: ["alice", "bob"],
    });
  });

  test("accepts v2 multi-question definitions and permits internalNo reuse across questions", () => {
    expect(ElectionDefinitionCodec.decode(v2Definition)).toEqual({ ok: true, value: v2Definition });
  });

  test("rejects hybrid, unknown version, unknown fields, and reserved authored question ids", () => {
    expect(
      ElectionDefinitionCodec.decode({ ...legacyDefinition, schemaVersion: 2 }),
    ).toMatchObject({ ok: false, error: { category: "ambiguous-schema", path: "$" } });
    expect(
      ElectionDefinitionCodec.decode({ ...v2Definition, schemaVersion: 3 }),
    ).toMatchObject({
      ok: false,
      error: { category: "unsupported-version", path: "$.schemaVersion" },
    });
    expect(ElectionDefinitionCodec.decode({ ...v2Definition, extra: true })).toMatchObject({
      ok: false,
      error: { category: "unknown-field", path: "$.extra" },
    });
    const reserved = {
      ...v2Definition,
      questions: [{ ...v2Definition.questions[0], questionId: LEGACY_QUESTION_ID }],
    };
    expect(ElectionDefinitionCodec.decode(reserved)).toMatchObject({
      ok: false,
      error: { category: "invalid-value", path: "$.questions[0].questionId" },
    });
    for (const questionId of ["", "  "]) {
      expect(
        ElectionDefinitionCodec.decode({
          ...v2Definition,
          questions: [{ ...v2Definition.questions[0], questionId }],
        }),
      ).toMatchObject({
        ok: false,
        error: { category: "invalid-value", path: "$.questions[0].questionId" },
      });
    }
    expect(
      ElectionDefinitionCodec.decode({
        ...v2Definition,
        questions: [v2Definition.questions[0], v2Definition.questions[0]],
      }),
    ).toMatchObject({ ok: false, error: { category: "duplicate-id", path: "$.questions" } });
    expect(
      ElectionDefinitionCodec.decode({
        ...v2Definition,
        questions: [
          {
            ...v2Definition.questions[0],
            choices: [v2Definition.questions[0].choices[0], v2Definition.questions[0].choices[0]],
          },
        ],
      }),
    ).toMatchObject({
      ok: false,
      error: { category: "duplicate-id", path: "$.questions[0].choices" },
    });
  });

  test("normalizes a legacy scalar ballot and orders v2 responses only when encoding", () => {
    const legacy = ElectionDefinitionCodec.decode(legacyDefinition);
    if (!legacy.ok) throw new Error("legacy definition must decode");
    const legacyBallot = {
      electionId: "E-LEGACY",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 2,
      reservation: "留保",
      rationale: null,
      submittedAt: "2026-08-13T00:00:00Z",
    };
    const first = BallotV2Codec.decode(legacyBallot, legacy.value, {
      targetQuestionIds: [LEGACY_QUESTION_ID],
    });
    const second = BallotV2Codec.decode(legacyBallot, legacy.value, {
      targetQuestionIds: [LEGACY_QUESTION_ID],
    });
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      ok: true,
      value: {
        schemaVersion: 2,
        kind: "original",
        responses: [{ questionId: LEGACY_QUESTION_ID, choiceInternalNo: 1, goa: 2 }],
      },
    });

    const definition = ElectionDefinitionCodec.decode(v2Definition);
    if (!definition.ok) throw new Error("v2 definition must decode");
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
    const decoded = BallotV2Codec.decode(raw, definition.value, {
      targetQuestionIds: ["q-1", "q-2"],
    });
    if (!decoded.ok) throw new Error(`ballot must decode: ${decoded.error.category}`);
    expect(decoded.value.responses.map((response) => response.questionId)).toEqual(["q-2", "q-1"]);
    const encoded = BallotV2Codec.encode(decoded.value, definition.value, {
      targetQuestionIds: ["q-1", "q-2"],
    });
    if (!encoded.ok) throw new Error("ballot must encode");
    expect(JSON.parse(encoded.value).responses.map((response: { questionId: string }) => response.questionId)).toEqual(["q-1", "q-2"]);
  });

  test("rejects invalid ballot references, duplicates, and response coverage", () => {
    const definition = ElectionDefinitionCodec.decode(v2Definition);
    if (!definition.ok) throw new Error("v2 definition must decode");
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
      BallotV2Codec.decode(
        { ...base, responses: [{ ...base.responses[0], questionId: "missing" }, base.responses[1]] },
        definition.value,
        context,
      ),
    ).toMatchObject({ ok: false, error: { category: "missing-reference" } });
    expect(
      BallotV2Codec.decode(
        { ...base, responses: [base.responses[0], base.responses[0]] },
        definition.value,
        context,
      ),
    ).toMatchObject({ ok: false, error: { category: "duplicate-id", path: "$.responses" } });
    expect(
      BallotV2Codec.decode(
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
      BallotV2Codec.decode(amend, definition.value, {
        targetQuestionIds: ["q-1", "q-2"],
        establishedQuestionIds: ["q-1"],
      }),
    ).toMatchObject({ ok: false, error: { category: "invalid-value", path: "$.responses" } });
    expect(
      BallotV2Codec.decode(
        { ...amend, ref: { ...amend.ref, voter: "bob" } },
        definition.value,
        context,
      ),
    ).toMatchObject({ ok: false, error: { category: "missing-reference", path: "$.ref" } });

    const valid = BallotV2Codec.decode(base, definition.value, context);
    if (!valid.ok) throw new Error("baseline ballot must decode");
    expect(
      BallotV2Codec.encode(
        {
          ...valid.value,
          responses: [{ ...valid.value.responses[0], goa: 2, reservation: null }],
        },
        definition.value,
        { targetQuestionIds: ["q-1"] },
      ),
    ).toMatchObject({ ok: false, error: { category: "invalid-value" } });
  });

  test("normalizes legacy tally identity and canonically orders v2 results, counts, and digest input", () => {
    const legacy = ElectionDefinitionCodec.decode(legacyDefinition);
    if (!legacy.ok) throw new Error("legacy definition must decode");
    const legacyTally = {
      result: {
        kind: "established",
        winner: { internalNo: 1, label: "可" },
        choiceCounts: [{ internalNo: 1, label: "可", count: 2 }],
        goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
      },
      talliedAt: "2026-08-13T00:01:00Z",
      ballots: [],
      resolutions: [],
    };
    const legacyFirst = TallyV2Codec.decode(legacyTally, legacy.value);
    const legacySecond = TallyV2Codec.decode(legacyTally, legacy.value);
    expect(legacyFirst).toEqual(legacySecond);
    if (!legacyFirst.ok) throw new Error("legacy tally must decode");
    expect(legacyFirst.value.runId).toMatch(/^legacy-[0-9a-f]{32}$/);
    const legacyBytes = TallyV2Codec.encode(legacyFirst.value, legacy.value);
    expect(legacyBytes).toEqual(TallyV2Codec.encode(legacySecond.ok ? legacySecond.value : legacyFirst.value, legacy.value));
    expect(TallyV2Codec.establishedResultsDigest(legacyFirst.value, legacy.value)).toEqual(
      TallyV2Codec.establishedResultsDigest(legacySecond.ok ? legacySecond.value : legacyFirst.value, legacy.value),
    );

    const legacyHold = TallyV2Codec.decode(
      {
        result: {
          kind: "hold",
          reason: "tie",
          counts: { favor: 1, against: 1, abstain: 0, discuss: 0 },
        },
        talliedAt: "2026-08-13T00:01:00Z",
        ballots: [],
        resolutions: [],
      },
      legacy.value,
    );
    expect(legacyHold).toMatchObject({
      ok: true,
      value: {
        targetQuestionIds: [LEGACY_QUESTION_ID],
        results: [{ questionId: LEGACY_QUESTION_ID, kind: "hold", reason: "tie" }],
      },
    });

    const definition = ElectionDefinitionCodec.decode({
      ...v2Definition,
      questions: v2Definition.questions.map((question) => ({
        ...question,
        choices: [
          ...question.choices,
          { internalNo: 2, label: `${question.questionId}-other` },
        ],
      })),
    });
    if (!definition.ok) throw new Error("v2 definition must decode");
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
    const decoded = TallyV2Codec.decode(raw, definition.value);
    if (!decoded.ok) throw new Error(`tally must decode: ${decoded.error.category}`);
    const encoded = TallyV2Codec.encode(decoded.value, definition.value);
    if (!encoded.ok) throw new Error("tally must encode");
    const wire = JSON.parse(encoded.value);
    expect(wire.targetQuestionIds).toEqual(["q-1", "q-2"]);
    expect(wire.results.map((result: { questionId: string }) => result.questionId)).toEqual(["q-1", "q-2"]);
    expect(wire.results[0].choiceCounts.map((count: { internalNo: number }) => count.internalNo)).toEqual([1, 2]);

    const digest = TallyV2Codec.establishedResultsDigest(decoded.value, definition.value);
    const changedEnvelope = {
      ...decoded.value,
      runId: "run-2",
      talliedAt: "2026-08-13T10:00:00Z",
    };
    expect(TallyV2Codec.establishedResultsDigest(changedEnvelope, definition.value)).toEqual(digest);
    expect(digest).toMatchObject({ ok: true, value: expect.stringMatching(/^sha256:[0-9a-f]{64}$/) });
  });

  test("rejects tally result duplicates, missing coverage, and unknown choice references", () => {
    const definition = ElectionDefinitionCodec.decode(v2Definition);
    if (!definition.ok) throw new Error("v2 definition must decode");
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
    expect(TallyV2Codec.decode({ ...base, results: [hold("q-1"), hold("q-1")] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "duplicate-id", path: "$.results" },
    });
    expect(TallyV2Codec.decode({ ...base, results: [hold("q-1")] }, definition.value)).toMatchObject({
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
    expect(TallyV2Codec.decode({ ...base, results: [badEstablished, hold("q-2")] }, definition.value)).toMatchObject({
      ok: false,
      error: { category: "missing-reference", path: "$.results[0].winner" },
    });
    const valid = TallyV2Codec.decode(base, definition.value);
    if (!valid.ok) throw new Error("baseline tally must decode");
    expect(
      TallyV2Codec.encode(
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
});
