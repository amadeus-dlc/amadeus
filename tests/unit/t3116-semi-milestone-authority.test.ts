// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: small

// RFC-0001 FR-5 (#3116). Semi leaves exactly two interaction kinds to the human
// — phase-gate and walking-skeleton — and decides every other kind itself. The
// permission set is DERIVED as the complement of that milestone pair, and the
// second guard in allowsOccurrence holds the milestone line independently of
// whatever scope a caller supplies.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ALL_INTERACTION_KINDS,
  SEMI_ROUTINE_INTERACTIONS,
  SemiAuthority,
  authorizeInteraction,
  autonomyDigest,
  createAutonomyProjection,
  createInteractionOccurrence,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  planHumanAutonomyCommand,
  type AutonomyProjection,
  type GrantScopeDescriptor,
  type HumanCommandContext,
  type InteractionKind,
  type InteractionOccurrence,
  type SemiAuthorityScope,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const HUMAN = { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" } as const;
const NORM = autonomyDigest("norm-v1");
const SCOPE_FP = autonomyDigest("self-feature");

const MILESTONE_KINDS: readonly InteractionKind[] = ["phase-gate", "walking-skeleton"];

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
    allowedInteractionKinds: [...ALL_INTERACTION_KINDS],
    permissionBoundaryFingerprint: autonomyDigest("host-policy"),
    prohibitedEffects: ["new-permission", "irreversible", "scope-out", "norm-waiver", "quality-waiver"],
  };
}

function semiProjection(): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const plan = planHumanAutonomyCommand(initial, { kind: "set-mode", mode: "semi", policies: [] }, context(initial, autonomyDigest("semi")));
  if (!plan.ok) throw new Error(plan.code);
  return plan.after;
}

function fullProjection(): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const policies = normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: SCOPE_FP,
    humanTurnId: HUMAN.turnId,
    policies: [{ sourceText: "Prefer the safe accepted option", selector: "selector-1", optionId: "accept" }],
  });
  const digest = grantIssuanceDisplayDigest({
    intentUuid: INTENT,
    principalId: "principal-1",
    scope: grantScope(),
    policies,
  });
  const plan = planHumanAutonomyCommand(initial, { kind: "issue-full", scope: grantScope(), policies }, context(initial, digest));
  if (!plan.ok) throw new Error(plan.code);
  return plan.after;
}

function semiScope(allowedInteractionKinds: readonly InteractionKind[] = SEMI_ROUTINE_INTERACTIONS): SemiAuthorityScope {
  return {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds,
  };
}

// The lifecycle phase production actually supplies (amadeus-state.ts stage.phase),
// NOT the "phase-boundary" sentinel the retired third term looked for.
function occurrence(kind: InteractionKind, phase = "construction"): InteractionOccurrence {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind,
    stage: "code-generation",
    phase,
    bolt: null,
    interactionId: `${kind}-code-generation`,
    selector: `${kind}-code-generation`,
    question: `Approve ${kind}`,
    optionIds: kind === "question" ? ["accept", "reject"] : ["approve", "request-changes"],
    graphRevision: autonomyDigest("graph-v1"),
  });
}

describe("R-2: the semi permission set is the complement of the milestone pair", () => {
  test("routine ∪ milestones = every kind, and the two sets are disjoint", () => {
    const routine = [...SEMI_ROUTINE_INTERACTIONS];
    expect([...routine, ...MILESTONE_KINDS].sort()).toEqual([...ALL_INTERACTION_KINDS].sort());
    expect(routine.filter((kind) => MILESTONE_KINDS.includes(kind))).toEqual([]);
  });

  test("the routine set is derived, not restated: no hand-written kind literal remains next to it", () => {
    const source = readFileSync(
      join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools", "amadeus-intent-autonomy.ts"),
      "utf8",
    );
    const declaration = source.match(/export const SEMI_ROUTINE_INTERACTIONS[^;]*;/s);
    expect(declaration).not.toBeNull();
    expect(declaration?.[0]).toContain("filter");
    expect(declaration?.[0]).not.toContain('"stage-gate"');
    // The milestone pair is spelled out exactly once in the module.
    const milestoneLiterals = source.match(/\["phase-gate",\s*"walking-skeleton"\]/g) ?? [];
    expect(milestoneLiterals.length).toBe(1);
  });
});

describe("R-3: the second guard refuses milestones regardless of the supplied scope", () => {
  for (const kind of MILESTONE_KINDS) {
    test(`a scope that allows ${kind} still does not let semi decide it`, () => {
      const authority = SemiAuthority.of(semiProjection(), semiScope(ALL_INTERACTION_KINDS));
      expect(authority).not.toBeNull();
      expect(SemiAuthority.allowsOccurrence(authority as SemiAuthority, occurrence(kind))).toBe(false);
    });
  }

  test("the routine kinds stay decidable under the same over-wide scope", () => {
    const authority = SemiAuthority.of(semiProjection(), semiScope(ALL_INTERACTION_KINDS));
    for (const kind of SEMI_ROUTINE_INTERACTIONS) {
      expect(SemiAuthority.allowsOccurrence(authority as SemiAuthority, occurrence(kind))).toBe(true);
    }
  });

  test("the lifecycle phase no longer decides authority on its own", () => {
    const authority = SemiAuthority.of(semiProjection(), semiScope());
    // A routine kind carried on the retired sentinel phase is still routine.
    expect(SemiAuthority.allowsOccurrence(authority as SemiAuthority, occurrence("question", "phase-boundary"))).toBe(true);
  });
});

describe("FR-5: the mode x confirmation-point matrix", () => {
  const expectations: ReadonlyArray<{
    readonly mode: "none" | "semi" | "full";
    readonly kind: InteractionKind;
    readonly authority: "human-required" | "semi-authority" | "full-grant";
    readonly reason?: "MODE_REQUIRES_HUMAN" | "SCOPE_OUT";
  }> = [
    { mode: "none", kind: "stage-gate", authority: "human-required", reason: "MODE_REQUIRES_HUMAN" },
    { mode: "none", kind: "phase-gate", authority: "human-required", reason: "MODE_REQUIRES_HUMAN" },
    { mode: "none", kind: "walking-skeleton", authority: "human-required", reason: "MODE_REQUIRES_HUMAN" },
    { mode: "none", kind: "question", authority: "human-required", reason: "MODE_REQUIRES_HUMAN" },
    { mode: "semi", kind: "stage-gate", authority: "semi-authority" },
    { mode: "semi", kind: "phase-gate", authority: "human-required", reason: "SCOPE_OUT" },
    { mode: "semi", kind: "walking-skeleton", authority: "human-required", reason: "SCOPE_OUT" },
    { mode: "semi", kind: "question", authority: "semi-authority" },
    { mode: "full", kind: "stage-gate", authority: "full-grant" },
    { mode: "full", kind: "phase-gate", authority: "full-grant" },
    { mode: "full", kind: "walking-skeleton", authority: "full-grant" },
    { mode: "full", kind: "question", authority: "full-grant" },
  ];

  test("covers every mode x kind pair exactly once", () => {
    expect(expectations.length).toBe(3 * ALL_INTERACTION_KINDS.length);
    expect(new Set(expectations.map((row) => `${row.mode}:${row.kind}`)).size).toBe(expectations.length);
  });

  for (const row of expectations) {
    test(`${row.mode} x ${row.kind} resolves to ${row.authority}`, () => {
      const projection = row.mode === "none"
        ? createAutonomyProjection({ intentUuid: INTENT })
        : row.mode === "semi" ? semiProjection() : fullProjection();
      const authorization = authorizeInteraction(projection, occurrence(row.kind), semiScope());
      expect(authorization.kind).toBe(row.authority);
      if (row.reason !== undefined && authorization.kind === "human-required") {
        expect(authorization.reason).toBe(row.reason);
      }
    });
  }
});

// RFC-0001 appendix B measured 172 semi refusals (phase-gate 106 +
// walking-skeleton 66). The class, not the count, is what must survive: every
// refusal in that corpus is a milestone, and no routine kind joins them.
describe("FR-5: the measured refusal corpus keeps exactly the milestone class", () => {
  test("the 172-case class is milestone-only, and semi never stops on a routine kind", () => {
    const projection = semiProjection();
    const refusedKinds = ALL_INTERACTION_KINDS.filter(
      (kind) => authorizeInteraction(projection, occurrence(kind), semiScope()).kind === "human-required",
    );
    expect([...refusedKinds].sort()).toEqual([...MILESTONE_KINDS].sort());
  });
});
