// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts
// covers: audit:INTENT_AUTONOMY_TRANSACTION_COMMITTED
// size: medium

import { describe, expect, test } from "bun:test";

import {
  autonomyDigest,
  createAutonomyProjection,
  createDecisionOptionEffectRegistry,
  createInteractionOccurrence,
  SEMI_ROUTINE_INTERACTIONS,
  SemiAuthority,
  type AutonomyProjection,
  type DecisionCapabilityPort,
  type DecisionFact,
  type DecisionOptionEffect,
  type SemiAuthorityScope,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  createMemoryIntentAutonomyRepository,
  projectIntentAutonomyStatus,
  type IntentAutonomyCoordinator,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";
import {
  readIntentAutonomyTransactions,
  renderIntentAutonomyAuditBlock,
  replayIntentAutonomyAudit,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-replay.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const NORM = autonomyDigest("norm-v1");
const SCOPE_FP = autonomyDigest("scope-v1");
const GRAPH = autonomyDigest("graph-v1");

function semiScope(): SemiAuthorityScope {
  return {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds: SEMI_ROUTINE_INTERACTIONS,
  };
}

function question(selector = "selector-1", interactionId = "question-1") {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind: "question",
    stage: "code-generation",
    phase: "construction",
    bolt: null,
    interactionId,
    selector,
    question: "Continue?",
    optionIds: ["accept", "reject"],
    graphRevision: GRAPH,
  });
}

function effect(optionId: string, classification: DecisionOptionEffect["classification"] = "workflow-reversible"): DecisionOptionEffect {
  const payload = { workflow: "continue", optionId };
  return {
    effectId: `workflow-${optionId}`,
    optionId,
    payload,
    payloadFingerprint: autonomyDigest(payload),
    classification,
    requiredScopeFingerprint: SCOPE_FP,
    applicableNormFingerprint: NORM,
  };
}

function registry(...effects: DecisionOptionEffect[]) {
  return createDecisionOptionEffectRegistry({ revision: autonomyDigest(effects), effects });
}

function capability(available: boolean, counters?: { elect: number; recommend: number }): DecisionCapabilityPort {
  return {
    soloElectionAvailable: available,
    unavailableReason: available ? null : "subagent-capability-unavailable",
    elect() {
      if (counters) counters.elect++;
      return { optionId: "accept", evidenceFingerprint: autonomyDigest("election") };
    },
    recommend() {
      if (counters) counters.recommend++;
      return { optionId: "accept", evidenceFingerprint: autonomyDigest("recommendation") };
    },
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

function semiRuntime(): {
  readonly coordinator: IntentAutonomyCoordinator;
  readonly repository: ReturnType<typeof createMemoryIntentAutonomyRepository>;
  readonly projection: AutonomyProjection;
} {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const repository = createMemoryIntentAutonomyRepository();
  const coordinator = createIntentAutonomyCoordinator({ initialProjection: initial, repository });
  const applied = coordinator.applyHumanCommand({ kind: "set-mode", mode: "semi", policies: [] }, {
    targetIntentUuid: INTENT,
    principalId: "principal-1",
    humanTurn: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" },
    commandOccurrenceId: "command-1",
    expectedProjectionRevision: initial.projectionRevision,
    confirmedDisplayDigest: autonomyDigest({ intentUuid: INTENT, mode: "semi" }),
  });
  if ("error" in applied) throw new Error(applied.error);
  return { coordinator, repository, projection: coordinator.readProjection() };
}

function decisionInput(overrides: Partial<Parameters<IntentAutonomyCoordinator["decide"]>[0]> = {}) {
  return {
    occurrence: question(),
    actorId: "amadeus-conductor",
    registry: registry(effect("accept"), effect("reject")),
    currentNormFingerprint: NORM,
    scopeLineageFingerprint: SCOPE_FP,
    applicableNormFacts: [],
    pastHumanRulings: [],
    capability: capability(true),
    semiScope: semiScope(),
    ...overrides,
  };
}

describe("semi questions travel the ladder", () => {
  test("a semi question commits AUTO_DECIDED with an authority-derived basis and no grant", () => {
    const { coordinator, repository, projection } = semiRuntime();
    const result = coordinator.decide(decisionInput());
    expect(result.kind).toBe("decided");
    if (result.kind !== "decided") return;
    expect(result.decision.grantId).toBeNull();
    expect(coordinator.readProjection().currentGrant).toBeNull();
    expect(repository.readTransactions(INTENT).at(-1)?.events.map((event) => event.type)).toEqual([
      "AUTO_DECIDED",
      "WORKFLOW_EFFECT_APPLIED",
    ]);
    const authority = SemiAuthority.of(projection, semiScope());
    if (authority === null) throw new Error("authority expected");
    expect(SemiAuthority.fingerprint({
      modeProvenance: projection.modeProvenance,
      scopeFingerprint: semiScope().scopeFingerprint,
      policies: [],
    })).toBe(authority.authorityFingerprint);
  });

  test("the question is decided by the ladder, never by the gate decision path", () => {
    const { coordinator } = semiRuntime();
    const result = coordinator.decide(decisionInput());
    if (result.kind !== "decided") throw new Error("decision expected");
    expect(["confirmed-policy", "norm", "history", "solo-election", "agent-recommendation"])
      .toContain(result.decision.basisKind);
    expect(result.decision.basisKind).not.toBe("mode-semi");
    expect(result.decision.basisKind).not.toBe("grant-gate");
  });

  test("the ladder descends norm, then history, then election, then recommendation", () => {
    const norm = semiRuntime().coordinator.decide(decisionInput({
      applicableNormFacts: [fact("accept", "norm-evidence")],
    }));
    expect(norm.kind === "decided" && norm.decision.basisKind).toBe("norm");
    expect(norm.kind === "decided" && norm.decision.reviewState).toBe("not-applicable");

    const history = semiRuntime().coordinator.decide(decisionInput({
      pastHumanRulings: [fact("accept", "history-evidence")],
    }));
    expect(history.kind === "decided" && history.decision.basisKind).toBe("history");
    expect(history.kind === "decided" && history.decision.reviewState).toBe("not-applicable");

    const counters = { elect: 0, recommend: 0 };
    const elected = semiRuntime().coordinator.decide(decisionInput({ capability: capability(true, counters) }));
    expect(elected.kind === "decided" && elected.decision.basisKind).toBe("solo-election");
    expect(elected.kind === "decided" && elected.decision.reviewState).toBe("unreviewed");
    expect(counters).toEqual({ elect: 1, recommend: 0 });

    const recommended = semiRuntime().coordinator.decide(decisionInput({ capability: capability(false) }));
    expect(recommended.kind === "decided" && recommended.decision.basisKind).toBe("agent-recommendation");
    expect(recommended.kind === "decided" && recommended.decision.reviewState).toBe("unreviewed");
  });

  test("the last two rungs are counted as unreviewed for the human to look at later", () => {
    const { coordinator } = semiRuntime();
    expect(projectIntentAutonomyStatus(coordinator.readProjection()).unreviewedAutoDecisionCount).toBe(0);
    coordinator.decide(decisionInput());
    expect(projectIntentAutonomyStatus(coordinator.readProjection()).unreviewedAutoDecisionCount).toBe(1);
    coordinator.decide(decisionInput({
      occurrence: question("selector-2", "question-2"),
      capability: capability(false),
    }));
    expect(projectIntentAutonomyStatus(coordinator.readProjection()).unreviewedAutoDecisionCount).toBe(2);
    coordinator.decide(decisionInput({
      occurrence: question("selector-3", "question-3"),
      applicableNormFacts: [{ ...fact("accept", "norm-evidence"), selector: "selector-3" }],
    }));
    expect(projectIntentAutonomyStatus(coordinator.readProjection()).unreviewedAutoDecisionCount).toBe(2);
  });

  test("an irreversible effect is refused instead of applied", () => {
    const { coordinator, repository } = semiRuntime();
    const result = coordinator.decide(decisionInput({
      registry: registry(effect("accept", "irreversible"), effect("reject")),
    }));
    expect(result).toEqual({ kind: "human-required", reason: "semi-gate-effect-not-authorized", result: null });
    expect(repository.readTransactions(INTENT).at(-1)?.events.map((event) => event.type))
      .toEqual(["AUTONOMY_MODE_CHANGED"]);
  });

  test("a semi decision replays into the same projection it was written from", () => {
    const { coordinator, repository } = semiRuntime();
    expect(coordinator.decide(decisionInput()).kind).toBe("decided");
    const audit = repository.readTransactions(INTENT).map(renderIntentAutonomyAuditBlock).join("\n");
    expect(readIntentAutonomyTransactions(audit)).toHaveLength(2);
    const replayed = replayIntentAutonomyAudit(audit).readTransactions(INTENT).at(-1)?.projection;
    expect(replayed).toEqual(coordinator.readProjection());
    expect(replayed?.currentGrant).toBeNull();
  });
});
