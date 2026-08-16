// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: small

import { describe, expect, test } from "bun:test";

import {
  assertLegalAutonomyProjection,
  authorizeInteraction,
  autonomyDigest,
  createAutonomyProjection,
  createInteractionOccurrence,
  decisionAuthorityOf,
  createGateAutoDecision,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  planHumanAutonomyCommand,
  resolveAutoDecision,
  SEMI_ROUTINE_INTERACTIONS,
  SemiAuthority,
  type AutonomyProjection,
  type DecisionCapabilityPort,
  type GrantScopeDescriptor,
  type HumanCommandContext,
  type InteractionOccurrence,
  type SemiAuthorityScope,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import { RecommendationOutcome } from "../../packages/framework/core/tools/amadeus-recommendation.ts";
import {
  encodeIntentAutonomyTransaction,
  readIntentAutonomyTransactions,
  renderIntentAutonomyAuditBlock,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-replay.ts";
import type { IntentAutonomyTransaction } from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const HUMAN = { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" } as const;
const NORM = autonomyDigest("norm-v1");
const SCOPE_FP = autonomyDigest("self-feature");

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

function semiProjection(): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const plan = planHumanAutonomyCommand(initial, { kind: "set-mode", mode: "semi", policies: [] }, context(initial, autonomyDigest("semi")));
  if (!plan.ok) throw new Error(plan.code);
  return plan.after;
}

function grantScope(): GrantScopeDescriptor {
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

function fullProjection(): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const normalized = policies();
  const digest = grantIssuanceDisplayDigest({
    intentUuid: INTENT,
    principalId: "principal-1",
    scope: grantScope(),
    policies: normalized,
  });
  const plan = planHumanAutonomyCommand(
    initial,
    { kind: "issue-full", scope: grantScope(), policies: normalized },
    context(initial, digest),
  );
  if (!plan.ok) throw new Error(plan.code);
  return plan.after;
}

function semiScope(): SemiAuthorityScope {
  return {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds: SEMI_ROUTINE_INTERACTIONS,
  };
}

function occurrence(
  kind: InteractionOccurrence["kind"] = "question",
  phase = "construction",
): InteractionOccurrence {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind,
    stage: kind === "phase-gate" ? null : "code-generation",
    phase,
    bolt: null,
    interactionId: kind === "question" ? "question-1" : "gate-1",
    selector: "selector-1",
    question: kind === "question" ? "Which option?" : "Approve?",
    optionIds: kind === "question" ? ["accept", "reject"] : ["approve"],
    graphRevision: autonomyDigest("graph-v1"),
  });
}

function capability(available = true): DecisionCapabilityPort {
  return {
    soloElectionAvailable: available,
    unavailableReason: available ? null : "native-election-unavailable",
    elect: () => RecommendationOutcome.unique("accept", { source: "election", fingerprint: autonomyDigest("election") }),
    recommend: () => RecommendationOutcome.unique("accept", { source: "agent", fingerprint: autonomyDigest("recommendation") }),
  };
}

describe("first gate decision table", () => {
  test("none refuses every occurrence regardless of a supplied scope", () => {
    const none = createAutonomyProjection({ intentUuid: INTENT });
    expect(authorizeInteraction(none, occurrence("stage-gate"), semiScope())).toMatchObject({
      kind: "human-required",
      reason: "MODE_REQUIRES_HUMAN",
    });
    expect(authorizeInteraction(none, occurrence("question"), semiScope())).toMatchObject({
      kind: "human-required",
      reason: "MODE_REQUIRES_HUMAN",
    });
  });

  test("semi without human-command provenance stays human", () => {
    const systemDefault: AutonomyProjection = {
      ...semiProjection(),
      modeProvenance: { kind: "system-default", targetIntentUuid: INTENT, sourceIdentity: "DEFAULT_MODE_V1", after: "none" },
    };
    expect(authorizeInteraction(systemDefault, occurrence("question"), semiScope())).toMatchObject({
      kind: "human-required",
      reason: "MODE_REQUIRES_HUMAN",
    });
  });

  test("semi without a supplied scope fails closed", () => {
    expect(authorizeInteraction(semiProjection(), occurrence("question"))).toMatchObject({
      kind: "human-required",
      reason: "MODE_REQUIRES_HUMAN",
    });
    expect(authorizeInteraction(semiProjection(), occurrence("stage-gate"), null)).toMatchObject({
      kind: "human-required",
      reason: "MODE_REQUIRES_HUMAN",
    });
  });

  test("semi authorizes questions and phase-internal stage gates with an authority", () => {
    const projection = semiProjection();
    const question = authorizeInteraction(projection, occurrence("question"), semiScope());
    expect(question.kind).toBe("semi-authority");
    if (question.kind !== "semi-authority") return;
    const expected = SemiAuthority.of(projection, semiScope());
    if (expected === null) throw new Error("authority expected");
    expect(question.authority.authorityFingerprint).toBe(expected.authorityFingerprint);
    expect(authorizeInteraction(projection, occurrence("stage-gate"), semiScope()).kind).toBe("semi-authority");
  });

  test("semi keeps the milestones human", () => {
    const projection = semiProjection();
    expect(authorizeInteraction(projection, occurrence("walking-skeleton"), semiScope())).toMatchObject({
      kind: "human-required",
      reason: "SCOPE_OUT",
    });
    expect(authorizeInteraction(projection, occurrence("phase-gate"), semiScope())).toMatchObject({
      kind: "human-required",
      reason: "SCOPE_OUT",
    });
    expect(authorizeInteraction(projection, occurrence("stage-gate", "phase-boundary"), semiScope())).toMatchObject({
      kind: "human-required",
      reason: "SCOPE_OUT",
    });
  });

  test("full keeps its grant-backed authorization and now carries scope and policies", () => {
    const projection = fullProjection();
    const authorization = authorizeInteraction(projection, occurrence("question"), semiScope());
    expect(authorization.kind).toBe("full-grant");
    if (authorization.kind !== "full-grant") return;
    expect(authorization.scope).toEqual(grantScope());
    expect(authorization.policies).toEqual(policies());
    expect(authorization.authorityFingerprint).toBe(autonomyDigest(projection.currentGrant));
  });
});

describe("ladder entry and gate guards", () => {
  function ladderInput(projection: AutonomyProjection) {
    return {
      projection,
      occurrence: occurrence("question"),
      actorId: "codex",
      scopeLineageFingerprint: SCOPE_FP,
      currentNormFingerprint: NORM,
      applicableNormFacts: [],
      pastHumanRulings: [],
      capability: capability(),
    } as const;
  }

  test("the entry refuses an unresolved authorization basis", () => {
    expect(resolveAutoDecision({ ...ladderInput(semiProjection()), authority: null }))
      .toEqual({ kind: "invalid", reason: "authorization-required" });
    expect(resolveAutoDecision({ ...ladderInput(createAutonomyProjection({ intentUuid: INTENT })), authority: null }))
      .toEqual({ kind: "invalid", reason: "authorization-required" });
  });

  test("the entry admits a semi authority and descends the ladder", () => {
    const projection = semiProjection();
    const authorization = authorizeInteraction(projection, occurrence("question"), semiScope());
    if (authorization.kind !== "semi-authority") throw new Error("semi authorization expected");
    const resolved = resolveAutoDecision({
      ...ladderInput(projection),
      authority: decisionAuthorityOf(authorization),
    });
    expect(resolved.kind).toBe("decided");
    if (resolved.kind !== "decided") return;
    expect(resolved.record.basisKind).toBe("solo-election");
    expect(resolved.record.reviewState).toBe("unreviewed");
  });

  test("the ladder entry names no autonomy mode", () => {
    const source = Bun.file("packages/framework/core/tools/amadeus-intent-autonomy.ts");
    return source.text().then((text) => {
      const body = text.slice(text.indexOf("export function resolveAutoDecision("));
      const functionBody = body.slice(0, body.indexOf("\nexport type EffectAuthorization"));
      expect(functionBody).not.toContain('mode !== "full"');
      expect(functionBody).toContain('reason: "authorization-required"');
    });
  });

  test("the gate decision keeps its three miswiring guards and takes its basis from the authority", () => {
    const projection = semiProjection();
    const authorization = authorizeInteraction(projection, occurrence("stage-gate"), semiScope());
    if (authorization.kind !== "semi-authority") throw new Error("semi authorization expected");
    const authority = decisionAuthorityOf(authorization);
    expect(() => createGateAutoDecision({
      projection,
      occurrence: occurrence("question"),
      authority,
      actorId: "codex",
      selectedOptionId: "accept",
      basisKind: "mode-semi",
    })).toThrow("gate-decision-requires-gate-occurrence");
    expect(() => createGateAutoDecision({
      projection: createAutonomyProjection({ intentUuid: INTENT }),
      occurrence: occurrence("stage-gate"),
      authority,
      actorId: "codex",
      selectedOptionId: "approve",
      basisKind: "mode-semi",
    })).toThrow("semi-gate-requires-semi-mode");
    expect(() => createGateAutoDecision({
      projection,
      occurrence: occurrence("stage-gate"),
      authority,
      actorId: "codex",
      selectedOptionId: "approve",
      basisKind: "grant-gate",
    })).toThrow("grant-gate-requires-full-grant");
    const decision = createGateAutoDecision({
      projection,
      occurrence: occurrence("stage-gate"),
      authority,
      actorId: "codex",
      selectedOptionId: "approve",
      basisKind: "mode-semi",
    });
    expect(decision.basisFingerprint).toBe(authority.authorityFingerprint);
  });
});

describe("one-way semiPolicies invariant", () => {
  function illegal(mode: "none" | "full"): AutonomyProjection {
    const base = mode === "full" ? fullProjection() : createAutonomyProjection({ intentUuid: INTENT });
    return { ...base, semiPolicies: policies() };
  }

  test("policies outside semi are an illegal projection", () => {
    expect(() => assertLegalAutonomyProjection(illegal("none")))
      .toThrow("ILLEGAL_STATE:semi-policies-mode-combination");
    expect(() => assertLegalAutonomyProjection(illegal("full")))
      .toThrow("ILLEGAL_STATE:semi-policies-mode-combination");
  });

  test("a semi projection with zero policies stays legal", () => {
    expect(() => assertLegalAutonomyProjection(semiProjection())).not.toThrow();
    expect(() => assertLegalAutonomyProjection({ ...semiProjection(), semiPolicies: [] })).not.toThrow();
    expect(() => assertLegalAutonomyProjection({ ...semiProjection(), semiPolicies: policies() })).not.toThrow();
  });

  test("replay refuses a transaction carrying the illegal projection", () => {
    const legal: IntentAutonomyTransaction = {
      schemaVersion: 1,
      transactionId: "semi-invariant-1",
      intentUuid: INTENT,
      expectedRevision: 0,
      beforeProjection: null,
      beforeProjectionDigest: autonomyDigest(null),
      afterProjectionDigest: autonomyDigest(semiProjection()),
      events: [{
        type: "AUTONOMY_MODE_CHANGED",
        beforeMode: "none",
        afterMode: "semi",
        principalId: "principal-1",
        humanTurnId: HUMAN.turnId,
      }],
      projection: semiProjection(),
    };
    const encoded = renderIntentAutonomyAuditBlock(legal);
    expect(readIntentAutonomyTransactions(encoded)).toHaveLength(1);
    const tampered = { ...legal, projection: illegal("none") };
    expect(() => encodeIntentAutonomyTransaction({
      ...tampered,
      afterProjectionDigest: autonomyDigest(tampered.projection),
    })).toThrow("invalid-intent-autonomy-transaction");
  });
});
