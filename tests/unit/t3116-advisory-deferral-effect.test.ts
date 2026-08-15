// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts, file:packages/framework/core/tools/amadeus-advisory-choice.ts
// size: small

// RFC-0001 ADR-2 (#3116). The semi effect ceiling grows by exactly one
// classification, `advisory-deferral`, and it is reachable from exactly one
// construction point: the advisory choice table. The two falling proofs the ADR
// reserved live here — the advisory arm goes green, and every other route to the
// new classification stays structurally closed.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS,
  advisoryChoiceOptionIds,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import { PROHIBITED_EFFECTS } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import {
  SEMI_ROUTINE_INTERACTIONS,
  SemiAuthority,
  authorizeDecisionEffect,
  autonomyDigest,
  createAutonomyProjection,
  createDecisionOptionEffectRegistry,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  planHumanAutonomyCommand,
  type AutonomyProjection,
  type DecisionOptionEffect,
  type EffectClassification,
  type GrantScopeDescriptor,
  type HumanCommandContext,
  type IntentGrant,
  type SemiAuthorityScope,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const HUMAN = { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" } as const;
const NORM = autonomyDigest("norm-v1");
const SCOPE_FP = autonomyDigest("self-feature");
const TOOLS_DIR = join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools");

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

function grantScope(): GrantScopeDescriptor {
  return {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds: ["stage-gate", "phase-gate", "walking-skeleton", "question"],
    permissionBoundaryFingerprint: autonomyDigest("host-policy"),
    prohibitedEffects: [...PROHIBITED_EFFECTS],
  };
}

function semiAuthority(): SemiAuthority {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const plan = planHumanAutonomyCommand(initial, { kind: "set-mode", mode: "semi", policies: [] }, context(initial, autonomyDigest("semi")));
  if (!plan.ok) throw new Error(plan.code);
  const scope: SemiAuthorityScope = {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds: SEMI_ROUTINE_INTERACTIONS,
  };
  const authority = SemiAuthority.of(plan.after, scope);
  if (authority === null) throw new Error("authority expected");
  return authority;
}

function grant(): IntentGrant {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const policies = normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: SCOPE_FP,
    humanTurnId: HUMAN.turnId,
    policies: [{ sourceText: "Prefer the safe accepted option", selector: "selector-1", optionId: "accept" }],
  });
  const digest = grantIssuanceDisplayDigest({ intentUuid: INTENT, principalId: "principal-1", scope: grantScope(), policies });
  const plan = planHumanAutonomyCommand(initial, { kind: "issue-full", scope: grantScope(), policies }, context(initial, digest));
  if (!plan.ok || plan.after.currentGrant === null) throw new Error("grant expected");
  return plan.after.currentGrant;
}

function effect(classification: EffectClassification): DecisionOptionEffect {
  const payload = { action: "defer", optionId: "defer-with-risk" };
  return {
    effectId: "effect-defer",
    optionId: "defer-with-risk",
    payload,
    payloadFingerprint: autonomyDigest(payload),
    classification,
    requiredScopeFingerprint: SCOPE_FP,
    applicableNormFingerprint: NORM,
  };
}

function authorizeUnderGrant(classification: EffectClassification) {
  const target = effect(classification);
  return authorizeDecisionEffect({
    grant: grant(),
    selectedOptionId: "defer-with-risk",
    currentNormFingerprint: NORM,
    registry: createDecisionOptionEffectRegistry({ revision: autonomyDigest(target), effects: [target] }),
  });
}

// Falling proof 1 (ADR-2 reservation): the advisory deferral arm goes green.
describe("R-7 / R-9: advisory deferral is an authorizable effect", () => {
  test("the advisory table classifies defer-with-risk as advisory-deferral", () => {
    expect(ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS).toEqual({
      "run-now": "workflow-reversible",
      "defer-with-risk": "advisory-deferral",
    });
  });

  test("semi authorizes the classification the advisory table assigns", () => {
    const classification = ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS["defer-with-risk"];
    expect(SemiAuthority.authorizeEffect(semiAuthority(), effect(classification), NORM)).toEqual({
      ok: true,
      effect: effect(classification),
    });
  });

  test("a full grant authorizes the same classification", () => {
    expect(authorizeUnderGrant(ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS["defer-with-risk"]).ok).toBe(true);
  });

  test("norm currency still binds the new classification", () => {
    const stale = { ...effect("advisory-deferral"), applicableNormFingerprint: autonomyDigest("norm-v0") };
    expect(SemiAuthority.authorizeEffect(semiAuthority(), stale, NORM)).toEqual({
      ok: false,
      reason: "semi-gate-effect-not-authorized",
    });
  });
});

// Falling proof 2 (ADR-2 reservation): the refusal side. Blocking-class
// deferrals cannot reach the new classification, and they cannot reach it
// because no other construction point assigns it — not because a runtime check
// happens to catch them.
describe("R-10: advisory-deferral has exactly one construction point", () => {
  test("no other module assigns the classification", () => {
    const assigning = readdirSync(TOOLS_DIR)
      .filter((name) => name.endsWith(".ts"))
      .filter((name) => readFileSync(join(TOOLS_DIR, name), "utf8").includes('"advisory-deferral"'));
    expect(assigning.sort()).toEqual(["amadeus-advisory-choice.ts", "amadeus-intent-autonomy.ts"]);
  });

  test("the blocking classes are still refused by both authorization arms", () => {
    for (const classification of PROHIBITED_EFFECTS) {
      expect(SemiAuthority.authorizeEffect(semiAuthority(), effect(classification), NORM)).toEqual({
        ok: false,
        reason: "semi-gate-effect-not-authorized",
      });
      expect(authorizeUnderGrant(classification)).toEqual({ ok: false, reason: "PROHIBITED_EFFECT" });
    }
  });

  test("the prohibited five are unchanged and advisory-deferral is not among them", () => {
    expect([...PROHIBITED_EFFECTS]).toEqual([
      "new-permission",
      "irreversible",
      "scope-out",
      "norm-waiver",
      "quality-waiver",
    ]);
    expect([...PROHIBITED_EFFECTS]).not.toContain("advisory-deferral");
  });
});

// R-11 + scope pin: what this unit does NOT change. The unattended translation
// barrier (only `run-now` resolves without a human) is a separate mechanism the
// ADR did not open, and the advisory option space is untouched, so a deferral is
// still recorded with its risk and stays re-raisable.
describe("the advisory choice contract around the classification is unchanged", () => {
  test("the option space still offers both choices", () => {
    expect(advisoryChoiceOptionIds()).toEqual(["run-now", "defer-with-risk"]);
  });

  test("translateAdvisoryDecision still resolves run-now only", () => {
    const source = readFileSync(join(TOOLS_DIR, "amadeus-advisory-choice.ts"), "utf8");
    const fn = source.match(/export function translateAdvisoryDecision[\s\S]*?\n}/);
    expect(fn).not.toBeNull();
    expect(fn?.[0]).toContain('selectedOptionId !== "run-now"');
  });
});
