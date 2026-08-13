// covers: function:buildDistributionView, function:renderElectionRecord
// size: small
import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import type {
  CanonicalElectionDefinition,
  CanonicalTally,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import {
  buildDistributionView,
  renderElectionRecord,
} from "../../packages/framework/core/tools/amadeus-election-record.ts";

const PBT_SEED = 0x28_13e3;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

const definitionArb: fc.Arbitrary<CanonicalElectionDefinition> = fc
  .uniqueArray(
    fc.record({
      questionId: fc.integer({ min: 0, max: 10_000 }).map((value) => `q-${value}`),
      text: fc.integer().map((value) => `Question ${value}`),
      choices: fc.uniqueArray(
        fc.record({
          internalNo: fc.integer({ min: 1, max: 20 }),
          label: fc.integer().map((value) => `Choice ${value}`),
        }),
        { minLength: 1, maxLength: 6, selector: (choice) => choice.internalNo },
      ),
    }),
    { minLength: 2, maxLength: 5, selector: (question) => question.questionId },
  )
  .map((questions) => ({
    schemaVersion: 2,
    electionId: "E-PROPERTY-VIEW",
    kind: "decision",
    questions,
    voters: ["alice"],
  }));

function tally(definition: CanonicalElectionDefinition): CanonicalTally {
  return {
    schemaVersion: 2,
    runId: "run-property",
    targetQuestionIds: definition.questions.map((question) => question.questionId),
    results: definition.questions.map((question) => ({
      questionId: question.questionId,
      kind: "hold" as const,
      reason: "quorum-short" as const,
      counts: { favor: 0, against: 0, abstain: 0, discuss: 0 },
    })),
    preservedResultDigest: null,
    talliedAt: "2026-08-13T00:00:00Z",
  };
}

describe("t552 election record and transport properties", () => {
  test("every generated question is isolated, complete, blind, and deterministic", () => {
    fc.assert(
      fc.property(definitionArb, (definition) => {
        const first = buildDistributionView(definition, "alice");
        const second = buildDistributionView(definition, "alice");
        expect(first).toEqual(second);
        expect(first.questions.map((question) => question.questionId)).toEqual(
          definition.questions.map((question) => question.questionId),
        );
        for (const [index, question] of first.questions.entries()) {
          const source = definition.questions[index]!;
          expect(new Set(question.ordered.map((choice) => choice.internalNo))).toEqual(
            new Set(source.choices.map((choice) => choice.internalNo)),
          );
          expect(question.ordered.map((choice) => choice.displayNo)).toEqual(
            source.choices.map((_, choiceIndex) => choiceIndex + 1),
          );
        }
        expect(JSON.stringify(first)).not.toMatch(/recommend|peer|status|response/i);

        const recordInput = {
          definition,
          tally: tally(definition),
          lifecycle: "partial" as const,
          materializedBallots: [],
          lateResponses: [],
          history: [tally(definition)],
          timeline: [],
        };
        expect(renderElectionRecord(recordInput)).toBe(renderElectionRecord(recordInput));
      }),
      OPTS,
    );
  });
});
