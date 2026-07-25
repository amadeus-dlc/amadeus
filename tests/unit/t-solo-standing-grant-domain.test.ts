// covers: function:resolveOperatingMode, function:evaluateStandingGrantGateEligibility, function:dispatchStandingGrantQuery
//
// Pure (Small) half of the U1 grant-authorization-domain suite: operating-mode
// normalization, the mode-dispatch observer and the gate-eligibility policy
// matrix. The audit-corpus scans (selection, receipt lookup) drive a real temp
// workspace and live in tests/integration/t-solo-standing-grant-domain.test.ts
// so the unit layer stays Small (test-size purity ratchet).

import { describe, expect, test } from "bun:test";
import {
  evaluateStandingGrantGateEligibility,
  resolveOperatingMode,
  StandingGrant,
  type StageEntry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  createStandingGrantTestObserver,
  dispatchStandingGrantQuery,
} from "../../packages/framework/core/tools/amadeus-grant-authorization.ts";

const GRAPH: StageEntry[] = [
  stage("application-design", "2.4", "inception"),
  stage("units-generation", "2.5", "inception"),
  stage("functional-design", "3.1", "construction"),
  stage("nfr-requirements", "3.2", "construction"),
];
const ORDINARY_STAGE = "application-design";
const HUMAN_TS = "2026-07-25T00:00:00.000Z";
const SHARD = "fixture-clone.md";

function stage(slug: string, number: string, phase: string): StageEntry {
  return {
    slug,
    number,
    name: slug,
    phase,
    execution: "ALWAYS",
    lead_agent: "test",
    support_agents: [],
    mode: "inline",
    scopes: ["amadeus-feature"],
  };
}

function auditBlock(event: string, timestamp: string, fields: Record<string, string> = {}): string {
  let block = `\n## ${event}\n**Timestamp**: ${timestamp}\n**Event**: ${event}\n`;
  for (const [name, value] of Object.entries(fields)) block += `**${name}**: ${value}\n`;
  return `${block}\n---\n`;
}

function grantBlock(
  intent: string,
  grantId: string,
  issuedAt: string,
  expiresAt: string,
  overrides: Record<string, string> = {},
): string {
  return auditBlock("GRANT_ISSUED", issuedAt, {
    "Grant Id": grantId,
    Scope: "stage-gates",
    "Expires At": expiresAt,
    "Includes Phase Boundary": "false",
    "Issuer Space": "default",
    "Issuer Intent": intent,
    "Issuer Shard": SHARD,
    "Issuer Human Ts": HUMAN_TS,
    ...overrides,
  });
}

function intentName(): string {
  return "solo-intent-abcd1234";
}

describe("solo standing grant operating mode", () => {
  test.each([
    [undefined, { kind: "valid", mode: "solo" }],
    ["", { kind: "valid", mode: "solo" }],
    ["solo", { kind: "valid", mode: "solo" }],
    ["team", { kind: "valid", mode: "team" }],
    ["unexpected", { kind: "invalid", raw: "unexpected" }],
  ] as const)("resolves %p without treating unknown values as solo", (raw, expected) => {
    expect(resolveOperatingMode(raw)).toEqual(expected);
  });
});

describe("operating-mode query dispatch", () => {
  test("team dispatch invokes the existing team finder and performs zero solo scan work", () => {
    let soloCalls = 0;
    let teamCalls = 0;
    const observer = createStandingGrantTestObserver();

    const result = dispatchStandingGrantQuery("team", {
      solo() {
        soloCalls++;
        return null;
      },
      team() {
        teamCalls++;
        return "team-result";
      },
    });

    expect(result).toBe("team-result");
    expect(soloCalls).toBe(0);
    expect(teamCalls).toBe(1);
    expect(observer.snapshot("candidate-selection")).toEqual({
      shardOpened: 0,
      eventVisited: 0,
      candidateCompared: 0,
      memoryItemAdded: 0,
      canonicalShards: [],
    });
  });
});

function parsedGrant(includesPhaseBoundary = false) {
  const grant = StandingGrant.parse(
    grantBlock(
      intentName(),
      "abcdef12",
      "2026-07-25T01:00:00.000Z",
      "2026-07-26T01:00:00.000Z",
      { "Includes Phase Boundary": includesPhaseBoundary ? "true" : "false" },
    ),
  );
  if (grant === null) throw new Error("invalid test grant");
  return grant;
}


describe("standing grant gate eligibility", () => {
  const ordinary = {
    gateRequired: true,
    isPhaseBoundary: false,
    isFirstConstructionGate: false,
    isPerUnitStage: false,
    isPerUnitFinalGate: false,
    scope: "amadeus-feature",
    walkingSkeletonStance: "off" as const,
  };

  test("does not invent authorization when no gate exists or a per-unit iteration is incomplete", () => {
    expect(
      evaluateStandingGrantGateEligibility(parsedGrant(), {
        ...ordinary,
        gateRequired: false,
      }),
    ).toEqual({ kind: "ineligible", reason: "no-gate" });
    expect(
      evaluateStandingGrantGateEligibility(parsedGrant(), {
        ...ordinary,
        isPerUnitStage: true,
        isPerUnitFinalGate: false,
      }),
    ).toEqual({ kind: "ineligible", reason: "per-unit-incomplete" });
  });

  test("applies phase-boundary opt-in before walking-skeleton policy", () => {
    const boundary = {
      ...ordinary,
      isPhaseBoundary: true,
      isFirstConstructionGate: true,
      walkingSkeletonStance: "on" as const,
    };
    expect(evaluateStandingGrantGateEligibility(parsedGrant(false), boundary)).toEqual({
      kind: "ineligible",
      reason: "phase-boundary",
    });
    expect(evaluateStandingGrantGateEligibility(parsedGrant(true), boundary)).toEqual({
      kind: "ineligible",
      reason: "walking-skeleton",
    });
  });

  test.each([
    ["on", "amadeus-feature", "ineligible"],
    ["off", "amadeus-feature", "eligible"],
    ["scope-dependent", "amadeus-feature", "ineligible"],
    [undefined, "amadeus-feature", "ineligible"],
    ["scope-dependent", "amadeus-bugfix", "eligible"],
    [undefined, "unknown-scope", "ineligible"],
  ] as const)("resolves stance %p and scope %s fail-closed", (stance, scope, expected) => {
    const result = evaluateStandingGrantGateEligibility(parsedGrant(), {
      ...ordinary,
      isFirstConstructionGate: true,
      scope,
      walkingSkeletonStance: stance,
    });
    expect(result.kind).toBe(expected);
  });
});
