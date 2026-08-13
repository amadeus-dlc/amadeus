// covers: object:ElectionDefinitionCodec, object:BallotV2Codec, object:TallyV2Codec
// size: small
import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  BallotV2Codec,
  type CanonicalElectionChoice,
  type CanonicalElectionDefinition,
  ElectionDefinitionCodec,
  TallyV2Codec,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";

const PBT_SEED = 0x28_13e1;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

const textArb = fc.string({ maxLength: 20 });
const choiceArb: fc.Arbitrary<CanonicalElectionChoice> = fc
  .tuple(fc.integer({ min: -20, max: 20 }), textArb, fc.boolean(), textArb)
  .map(([internalNo, label, hasDescription, description]) =>
    hasDescription ? { internalNo, label, description } : { internalNo, label },
  );
const choicesArb = fc.uniqueArray(choiceArb, {
  minLength: 1,
  maxLength: 5,
  selector: (choice) => choice.internalNo,
});
const questionArb = fc.record({
  questionId: fc.integer({ min: 0, max: 10_000 }).map((value) => `q-${value}`),
  text: fc.integer().map((value) => `question-${value}`),
  choices: choicesArb,
});
const definitionArb: fc.Arbitrary<CanonicalElectionDefinition> = fc
  .record({
    schemaVersion: fc.constant(2 as const),
    electionId: fc.integer().map((value) => `E-${value}`),
    kind: textArb,
    questions: fc.uniqueArray(questionArb, {
      minLength: 2,
      maxLength: 4,
      selector: (question) => question.questionId,
    }),
    voters: fc.uniqueArray(fc.integer({ min: 0, max: 10_000 }).map((value) => `v-${value}`), {
      minLength: 1,
      maxLength: 5,
    }),
  })
  .map((definition) => definition as CanonicalElectionDefinition);

function canonicalBallot(definition: CanonicalElectionDefinition) {
  return {
    schemaVersion: 2,
    kind: "original",
    electionId: definition.electionId,
    voter: definition.voters[0],
    voterKind: "subagent",
    responses: definition.questions.map((question) => ({
      questionId: question.questionId,
      choiceInternalNo: question.choices[0]?.internalNo,
      goa: 1,
      reservation: null,
      rationale: null,
    })),
    submittedAt: "2026-08-13T00:00:00Z",
  };
}

function canonicalTally(definition: CanonicalElectionDefinition) {
  return {
    schemaVersion: 2,
    runId: "run-property",
    targetQuestionIds: definition.questions.map((question) => question.questionId),
    results: definition.questions.map((question) => {
      const winner = question.choices[0] as CanonicalElectionChoice;
      return {
        questionId: question.questionId,
        kind: "established",
        winner: { internalNo: winner.internalNo, label: winner.label },
        choiceCounts: question.choices.map((choice, index) => ({
          internalNo: choice.internalNo,
          label: choice.label,
          count: index === 0 ? 1 : 0,
        })),
        goa: { favor: 1, against: 0, abstain: 0, discuss: 0 },
      };
    }),
    preservedResultDigest: null,
    talliedAt: "2026-08-13T00:01:00Z",
  };
}

function assertDefinitionRoundTrip(definition: CanonicalElectionDefinition): void {
  const encoded = ElectionDefinitionCodec.encode(definition);
  expect(encoded.ok).toBe(true);
  if (!encoded.ok) return;
  expect(ElectionDefinitionCodec.decode(JSON.parse(encoded.value))).toEqual({
    ok: true,
    value: definition,
  });
}

function assertBallotRoundTrip(definition: CanonicalElectionDefinition): void {
  const targetQuestionIds = definition.questions.map((question) => question.questionId);
  const ballot = BallotV2Codec.decode(canonicalBallot(definition), definition, {
    targetQuestionIds,
  });
  expect(ballot.ok).toBe(true);
  if (!ballot.ok) return;
  const encoded = BallotV2Codec.encode(ballot.value, definition, { targetQuestionIds });
  expect(encoded.ok).toBe(true);
  if (!encoded.ok) return;
  expect(
    BallotV2Codec.decode(JSON.parse(encoded.value), definition, { targetQuestionIds }),
  ).toEqual(ballot);
}

function assertTallyRoundTrip(definition: CanonicalElectionDefinition): void {
  const tally = TallyV2Codec.decode(canonicalTally(definition), definition);
  expect(tally.ok).toBe(true);
  if (!tally.ok) return;
  const encoded = TallyV2Codec.encode(tally.value, definition);
  expect(encoded.ok).toBe(true);
  if (!encoded.ok) return;
  expect(TallyV2Codec.decode(JSON.parse(encoded.value), definition)).toEqual(tally);
  expect(TallyV2Codec.establishedResultsDigest(tally.value, definition)).toEqual(
    TallyV2Codec.establishedResultsDigest(tally.value, definition),
  );
}

describe("t548 canonical election codec properties", () => {
  test("generated v2 definitions, ballots, and tallies survive canonical encode/decode", () => {
    fc.assert(
      fc.property(definitionArb, (definition) => {
        assertDefinitionRoundTrip(definition);
        assertBallotRoundTrip(definition);
        assertTallyRoundTrip(definition);
      }),
      OPTS,
    );
  });

  test("generated duplicate ids and coverage deletions are rejected fail-closed", () => {
    fc.assert(
      fc.property(definitionArb, (definition) => {
        const duplicateQuestion = {
          ...definition,
          questions: [...definition.questions, definition.questions[0]],
        };
        expect(ElectionDefinitionCodec.decode(duplicateQuestion)).toMatchObject({
          ok: false,
          error: { category: "duplicate-id", path: "$.questions" },
        });

        const targets = definition.questions.map((question) => question.questionId);
        const incompleteBallot = {
          ...canonicalBallot(definition),
          responses: canonicalBallot(definition).responses.slice(0, -1),
        };
        expect(
          BallotV2Codec.decode(incompleteBallot, definition, { targetQuestionIds: targets }),
        ).toMatchObject({
          ok: false,
          error: { category: "coverage-mismatch", path: "$.responses" },
        });

        const incompleteTally = {
          ...canonicalTally(definition),
          results: canonicalTally(definition).results.slice(0, -1),
        };
        expect(TallyV2Codec.decode(incompleteTally, definition)).toMatchObject({
          ok: false,
          error: { category: "coverage-mismatch", path: "$.results" },
        });
      }),
      OPTS,
    );
  });
});
