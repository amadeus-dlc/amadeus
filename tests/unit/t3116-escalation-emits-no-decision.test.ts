// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts
// size: small
//
// R-7 / FR-4 measured where it counts: not on the ladder's return value but on
// what the coordinator committed. A derivation that did not single out an
// option must leave no AUTO_DECIDED behind — that is the whole point of
// removing "reach the last rung, decide anyway".

import { describe, expect, test } from "bun:test";

import {
  autonomyDigest,
  createAutonomyProjection,
  createDecisionOptionEffectRegistry,
  createInteractionOccurrence,
  SEMI_ROUTINE_INTERACTIONS,
  type AutonomyProjection,
  type DecisionCapabilityPort,
  type DecisionOptionEffect,
  type SemiAuthorityScope,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  createMemoryIntentAutonomyRepository,
  type IntentAutonomyCoordinator,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";
import { RecommendationOutcome } from "../../packages/framework/core/tools/amadeus-recommendation.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76eae";
const NORM = autonomyDigest("escalation-norm");
const SCOPE_FP = autonomyDigest("escalation-scope");

function semiScope(): SemiAuthorityScope {
  return {
    intentUuid: INTENT,
    scopeId: "self-fix",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds: SEMI_ROUTINE_INTERACTIONS,
  };
}

function effect(optionId: string): DecisionOptionEffect {
  const payload = { workflow: "continue", optionId };
  return {
    effectId: `workflow-${optionId}`,
    optionId,
    payload,
    payloadFingerprint: autonomyDigest(payload),
    classification: "workflow-reversible",
    requiredScopeFingerprint: SCOPE_FP,
    applicableNormFingerprint: NORM,
  };
}

function question() {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind: "question",
    stage: "code-generation",
    phase: "construction",
    bolt: "recommendation-core",
    interactionId: "question-1",
    selector: "selector-1",
    question: "Continue?",
    optionIds: ["accept", "reject"],
    graphRevision: autonomyDigest("escalation-graph"),
  });
}

function semiRuntime(): { coordinator: IntentAutonomyCoordinator; repository: ReturnType<typeof createMemoryIntentAutonomyRepository>; initial: AutonomyProjection } {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const repository = createMemoryIntentAutonomyRepository();
  const coordinator = createIntentAutonomyCoordinator({ initialProjection: initial, repository });
  const applied = coordinator.applyHumanCommand({ kind: "set-mode", mode: "semi", policies: [] }, {
    targetIntentUuid: INTENT,
    principalId: "principal-1",
    humanTurn: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" },
    commandOccurrenceId: "command-1",
    expectedProjectionRevision: 0,
    confirmedDisplayDigest: autonomyDigest("semi-display"),
  });
  if ("error" in applied) throw new Error(applied.error);
  return { coordinator, repository, initial };
}

function decideWith(capability: DecisionCapabilityPort) {
  const { coordinator, repository } = semiRuntime();
  const before = repository.readTransactions(INTENT).length;
  const result = coordinator.decide({
    occurrence: question(),
    actorId: "codex",
    registry: createDecisionOptionEffectRegistry({
      revision: autonomyDigest("escalation-registry"),
      effects: [effect("accept"), effect("reject")],
    }),
    currentNormFingerprint: NORM,
    scopeLineageFingerprint: SCOPE_FP,
    applicableNormFacts: [],
    pastHumanRulings: [],
    capability,
    semiScope: semiScope(),
  });
  const committed = repository.readTransactions(INTENT).slice(before);
  return { result, committed, projection: coordinator.readProjection() };
}

function contestedCapability(): DecisionCapabilityPort {
  return {
    soloElectionAvailable: true,
    unavailableReason: null,
    elect: () => RecommendationOutcome.contested([
      { optionId: "accept", rationale: "two voters in favour", rank: 1 },
      { optionId: "reject", rationale: "two voters against", rank: 2 },
    ], "election-tie"),
    recommend: () => RecommendationOutcome.none("unreachable"),
  };
}

function settledCapability(): DecisionCapabilityPort {
  return {
    soloElectionAvailable: true,
    unavailableReason: null,
    elect: () => RecommendationOutcome.unique("accept", { source: "election", fingerprint: autonomyDigest("settled") }),
    recommend: () => RecommendationOutcome.none("unreachable"),
  };
}

describe("R-7 an escalated ruling commits nothing", () => {
  test("a contested election leaves no transaction, no auto decision and no AUTO_DECIDED event", () => {
    const { result, committed, projection } = decideWith(contestedCapability());
    expect(result.kind).toBe("human-required");
    expect(committed).toEqual([]);
    expect(projection.autoDecisions).toEqual([]);
    expect(committed.flatMap((transaction) => transaction.events.map((event) => event.type))).not.toContain("AUTO_DECIDED");
  });

  test("the escalation carries the ruling so the caller presents it instead of re-deriving it", () => {
    const { result } = decideWith(contestedCapability());
    if (result.kind !== "human-required") throw new Error("human-required expected");
    expect(result.reason).toBe("recommendation-contested");
    expect(result.outcome).toBeDefined();
    if (result.outcome === undefined) return;
    expect(RecommendationOutcome.presentationOf(result.outcome)).toEqual({
      kind: "contested",
      nonUniqueReason: "election-tie",
      candidates: [
        { optionId: "accept", rationale: "two voters in favour", rank: 1 },
        { optionId: "reject", rationale: "two voters against", rank: 2 },
      ],
    });
  });

  test("the same runtime does commit AUTO_DECIDED once the election settles", () => {
    const { result, committed, projection } = decideWith(settledCapability());
    expect(result.kind).toBe("decided");
    expect(committed.flatMap((transaction) => transaction.events.map((event) => event.type))).toContain("AUTO_DECIDED");
    expect(projection.autoDecisions).toHaveLength(1);
  });
});
