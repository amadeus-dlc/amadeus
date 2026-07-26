// covers: function:routeSoloStandingGrantDirective, function:armPresenceReservation, function:mintArmedPresenceReservation, function:consumePresenceReservation, function:mintHumanPresence
//
// Filesystem-backed (Medium) half of the U2 solo-gate-transaction suite: the
// route transaction's audit-first receipt, the ritual-preservation counters and
// the presence reservation state machine all drive a real temp workspace, so
// they live in the integration layer (test-size purity). The pure directive and
// classifier assertions stay in tests/unit/t-solo-gate-transaction.test.ts.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  directiveSelfCheckExamples,
  type RunStageDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";
import type { StageEntry } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  findStandingGrantRouteReceiptById,
  routeSoloStandingGrantDirective,
} from "../../packages/framework/core/tools/amadeus-grant-authorization.ts";
import {
  armPresenceReservation,
  consumePresenceReservation,
  hostSessionCapability,
  mintArmedPresenceReservation,
  mintHumanPresence,
  type PresenceReservation,
  readPresenceReservation,
  verifyMintedPresenceReservation,
  type VerifyReservationInput,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { useRealScopeData } from "../harness/real-scope-data.ts";

const GRANT_ID = "abcdef12";
const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";
const TARGET_INTENT_ID = "00000000-0000-7000-8000-000000000001";
const RESERVATION_ID = "87654321-4321-4abc-8def-1234567890ab";
const TEMP_ROOTS: string[] = [];

let restoreScopeData: (() => void) | null = null;

beforeAll(() => {
  restoreScopeData = useRealScopeData();
});

afterAll(() => {
  for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
  restoreScopeData?.();
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

// Stage frontmatter carries the STOCK scope vocabulary only; the composed
// scope the fixture state declares (amadeus-feature) is resolved from the
// compiled scope-grid via useRealScopeData above (#1497 FR-4b).
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
    scopes: ["feature"],
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


// ---------------------------------------------------------------------------
// Reservation parse and provenance rejections.
//
// The reservation marker is the only thing standing between a stale or tampered
// session file and an approval that claims a human was present. Every rejection
// below is therefore asserted on its own: a marker that fails to parse, resolve
// or match its recorded HUMAN_TURN must never be usable as presence.
// ---------------------------------------------------------------------------
describe("presence reservation rejections", () => {
  const SESSION = "trusted-session-1";
  const STAGE = "application-design";

  function reservationFile(root: string, id: string, body: unknown): void {
    const dir = join(root, "amadeus", ".amadeus-sessions", "presence-reservations");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${id}.json`), `${JSON.stringify(body, null, 2)}\n`);
  }

  function armed(root: string): PresenceReservation {
    return armPresenceReservation({
      projectDir: root,
      sessionId: SESSION,
      space: "default",
      targetIntentId: TARGET_INTENT_ID,
      stage: STAGE,
      routeId: ROUTE_ID,
      reservationIdFactory: () => RESERVATION_ID,
    });
  }

  function mintedMarker(root: string): PresenceReservation {
    armed(root);
    const result = mintArmedPresenceReservation({ projectDir: root, sessionId: SESSION });
    if (result.kind !== "minted") throw new Error(`fixture did not mint: ${result.kind}`);
    return result.reservation;
  }

  test("refuses a Reservation Id that is not a UUID v4", () => {
    const root = routeFixture();
    expect(() => readPresenceReservation(root, "not-a-uuid")).toThrow(/UUID v4/);
    // A v7 id is a valid UUID but the wrong version for a reservation.
    expect(() => readPresenceReservation(root, TARGET_INTENT_ID)).toThrow(/UUID v4/);
  });

  test("refuses a target intent id that is not a UUID v7", () => {
    const root = routeFixture();
    expect(() =>
      armPresenceReservation({
        projectDir: root,
        sessionId: SESSION,
        space: "default",
        targetIntentId: ROUTE_ID,
        stage: STAGE,
        routeId: ROUTE_ID,
      }),
    ).toThrow(/UUID v7/);
  });

  test("refuses a target intent that is not exactly one in-flight registry row", () => {
    const root = routeFixture();
    const registry = join(root, "amadeus", "spaces", "default", "intents", "intents.json");
    writeFileSync(
      registry,
      `${JSON.stringify([
        { uuid: TARGET_INTENT_ID, slug: "solo-intent", dirName: "solo-intent-abcd1234", status: "complete" },
      ])}\n`,
    );
    expect(() =>
      armPresenceReservation({
        projectDir: root,
        sessionId: SESSION,
        space: "default",
        targetIntentId: TARGET_INTENT_ID,
        stage: STAGE,
        routeId: ROUTE_ID,
      }),
    ).toThrow(/exactly one in-flight registry row/);
  });

  test.each([
    ["a JSON array", [], /must be an object/],
    ["an unknown field", { extra: 1 }, /unknown or missing field/],
  ] as const)("refuses a marker that is %s", (_label, body, expected) => {
    const root = routeFixture();
    reservationFile(root, RESERVATION_ID, body);
    expect(() => readPresenceReservation(root, RESERVATION_ID)).toThrow(expected);
  });

  test("refuses a marker whose field values are malformed", () => {
    const root = routeFixture();
    reservationFile(root, RESERVATION_ID, { ...armed(root), stage: "Not A Slug" });
    expect(() => readPresenceReservation(root, RESERVATION_ID)).toThrow(/field is malformed/);
  });

  test("refuses an armed marker that already carries HUMAN_TURN provenance", () => {
    const root = routeFixture();
    reservationFile(root, RESERVATION_ID, {
      ...armed(root),
      humanTurnTimestamp: "2026-07-25T00:00:00.000Z",
      humanTurnShard: "fixture-clone.md",
    });
    expect(() => readPresenceReservation(root, RESERVATION_ID)).toThrow(
      /does not match its provenance/,
    );
  });

  test("refuses a second reservation while one is still active", () => {
    const root = routeFixture();
    armed(root);
    expect(() =>
      armPresenceReservation({
        projectDir: root,
        sessionId: SESSION,
        space: "default",
        targetIntentId: TARGET_INTENT_ID,
        stage: STAGE,
        routeId: ROUTE_ID,
        reservationIdFactory: () => "11111111-2222-4333-8444-555555555555",
      }),
    ).toThrow(/already has an active presence reservation/);
  });

  test("refuses a minted Reservation Id that collides with an existing marker", () => {
    const root = routeFixture();
    // Consume the first reservation so the "already active" guard is not the
    // one that fires — the collision guard must stand on its own.
    armed(root);
    mintArmedPresenceReservation({ projectDir: root, sessionId: SESSION });
    consumePresenceReservation({
      projectDir: root,
      sessionId: SESSION,
      reservationId: RESERVATION_ID,
      targetIntentId: TARGET_INTENT_ID,
      stage: STAGE,
    });
    expect(() =>
      armPresenceReservation({
        projectDir: root,
        sessionId: SESSION,
        space: "default",
        targetIntentId: TARGET_INTENT_ID,
        stage: STAGE,
        routeId: ROUTE_ID,
        reservationIdFactory: () => RESERVATION_ID,
      }),
    ).toThrow(/collision/);
  });

  test("refuses to mint when the session holds ambiguous reservations", () => {
    const root = routeFixture();
    const first = armed(root);
    reservationFile(root, "11111111-2222-4333-8444-555555555555", {
      ...first,
      reservationId: "11111111-2222-4333-8444-555555555555",
    });
    expect(() => mintArmedPresenceReservation({ projectDir: root, sessionId: SESSION })).toThrow(
      /ambiguous presence reservations/,
    );
  });

  test("refuses to mint a second HUMAN_TURN for the same Reservation Id", () => {
    const root = routeFixture();
    const marker = mintedMarker(root);
    // Re-arm the same marker on disk while its two owner HUMAN_TURN events stay
    // in the ledger: minting again must refuse rather than pick one.
    const shard = join(
      root, "amadeus", "spaces", "default", "intents", "solo-intent-abcd1234", "audit", "fixture-clone.md",
    );
    writeFileSync(
      shard,
      `${readFileSync(shard, "utf-8")}
## Human Turn
**Timestamp**: 2026-07-25T03:00:00.000Z
**Event**: HUMAN_TURN
**Presence Reservation Id**: ${marker.reservationId}

---
`,
    );
    reservationFile(root, RESERVATION_ID, {
      ...marker,
      state: "armed",
      humanTurnTimestamp: null,
      humanTurnShard: null,
    });
    expect(() => mintArmedPresenceReservation({ projectDir: root, sessionId: SESSION })).toThrow(
      /multiple HUMAN_TURN events/,
    );
  });

  test.each([
    ["target intent", { targetIntentId: "00000000-0000-7000-8000-000000000009" }, /target does not match/],
    ["stage", { stage: "requirements-analysis" }, /target does not match/],
  ] as const)("refuses to consume when the %s does not match", (_label, override, expected) => {
    const root = routeFixture();
    mintedMarker(root);
    expect(() =>
      consumePresenceReservation({
        projectDir: root,
        sessionId: SESSION,
        reservationId: RESERVATION_ID,
        targetIntentId: TARGET_INTENT_ID,
        stage: STAGE,
        ...override,
      }),
    ).toThrow(expected);
  });

  test("refuses to consume a reservation that was never minted", () => {
    const root = routeFixture();
    armed(root);
    expect(() =>
      consumePresenceReservation({
        projectDir: root,
        sessionId: SESSION,
        reservationId: RESERVATION_ID,
        targetIntentId: TARGET_INTENT_ID,
        stage: STAGE,
      }),
    ).toThrow(/has not been minted/);
  });

  test("consuming twice is idempotent", () => {
    const root = routeFixture();
    mintedMarker(root);
    const input = {
      projectDir: root,
      sessionId: SESSION,
      reservationId: RESERVATION_ID,
      targetIntentId: TARGET_INTENT_ID,
      stage: STAGE,
    };
    expect(consumePresenceReservation(input).state).toBe("consumed");
    expect(consumePresenceReservation(input).state).toBe("consumed");
  });
});

// ---------------------------------------------------------------------------
// verifyMintedPresenceReservation — the read-side gate the approval commit runs
// before it trusts a reservation. Each rejection is a distinct way a marker can
// stop standing for a real, still-valid human turn.
// ---------------------------------------------------------------------------
describe("minted reservation verification", () => {
  const SESSION = "trusted-session-1";
  const STAGE = "application-design";

  function verifyInput(root: string): VerifyReservationInput {
    return {
      projectDir: root,
      sessionId: SESSION,
      reservationId: RESERVATION_ID,
      targetIntentId: TARGET_INTENT_ID,
      stage: STAGE,
    };
  }

  function mintFixture(): { root: string; marker: PresenceReservation } {
    const root = routeFixture();
    armPresenceReservation({
      projectDir: root,
      sessionId: SESSION,
      space: "default",
      targetIntentId: TARGET_INTENT_ID,
      stage: STAGE,
      routeId: ROUTE_ID,
      reservationIdFactory: () => RESERVATION_ID,
    });
    const result = mintArmedPresenceReservation({ projectDir: root, sessionId: SESSION });
    if (result.kind !== "minted") throw new Error(`fixture did not mint: ${result.kind}`);
    return { root, marker: result.reservation };
  }

  function writeMarker(root: string, marker: PresenceReservation): void {
    const dir = join(root, "amadeus", ".amadeus-sessions", "presence-reservations");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${marker.reservationId}.json`), `${JSON.stringify(marker, null, 2)}\n`);
  }

  test("accepts the marker it minted", () => {
    const { root, marker } = mintFixture();
    expect(verifyMintedPresenceReservation(verifyInput(root))).toEqual(marker);
  });

  test("rejects a missing marker", () => {
    const root = routeFixture();
    expect(() => verifyMintedPresenceReservation(verifyInput(root))).toThrow(/was not found/);
  });

  test("rejects a marker held by another session", () => {
    const { root } = mintFixture();
    expect(() =>
      verifyMintedPresenceReservation({ ...verifyInput(root), sessionId: "other-session" }),
    ).toThrow(/session does not match/);
  });

  test("rejects a marker whose target no longer matches the call", () => {
    const { root } = mintFixture();
    expect(() =>
      verifyMintedPresenceReservation({ ...verifyInput(root), stage: "requirements-analysis" }),
    ).toThrow(/target does not match/);
  });

  test("rejects a consumed marker unless the caller opts in", () => {
    const { root } = mintFixture();
    consumePresenceReservation({
      projectDir: root,
      sessionId: SESSION,
      reservationId: RESERVATION_ID,
      targetIntentId: TARGET_INTENT_ID,
      stage: STAGE,
    });
    expect(() => verifyMintedPresenceReservation(verifyInput(root))).toThrow(/is not minted/);
    expect(
      verifyMintedPresenceReservation({ ...verifyInput(root), allowConsumed: true }).state,
    ).toBe("consumed");
  });

  test("rejects a marker whose owner directory drifted from the registry", () => {
    const { root, marker } = mintFixture();
    const intents = join(root, "amadeus", "spaces", "default", "intents");
    const moved = "solo-intent-99999999";
    mkdirSync(join(intents, moved, "audit"), { recursive: true });
    writeFileSync(
      join(intents, "intents.json"),
      `${JSON.stringify([
        { uuid: TARGET_INTENT_ID, slug: "solo-intent", dirName: moved, status: "in-flight" },
      ])}\n`,
    );
    expect(marker.targetIntentDir).not.toBe(moved);
    expect(() => verifyMintedPresenceReservation(verifyInput(root))).toThrow(
      /owner no longer matches the registry/,
    );
  });

  test("rejects a marker whose recorded HUMAN_TURN provenance is not the one in the ledger", () => {
    const { root, marker } = mintFixture();
    writeMarker(root, { ...marker, humanTurnTimestamp: "2026-07-25T09:09:09.000Z" });
    expect(() => verifyMintedPresenceReservation(verifyInput(root))).toThrow(
      /HUMAN_TURN provenance does not match/,
    );
  });
});

// ---------------------------------------------------------------------------
// A sealed ledger (#1248: the registry row is "complete") must stop both writers
// loudly. Neither the route receipt nor the reservation's HUMAN_TURN may be
// silently dropped, because both are provenance a later approval relies on.
// ---------------------------------------------------------------------------
describe("writes into a sealed audit ledger", () => {
  function rewriteRegistry(root: string, rows: Array<Record<string, unknown>>): void {
    writeFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "intents.json"),
      `${JSON.stringify(rows, null, 2)}\n`,
    );
  }

  test("refuses to append a route receipt to a completed intent", () => {
    const root = routeFixture();
    rewriteRegistry(root, [
      { uuid: TARGET_INTENT_ID, slug: "solo-intent", dirName: "solo-intent-abcd1234", status: "complete" },
    ]);
    const stateContent = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "solo-intent-abcd1234", "amadeus-state.md"),
      "utf-8",
    );

    expect(() =>
      routeSoloStandingGrantDirective({
        directive: { ...runStage(), stage: "application-design", gate: true },
        projectDir: root,
        stateContent,
        graph: ROUTE_GRAPH,
        nowMs: Date.parse("2026-07-25T12:00:00.000Z"),
        operatingMode: "solo",
        routeIdFactory: () => ROUTE_ID,
      }),
    ).toThrow(/intent is complete/);
    expect(findStandingGrantRouteReceiptById(root, ROUTE_ID)).toBeNull();
  });

  test("refuses to mint a reservation HUMAN_TURN into a completed intent", () => {
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
    // A stale "complete" row shadowing the same directory seals its ledger even
    // though the reservation's own target row is still in-flight.
    rewriteRegistry(root, [
      { uuid: "99999999-9999-7999-8999-999999999999", slug: "sealed", dirName: "solo-intent-abcd1234", status: "complete" },
      { uuid: TARGET_INTENT_ID, slug: "solo-intent", dirName: "solo-intent-abcd1234", status: "in-flight" },
    ]);

    expect(() =>
      mintArmedPresenceReservation({ projectDir: root, sessionId: "trusted-session-1" }),
    ).toThrow(/completed target intent/);
    expect(readPresenceReservation(root, RESERVATION_ID)?.state).toBe("armed");
  });
});

// ---------------------------------------------------------------------------
// Concurrent arming.
//
// The "at most one active reservation per session" invariant is what keeps a
// single human turn from being claimable by several open gates at once. It only
// holds if the active-marker scan and the marker write happen as one atomic
// step, so it is asserted against real racing processes released from a start
// barrier — a sequential loop passes even on a check-then-write implementation.
// ---------------------------------------------------------------------------
describe("presence reservation concurrency", () => {
  const SESSION = "trusted-session-1";
  const RACERS = 16;

  function reservationMarkers(root: string): PresenceReservation[] {
    const dir = join(root, "amadeus", ".amadeus-sessions", "presence-reservations");
    return readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => JSON.parse(readFileSync(join(dir, name), "utf-8")) as PresenceReservation);
  }

  test("arms at most one reservation when a session races itself", async () => {
    const root = routeFixture();
    const child = join(root, "arm-child.ts");
    const barrier = join(root, "barrier");
    mkdirSync(barrier, { recursive: true });
    writeFileSync(
      child,
      [
        `import { existsSync, writeFileSync } from "node:fs";`,
        `import { armPresenceReservation } from ${JSON.stringify(
          join(import.meta.dir, "../../packages/framework/core/tools/amadeus-presence-reservation.ts"),
        )};`,
        `const [root, barrier, tag] = process.argv.slice(2);`,
        `writeFileSync(\`\${barrier}/ready-\${tag}\`, "");`,
        `while (!existsSync(\`\${barrier}/go\`)) Bun.sleepSync(5);`,
        `try {`,
        `  armPresenceReservation({`,
        `    projectDir: root,`,
        `    sessionId: ${JSON.stringify(SESSION)},`,
        `    space: "default",`,
        `    targetIntentId: ${JSON.stringify(TARGET_INTENT_ID)},`,
        `    stage: "application-design",`,
        `    routeId: ${JSON.stringify(ROUTE_ID)},`,
        `  });`,
        `  console.log("armed");`,
        `} catch (cause) {`,
        `  console.log(\`refused: \${cause instanceof Error ? cause.message : String(cause)}\`);`,
        `}`,
      ].join("\n"),
    );

    const racers = Array.from({ length: RACERS }, (_, index) =>
      Bun.spawn(["bun", child, root, barrier, String(index)], { stdout: "pipe", stderr: "pipe" }),
    );
    while (readdirSync(barrier).filter((name) => name.startsWith("ready-")).length < RACERS) {
      await Bun.sleep(10);
    }
    writeFileSync(join(barrier, "go"), "");
    const outcomes = await Promise.all(
      racers.map(async (proc) => {
        const stdout = (await new Response(proc.stdout).text()).trim();
        await proc.exited;
        return stdout;
      }),
    );

    // Every racer terminates with a definite outcome: no hang, no ambiguity.
    expect(outcomes.filter((line) => line === "armed")).toHaveLength(1);
    expect(outcomes.filter((line) => line.startsWith("refused: "))).toHaveLength(RACERS - 1);
    const markers = reservationMarkers(root);
    expect(markers).toHaveLength(1);
    expect(markers[0].state).toBe("armed");
  }, 60_000);
});
