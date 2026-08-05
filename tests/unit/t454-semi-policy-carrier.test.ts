// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: small

import { describe, expect, test } from "bun:test";

import {
  autonomyDigest,
  autonomyScopeFingerprint,
  createAutonomyProjection,
  grantIssuanceDisplayDigest,
  nonFullCommandDisplayDigest,
  normalizeDecisionPolicies,
  planHumanAutonomyCommand,
  SEMI_POLICY_SCOPE_ID,
  semiPoliciesOf,
  type AutonomyProjection,
  type DecisionPolicyInput,
  type GrantScopeDescriptor,
  type HumanCommandContext,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const HUMAN = { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" } as const;
const NORM = autonomyDigest("norm-v1");
const SCOPE_FP = autonomyDigest("self-feature");
const OCCURRENCE_ID = "command-1";

const POLICY: DecisionPolicyInput = {
  sourceText: "Prefer the safe accepted option",
  selector: "selector-1",
  optionId: "accept",
};

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

function context(projection: AutonomyProjection, confirmedDisplayDigest: string): HumanCommandContext {
  return {
    targetIntentUuid: INTENT,
    principalId: "principal-1",
    humanTurn: HUMAN,
    commandOccurrenceId: OCCURRENCE_ID,
    expectedProjectionRevision: projection.projectionRevision,
    confirmedDisplayDigest,
  };
}

function nonFullDigest(
  mode: "none" | "semi",
  policies: readonly DecisionPolicyInput[],
  revokedGrantId: string | null = null,
): string {
  return nonFullCommandDisplayDigest({ intentUuid: INTENT, mode, revokedGrantId, policies });
}

// The write side is only reachable through a human command, so every case
// starts from a fresh projection and names the digest the human confirmed.
function applySetMode(
  mode: "none" | "semi",
  policies: readonly DecisionPolicyInput[],
): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const plan = planHumanAutonomyCommand(
    initial,
    { kind: "set-mode", mode, policies },
    context(initial, nonFullDigest(mode, policies)),
  );
  if (!plan.ok) throw new Error(`plan rejected: ${plan.code}`);
  return plan.after;
}

function fullProjection(): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const normalized = normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: SCOPE_FP,
    humanTurnId: HUMAN.turnId,
    policies: [POLICY],
  });
  const digest = grantIssuanceDisplayDigest({
    intentUuid: INTENT,
    principalId: "principal-1",
    scope: scope(),
    policies: normalized,
  });
  const plan = planHumanAutonomyCommand(
    initial,
    { kind: "issue-full", scope: scope(), policies: normalized },
    context(initial, digest),
  );
  if (!plan.ok) throw new Error(`grant issuance rejected: ${plan.code}`);
  return plan.after;
}

describe("t454 semi policy carrier", () => {
  // C8 write side: the five rows of the input -> after.semiPolicies table.
  test("set-mode semi with policies stores the normalized policy set", () => {
    const after = applySetMode("semi", [POLICY]);
    const stored = semiPoliciesOf(after);
    expect(stored.length).toBe(1);
    expect(stored[0]!.selector).toBe("selector-1");
    expect(stored[0]!.normalizedOptionRule).toEqual({ kind: "exact-option", optionId: "accept" });
    expect(stored[0]!.confirmedByHumanTurnId).toBe(HUMAN.turnId);
    // The policy has to land in the same fingerprint space the semi authority
    // carries at decision time, or the confirmed-policy rung filters it out.
    expect(stored[0]!.scopeFingerprint).toBe(autonomyScopeFingerprint(INTENT, SEMI_POLICY_SCOPE_ID));
    expect(stored[0]!.policyId).toBe(
      normalizeDecisionPolicies({
        grantIdentitySeed: OCCURRENCE_ID,
        scopeFingerprint: autonomyScopeFingerprint(INTENT, SEMI_POLICY_SCOPE_ID),
        humanTurnId: HUMAN.turnId,
        policies: [POLICY],
      })[0]!.policyId,
    );
  });

  test("zero policies is the same state as no field at all", () => {
    const after = applySetMode("semi", []);
    expect(after.semiPolicies).toBeUndefined();
    expect(semiPoliciesOf(after)).toEqual([]);
  });

  test("set-mode none leaves the carrier unset", () => {
    const after = applySetMode("none", []);
    expect(after.mode).toBe("none");
    expect(after.semiPolicies).toBeUndefined();
  });

  test("revoke-full to semi follows the same rule as set-mode semi", () => {
    const before = fullProjection();
    const grantId = before.currentGrant!.grantId;
    const plan = planHumanAutonomyCommand(
      before,
      { kind: "revoke-full", targetMode: "semi", policies: [POLICY] },
      context(before, nonFullDigest("semi", [POLICY], grantId)),
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.after.mode).toBe("semi");
    expect(semiPoliciesOf(plan.after).length).toBe(1);
    expect(plan.after.currentGrant).toBeNull();
  });

  test("issue-full keeps its policies on the grant, not on the carrier", () => {
    const after = fullProjection();
    expect(after.semiPolicies).toBeUndefined();
    expect(after.currentGrant!.policies.length).toBe(1);
  });

  // C9: one digest definition, policy set folded in.
  test("the non-full display digest moves with the policy set and is stable", () => {
    const other: DecisionPolicyInput = { ...POLICY, optionId: "defer" };
    expect(nonFullDigest("semi", [POLICY])).toBe(nonFullDigest("semi", [POLICY]));
    expect(nonFullDigest("semi", [POLICY])).not.toBe(nonFullDigest("semi", [other]));
    expect(nonFullDigest("semi", [POLICY])).not.toBe(nonFullDigest("semi", []));
    expect(nonFullDigest("semi", [POLICY])).not.toBe(nonFullDigest("none", [POLICY]));
    expect(nonFullDigest("semi", [POLICY])).not.toBe(nonFullDigest("semi", [POLICY], "intent-grant-abc"));
  });

  // Q1: the confirmation digest is checked exactly when policies are carried.
  test("a non-empty policy set must match the confirmed digest", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    const matched = planHumanAutonomyCommand(
      initial,
      { kind: "set-mode", mode: "semi", policies: [POLICY] },
      context(initial, nonFullDigest("semi", [POLICY])),
    );
    expect(matched.ok).toBe(true);

    const mismatched = planHumanAutonomyCommand(
      initial,
      { kind: "set-mode", mode: "semi", policies: [POLICY] },
      context(initial, nonFullDigest("semi", [{ ...POLICY, optionId: "defer" }])),
    );
    expect(mismatched.ok).toBe(false);
    if (mismatched.ok) return;
    expect(mismatched.code).toBe("INVALID_COMMAND");
  });

  test("an empty policy set keeps the single-step confirmation shape", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    const plan = planHumanAutonomyCommand(
      initial,
      { kind: "set-mode", mode: "semi", policies: [] },
      context(initial, autonomyDigest("some-other-preview")),
    );
    expect(plan.ok).toBe(true);
  });
});
