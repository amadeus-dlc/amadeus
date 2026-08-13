// covers: function:resolveResponses, function:tallyQuestions
// size: small
import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import type {
  CanonicalBallot,
  CanonicalBallotResponse,
  CanonicalElectionDefinition,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import {
  resolveResponses,
  tallyQuestions,
} from "../../packages/framework/core/tools/amadeus-election-question-tally.ts";

const PBT_SEED = 0x28_13e2;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

const definition: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-PROPERTY",
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
  voters: ["alice", "bob", "cara"],
};

function response(
  questionId: string,
  choiceInternalNo: number,
  goa: number,
): CanonicalBallotResponse {
  return { questionId, choiceInternalNo, goa, reservation: null, rationale: null };
}

function ballot(
  voter: string,
  receivedAt: string | undefined,
  responses: readonly CanonicalBallotResponse[],
): CanonicalBallot {
  return {
    schemaVersion: 2,
    kind: "original",
    electionId: definition.electionId,
    voter,
    voterKind: "subagent",
    responses,
    submittedAt: "2026-08-13T00:00:00Z",
    ...(receivedAt === undefined ? {} : { receivedAt }),
  };
}

describe("t550 election per-question tally properties", () => {
  test("a later append at the same receipt replaces exactly its voter-question pair", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("alice", "bob", "cara"),
        fc.constantFrom("q-a", "q-b"),
        fc.integer({ min: 1, max: 2 }),
        fc.integer({ min: 1, max: 2 }),
        (voter, questionId, beforeChoice, afterChoice) => {
          const resolved = resolveResponses([
            ballot(voter, undefined, [response(questionId, beforeChoice, 1)]),
            ballot(voter, "2026-08-13T00:00:01Z", [response(questionId, beforeChoice, 1)]),
            ballot(voter, "2026-08-13T00:00:01Z", [response(questionId, afterChoice, 1)]),
          ]);
          expect(resolved).toHaveLength(1);
          expect(resolved[0]?.response.choiceInternalNo).toBe(afterChoice);
        },
      ),
      OPTS,
    );
  });

  test("changing question B never changes question A's tally", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            choice: fc.integer({ min: 1, max: 2 }),
            goa: fc.constantFrom(1, 4, 5, 7, 8),
          }),
          { minLength: 3, maxLength: 3 },
        ),
        (questionB) => {
          const ballots = definition.voters.map((voter, index) =>
            ballot(voter, `2026-08-13T00:00:0${index + 1}Z`, [
              response("q-a", 1, 1),
              response("q-b", questionB[index]?.choice ?? 1, questionB[index]?.goa ?? 1),
            ]),
          );
          const together = tallyQuestions(
            definition,
            resolveResponses(ballots),
            ["q-a", "q-b"],
            null,
          );
          expect(together.ok).toBe(true);
          if (!together.ok) return;
          expect(together.value.results[0]).toMatchObject({
            questionId: "q-a",
            kind: "established",
            winner: { internalNo: 1, label: "A1" },
            choiceCounts: [
              { internalNo: 1, label: "A1", count: 3 },
              { internalNo: 2, label: "A2", count: 0 },
            ],
          });
        },
      ),
      OPTS,
    );
  });
});
