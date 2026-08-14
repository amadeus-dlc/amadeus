// covers: function:buildDistributionView, function:renderElectionRecord
// size: small
import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import type {
  CanonicalBallot,
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

// Mirrors the reservation-triggering GoA codes documented alongside
// questionReservations in amadeus-election-record.ts (2/3/6).
const RESERVATION_GOA = new Set([2, 3, 6]);

const definitionArb: fc.Arbitrary<CanonicalElectionDefinition> = fc
  .tuple(
    fc.uniqueArray(
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
    ),
    fc.uniqueArray(fc.integer({ min: 0, max: 10_000 }).map((value) => `voter-${value}`), {
      minLength: 2,
      maxLength: 4,
    }),
  )
  .map(([questions, voters]) => ({
    schemaVersion: 2 as const,
    electionId: "E-PROPERTY-VIEW",
    kind: "decision",
    questions,
    voters,
  }));

// One response per (voter, question), choosing among the question's real
// choices. The first voter's first-question response is forced onto a
// reservation-triggering GoA so the reservation render path is exercised on
// every generated case, not just some fraction of them.
function ballotsArbFor(definition: CanonicalElectionDefinition): fc.Arbitrary<readonly CanonicalBallot[]> {
  const perVoterArb = (voter: string, isFirstVoter: boolean) =>
    fc
      .tuple(
        ...definition.questions.map((question, questionIndex) =>
          fc
            .record({
              choiceInternalNo: fc.constantFrom(...question.choices.map((choice) => choice.internalNo)),
              goa: fc.integer({ min: 1, max: 8 }),
            })
            .map(({ choiceInternalNo, goa }) => {
              const forcedGoa = isFirstVoter && questionIndex === 0 ? 2 : goa;
              return {
                questionId: question.questionId,
                choiceInternalNo,
                goa: forcedGoa,
                reservation: RESERVATION_GOA.has(forcedGoa) ? "reservation text" : null,
                rationale: null,
              };
            }),
        ),
      )
      .map((responses) => ({
        schemaVersion: 2 as const,
        kind: "original" as const,
        electionId: definition.electionId,
        voter,
        voterKind: "member" as const,
        responses,
        submittedAt: "2026-08-13T00:00:00Z",
        receivedAt: "2026-08-13T00:00:01Z",
      }));

  return fc.tuple(...definition.voters.map((voter, index) => perVoterArb(voter, index === 0)));
}

// Every even-indexed question is established (so the GoA-frequency render
// path fires on every case); odd-indexed questions hold. Not a re-derivation
// of the tally policy — just fixed shapes to exercise both render branches.
function tally(definition: CanonicalElectionDefinition, ballots: readonly CanonicalBallot[]): CanonicalTally {
  return {
    schemaVersion: 2,
    runId: "run-property",
    targetQuestionIds: definition.questions.map((question) => question.questionId),
    results: definition.questions.map((question, index) => {
      if (index % 2 === 0) {
        const winner = question.choices[0]!;
        return {
          questionId: question.questionId,
          kind: "established" as const,
          winner: { internalNo: winner.internalNo, label: winner.label },
          choiceCounts: question.choices.map((choice, choiceIndex) => ({
            internalNo: choice.internalNo,
            label: choice.label,
            count: choiceIndex === 0 ? ballots.length : 0,
          })),
          goa: { favor: ballots.length, against: 0, abstain: 0, discuss: 0 },
        };
      }
      return {
        questionId: question.questionId,
        kind: "hold" as const,
        reason: "quorum-short" as const,
        counts: { favor: 0, against: 0, abstain: 0, discuss: 0 },
      };
    }),
    preservedResultDigest: null,
    talliedAt: "2026-08-13T00:00:00Z",
  };
}

describe("t552 election record and transport properties", () => {
  test("every generated question is isolated, complete, blind, and deterministic per voter", () => {
    // Aggregate coverage flag: at least one generated case, across all
    // voters, must produce a different per-voter choice order — proving the
    // electionId:voter:questionId seed (not just electionId:questionId)
    // actually drives shuffledChoices. Checked once after fc.assert so a
    // per-run assertion never has to gamble on a shuffle collision.
    let sawVoterDivergence = false;

    fc.assert(
      fc.property(definitionArb, (definition) => {
        const viewsByVoter = definition.voters.map((voter) => {
          const first = buildDistributionView(definition, voter);
          const second = buildDistributionView(definition, voter);
          expect(first).toEqual(second);
          return { voter, view: first };
        });

        for (const { view } of viewsByVoter) {
          expect(view.questions.map((question) => question.questionId)).toEqual(
            definition.questions.map((question) => question.questionId),
          );
          for (const [index, question] of view.questions.entries()) {
            const source = definition.questions[index]!;
            expect(new Set(question.ordered.map((choice) => choice.internalNo))).toEqual(
              new Set(source.choices.map((choice) => choice.internalNo)),
            );
            expect(question.ordered.map((choice) => choice.displayNo)).toEqual(
              source.choices.map((_, choiceIndex) => choiceIndex + 1),
            );
          }
          expect(JSON.stringify(view)).not.toMatch(/recommend|peer|status|response/i);
        }

        for (let a = 0; a < viewsByVoter.length; a++) {
          for (let b = a + 1; b < viewsByVoter.length; b++) {
            const orderA = viewsByVoter[a]!.view.questions.map((question) =>
              question.ordered.map((choice) => choice.internalNo),
            );
            const orderB = viewsByVoter[b]!.view.questions.map((question) =>
              question.ordered.map((choice) => choice.internalNo),
            );
            if (JSON.stringify(orderA) !== JSON.stringify(orderB)) sawVoterDivergence = true;
          }
        }
      }),
      OPTS,
    );

    expect(sawVoterDivergence).toBe(true);
  });

  test("materialized ballots exercise reservation, late-response, and GoA-frequency render paths", () => {
    fc.assert(
      fc.property(
        definitionArb.chain((definition) =>
          fc.record({
            definition: fc.constant(definition),
            ballots: ballotsArbFor(definition),
          }),
        ),
        ({ definition, ballots }) => {
          const firstQuestionId = definition.questions[0]!.questionId;
          const firstVoter = definition.voters[0]!;
          const lateResponses = [
            {
              voter: firstVoter,
              questionId: firstQuestionId,
              receivedAt: "2026-08-13T00:01:00Z",
              reason: "received-after-tally",
            },
          ];
          const recordInput = {
            definition,
            tally: tally(definition, ballots),
            lifecycle: "partial" as const,
            materializedBallots: ballots,
            lateResponses,
            history: [tally(definition, ballots)],
            timeline: [],
          };
          const record = renderElectionRecord(recordInput);
          expect(record).toBe(renderElectionRecord(recordInput));

          // Reserved-row path: the forced GoA-2 first response always yields
          // a transcribed reservation line for the first voter/question.
          expect(record).toContain(`- Reservation ${firstVoter}`);
          // Late-response path.
          expect(record).toContain(`- Late ${firstVoter} at 2026-08-13T00:01:00Z: received-after-tally`);
          // GoA-frequency path: the first (even-indexed) question is always
          // established.
          expect(record).toContain(`## Question ${firstQuestionId}:`);
          expect(record).toMatch(/GoA frequency: 1x\d+ 2x\d+ 3x\d+ 4x\d+ 5x\d+ 6x\d+ 7x\d+ 8x\d+/);
        },
      ),
      OPTS,
    );
  });
});
