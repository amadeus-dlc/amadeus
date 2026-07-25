// covers: function:routeSoloStandingGrantDirective, function:armPresenceReservation, function:mintArmedPresenceReservation, function:consumePresenceReservation, function:mintHumanPresence
//
// Filesystem-backed (Medium) half of the U2 solo-gate-transaction suite: the
// route transaction's audit-first receipt, the ritual-preservation counters and
// the presence reservation state machine all drive a real temp workspace, so
// they live in the integration layer (test-size purity). The pure directive and
// classifier assertions stay in tests/unit/t-solo-gate-transaction.test.ts.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  directiveSelfCheckExamples,
  type RunStageDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";
import { routeSoloStandingGrantDirective } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import type { StageEntry } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { findStandingGrantRouteReceiptById } from "../../packages/framework/core/tools/amadeus-grant-authorization.ts";
import {
  armPresenceReservation,
  consumePresenceReservation,
  hostSessionCapability,
  mintArmedPresenceReservation,
  mintHumanPresence,
  readPresenceReservation,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";

const GRANT_ID = "abcdef12";
const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";
const TARGET_INTENT_ID = "00000000-0000-7000-8000-000000000001";
const RESERVATION_ID = "87654321-4321-4abc-8def-1234567890ab";
const TEMP_ROOTS: string[] = [];

afterAll(() => {
  for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
});

function runStage(): RunStageDirective {
  const example = directiveSelfCheckExamples.find(
    (directive) => directive.kind === "run-stage" && directive.gate === true,
  );
  if (example === undefined || example.kind !== "run-stage") {
    throw new Error("missing run-stage fixture");
  }
  return { ...example };
}

describe("solo grant route transaction", () => {
  test("appends the protected receipt before returning the carrier pair", () => {
    const root = routeFixture();
    const directive = runStage() as RunStageDirective;
    directive.stage = "application-design";
    directive.gate = true;
    const stateContent = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "solo-intent-abcd1234", "amadeus-state.md"),
      "utf-8",
    );

    const routed = routeSoloStandingGrantDirective({
      directive,
      projectDir: root,
      stateContent,
      graph: ROUTE_GRAPH,
      nowMs: Date.parse("2026-07-25T12:00:00.000Z"),
      operatingMode: "solo",
      routeIdFactory: () => ROUTE_ID,
    });

    expect(routed.standing_grant_id).toBe(GRANT_ID);
    expect(routed.standing_grant_route_id).toBe(ROUTE_ID);
    expect(routed.gate).toBe(true);
    expect(findStandingGrantRouteReceiptById(root, ROUTE_ID)).toEqual({
      intent: "solo-intent-abcd1234",
      receipt: {
        routeId: ROUTE_ID,
        stage: "application-design",
        grantId: GRANT_ID,
        timestamp: expect.any(String),
      },
    });
  });

  test.each([
    ["team", true],
    ["solo", false],
  ] as const)("does not route mode=%s gate=%s", (operatingMode, gate) => {
    const root = routeFixture();
    const directive = { ...runStage(), gate };
    const stateContent = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "solo-intent-abcd1234", "amadeus-state.md"),
      "utf-8",
    );

    const routed = routeSoloStandingGrantDirective({
      directive,
      projectDir: root,
      stateContent,
      graph: ROUTE_GRAPH,
      operatingMode,
      routeIdFactory: () => ROUTE_ID,
    });

    expect(routed).toBe(directive);
    expect(findStandingGrantRouteReceiptById(root, ROUTE_ID)).toBeNull();
  });

  test("fails before append when the generated Route Id is already used", () => {
    const root = routeFixture(existingReceipt());
    const stateContent = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "solo-intent-abcd1234", "amadeus-state.md"),
      "utf-8",
    );

    expect(() =>
      routeSoloStandingGrantDirective({
        directive: runStage(),
        projectDir: root,
        stateContent,
        graph: ROUTE_GRAPH,
        nowMs: Date.parse("2026-07-25T12:00:00.000Z"),
        operatingMode: "solo",
        routeIdFactory: () => ROUTE_ID,
      })
    ).toThrow(/Route Id collision/);
    expect(findStandingGrantRouteReceiptById(root, ROUTE_ID)).not.toBeNull();
  });
});

describe("stage ritual under a carrier route", () => {
  // FR-09 / FR-22-23: routing may only add the carrier pair. The stage body
  // (stage_file), reviewer, sensors and §13 learnings ritual are carried by the
  // rest of the directive, so "each exactly once" is asserted as: the routed
  // directive minus the two carrier keys is byte-identical to the input.
  test("adds only the carrier pair and leaves body, reviewer and sensors at one each", () => {
    const root = routeFixture();
    const input: RunStageDirective = {
      ...runStage(),
      stage: "application-design",
      gate: true,
      reviewer: "amadeus-quality-agent",
      reviewer_max_iterations: 2,
    };
    const before = JSON.stringify(input);
    const stateContent = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "solo-intent-abcd1234", "amadeus-state.md"),
      "utf-8",
    );

    const routed = routeSoloStandingGrantDirective({
      directive: input,
      projectDir: root,
      stateContent,
      graph: ROUTE_GRAPH,
      nowMs: Date.parse("2026-07-25T12:00:00.000Z"),
      operatingMode: "solo",
      routeIdFactory: () => ROUTE_ID,
    });

    const { standing_grant_id, standing_grant_route_id, ...ritual } = routed;
    expect(standing_grant_id).toBe(GRANT_ID);
    expect(standing_grant_route_id).toBe(ROUTE_ID);
    expect(JSON.stringify(ritual)).toBe(before);
    expect(JSON.stringify(input)).toBe(before);
    expect([ritual.stage_file].filter(Boolean)).toHaveLength(1);
    expect([ritual.reviewer].filter(Boolean)).toHaveLength(1);
    expect(ritual.sensors_applicable).toEqual(input.sensors_applicable);
  });

  // FR-22: a per-unit iteration directive is gate:false, so it can never carry
  // authorization — only the all-covered final stage gate is a route candidate.
  test("never routes a per-unit iteration directive", () => {
    const root = routeFixture();
    const stateContent = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "solo-intent-abcd1234", "amadeus-state.md"),
      "utf-8",
    );
    const perUnit: RunStageDirective = {
      ...runStage(),
      stage: "application-design",
      gate: false,
    };

    const routed = routeSoloStandingGrantDirective({
      directive: perUnit,
      projectDir: root,
      stateContent,
      graph: ROUTE_GRAPH,
      nowMs: Date.parse("2026-07-25T12:00:00.000Z"),
      operatingMode: "solo",
      routeIdFactory: () => ROUTE_ID,
    });

    expect(routed).toBe(perUnit);
    expect(routed.standing_grant_id).toBeUndefined();
    expect(findStandingGrantRouteReceiptById(root, ROUTE_ID)).toBeNull();
  });
});

describe("presence reservation state machine", () => {
  test("moves armed to minted exactly once and then consumed", () => {
    const root = routeFixture();
    const armed = armPresenceReservation({
      projectDir: root,
      sessionId: "trusted-session-1",
      space: "default",
      targetIntentId: TARGET_INTENT_ID,
      stage: "application-design",
      routeId: ROUTE_ID,
      reservationIdFactory: () => RESERVATION_ID,
    });
    expect(armed.state).toBe("armed");

    const minted = mintArmedPresenceReservation({
      projectDir: root,
      sessionId: "trusted-session-1",
    });
    expect(minted.kind).toBe("minted");
    expect(readPresenceReservation(root, RESERVATION_ID)?.state).toBe("minted");

    const replay = mintArmedPresenceReservation({
      projectDir: root,
      sessionId: "trusted-session-1",
    });
    expect(replay.kind).toBe("already-minted");

    expect(
      consumePresenceReservation({
        projectDir: root,
        sessionId: "trusted-session-1",
        reservationId: RESERVATION_ID,
        targetIntentId: TARGET_INTENT_ID,
        stage: "application-design",
      }).state,
    ).toBe("consumed");
  });

  // Regression: an unconsumed `minted` reservation must not strand the host
  // session. Before the fix, mintHumanPresence returned on `already-minted`, so
  // every human prompt after the first left no HUMAN_TURN anywhere — and since
  // reservations never expire on time alone, the session could never satisfy a
  // human-presence gate again, not even after a restart.
  test("keeps minting ordinary presence while a reservation is held", () => {
    const root = routeFixture();
    const capability = hostSessionCapability("trusted-session-1");
    armPresenceReservation({
      projectDir: root,
      sessionId: "trusted-session-1",
      space: "default",
      targetIntentId: TARGET_INTENT_ID,
      stage: "application-design",
      routeId: ROUTE_ID,
      reservationIdFactory: () => RESERVATION_ID,
    });

    const baseline = humanTurnCount(root);
    for (let turn = 0; turn < 4; turn += 1) {
      mintHumanPresence({ projectDir: root, capability });
    }

    // One event per human prompt: the first is the owner-targeted mint, the
    // remaining three are ordinary untargeted appends.
    expect(humanTurnCount(root) - baseline).toBe(4);
    // HR-24 still holds: exactly one owner event carries the Reservation Id.
    expect(reservationHumanTurnCount(root)).toBe(1);
    expect(readPresenceReservation(root, RESERVATION_ID)?.state).toBe("minted");
  });

  test("does not mint or consume from another session", () => {
    const root = routeFixture();
    armPresenceReservation({
      projectDir: root,
      sessionId: "trusted-session-1",
      space: "default",
      targetIntentId: TARGET_INTENT_ID,
      stage: "application-design",
      routeId: ROUTE_ID,
      reservationIdFactory: () => RESERVATION_ID,
    });

    expect(
      mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "trusted-session-2",
      }),
    ).toEqual({ kind: "none" });
    expect(() =>
      consumePresenceReservation({
        projectDir: root,
        sessionId: "trusted-session-2",
        reservationId: RESERVATION_ID,
        targetIntentId: TARGET_INTENT_ID,
        stage: "application-design",
      })
    ).toThrow(/session/);
    expect(readPresenceReservation(root, RESERVATION_ID)?.state).toBe("armed");
  });
});

const ROUTE_GRAPH: StageEntry[] = [
  {
    slug: "application-design",
    number: "2.4",
    name: "application-design",
    phase: "inception",
    execution: "ALWAYS",
    lead_agent: "test",
    support_agents: [],
    mode: "inline",
    scopes: ["amadeus-feature"],
  },
];

// Read every audit shard of the fixture's record and count HUMAN_TURN events,
// optionally narrowing to the ones tagged with the reservation's id.
function auditText(root: string): string {
  const dir = join(root, "amadeus", "spaces", "default", "intents", "solo-intent-abcd1234", "audit");
  return readdirSync(dir)
    .map((shard) => readFileSync(join(dir, shard), "utf-8"))
    .join("\n");
}

function humanTurnCount(root: string): number {
  return (auditText(root).match(/\*\*Event\*\*: HUMAN_TURN/g) ?? []).length;
}

function reservationHumanTurnCount(root: string): number {
  return auditText(root)
    .split(/^---$/m)
    .filter(
      (block) =>
        block.includes("**Event**: HUMAN_TURN") &&
        block.includes(`**Presence Reservation Id**: ${RESERVATION_ID}`),
    ).length;
}

function routeFixture(extraAudit = ""): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-solo-route-"));
  TEMP_ROOTS.push(root);
  const intent = "solo-intent-abcd1234";
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, intent);
  mkdirSync(join(record, "audit"), { recursive: true });
  writeFileSync(
    join(record, "amadeus-state.md"),
    "# AI-DLC State\n\n- **Scope**: amadeus-feature\n- **Skeleton Stance**: off\n",
  );
  writeFileSync(join(root, "amadeus", "active-space"), "default\n");
  writeFileSync(join(intents, "active-intent"), `${intent}\n`);
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      {
        uuid: TARGET_INTENT_ID,
        slug: "solo-intent",
        dirName: intent,
        status: "in-flight",
      },
    ])}\n`,
  );
  const humanTs = "2026-07-25T00:00:00.000Z";
  writeFileSync(
    join(record, "audit", "fixture-clone.md"),
    `# Audit

## Human Turn
**Timestamp**: ${humanTs}
**Event**: HUMAN_TURN

---

## Grant Issued
**Timestamp**: 2026-07-25T01:00:00.000Z
**Event**: GRANT_ISSUED
**Grant Id**: ${GRANT_ID}
**Scope**: stage-gates
**Expires At**: 2026-07-26T01:00:00.000Z
**Includes Phase Boundary**: true
**Issuer Space**: default
**Issuer Intent**: ${intent}
**Issuer Shard**: fixture-clone.md
**Issuer Human Ts**: ${humanTs}

---
${extraAudit}
`,
  );
  return root;
}

function existingReceipt(): string {
  return `
## Authorization Selected
**Timestamp**: 2026-07-25T02:00:00.000Z
**Event**: GATE_AUTHORIZATION_SELECTED
**Route Id**: ${ROUTE_ID}
**Stage**: application-design
**Grant Id**: ${GRANT_ID}

---
`;
}

