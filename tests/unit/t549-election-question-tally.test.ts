// covers: function:resolveResponses, function:classifyLateResponses, function:canEarlyTally, function:tallyQuestions, function:deriveLifecycle
// size: small
import { describe, expect, test } from "bun:test";
import type {
  CanonicalBallot,
  CanonicalElectionDefinition,
  CanonicalTally,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import {
  canEarlyTally,
  classifyLateResponses,
  deriveLifecycle,
  resolveResponses,
  tallyQuestions,
} from "../../packages/framework/core/tools/amadeus-election-question-tally.ts";

const definition: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-MULTI",
  kind: "decision",
  questions: [
    {
      questionId: "q-a",
      text: "A",
      choices: [
        { internalNo: 1, label: "A1" },
        { internalNo: 2, label: "A2" },
      ],
    },
    {
      questionId: "q-b",
      text: "B",
      choices: [
        { internalNo: 1, label: "B1" },
        { internalNo: 2, label: "B2" },
      ],
    },
  ],
  voters: ["alice", "bob"],
};

function ballot(
  voter: string,
  receivedAt: string | undefined,
  responses: CanonicalBallot["responses"],
): CanonicalBallot {
  return {
    schemaVersion: 2,
    kind: "original",
    electionId: definition.electionId,
    voter,
    voterKind: "member",
    responses,
    submittedAt: "2026-08-13T00:00:00Z",
    ...(receivedAt === undefined ? {} : { receivedAt }),
  };
}

const favorA1 = { questionId: "q-a", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null };
const favorB1 = { questionId: "q-b", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null };

describe("t549 election per-question tally", () => {
  test("resolves by voter and question on receipt time, with append-later ties and legacy rows first", () => {
    const resolved = resolveResponses(definition, [
      ballot("alice", undefined, [favorA1, favorB1]),
      ballot("alice", "2026-08-13T00:00:01Z", [
        { ...favorA1, choiceInternalNo: 2 },
        favorB1,
      ]),
      ballot("alice", "2026-08-13T00:00:01Z", [
        { ...favorA1, choiceInternalNo: 1 },
        { ...favorB1, choiceInternalNo: 2 },
      ]),
      ballot("bob", "2026-08-13T00:00:00Z", [favorA1, favorB1]),
    ]);

    expect(resolved.map(({ voter, response }) => [voter, response.questionId, response.choiceInternalNo])).toEqual([
      ["alice", "q-a", 1],
      ["alice", "q-b", 2],
      ["bob", "q-a", 1],
      ["bob", "q-b", 1],
    ]);
  });

  test("normalizes resolved responses to definition voter and question order", () => {
    const resolved = resolveResponses(definition, [
      ballot("bob", "2026-08-13T00:00:02Z", [favorB1, favorA1]),
      ballot("alice", "2026-08-13T00:00:01Z", [favorB1, favorA1]),
    ]);

    expect(resolved.map(({ voter, response }) => [voter, response.questionId])).toEqual([
      ["alice", "q-a"],
      ["alice", "q-b"],
      ["bob", "q-a"],
      ["bob", "q-b"],
    ]);
  });

  test("isolates same internalNo across questions and assembles mixed established and hold results", () => {
    const resolved = resolveResponses(definition, [
      ballot("alice", "2026-08-13T00:00:01Z", [favorA1, favorB1]),
      ballot("bob", "2026-08-13T00:00:02Z", [
        favorA1,
        { ...favorB1, choiceInternalNo: 2 },
      ]),
    ]);
    const result = tallyQuestions(definition, resolved, ["q-a", "q-b"], null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lifecycle).toBe("partial");
    expect(result.value.results).toMatchObject([
      { questionId: "q-a", kind: "established", winner: { internalNo: 1, label: "A1" } },
      { questionId: "q-b", kind: "hold", reason: "tie" },
    ]);
    expect(result.value.targetResults).toEqual(result.value.results);
    expect(result.value.preservedResultDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(deriveLifecycle(result.value.results)).toBe("partial");
  });

  test("preserves established questions on a hold-only rerun without mutating the prior tally", () => {
    const first = tallyQuestions(
      definition,
      resolveResponses(definition, [
        ballot("alice", "2026-08-13T00:00:01Z", [favorA1, favorB1]),
        ballot("bob", "2026-08-13T00:00:02Z", [favorA1, { ...favorB1, choiceInternalNo: 2 }]),
      ]),
      ["q-a", "q-b"],
      null,
    );
    if (!first.ok) throw new Error(first.error.category);
    const prior: CanonicalTally = {
      schemaVersion: 2,
      runId: "run-1",
      targetQuestionIds: ["q-a", "q-b"],
      results: first.value.results,
      preservedResultDigest: first.value.preservedResultDigest,
      talliedAt: "2026-08-13T00:01:00Z",
    };
    const snapshot = JSON.stringify(prior);
    const rerun = tallyQuestions(
      definition,
      resolveResponses(definition, [
        ballot("alice", "2026-08-13T00:02:01Z", [favorB1]),
        ballot("bob", "2026-08-13T00:02:02Z", [favorB1]),
      ]),
      ["q-b"],
      prior,
    );
    expect(rerun.ok).toBe(true);
    if (!rerun.ok) return;
    expect(rerun.value.lifecycle).toBe("tallied");
    expect(rerun.value.targetResults).toMatchObject([{ questionId: "q-b", kind: "established" }]);
    expect(rerun.value.results[0]).toBe(prior.results[0]);
    expect(JSON.stringify(prior)).toBe(snapshot);

    expect(
      tallyQuestions(definition, [], ["q-b"], { ...prior, preservedResultDigest: `sha256:${"0".repeat(64)}` }),
    ).toMatchObject({ ok: false, error: { category: "preservation-mismatch" } });
  });

  test("classifies each response against its own boundary and flags a late block without reopening", () => {
    const mixed = ballot("alice", "2026-08-13T00:02:00Z", [favorA1, { ...favorB1, goa: 8 }]);
    const classified = classifyLateResponses(
      new Map([
        ["q-a", "2026-08-13T00:03:00Z"],
        ["q-b", "2026-08-13T00:01:00Z"],
      ]),
      mixed.receivedAt as string,
      mixed,
    );
    expect(classified.onTime.map(({ response }) => response.questionId)).toEqual(["q-a"]);
    expect(classified.late).toMatchObject([
      { response: { questionId: "q-b" }, reexamRequired: true },
    ]);
  });

  test("calculates early eligibility independently per question", () => {
    const threeVoters = { ...definition, voters: ["alice", "bob", "cara"] };
    const resolved = resolveResponses(threeVoters, [
      ballot("alice", "2026-08-13T00:00:01Z", [favorA1, favorB1]),
      ballot("bob", "2026-08-13T00:00:02Z", [favorA1, { ...favorB1, goa: 8 }]),
    ]);
    expect(canEarlyTally(threeVoters, resolved, ["q-a", "q-b"])).toEqual(
      new Map([
        ["q-a", true],
        ["q-b", false],
      ]),
    );
  });

  test("applies the two-voter and three-plus GoA hold policies before winner selection", () => {
    const single = { ...definition, questions: [definition.questions[0]] };
    const outcome = (voters: readonly string[], goas: readonly number[]) => {
      const election = { ...single, voters };
      const responses = voters.slice(0, goas.length).map((voter, index) =>
        ballot(voter, `2026-08-13T00:00:0${index + 1}Z`, [
          { ...favorA1, goa: goas[index] as number },
        ]),
      );
      const result = tallyQuestions(election, resolveResponses(election, responses), ["q-a"], null);
      if (!result.ok) throw new Error(result.error.category);
      return result.value.results[0];
    };

    expect(outcome(["alice", "bob"], [1])).toMatchObject({ kind: "hold", reason: "quorum-short" });
    expect(outcome(["alice", "bob"], [1, 8])).toMatchObject({ kind: "hold", reason: "block" });
    expect(outcome(["alice", "bob"], [1, 5])).toMatchObject({ kind: "hold", reason: "discussion-needed" });
    expect(outcome(["alice", "bob"], [1, 4])).toMatchObject({ kind: "hold", reason: "quorum-short" });
    expect(outcome(["alice", "bob"], [1, 7])).toMatchObject({ kind: "hold", reason: "split" });
    expect(outcome(["alice", "bob", "cara"], [5, 5, 1])).toMatchObject({
      kind: "hold",
      reason: "discussion-needed",
    });
    expect(outcome(["alice", "bob", "cara"], [4, 4, 4])).toMatchObject({
      kind: "hold",
      reason: "quorum-short",
    });
  });

  test("excludes GoA 4 from choice winner counts", () => {
    const election = {
      ...definition,
      questions: [definition.questions[0]],
      voters: ["alice", "bob", "cara"],
    };
    const result = tallyQuestions(
      election,
      resolveResponses(election, [
        ballot("alice", "2026-08-13T00:00:01Z", [{ ...favorA1, choiceInternalNo: 2, goa: 4 }]),
        ballot("bob", "2026-08-13T00:00:02Z", [favorA1]),
        ballot("cara", "2026-08-13T00:00:03Z", [favorA1]),
      ]),
      ["q-a"],
      null,
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        results: [
          {
            kind: "established",
            winner: { internalNo: 1 },
            choiceCounts: [{ internalNo: 1, count: 2 }, { internalNo: 2, count: 0 }],
          },
        ],
      },
    });
  });

  test("fails closed for invalid partitions and response coverage", () => {
    expect(tallyQuestions(definition, [], ["q-a", "q-a"], null)).toMatchObject({
      ok: false,
      error: { category: "target-invalid" },
    });
    expect(tallyQuestions(definition, [], ["missing"], null)).toMatchObject({
      ok: false,
      error: { category: "target-invalid", questionId: "missing" },
    });
    const first = tallyQuestions(definition, [], ["q-a", "q-b"], null);
    if (!first.ok) throw new Error(first.error.category);
    const prior: CanonicalTally = {
      schemaVersion: 2,
      runId: "run",
      targetQuestionIds: ["q-a", "q-b"],
      results: first.value.results,
      preservedResultDigest: first.value.preservedResultDigest,
      talliedAt: "2026-08-13T00:01:00Z",
    };
    expect(tallyQuestions(definition, [], ["q-a"], prior)).toMatchObject({
      ok: false,
      error: { category: "result-coverage" },
    });

    const established = tallyQuestions(
      definition,
      resolveResponses(definition, [
        ballot("alice", "2026-08-13T00:00:01Z", [favorA1, favorB1]),
        ballot("bob", "2026-08-13T00:00:02Z", [favorA1, favorB1]),
      ]),
      ["q-a", "q-b"],
      null,
    );
    if (!established.ok) throw new Error(established.error.category);
    const establishedPrior: CanonicalTally = {
      schemaVersion: 2,
      runId: "established-run",
      targetQuestionIds: ["q-a", "q-b"],
      results: established.value.results,
      preservedResultDigest: established.value.preservedResultDigest,
      talliedAt: "2026-08-13T00:01:00Z",
    };
    expect(tallyQuestions(definition, [], ["q-a"], establishedPrior)).toMatchObject({
      ok: false,
      error: { category: "target-preserved-overlap", questionId: "q-a" },
    });

    const invalid = resolveResponses(definition, [
      ballot("mallory", "2026-08-13T00:00:01Z", [favorA1]),
    ]);
    expect(tallyQuestions(definition, invalid, ["q-a", "q-b"], null)).toMatchObject({
      ok: false,
      error: { category: "response-coverage" },
    });
  });
});
