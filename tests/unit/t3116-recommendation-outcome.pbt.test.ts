// covers: file:packages/framework/core/tools/amadeus-recommendation.ts
// size: small
//
// R-5: a contested outcome crosses a persistence boundary — U3 stores it in a
// waiting cause and re-presents it on resume. The round trip is what makes the
// re-presentation the same ruling, so it is checked as a property rather than
// on a handful of hand-picked shapes. PBT conventions follow
// tests/unit/setup-semver.pbt.test.ts (fixed seed, default numRuns, deep tier
// via AMADEUS_PBT_DEEP).

import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  RecommendationOutcome,
  type Candidate,
  type RecommendationBasisSource,
} from "../../packages/framework/core/tools/amadeus-recommendation.ts";

const PBT_SEED = 0x31_16_01;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

const SOURCES: readonly RecommendationBasisSource[] = ["norm", "prior-ruling", "election", "agent"];

const nonBlankArb = fc.string({ minLength: 1, maxLength: 24 }).filter((value) => value.trim().length > 0);
const fingerprintArb = fc.string({ unit: fc.constantFrom(..."0123456789abcdef"), minLength: 64, maxLength: 64 })
  .map((hex) => `sha256:${hex}`);

const uniqueArb = fc.record({ optionId: nonBlankArb, source: fc.constantFrom(...SOURCES), fingerprint: fingerprintArb })
  .map(({ optionId, source, fingerprint }) => RecommendationOutcome.unique(optionId, { source, fingerprint }));

const contestedArb = fc.record({
  options: fc.uniqueArray(nonBlankArb, { minLength: 2, maxLength: 6 }),
  rationales: fc.array(nonBlankArb, { minLength: 6, maxLength: 6 }),
  reason: nonBlankArb,
}).map(({ options, rationales, reason }) => {
  const candidates: readonly Candidate[] = options.map((optionId, index) => ({
    optionId,
    rationale: rationales[index]!,
    rank: index + 1,
  }));
  return RecommendationOutcome.contested(candidates, reason);
});

const noneArb = nonBlankArb.map((reason) => RecommendationOutcome.none(reason));
const outcomeArb = fc.oneof(uniqueArb, contestedArb, noneArb);

describe("R-5 property: parse ∘ serialize is the identity on every valid outcome", () => {
  test("an outcome that survives JSON transport re-parses to an equal value", () => {
    fc.assert(
      fc.property(outcomeArb, (outcome) => {
        const transported: unknown = JSON.parse(JSON.stringify(RecommendationOutcome.serialize(outcome)));
        const restored = RecommendationOutcome.parse(transported);
        expect(restored.ok).toBe(true);
        if (!restored.ok) return;
        expect(restored.value).toEqual(outcome);
      }),
      OPTS,
    );
  });

  test("the restored value presents identically, so a resumed ruling asks the same question", () => {
    fc.assert(
      fc.property(fc.oneof(contestedArb, noneArb), (outcome) => {
        const restored = RecommendationOutcome.parse(RecommendationOutcome.serialize(outcome));
        expect(restored.ok).toBe(true);
        if (!restored.ok || restored.value.kind === "unique") return;
        expect(RecommendationOutcome.presentationOf(restored.value))
          .toEqual(RecommendationOutcome.presentationOf(outcome));
      }),
      OPTS,
    );
  });
});
