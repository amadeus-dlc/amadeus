// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: small

import { describe, expect, test } from "bun:test";

import {
  autonomyDigest,
  createAutonomyProjection,
  createInteractionOccurrence,
  decisionAuthorityOf,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  planHumanAutonomyCommand,
  SEMI_ROUTINE_INTERACTIONS,
  SemiAuthority,
  semiPoliciesOf,
  type AutonomyProjection,
  type DecisionOptionEffect,
  type GrantScopeDescriptor,
  type HumanCommandContext,
  type InteractionOccurrence,
  type SemiAuthorityScope,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

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

function semiScope(overrides: Partial<SemiAuthorityScope> = {}): SemiAuthorityScope {
  return {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds: SEMI_ROUTINE_INTERACTIONS,
    ...overrides,
  };
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

function fullProjection(): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const normalized = normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: SCOPE_FP,
    humanTurnId: HUMAN.turnId,
    policies: [{ sourceText: "Prefer the safe accepted option", selector: "selector-1", optionId: "accept" }],
  });
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

function occurrence(
  kind: InteractionOccurrence["kind"] = "question",
  overrides: Partial<Pick<InteractionOccurrence, "phase" | "intentUuid">> = {},
): InteractionOccurrence {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind,
    stage: "code-generation",
    phase: "construction",
    bolt: null,
    interactionId: kind === "question" ? "question-1" : "gate-1",
    selector: "selector-1",
    question: kind === "question" ? "Which option?" : "Approve?",
    optionIds: kind === "question" ? ["accept", "reject"] : ["approve"],
    graphRevision: autonomyDigest("graph-v1"),
    ...overrides,
  });
}

function effect(
  classification: DecisionOptionEffect["classification"] = "workflow-reversible",
  applicableNormFingerprint = NORM,
): DecisionOptionEffect {
  const payload = { action: "continue", optionId: "accept" };
  return {
    effectId: "effect-accept",
    optionId: "accept",
    payload,
    payloadFingerprint: autonomyDigest(payload),
    classification,
    requiredScopeFingerprint: SCOPE_FP,
    applicableNormFingerprint,
  };
}

describe("SemiAuthority smart constructor", () => {
  test("builds only for a human-commanded semi projection with well-formed fingerprints", () => {
    const authority = SemiAuthority.of(semiProjection(), semiScope());
    expect(authority).not.toBeNull();
    expect(authority?.kind).toBe("semi-authority");
    expect(authority?.intentUuid).toBe(INTENT);
    expect(authority?.authorityFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("returns null for a non-semi mode, a non-human provenance, and malformed fingerprints", () => {
    expect(SemiAuthority.of(createAutonomyProjection({ intentUuid: INTENT }), semiScope())).toBeNull();
    expect(SemiAuthority.of(fullProjection(), semiScope())).toBeNull();
    const systemDefault: AutonomyProjection = {
      ...semiProjection(),
      modeProvenance: { kind: "system-default", targetIntentUuid: INTENT, sourceIdentity: "DEFAULT_MODE_V1", after: "none" },
    };
    expect(SemiAuthority.of(systemDefault, semiScope())).toBeNull();
    expect(SemiAuthority.of(semiProjection(), semiScope({ scopeFingerprint: "not-a-digest" }))).toBeNull();
    expect(SemiAuthority.of(semiProjection(), semiScope({ normFingerprint: "not-a-digest" }))).toBeNull();
  });

  test("carries the projection policies through the read-side total function", () => {
    const projection = semiProjection();
    expect(semiPoliciesOf(projection)).toEqual([]);
    const policies = normalizeDecisionPolicies({
      grantIdentitySeed: "semi-seed",
      scopeFingerprint: SCOPE_FP,
      humanTurnId: HUMAN.turnId,
      policies: [{ sourceText: "Prefer accept", selector: "selector-1", optionId: "accept" }],
    });
    const withPolicies: AutonomyProjection = { ...projection, semiPolicies: policies };
    expect(semiPoliciesOf(withPolicies)).toEqual(policies);
    expect(SemiAuthority.of(withPolicies, semiScope())?.policies).toEqual(policies);
  });

  test("the fingerprint is stable per policy set and moves when the policy set moves", () => {
    const base = { modeProvenance: semiProjection().modeProvenance, scopeFingerprint: SCOPE_FP, policies: [] as const };
    expect(SemiAuthority.fingerprint(base)).toBe(SemiAuthority.fingerprint(base));
    const policies = normalizeDecisionPolicies({
      grantIdentitySeed: "semi-seed",
      scopeFingerprint: SCOPE_FP,
      humanTurnId: HUMAN.turnId,
      policies: [{ sourceText: "Prefer accept", selector: "selector-1", optionId: "accept" }],
    });
    expect(SemiAuthority.fingerprint({ ...base, policies })).not.toBe(SemiAuthority.fingerprint(base));
  });

  test("the type carries only the three authorization responsibilities", () => {
    const authority = SemiAuthority.of(semiProjection(), semiScope());
    if (authority === null) throw new Error("authority expected");
    expect(Object.keys(authority).sort()).toEqual(["authorityFingerprint", "intentUuid", "kind", "policies", "scope"]);
    for (const forbidden of ["expiresAt", "state", "principalId", "issuanceDigest", "grantId"]) {
      expect(authority).not.toHaveProperty(forbidden);
    }
  });
});

describe("SemiAuthority scope and effect authorization", () => {
  test("allows the routine interaction kinds inside a phase and refuses the milestones", () => {
    const authority = SemiAuthority.of(semiProjection(), semiScope());
    if (authority === null) throw new Error("authority expected");
    expect(SEMI_ROUTINE_INTERACTIONS).toEqual(["stage-gate", "question"]);
    expect(SemiAuthority.allowsOccurrence(authority, occurrence("question"))).toBe(true);
    expect(SemiAuthority.allowsOccurrence(authority, occurrence("stage-gate"))).toBe(true);
    expect(SemiAuthority.allowsOccurrence(authority, occurrence("walking-skeleton"))).toBe(false);
    expect(SemiAuthority.allowsOccurrence(authority, occurrence("phase-gate"))).toBe(false);
    // RFC-0001 FR-5: the milestone line is drawn by kind, not by the occurrence
    // phase, so a routine kind stays routine whatever phase string it carries.
    expect(SemiAuthority.allowsOccurrence(authority, occurrence("stage-gate", { phase: "phase-boundary" }))).toBe(true);
    expect(SemiAuthority.allowsOccurrence(authority, occurrence("question", { intentUuid: "other-intent" }))).toBe(false);
  });

  test("authorizes reversible effects on the current norm and refuses everything else", () => {
    const authority = SemiAuthority.of(semiProjection(), semiScope());
    if (authority === null) throw new Error("authority expected");
    expect(SemiAuthority.authorizeEffect(authority, effect(), NORM)).toEqual({ ok: true, effect: effect() });
    expect(SemiAuthority.authorizeEffect(authority, null, NORM))
      .toEqual({ ok: false, reason: "semi-gate-effect-not-authorized" });
    expect(SemiAuthority.authorizeEffect(authority, effect("irreversible"), NORM))
      .toEqual({ ok: false, reason: "semi-gate-effect-not-authorized" });
    expect(SemiAuthority.authorizeEffect(authority, effect("workflow-reversible", autonomyDigest("other-norm")), NORM))
      .toEqual({ ok: false, reason: "semi-gate-effect-not-authorized" });
  });
});

describe("decisionAuthorityOf projection", () => {
  test("projects the semi authorization onto the ladder authority", () => {
    const authority = SemiAuthority.of(semiProjection(), semiScope());
    if (authority === null) throw new Error("authority expected");
    expect(decisionAuthorityOf({
      kind: "semi-authority",
      occurrence: occurrence("question"),
      authority,
      projectionRevision: 1,
    })).toEqual({
      kind: "semi",
      scope: authority.scope,
      policies: authority.policies,
      authorityFingerprint: authority.authorityFingerprint,
    });
  });

  test("projects the full-grant authorization onto the ladder authority", () => {
    const grant = fullProjection().currentGrant;
    if (grant === null) throw new Error("grant expected");
    expect(decisionAuthorityOf({
      kind: "full-grant",
      occurrence: occurrence("question"),
      grantId: grant.grantId,
      scope: grant.scope,
      policies: grant.policies,
      scopeFingerprint: grant.scope.scopeFingerprint,
      authorityFingerprint: autonomyDigest(grant),
      projectionRevision: 1,
    })).toEqual({
      kind: "grant",
      grantId: grant.grantId,
      scope: grant.scope,
      policies: grant.policies,
      authorityFingerprint: autonomyDigest(grant),
    });
  });

  test("projects a human-required authorization onto no authority at all", () => {
    expect(decisionAuthorityOf({
      kind: "human-required",
      occurrence: occurrence("walking-skeleton"),
      reason: "SCOPE_OUT",
    })).toBeNull();
  });
});
