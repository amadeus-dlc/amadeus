// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts(resolveAutoDecision)
// size: small
//
// RFC-0001 FR-4: the ladder may only emit AUTO_DECIDED when the derivation
// landed on one option. Everything else escalates carrying the outcome, and
// the two fail-closed terminals the ladder already had (NORM_CONFLICT park,
// invalid) keep their meaning.

import { describe, expect, test } from "bun:test";

import {
  autonomyDigest,
  createAutonomyProjection,
  createInteractionOccurrence,
  recommendationBasisFingerprint,
  resolveAutoDecision,
  type AutonomyProjection,
  type DecisionAuthority,
  type DecisionCapabilityPort,
  type DecisionFact,
  type InteractionOccurrence,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  deriveGateRecommendation,
  electionHoldOutcome,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import {
  RecommendationOutcome,
  type Candidate,
} from "../../packages/framework/core/tools/amadeus-recommendation.ts";

const INTENT = "11111111-2222-4333-8444-555555555555";
const SCOPE_FP = autonomyDigest("scope-lineage");
const NORM = autonomyDigest("norm-revision");
const EVIDENCE = autonomyDigest("evidence");

function occurrence(kind: InteractionOccurrence["kind"] = "question"): InteractionOccurrence {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind,
    stage: "code-generation",
    phase: "construction",
    bolt: null,
    interactionId: "question-1",
    selector: "selector-1",
    question: "which option?",
    optionIds: ["accept", "reject"],
    graphRevision: autonomyDigest("graph"),
  });
}

function projection(): AutonomyProjection {
  return createAutonomyProjection({ intentUuid: INTENT });
}

function authority(): DecisionAuthority {
  return {
    kind: "semi",
    policies: [],
    scope: {
      intentUuid: INTENT,
      scopeId: "intent",
      scopeFingerprint: SCOPE_FP,
      normFingerprint: NORM,
      allowedInteractionKinds: ["question"],
    },
    authorityFingerprint: autonomyDigest("authority"),
  };
}

function fact(optionId: string, evidence: string): DecisionFact {
  return {
    optionId,
    selector: "selector-1",
    scopeLineageFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    evidenceFingerprint: autonomyDigest(evidence),
  };
}

interface Calls {
  elect: number;
  recommend: number;
}

function capability(
  calls: Calls,
  overrides: Partial<DecisionCapabilityPort> = {},
): DecisionCapabilityPort {
  return {
    soloElectionAvailable: true,
    unavailableReason: null,
    elect: () => {
      calls.elect++;
      return RecommendationOutcome.unique("accept", { source: "election", fingerprint: EVIDENCE });
    },
    recommend: () => {
      calls.recommend++;
      return RecommendationOutcome.unique("accept", { source: "agent", fingerprint: EVIDENCE });
    },
    ...overrides,
  };
}

function ladder(overrides: Partial<Parameters<typeof resolveAutoDecision>[0]> = {}, calls: Calls = { elect: 0, recommend: 0 }) {
  return resolveAutoDecision({
    projection: projection(),
    occurrence: occurrence(),
    authority: authority(),
    actorId: "codex",
    scopeLineageFingerprint: SCOPE_FP,
    currentNormFingerprint: NORM,
    applicableNormFacts: [],
    pastHumanRulings: [],
    capability: capability(calls),
    ...overrides,
  });
}

describe("FP-1 / R-8 conflicting past rulings are contested, not something to fall past", () => {
  test("the ladder terminates at the history stage and never consults election or agent", () => {
    const calls: Calls = { elect: 0, recommend: 0 };
    const resolved = ladder({
      pastHumanRulings: [fact("accept", "ruling-a"), fact("reject", "ruling-b")],
      capability: capability(calls),
    }, calls);

    expect(resolved.kind).toBe("escalate");
    if (resolved.kind !== "escalate") return;
    expect(resolved.outcome.kind).toBe("contested");
    if (resolved.outcome.kind !== "contested") return;
    expect(resolved.outcome.reason).toBe("past-rulings-conflict");
    expect(resolved.outcome.candidates.map((candidate: Candidate) => candidate.optionId)).toEqual(["accept", "reject"]);
    expect(resolved.outcome.candidates.every((candidate: Candidate) => candidate.rationale.length > 0)).toBe(true);
    expect(calls).toEqual({ elect: 0, recommend: 0 });
  });
});

describe("R-7 only a unique terminal produces a decision record", () => {
  test("a contested election escalates and records nothing", () => {
    const calls: Calls = { elect: 0, recommend: 0 };
    const resolved = ladder({
      capability: capability(calls, {
        elect: () => {
          calls.elect++;
          return RecommendationOutcome.contested([
            { optionId: "accept", rationale: "3 votes", rank: 1 },
            { optionId: "reject", rationale: "3 votes", rank: 2 },
          ], "election-tie");
        },
      }),
    }, calls);
    expect(resolved).toEqual({
      kind: "escalate",
      outcome: RecommendationOutcome.contested([
        { optionId: "accept", rationale: "3 votes", rank: 1 },
        { optionId: "reject", rationale: "3 votes", rank: 2 },
      ], "election-tie"),
    });
  });

  test("R-9 the agent stage may decline, and reaching it no longer means deciding", () => {
    const calls: Calls = { elect: 0, recommend: 0 };
    const resolved = ladder({
      capability: capability(calls, {
        soloElectionAvailable: false,
        unavailableReason: "native-election-unavailable",
        recommend: () => {
          calls.recommend++;
          return RecommendationOutcome.none("no-applicable-basis");
        },
      }),
    }, calls);
    expect(resolved).toEqual({ kind: "escalate", outcome: RecommendationOutcome.none("no-applicable-basis") });
    expect(calls.recommend).toBe(1);
  });

  test("a unique terminal still decides, with the basis the stage supplied", () => {
    const resolved = ladder();
    expect(resolved.kind).toBe("decided");
    if (resolved.kind !== "decided") return;
    expect(resolved.record.basisKind).toBe("solo-election");
    expect(resolved.record.basisFingerprint).toBe(EVIDENCE);
    expect(resolved.record.selectedOptionId).toBe("accept");
  });
});

describe("R-11 the existing fail-closed terminals keep their meaning", () => {
  test("conflicting norms still park instead of becoming contested", () => {
    expect(ladder({ applicableNormFacts: [fact("accept", "norm-a"), fact("reject", "norm-b")] }))
      .toEqual({ kind: "park", reason: "NORM_CONFLICT" });
  });

  test("an option outside the occurrence and a malformed fingerprint are still invalid", () => {
    const calls: Calls = { elect: 0, recommend: 0 };
    expect(ladder({
      capability: capability(calls, {
        elect: () => ({ kind: "unique", optionId: "missing", basis: { source: "election", fingerprint: EVIDENCE } }),
      }),
    }, calls)).toEqual({ kind: "invalid", reason: "invalid-election-result" });

    expect(ladder({
      capability: capability(calls, {
        elect: () => ({ kind: "unique", optionId: "accept", basis: { source: "election", fingerprint: "bad" } }),
      }),
    }, calls)).toEqual({ kind: "invalid", reason: "invalid-election-result" });
  });

  test("a contested set naming an option the occurrence does not offer is invalid, not escalated", () => {
    const calls: Calls = { elect: 0, recommend: 0 };
    expect(ladder({
      capability: capability(calls, {
        elect: () => RecommendationOutcome.contested([
          { optionId: "accept", rationale: "a", rank: 1 },
          { optionId: "defer", rationale: "b", rank: 2 },
        ], "election-split"),
      }),
    }, calls)).toEqual({ kind: "invalid", reason: "invalid-election-result" });
  });
});

describe("R-12 a human-reserved decision point is settled before any derivation runs", () => {
  test("even a unique recommendation cannot auto-decide a reserved point", () => {
    const calls: Calls = { elect: 0, recommend: 0 };
    const resolved = ladder({
      humanReservedDecision: () => "phase-boundary-is-human-reserved",
      capability: capability(calls),
    }, calls);
    expect(resolved).toEqual({ kind: "escalate", outcome: RecommendationOutcome.none("phase-boundary-is-human-reserved") });
    expect(calls).toEqual({ elect: 0, recommend: 0 });
  });

  test("without the seam the ladder behaves exactly as before", () => {
    expect(ladder({ humanReservedDecision: () => null }).kind).toBe("decided");
  });

  test("a blank reservation reason refuses the resolution instead of throwing", () => {
    expect(ladder({ humanReservedDecision: () => "   " })).toEqual({
      kind: "invalid",
      reason: "invalid-reserved-decision-reason",
    });
  });
});

describe("R-13 the gate derivation is deterministic approval expressed through the type", () => {
  test("every gate context yields unique(approve)", () => {
    for (const stage of ["code-generation", "build-and-test", "pr-convergence"]) {
      for (const walkingSkeleton of [false, true]) {
        const outcome = deriveGateRecommendation({
          stage,
          approvalOptionId: "approve",
          walkingSkeleton,
          scopeFingerprint: SCOPE_FP,
          normFingerprint: NORM,
        });
        expect(outcome.kind).toBe("unique");
        if (outcome.kind !== "unique") return;
        expect(outcome.optionId).toBe("approve");
        expect(outcome.basis.source).toBe("norm");
      }
    }
  });
});

describe("R-10 an election that did not settle maps to a non-unique terminal", () => {
  const candidates: readonly Candidate[] = [
    { optionId: "accept", rationale: "favour", rank: 1 },
    { optionId: "reject", rationale: "against", rank: 2 },
  ];

  test("the five hold reasons map to the documented terminals", () => {
    expect([
      electionHoldOutcome({ hold: "tie", candidates }).kind,
      electionHoldOutcome({ hold: "split", candidates }).kind,
      electionHoldOutcome({ hold: "block", candidates }).kind,
      electionHoldOutcome({ hold: "discussion-needed", candidates }).kind,
      electionHoldOutcome({ hold: "quorum-short", candidates }).kind,
    ]).toEqual(["contested", "contested", "contested", "contested", "none"]);
  });

  test("a hold is never rounded up into a unique option", () => {
    for (const hold of ["tie", "split", "block", "discussion-needed", "quorum-short"] as const) {
      expect(electionHoldOutcome({ hold, candidates }).kind).not.toBe("unique");
      expect(electionHoldOutcome({ hold, candidates: [] }).kind).toBe("none");
      expect(electionHoldOutcome({ hold, candidates: [] }).reason).toContain(hold);
    }
  });
});

describe("ADR-11 the basis fingerprint survives trivial perturbation of the derivation", () => {
  const facts = {
    source: "agent" as const,
    selector: "selector-1",
    optionIds: ["accept", "reject"],
    evidence: ["norm rule A", "past ruling B"],
  };

  test("whitespace, ordering and duplication do not move the digest", () => {
    const base = recommendationBasisFingerprint(facts);
    expect(base).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(recommendationBasisFingerprint({ ...facts, evidence: ["past ruling B", "norm rule A"] })).toBe(base);
    expect(recommendationBasisFingerprint({ ...facts, optionIds: ["reject", "accept"] })).toBe(base);
    expect(recommendationBasisFingerprint({
      ...facts,
      selector: "  selector-1  ",
      evidence: ["norm   rule\tA", "  past ruling  B\n"],
    })).toBe(base);
    expect(recommendationBasisFingerprint({ ...facts, evidence: [...facts.evidence, "norm rule A"] })).toBe(base);
  });

  test("lone surrogates keep the digest order-independent despite equal UTF-8 bytes", () => {
    const surrogates = { ...facts, evidence: ["\ud800", "\ud801"] };
    const reversed = { ...facts, evidence: ["\ud801", "\ud800"] };
    expect(recommendationBasisFingerprint(surrogates)).toBe(recommendationBasisFingerprint(reversed));
  });

  test("a different derivation still yields a different digest", () => {
    const base = recommendationBasisFingerprint(facts);
    expect(recommendationBasisFingerprint({ ...facts, evidence: ["norm rule C", "past ruling B"] })).not.toBe(base);
    expect(recommendationBasisFingerprint({ ...facts, source: "norm" })).not.toBe(base);
    expect(recommendationBasisFingerprint({ ...facts, optionIds: ["accept"] })).not.toBe(base);
  });
});
