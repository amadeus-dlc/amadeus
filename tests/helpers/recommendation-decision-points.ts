// Shared corpus for the ADR-9 contested-frequency budget.
//
// ADR-9 fixes the acceptance form as "contested fires zero times on the
// mechanism-caused classes and on ordinary progress" — no ratio threshold. The
// cases below are the base U1 owns; U3 and U4 add their own route-side cases
// against the same shape, and every case runs the real derivation rather than
// asserting over a table of expected answers.

import {
  autonomyDigest,
  createAutonomyProjection,
  createInteractionOccurrence,
  resolveAutoDecision,
  type DecisionAuthority,
  type DecisionCapabilityPort,
  type DecisionFact,
  type InteractionKind,
  type InteractionOccurrence,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import { deriveGateRecommendation } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { RecommendationOutcome } from "../../packages/framework/core/tools/amadeus-recommendation.ts";

const INTENT = "9f0c1d2e-3a4b-4c5d-8e6f-708192a3b4c5";
const SCOPE_FP = autonomyDigest("contested-frequency-scope");
const NORM = autonomyDigest("contested-frequency-norm");

// The classes RFC-0001 appendix B counted as mechanism-caused stops, plus the
// ordinary progress baseline they are measured against.
export type DecisionPointClass = "phase-gate" | "walking-skeleton" | "s13-learnings" | "ordinary-progress";

// What a decision point actually ended at. `park` and `invalid` are the two
// pre-existing fail-closed terminals; they are counted separately so a case
// that stopped for a mechanism reason is never mistaken for a contested ruling.
export type ObservedTerminal = "unique" | "contested" | "none" | "park" | "invalid";

export interface DecisionPointCase {
  readonly pointClass: DecisionPointClass;
  readonly label: string;
  observe(): ObservedTerminal;
}

function occurrenceOf(kind: InteractionKind, interactionId: string, selector: string, optionIds: readonly string[]): InteractionOccurrence {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind,
    stage: kind === "phase-gate" ? "requirements-analysis" : "code-generation",
    phase: kind === "phase-gate" ? "inception" : "construction",
    bolt: null,
    interactionId,
    selector,
    question: "proceed?",
    optionIds,
    graphRevision: autonomyDigest("contested-frequency-graph"),
  });
}

function authorityOf(kinds: readonly InteractionKind[]): DecisionAuthority {
  return {
    kind: "semi",
    policies: [],
    scope: {
      intentUuid: INTENT,
      scopeId: "intent",
      scopeFingerprint: SCOPE_FP,
      normFingerprint: NORM,
      allowedInteractionKinds: kinds,
    },
    authorityFingerprint: autonomyDigest("contested-frequency-authority"),
  };
}

function normFact(optionId: string, selector: string, evidence: string): DecisionFact {
  return {
    optionId,
    selector,
    scopeLineageFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    evidenceFingerprint: autonomyDigest(evidence),
  };
}

function settledElection(optionId: string): DecisionCapabilityPort {
  return {
    soloElectionAvailable: true,
    unavailableReason: null,
    elect: () => RecommendationOutcome.unique(optionId, { source: "election", fingerprint: autonomyDigest(`election-${optionId}`) }),
    recommend: () => RecommendationOutcome.unique(optionId, { source: "agent", fingerprint: autonomyDigest(`agent-${optionId}`) }),
  };
}

function ladderTerminal(
  occurrence: InteractionOccurrence,
  applicableNormFacts: readonly DecisionFact[],
  capability: DecisionCapabilityPort,
): ObservedTerminal {
  const resolved = resolveAutoDecision({
    projection: createAutonomyProjection({ intentUuid: INTENT }),
    occurrence,
    authority: authorityOf(["question"]),
    actorId: "amadeus-conductor",
    scopeLineageFingerprint: SCOPE_FP,
    currentNormFingerprint: NORM,
    applicableNormFacts,
    pastHumanRulings: [],
    capability,
  });
  switch (resolved.kind) {
    case "decided":
      return "unique";
    case "escalate":
      return resolved.outcome.kind;
    case "park":
      return "park";
    case "invalid":
      return "invalid";
  }
}

function gateCase(pointClass: Extract<DecisionPointClass, "phase-gate" | "walking-skeleton">, stage: string): DecisionPointCase {
  return {
    pointClass,
    label: `${pointClass}:${stage}`,
    observe: () => deriveGateRecommendation({
      stage,
      approvalOptionId: "approve",
      walkingSkeleton: pointClass === "walking-skeleton",
      scopeFingerprint: SCOPE_FP,
      normFingerprint: NORM,
    }).kind,
  };
}

// The 172-case class of appendix B: phase boundaries and the walking-skeleton
// gate, which stop for authority reasons and never present a choice at all.
export function mechanismDecisionPoints(): readonly DecisionPointCase[] {
  return [
    gateCase("phase-gate", "requirements-analysis"),
    gateCase("phase-gate", "application-design"),
    gateCase("phase-gate", "delivery-planning"),
    gateCase("walking-skeleton", "code-generation"),
    gateCase("walking-skeleton", "build-and-test"),
    // The §13 "zero learnings, confirm?" class: a norm answers it outright.
    {
      pointClass: "s13-learnings",
      label: "s13-learnings:zero-candidates",
      observe: () => ladderTerminal(
        occurrenceOf("question", "s13-zero", "learnings-selection", ["confirm-zero", "revisit"]),
        [normFact("confirm-zero", "learnings-selection", "s13-zero-norm")],
        settledElection("confirm-zero"),
      ),
    },
  ];
}

// Ordinary forward progress: a question the norm settles, and one the election
// settles. Neither should ever surface candidates to a human.
export function ordinaryProgressDecisionPoints(): readonly DecisionPointCase[] {
  return [
    {
      pointClass: "ordinary-progress",
      label: "ordinary-progress:norm-settled",
      observe: () => ladderTerminal(
        occurrenceOf("question", "next-stage", "stage-advance", ["advance", "hold"]),
        [normFact("advance", "stage-advance", "stage-advance-norm")],
        settledElection("advance"),
      ),
    },
    {
      pointClass: "ordinary-progress",
      label: "ordinary-progress:election-settled",
      observe: () => ladderTerminal(
        occurrenceOf("question", "fix-shape", "fix-method", ["patch", "rewrite"]),
        [],
        settledElection("patch"),
      ),
    },
  ];
}

export type TerminalCensus = Readonly<Record<ObservedTerminal, number>>;

// The observation ADR-9 defers a threshold on: how often each decision-point
// class ended at each terminal. Every count comes from running the case, never
// from a declared expectation.
export function censusByClass(cases: readonly DecisionPointCase[]): ReadonlyMap<DecisionPointClass, TerminalCensus> {
  const census = new Map<DecisionPointClass, { unique: number; contested: number; none: number; park: number; invalid: number }>();
  for (const decisionPoint of cases) {
    const entry = census.get(decisionPoint.pointClass) ??
      { unique: 0, contested: 0, none: 0, park: 0, invalid: 0 };
    entry[decisionPoint.observe()] += 1;
    census.set(decisionPoint.pointClass, entry);
  }
  return census;
}
