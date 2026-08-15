// covers: file:packages/framework/core/tools/amadeus-recommendation.ts
// size: small
//
// RFC-0001 / FR-1: the ruling vocabulary. A derivation ends in exactly one of
// unique / contested / none, and nothing outside those three can be built.

import { describe, expect, test } from "bun:test";

import {
  RecommendationOutcome,
  type Candidate,
  type RecommendationBasis,
} from "../../packages/framework/core/tools/amadeus-recommendation.ts";

const FP = `sha256:${"a".repeat(64)}`;
const basis: RecommendationBasis = { source: "norm", fingerprint: FP };

function candidates(): readonly Candidate[] {
  return [
    { optionId: "accept", rationale: "past ruling A", rank: 1 },
    { optionId: "reject", rationale: "past ruling B", rank: 2 },
  ];
}

describe("R-1 the outcome vocabulary has exactly three terminals", () => {
  test("every constructed outcome is exhaustively handled by the three discriminants", () => {
    const all = [
      RecommendationOutcome.unique("accept", basis),
      RecommendationOutcome.contested(candidates(), "past-rulings-conflict"),
      RecommendationOutcome.none("no-basis"),
    ];
    const seen = all.map((outcome) => {
      switch (outcome.kind) {
        case "unique":
          return outcome.optionId;
        case "contested":
          return outcome.candidates.length;
        case "none":
          return outcome.reason;
        default: {
          const exhaustive: never = outcome;
          throw new Error(`unreachable ${JSON.stringify(exhaustive)}`);
        }
      }
    });
    expect(seen).toEqual(["accept", 2, "no-basis"]);
  });
});

describe("R-2 contested cannot exist below two candidates", () => {
  test("zero and one candidate throw at construction", () => {
    expect(() => RecommendationOutcome.contested([], "split")).toThrow("contested-requires-two-candidates");
    expect(() => RecommendationOutcome.contested([candidates()[0]!], "split"))
      .toThrow("contested-requires-two-candidates");
  });

  test("an empty reason, an empty rationale and a broken rank sequence all throw", () => {
    expect(() => RecommendationOutcome.contested(candidates(), " ")).toThrow("outcome-requires-reason");
    expect(() => RecommendationOutcome.contested(
      [{ optionId: "accept", rationale: "", rank: 1 }, { optionId: "reject", rationale: "b", rank: 2 }],
      "split",
    )).toThrow("candidate-requires-rationale");
    expect(() => RecommendationOutcome.contested(
      [{ optionId: "accept", rationale: "a", rank: 1 }, { optionId: "reject", rationale: "b", rank: 3 }],
      "split",
    )).toThrow("candidate-ranks-must-be-a-dense-sequence");
    expect(() => RecommendationOutcome.contested(
      [{ optionId: "accept", rationale: "a", rank: 1 }, { optionId: "accept", rationale: "b", rank: 2 }],
      "split",
    )).toThrow("candidate-options-must-be-distinct");
  });

  test("candidates are stored in recommended order regardless of input order", () => {
    const outcome = RecommendationOutcome.contested(
      [{ optionId: "reject", rationale: "b", rank: 2 }, { optionId: "accept", rationale: "a", rank: 1 }],
      "split",
    );
    if (outcome.kind !== "contested") throw new Error("contested expected");
    expect(outcome.candidates.map((candidate) => candidate.optionId)).toEqual(["accept", "reject"]);
  });
});

describe("unique and none guard their own invariants", () => {
  test("unique refuses a non-sha256 fingerprint, an unknown source and an empty option", () => {
    expect(() => RecommendationOutcome.unique("accept", { source: "norm", fingerprint: "bad" }))
      .toThrow("basis-requires-sha256-fingerprint");
    expect(() => RecommendationOutcome.unique("accept", { source: "guess" as RecommendationBasis["source"], fingerprint: FP }))
      .toThrow("basis-requires-known-source");
    expect(() => RecommendationOutcome.unique(" ", basis)).toThrow("unique-requires-option");
  });

  test("none refuses an empty reason", () => {
    expect(() => RecommendationOutcome.none("")).toThrow("outcome-requires-reason");
  });
});

describe("R-3 parse is the only entrance and fails closed", () => {
  test("a well formed payload of each kind decodes", () => {
    const decoded = RecommendationOutcome.parse({ kind: "unique", optionId: "accept", basis: { source: "norm", fingerprint: FP } });
    expect(decoded).toEqual({ ok: true, value: RecommendationOutcome.unique("accept", basis) });
    expect(RecommendationOutcome.parse({ kind: "none", reason: "no-basis" }).ok).toBe(true);
    expect(RecommendationOutcome.parse({
      kind: "contested",
      candidates: candidates(),
      reason: "past-rulings-conflict",
    }).ok).toBe(true);
  });

  test("an unknown kind, missing candidates and a non-sha256 fingerprint each return the error arm", () => {
    const unknownKind = RecommendationOutcome.parse({ kind: "probably", optionId: "accept" });
    expect(unknownKind).toEqual({ ok: false, error: { reason: "unknown-kind", path: "kind" } });

    const missingCandidates = RecommendationOutcome.parse({ kind: "contested", reason: "split" });
    expect(missingCandidates).toEqual({ ok: false, error: { reason: "expected-array", path: "candidates" } });

    const badFingerprint = RecommendationOutcome.parse({
      kind: "unique",
      optionId: "accept",
      basis: { source: "norm", fingerprint: "sha256:zz" },
    });
    expect(badFingerprint).toEqual({ ok: false, error: { reason: "expected-sha256", path: "basis.fingerprint" } });
  });

  test("no default is invented for an absent field and unknown fields are refused", () => {
    expect(RecommendationOutcome.parse({ kind: "none" })).toEqual({ ok: false, error: { reason: "expected-string", path: "reason" } });
    expect(RecommendationOutcome.parse({ kind: "none", reason: "x", confidence: 0.5 }))
      .toEqual({ ok: false, error: { reason: "unknown-field", path: "confidence" } });
    expect(RecommendationOutcome.parse(null)).toEqual({ ok: false, error: { reason: "expected-object", path: "" } });
    expect(RecommendationOutcome.parse("{}")).toEqual({ ok: false, error: { reason: "expected-object", path: "" } });
  });

  test("a contested payload below two candidates is refused rather than thrown", () => {
    expect(RecommendationOutcome.parse({ kind: "contested", candidates: [candidates()[0]], reason: "split" }))
      .toEqual({ ok: false, error: { reason: "contested-requires-two-candidates", path: "candidates" } });
  });
});

describe("R-5 serialize and parse are inverse on examples", () => {
  test("each kind survives the round trip unchanged", () => {
    for (const outcome of [
      RecommendationOutcome.unique("accept", basis),
      RecommendationOutcome.contested(candidates(), "past-rulings-conflict"),
      RecommendationOutcome.none("no-basis"),
    ]) {
      const restored = RecommendationOutcome.parse(JSON.parse(JSON.stringify(RecommendationOutcome.serialize(outcome))));
      expect(restored).toEqual({ ok: true, value: outcome });
    }
  });
});

describe("R-4 the presentation carries all four required elements", () => {
  test("contested presents candidates, rationales, the non-unique reason and the order", () => {
    const outcome = RecommendationOutcome.contested(candidates(), "past-rulings-conflict");
    const presentation = RecommendationOutcome.presentationOf(outcome);
    expect(presentation.kind).toBe("contested");
    expect(presentation.nonUniqueReason).toBe("past-rulings-conflict");
    expect(presentation.candidates.map((candidate) => candidate.rank)).toEqual([1, 2]);
    expect(presentation.candidates.every((candidate) => candidate.rationale.length > 0)).toBe(true);
  });

  test("none presents no candidate but still names why", () => {
    const outcome = RecommendationOutcome.none("election-quorum-short");
    const presentation = RecommendationOutcome.presentationOf(outcome);
    expect(presentation).toEqual({ kind: "none", candidates: [], nonUniqueReason: "election-quorum-short" });
  });
});

describe("R-6 the vocabulary module computes no fingerprint of its own", () => {
  test("the module neither hashes nor imports a hashing primitive", () => {
    const source = Bun.file("packages/framework/core/tools/amadeus-recommendation.ts");
    return source.text().then((text) => {
      expect(text).not.toContain("node:crypto");
      expect(text).not.toContain("createHash");
      expect(text).not.toContain("autonomyDigest");
    });
  });
});
