// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: medium

import { describe, expect, test } from "bun:test";

import {
  assertLegalAutonomyProjection,
  authorizeDecisionEffect,
  authorizeInteraction,
  autonomyDigest,
  createAutonomyProjection,
  createDecisionOptionEffectRegistry,
  createGateAutoDecision,
  createGrantExerciseReservation,
  createInteractionOccurrence,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  parseWorkflowResult,
  planHumanAutonomyCommand,
  resolveAutoDecision,
  type AutonomyProjection,
  type DecisionCapabilityPort,
  type DecisionFact,
  type DecisionOptionEffect,
  type GrantScopeDescriptor,
  type HumanCommandContext,
  type InteractionOccurrence,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const HUMAN = { verified: true, eventType: "HUMAN_TURN", turnId: "human-turn-1" } as const;
const NORM = autonomyDigest("norm-v1");
const SCOPE_FP = autonomyDigest("self-feature");

function scope(): GrantScopeDescriptor {
  return {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds: ["stage-gate", "phase-gate", "walking-skeleton", "question"],
    permissionBoundaryFingerprint: autonomyDigest("host-policy"),
    prohibitedEffects: ["new-permission", "irreversible", "scope-out", "norm-waiver", "quality-waiver"],
  };
}

function policies(optionId = "accept") {
  return normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: SCOPE_FP,
    humanTurnId: HUMAN.turnId,
    policies: [{ sourceText: "Prefer the safe accepted option", selector: "selector-1", optionId }],
  });
}

function context(projection: AutonomyProjection, confirmedDisplayDigest: string): HumanCommandContext {
  return {
    targetIntentUuid: INTENT,
    principalId: "principal-1",
    humanTurn: HUMAN,
    commandOccurrenceId: "command-1",
    expectedProjectionRevision: projection.projectionRevision,
    confirmedDisplayDigest,
  };
}

function fullProjection(optionId = "accept"): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const normalized = policies(optionId);
  const digest = grantIssuanceDisplayDigest({ intentUuid: INTENT, principalId: "principal-1", scope: scope(), policies: normalized });
  const plan = planHumanAutonomyCommand(initial, { kind: "issue-full", scope: scope(), policies: normalized }, context(initial, digest));
  if (!plan.ok) throw new Error(plan.code);
  return plan.after;
}

function occurrence(kind: InteractionOccurrence["kind"] = "question", options = ["accept", "reject"]): InteractionOccurrence {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind,
    stage: "code-generation",
    phase: "construction",
    bolt: "intent-autonomy-runtime",
    interactionId: kind === "question" ? "question-1" : "gate-1",
    selector: "selector-1",
    question: kind === "question" ? "Which option?" : "Approve?",
    optionIds: options,
    graphRevision: autonomyDigest("graph-v1"),
  });
}

function effect(optionId = "accept", classification: DecisionOptionEffect["classification"] = "workflow-reversible"): DecisionOptionEffect {
  const payload = { action: "continue", optionId };
  return {
    effectId: `effect-${optionId}`,
    optionId,
    payload,
    payloadFingerprint: autonomyDigest(payload),
    classification,
    requiredScopeFingerprint: SCOPE_FP,
    applicableNormFingerprint: NORM,
  };
}

function capability(available = true): DecisionCapabilityPort {
  return {
    soloElectionAvailable: available,
    unavailableReason: available ? null : "native-election-unavailable",
    elect: () => ({ optionId: "accept", evidenceFingerprint: autonomyDigest("election") }),
    recommend: () => ({ optionId: "reject", evidenceFingerprint: autonomyDigest("recommendation") }),
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

describe("Intent autonomy mode and grant aggregate", () => {
  test("defaults to none without manufacturing human provenance", () => {
    const projection = createAutonomyProjection({ intentUuid: INTENT });
    expect(projection.mode).toBe("none");
    expect(projection.currentGrant).toBeNull();
    expect(projection.modeProvenance.kind).toBe("system-default");
  });

  test("legacy standing grants are diagnostics and cannot authorize", () => {
    const projection = createAutonomyProjection({
      intentUuid: INTENT,
      legacyStandingGrants: [{ eventIdentity: "legacy-event-1", grantId: "abcdef12", observedState: "active" }],
    });
    expect(projection.mode).toBe("none");
    expect(projection.modeProvenance.kind).toBe("legacy-fail-closed");
    expect(projection.migrationDiagnostics[0]?.kind).toBe("legacy-non-authoritative");
  });

  test("headless and harness facts are not accepted as a mode command", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    const invalid = planHumanAutonomyCommand(initial, { kind: "set-mode", mode: "semi" }, {
      ...context(initial, autonomyDigest("semi-display")),
      humanTurn: null as never,
    });
    expect(invalid).toEqual({ ok: false, code: "PROVENANCE_REQUIRED" });
  });

  test("none to semi is a human-only transition with no grant", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    const plan = planHumanAutonomyCommand(initial, { kind: "set-mode", mode: "semi" }, context(initial, autonomyDigest("semi-display")));
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.after.mode).toBe("semi");
    expect(plan.after.currentGrant).toBeNull();
    expect(plan.after.modeProvenance.kind).toBe("human-command");
  });

  test("full issuance binds scope, policies and the real human display digest", () => {
    const projection = fullProjection();
    expect(projection.mode).toBe("full");
    expect(projection.currentGrant?.state).toBe("active");
    expect(projection.currentGrant).not.toHaveProperty("expiresAt");
    expect(projection.currentGrant).not.toHaveProperty("remainingUses");
  });

  test("a mismatched displayed digest cannot issue a grant", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    const plan = planHumanAutonomyCommand(initial, { kind: "issue-full", scope: scope(), policies: policies() }, context(initial, autonomyDigest("tampered")));
    expect(plan).toEqual({ ok: false, code: "INVALID_COMMAND" });
  });

  test("replacement revokes the old grant atomically", () => {
    const before = fullProjection();
    const nextPolicies = normalizeDecisionPolicies({
      grantIdentitySeed: "replacement-seed",
      scopeFingerprint: SCOPE_FP,
      humanTurnId: "human-turn-2",
      policies: [{ sourceText: "Choose reject", selector: "selector-1", optionId: "reject" }],
    });
    const nextContext = {
      ...context(before, grantIssuanceDisplayDigest({ intentUuid: INTENT, principalId: "principal-1", scope: scope(), policies: nextPolicies })),
      humanTurn: { ...HUMAN, turnId: "human-turn-2" },
      commandOccurrenceId: "command-2",
    };
    const plan = planHumanAutonomyCommand(before, { kind: "replace-full", scope: scope(), policies: nextPolicies }, nextContext);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.revokedGrant?.state).toBe("revoked");
    expect(plan.after.currentGrant?.grantId).not.toBe(before.currentGrant?.grantId);
  });

  test("full plus null grant and none plus active grant are illegal", () => {
    const full = fullProjection();
    expect(() => assertLegalAutonomyProjection({ ...full, currentGrant: null })).toThrow("mode-grant-combination");
    expect(() => assertLegalAutonomyProjection({ ...full, mode: "none" })).toThrow("mode-grant-combination");
  });
});

describe("gate and question decision contract", () => {
  test("none always returns human-required", () => {
    expect(authorizeInteraction(createAutonomyProjection({ intentUuid: INTENT }), occurrence("stage-gate", ["approve"])).kind).toBe("human-required");
  });

  test("semi authorizes only phase-internal stage gates", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    const plan = planHumanAutonomyCommand(initial, { kind: "set-mode", mode: "semi" }, context(initial, autonomyDigest("semi")));
    if (!plan.ok) throw new Error(plan.code);
    expect(authorizeInteraction(plan.after, occurrence("stage-gate", ["approve"])).kind).toBe("semi-mode-gate");
    expect(authorizeInteraction(plan.after, occurrence("walking-skeleton", ["approve"])).kind).toBe("human-required");
    expect(authorizeInteraction(plan.after, occurrence("question")).kind).toBe("human-required");
  });

  test("full covers walking skeleton using the same grant rule", () => {
    expect(authorizeInteraction(fullProjection(), occurrence("walking-skeleton", ["approve"])).kind).toBe("full-grant");
  });

  test("semi and grant gate decisions are queue-inapplicable", () => {
    const full = fullProjection("approve");
    const decision = createGateAutoDecision({
      projection: full,
      occurrence: occurrence("stage-gate", ["approve"]),
      actorId: "codex",
      selectedOptionId: "approve",
      basisKind: "grant-gate",
    });
    expect(decision.decider).toBe("deterministic-engine");
    expect(decision.reviewState).toBe("not-applicable");
  });

  test("confirmed policy wins and is represented as basis, not decider", () => {
    const result = resolveAutoDecision({
      projection: fullProjection(),
      occurrence: occurrence(),
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [fact("reject", "norm")],
      pastHumanRulings: [],
      capability: capability(),
    });
    expect(result.kind).toBe("decided");
    if (result.kind !== "decided") return;
    expect(result.record.selectedOptionId).toBe("accept");
    expect(result.record.decider).toBe("deterministic-engine");
    expect(result.record.basisKind).toBe("confirmed-policy");
    expect(result.record.reviewState).toBe("not-applicable");
  });

  test("unique norm precedes history and election", () => {
    const projection = fullProjection("reject");
    const withoutPolicies = { ...projection, currentGrant: { ...projection.currentGrant!, policies: [] } };
    const result = resolveAutoDecision({
      projection: withoutPolicies,
      occurrence: occurrence(),
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [fact("accept", "norm")],
      pastHumanRulings: [fact("reject", "history")],
      capability: capability(),
    });
    expect(result.kind === "decided" && result.record.basisKind).toBe("norm");
  });

  test("conflicting applicable norms park instead of inventing precedence", () => {
    const projection = fullProjection("accept");
    const withoutPolicies = { ...projection, currentGrant: { ...projection.currentGrant!, policies: [] } };
    const result = resolveAutoDecision({
      projection: withoutPolicies,
      occurrence: occurrence(),
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [fact("accept", "norm-a"), fact("reject", "norm-b")],
      pastHumanRulings: [],
      capability: capability(),
    });
    expect(result).toEqual({ kind: "park", reason: "NORM_CONFLICT" });
  });

  test("past human ruling requires selector, lineage and norm fingerprint match", () => {
    const projection = fullProjection("accept");
    const withoutPolicies = { ...projection, currentGrant: { ...projection.currentGrant!, policies: [] } };
    const result = resolveAutoDecision({
      projection: withoutPolicies,
      occurrence: occurrence(),
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [],
      pastHumanRulings: [fact("reject", "history")],
      capability: capability(),
    });
    expect(result.kind === "decided" && result.record.basisKind).toBe("history");
  });

  test("missing election capability degrades loudly without fake votes", () => {
    const projection = fullProjection("accept");
    const withoutPolicies = { ...projection, currentGrant: { ...projection.currentGrant!, policies: [] } };
    const result = resolveAutoDecision({
      projection: withoutPolicies,
      occurrence: occurrence(),
      actorId: "kimi",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [],
      pastHumanRulings: [],
      capability: capability(false),
    });
    expect(result.kind).toBe("decided");
    if (result.kind !== "decided") return;
    expect(result.record.decider).toBe("agent-recommendation");
    expect(result.record.degradedCapability?.reason).toBe("native-election-unavailable");
    expect(result.record.reviewState).toBe("unreviewed");
  });
});

describe("effect authorization and workflow result", () => {
  test("effect registry is exact and allows only current reversible scope/norm", () => {
    const grant = fullProjection().currentGrant!;
    const registry = createDecisionOptionEffectRegistry({ revision: autonomyDigest("registry"), effects: [effect()] });
    expect(authorizeDecisionEffect({ grant, selectedOptionId: "accept", currentNormFingerprint: NORM, registry }).ok).toBe(true);
    expect(authorizeDecisionEffect({ grant, selectedOptionId: "missing", currentNormFingerprint: NORM, registry })).toEqual({ ok: false, reason: "UNKNOWN_EFFECT" });
  });

  test.each(["new-permission", "irreversible", "scope-out", "norm-waiver", "quality-waiver"] as const)(
    "%s can never be auto-authorized",
    (classification) => {
      const grant = fullProjection().currentGrant!;
      const registry = createDecisionOptionEffectRegistry({ revision: autonomyDigest("registry"), effects: [effect("accept", classification)] });
      expect(authorizeDecisionEffect({ grant, selectedOptionId: "accept", currentNormFingerprint: NORM, registry })).toEqual({ ok: false, reason: "PROHIBITED_EFFECT" });
    },
  );

  test("reservation binds the complete candidate after option selection", () => {
    const projection = fullProjection();
    const decision = resolveAutoDecision({
      projection,
      occurrence: occurrence(),
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [],
      pastHumanRulings: [],
      capability: capability(),
    });
    if (decision.kind !== "decided") throw new Error("decision expected");
    const reservation = createGrantExerciseReservation({
      projection,
      occurrence: occurrence(),
      decision: decision.record,
      effect: effect(),
      effectRegistryRevision: autonomyDigest("registry"),
      currentNormFingerprint: NORM,
    });
    expect(reservation.candidateDigest).toMatch(/^sha256:/);
    expect(reservation).not.toHaveProperty("authorized");
  });

  test("strict result parser rejects full without active grant", () => {
    expect(() => parseWorkflowResult({
      outcome: "completed",
      reasonCode: null,
      retryable: false,
      intentUuid: INTENT,
      autonomyMode: "full",
      grant: null,
      evidenceFingerprint: null,
      resumeCondition: null,
      failureRef: null,
    })).toThrow("invalid-workflow-result");
  });
});
