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
  projectGrantReference,
  revalidateGrantExerciseReservation,
  resolveAutoDecision,
  validateResumeCondition,
  type AutonomyProjection,
  type DecisionCapabilityPort,
  type DecisionFact,
  type DecisionOptionEffect,
  type GrantScopeDescriptor,
  type HumanCommandContext,
  type InteractionOccurrence,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const HUMAN = { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" } as const;
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
  test("rejects malformed policy, projection, and command invariants", () => {
    expect(() => normalizeDecisionPolicies({
      grantIdentitySeed: "bad seed",
      scopeFingerprint: SCOPE_FP,
      humanTurnId: HUMAN.turnId,
      policies: [],
    })).toThrow("invalid-policy-normalization-context");
    expect(() => normalizeDecisionPolicies({
      grantIdentitySeed: "grant-seed",
      scopeFingerprint: SCOPE_FP,
      humanTurnId: HUMAN.turnId,
      policies: [{ sourceText: "   ", selector: "selector-1", optionId: "accept" }],
    })).toThrow("invalid-decision-policy");
    expect(() => normalizeDecisionPolicies({
      grantIdentitySeed: "grant-seed",
      scopeFingerprint: SCOPE_FP,
      humanTurnId: HUMAN.turnId,
      policies: [
        { sourceText: "same", selector: "selector-1", optionId: "accept" },
        { sourceText: "same", selector: "selector-1", optionId: "accept" },
      ],
    })).toThrow("duplicate-decision-policy");
    expect(() => createAutonomyProjection({ intentUuid: "bad intent" })).toThrow("invalid-intent-uuid");

    const initial = createAutonomyProjection({ intentUuid: INTENT });
    expect(() => assertLegalAutonomyProjection({ ...initial, projectionRevision: -1 })).toThrow("projection-identity");
    expect(() => assertLegalAutonomyProjection({
      ...initial,
      workflowExecutionState: "suspended",
      parkEnvelope: null,
    })).toThrow("park-envelope");
    expect(planHumanAutonomyCommand(initial, { kind: "replace-full", scope: scope(), policies: policies() }, context(initial, autonomyDigest("replace"))))
      .toEqual({ ok: false, code: "INVALID_COMMAND" });
    const full = fullProjection();
    expect(planHumanAutonomyCommand(full, { kind: "issue-full", scope: scope(), policies: policies() }, context(full, autonomyDigest("issue"))))
      .toEqual({ ok: false, code: "INVALID_COMMAND" });
  });

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
    expect(() => assertLegalAutonomyProjection({
      ...full,
      currentGrant: {
        ...full.currentGrant!,
        scope: { ...full.currentGrant!.scope, scopeId: "invalid scope" },
      },
    })).toThrow("invalid-grant-scope");
  });
});

describe("gate and question decision contract", () => {
  test("rejects invalid gate and fallback decision inputs", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    expect(() => createGateAutoDecision({
      projection: initial,
      occurrence: occurrence("question"),
      actorId: "codex",
      selectedOptionId: "accept",
      basisKind: "mode-semi",
    })).toThrow("gate-decision-requires-gate-occurrence");
    expect(() => createGateAutoDecision({
      projection: initial,
      occurrence: occurrence("stage-gate", ["approve"]),
      actorId: "codex",
      selectedOptionId: "approve",
      basisKind: "mode-semi",
    })).toThrow("semi-gate-requires-semi-mode");
    expect(() => createGateAutoDecision({
      projection: initial,
      occurrence: occurrence("stage-gate", ["approve"]),
      actorId: "codex",
      selectedOptionId: "approve",
      basisKind: "grant-gate",
    })).toThrow("grant-gate-requires-full-grant");

    const projection = fullProjection("accept");
    const withoutPolicies = { ...projection, currentGrant: { ...projection.currentGrant!, policies: [] } };
    const decisionInput = {
      projection: withoutPolicies,
      occurrence: occurrence(),
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [],
      pastHumanRulings: [],
    } as const;
    expect(resolveAutoDecision({ ...decisionInput, currentNormFingerprint: "bad", capability: capability() }))
      .toEqual({ kind: "invalid", reason: "invalid-decision-context" });
    expect(resolveAutoDecision({
      ...decisionInput,
      capability: {
        ...capability(),
        elect: () => ({ optionId: "missing", evidenceFingerprint: "bad" }),
      },
    })).toEqual({ kind: "invalid", reason: "invalid-election-result" });
    expect(resolveAutoDecision({
      ...decisionInput,
      capability: {
        ...capability(false),
        unavailableReason: null,
      },
    })).toEqual({ kind: "invalid", reason: "invalid-recommendation-result" });
  });

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

  test("authorization rejects cross-Intent and out-of-scope interactions", () => {
    const full = fullProjection();
    expect(authorizeInteraction(full, { ...occurrence(), intentUuid: "other-intent" })).toMatchObject({
      kind: "human-required",
      reason: "SCOPE_OUT",
    });
    const stageOnly = {
      ...full,
      currentGrant: {
        ...full.currentGrant!,
        scope: { ...full.currentGrant!.scope, allowedInteractionKinds: ["stage-gate"] as const },
      },
    };
    expect(authorizeInteraction(stageOnly, occurrence("walking-skeleton", ["approve"]))).toMatchObject({
      kind: "human-required",
      reason: "SCOPE_OUT",
    });
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

  test("a valid solo election is recorded as an unreviewed decision", () => {
    const projection = fullProjection("accept");
    const withoutPolicies = { ...projection, currentGrant: { ...projection.currentGrant!, policies: [] } };
    const result = resolveAutoDecision({
      projection: withoutPolicies,
      occurrence: occurrence(),
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [],
      pastHumanRulings: [],
      capability: capability(true),
    });
    expect(result).toMatchObject({
      kind: "decided",
      record: { selectedOptionId: "accept", decider: "solo-election", reviewState: "unreviewed" },
    });
  });
});

describe("effect authorization and workflow result", () => {
  test("effect registry and authorization fail closed on drift", () => {
    expect(() => createDecisionOptionEffectRegistry({ revision: "bad", effects: [] }))
      .toThrow("invalid-effect-registry-revision");
    expect(() => createDecisionOptionEffectRegistry({
      revision: autonomyDigest("registry"),
      effects: [{ ...effect(), payloadFingerprint: "bad" }],
    })).toThrow("invalid-effect-registry");
    expect(() => createDecisionOptionEffectRegistry({
      revision: autonomyDigest("registry"),
      effects: [effect(), effect()],
    })).toThrow("invalid-effect-registry");

    const grant = fullProjection().currentGrant!;
    const scopeDrift = createDecisionOptionEffectRegistry({
      revision: autonomyDigest("scope-registry"),
      effects: [{ ...effect(), requiredScopeFingerprint: autonomyDigest("other-scope") }],
    });
    expect(authorizeDecisionEffect({ grant, selectedOptionId: "accept", currentNormFingerprint: NORM, registry: scopeDrift }))
      .toEqual({ ok: false, reason: "SCOPE_OUT" });
    const normDrift = createDecisionOptionEffectRegistry({
      revision: autonomyDigest("norm-registry"),
      effects: [{ ...effect(), applicableNormFingerprint: autonomyDigest("other-norm") }],
    });
    expect(authorizeDecisionEffect({ grant, selectedOptionId: "accept", currentNormFingerprint: NORM, registry: normDrift }))
      .toEqual({ ok: false, reason: "NORM_DRIFT" });
    const mutableEffect = effect();
    const payloadDrift = createDecisionOptionEffectRegistry({ revision: autonomyDigest("payload-registry"), effects: [mutableEffect] });
    (mutableEffect.payload as { action: string }).action = "tampered";
    expect(authorizeDecisionEffect({ grant, selectedOptionId: "accept", currentNormFingerprint: NORM, registry: payloadDrift }))
      .toEqual({ ok: false, reason: "PAYLOAD_MISMATCH" });
  });

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

  test("reservation revalidation reports each drift boundary", () => {
    const base = fullProjection();
    const target = occurrence();
    const resolved = resolveAutoDecision({
      projection: base,
      occurrence: target,
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [],
      pastHumanRulings: [],
      capability: capability(),
    });
    if (resolved.kind !== "decided") throw new Error("decision expected");
    const selectedEffect = effect();
    const registry = createDecisionOptionEffectRegistry({
      revision: autonomyDigest("reservation-registry"),
      effects: [selectedEffect],
    });
    const reservation = createGrantExerciseReservation({
      projection: base,
      occurrence: target,
      decision: resolved.record,
      effect: selectedEffect,
      effectRegistryRevision: registry.revision,
      currentNormFingerprint: NORM,
    });
    const reserved = { ...base, projectionRevision: base.projectionRevision + 1, pendingExercise: reservation };
    const validate = (projection: AutonomyProjection, candidate = target, selectedRegistry = registry, norm = NORM) =>
      revalidateGrantExerciseReservation({ projection, reservation, occurrence: candidate, registry: selectedRegistry, currentNormFingerprint: norm });
    expect(validate({ ...reserved, mode: "none", currentGrant: null })).toEqual({ valid: false, reason: "grant-changed" });
    expect(validate({ ...reserved, projectionRevision: reserved.projectionRevision + 1 })).toEqual({ valid: false, reason: "projection-changed" });
    expect(validate(reserved, { ...target, occurrenceId: "other-occurrence" })).toEqual({ valid: false, reason: "occurrence-changed" });
    expect(validate(reserved, target, { ...registry, revision: autonomyDigest("changed-registry") })).toEqual({ valid: false, reason: "registry-changed" });
    expect(validate(reserved, target, registry, autonomyDigest("changed-norm"))).toEqual({ valid: false, reason: "norm-changed" });
    expect(validate(reserved)).toEqual({ valid: true });
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

  test("strict result parser rejects malformed terminal and retry contracts", () => {
    expect(() => parseWorkflowResult(null)).toThrow("invalid-workflow-result");
    expect(() => parseWorkflowResult({ outcome: "unknown" })).toThrow("invalid-workflow-result");
    expect(() => parseWorkflowResult({
      outcome: "completed", reasonCode: "USER_PARKED", retryable: true, intentUuid: INTENT,
      autonomyMode: "none", grant: null, evidenceFingerprint: null, resumeCondition: null, failureRef: null,
    })).toThrow("invalid-workflow-result");
    expect(() => parseWorkflowResult({
      outcome: "failed", reasonCode: null, retryable: false, intentUuid: INTENT,
      autonomyMode: "none", grant: null, evidenceFingerprint: "bad", resumeCondition: null, failureRef: "bad ref",
    })).toThrow("invalid-workflow-result");
    expect(() => parseWorkflowResult({
      outcome: "parked", reasonCode: "USER_PARKED", retryable: false, intentUuid: INTENT,
      autonomyMode: "none", grant: null, evidenceFingerprint: autonomyDigest("parked"),
      resumeCondition: { kind: "human-unpark", identity: "resume-1", status: "pending", evidenceFingerprint: null },
      failureRef: null,
    })).toThrow("invalid-workflow-result");
  });

  test("workflow result projection accepts valid terminal and failed outcomes", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    expect(projectGrantReference(initial)).toBeNull();
    const full = fullProjection();
    expect(projectGrantReference(full)).toMatchObject({ state: "active" });

    const failed = {
      outcome: "failed",
      reasonCode: null,
      retryable: false,
      intentUuid: INTENT,
      autonomyMode: "none",
      grant: null,
      evidenceFingerprint: autonomyDigest("failure"),
      resumeCondition: null,
      failureRef: "failure-1",
    } as const;
    expect(parseWorkflowResult(failed)).toEqual(failed);
    const completed = {
      outcome: "completed",
      reasonCode: null,
      retryable: false,
      intentUuid: INTENT,
      autonomyMode: "none",
      grant: null,
      evidenceFingerprint: null,
      resumeCondition: null,
      failureRef: null,
    } as const;
    expect(parseWorkflowResult(completed)).toEqual(completed);
    expect(() => parseWorkflowResult({ ...completed, autonomyMode: "invalid" })).toThrow("invalid-workflow-result");

    const resume = { kind: "human-unpark", identity: "resume-1", status: "pending", evidenceFingerprint: null } as const;
    expect(() => validateResumeCondition("USER_PARKED", resume)).not.toThrow();
    expect(() => validateResumeCondition("NORM_CONFLICT", resume)).toThrow("ILLEGAL_STATE:resume-condition");
  });
});
