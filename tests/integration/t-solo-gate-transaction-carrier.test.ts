// covers: function:handleApprove, function:handleReport, file:tools/amadeus-presence-reservation.ts
//
// In-process carrier commits: the grant-backed and targeted-human approval
// arms driven through handleApprove directly, so every rejection is asserted
// on the state file and the audit ledger rather than on an exit code alone.

import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  auditShardName,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  hostSessionCapability,
  mintHumanPresence,
  readPresenceReservation,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import {
  createStandingGrantTestObserver,
} from "../../packages/framework/core/tools/amadeus-grant-authorization.ts";
import {
  handleApprove,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import { DEFAULT_INTENT_UUID } from "../harness/fixtures.ts";
import {
  GRANT_ID,
  OWNER_EVENT_BUDGET,
  ROUTE_ID,
  SCAN_PASSES,
  SESSION_ID,
  SPACE_EVENT_BUDGET,
  STAGE,
  captureStdout,
  cleanupSoloGateRoots,
  padAuditFixture,
  restoreSoloEnv,
  revokeGrant,
  setup,
  switchCursorToNonOwner,
  useSoloEnv,
} from "../harness/solo-gate-fixture.ts";

afterAll(() => {
  cleanupSoloGateRoots();
});

// ---------------------------------------------------------------------------
// The same approval commits, driven in-process.
//
// The suite above proves the shipped CLI journey across a process boundary. The
// block below drives handleApprove directly so the carrier commit path is also
// exercised as a function: every rejection is asserted on the state file and
// the audit ledger, not on a subprocess's exit code alone.
// ---------------------------------------------------------------------------
describe("in-process carrier approval commits", () => {
  class ExitSignal extends Error {
    constructor(readonly code: number) {
      super(`exit ${code}`);
    }
  }

  // Run a handler to completion while capturing the three effects it can have on
  // the process: an exit, stdout JSON, and stderr JSON.
  function capture(fn: () => void): {
    exited: boolean;
    code: number;
    stdout: string;
    stderr: string;
  } {
    let stdout = "";
    let stderr = "";
    let code = -1;
    let exited = false;
    const originalExit = process.exit.bind(process);
    const originalLog = console.log;
    const originalError = console.error;
    process.exit = ((c?: number) => {
      throw new ExitSignal(c ?? 0);
    }) as typeof process.exit;
    console.log = (...values: unknown[]) => {
      stdout += values.map(String).join(" ");
    };
    console.error = (...values: unknown[]) => {
      stderr += values.map(String).join(" ");
    };
    try {
      fn();
    } catch (cause) {
      if (!(cause instanceof ExitSignal)) throw cause;
      exited = true;
      code = cause.code;
    } finally {
      process.exit = originalExit;
      console.log = originalLog;
      console.error = originalError;
    }
    return { exited, code, stdout, stderr };
  }

  afterEach(() => {
    restoreSoloEnv();
  });

  function grantArgs(grantId = GRANT_ID, routeId = ROUTE_ID): string[] {
    return [STAGE, "--standing-grant-id", grantId, "--standing-grant-route-id", routeId];
  }

  function ownerState(owner: string): string {
    return readFileSync(join(owner, "amadeus-state.md"), "utf-8");
  }

  function ownerAudit(root: string, owner: string): string {
    return readFileSync(join(owner, "audit", auditShardName(root)), "utf-8");
  }

  // Drive the grant carrier to its fallback, then mint the armed reservation the
  // way a real human prompt does, and return the ids the commit needs.
  function armedAndMinted(root: string): { targetIntentId: string; reservationId: string } {
    const fallback = JSON.parse(
      captureStdout(() => {
        handleReport(
          ["--stage", STAGE, "--result", "approved", ...grantArgs().slice(1)],
          root,
        );
      }),
    ) as { kind: string; target_intent_id: string; presence_reservation_id: string };
    if (fallback.kind !== "await-approval") {
      throw new Error(`fixture did not fall back: ${JSON.stringify(fallback)}`);
    }
    mintHumanPresence({ projectDir: root, capability: hostSessionCapability(SESSION_ID) });
    expect(readPresenceReservation(root, fallback.presence_reservation_id)?.state).toBe("minted");
    return {
      targetIntentId: fallback.target_intent_id,
      reservationId: fallback.presence_reservation_id,
    };
  }

  function humanArgs(
    ids: { targetIntentId: string; reservationId: string },
    userInput = "1",
  ): string[] {
    return [
      STAGE,
      "--user-input",
      userInput,
      "--target-intent-id",
      ids.targetIntentId,
      "--presence-reservation-id",
      ids.reservationId,
    ];
  }

  test("rejects a partial carrier before reading any state", () => {
    const { root, owner } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    useSoloEnv(root);
    const before = ownerState(owner);

    const result = capture(() => handleApprove([STAGE, "--standing-grant-id", GRANT_ID]));

    expect(result.exited).toBe(true);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stderr).error).toContain("partial authorization carrier");
    expect(ownerState(owner)).toBe(before);
  });

  test("commits the routed grant against the receipt owner, not the cursor", () => {
    const { root, owner } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    const nonOwner = switchCursorToNonOwner(root);
    const nonOwnerBefore = readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8");
    useSoloEnv(root);

    const result = capture(() => handleApprove(grantArgs()));

    expect(result.exited).toBe(false);
    expect(JSON.parse(result.stdout)).toEqual({ kind: "approved" });
    expect(ownerState(owner)).toContain(`- [x] ${STAGE}`);
    expect(readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8")).toBe(nonOwnerBefore);
    expect(ownerAudit(root, owner)).toContain(`**Grant Id**: ${GRANT_ID}`);
  });

  test("refuses a route id that matches no receipt", () => {
    const { root, owner } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    useSoloEnv(root);
    const before = ownerState(owner);

    const result = capture(() =>
      handleApprove(grantArgs(GRANT_ID, "87654321-4321-4abc-8def-1234567890ab")),
    );

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain("cardinality must be exactly one; got 0");
    expect(ownerState(owner)).toBe(before);
  });

  test("refuses when the receipt owner is no longer exactly one in-flight intent", () => {
    const { root, owner } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    const registryPath = join(root, "amadeus", "spaces", "default", "intents", "intents.json");
    const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as Array<Record<string, unknown>>;
    registry[0].status = "parked";
    writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    useSoloEnv(root);
    const before = ownerState(owner);

    const result = capture(() => handleApprove(grantArgs()));

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain(
      "owner is not exactly one in-flight intent",
    );
    expect(ownerState(owner)).toBe(before);
  });

  test("falls back to await-approval when the carrier does not match the receipt", () => {
    const { root, owner } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    useSoloEnv(root);
    const before = ownerState(owner);

    const result = capture(() => handleApprove(grantArgs("deadbeef")));

    expect(result.exited).toBe(false);
    expect(JSON.parse(result.stdout)).toEqual({
      kind: "await-approval",
      stage: STAGE,
      reason: "standing-grant-no-longer-authorizes",
      target_intent_id: DEFAULT_INTENT_UUID,
    });
    expect(ownerState(owner)).toBe(before);
  });

  test("falls back to await-approval when the routed grant is revoked", () => {
    const { root, owner, humanTs } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    revokeGrant(root, humanTs, GRANT_ID);
    useSoloEnv(root);
    const before = ownerState(owner);

    const result = capture(() => handleApprove(grantArgs()));

    expect(result.exited).toBe(false);
    expect(JSON.parse(result.stdout).kind).toBe("await-approval");
    expect(ownerState(owner)).toBe(before);
  });

  test("commits targeted human approval and consumes the reservation once", () => {
    const expiredAt = Date.now() - 1_000;
    const { root, owner } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    const nonOwner = switchCursorToNonOwner(root);
    const nonOwnerBefore = readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8");
    useSoloEnv(root);
    const ids = armedAndMinted(root);

    const committed = capture(() => handleApprove(humanArgs(ids)));

    expect(committed.exited).toBe(false);
    expect(JSON.parse(committed.stdout)).toEqual({ kind: "approved" });
    expect(ownerState(owner)).toContain(`- [x] ${STAGE}`);
    expect(readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8")).toBe(nonOwnerBefore);
    expect(readPresenceReservation(root, ids.reservationId)?.state).toBe("consumed");

    // Replay: the gate is already completed, so the recovery arm must re-emit
    // "approved" without appending a second GATE_APPROVED.
    const auditBefore = ownerAudit(root, owner);
    const replay = capture(() => handleApprove(humanArgs(ids)));
    expect(replay.exited).toBe(false);
    expect(JSON.parse(replay.stdout)).toEqual({ kind: "approved" });
    expect(ownerAudit(root, owner)).toBe(auditBefore);
  });

  test("refuses targeted approval without a trusted session identity", () => {
    const expiredAt = Date.now() - 1_000;
    const { root, owner } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    useSoloEnv(root);
    const ids = armedAndMinted(root);
    const before = ownerState(owner);
    delete process.env.AMADEUS_TRUSTED_SESSION_ID;

    const result = capture(() => handleApprove(humanArgs(ids)));

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain("Trusted session identity is unavailable");
    expect(ownerState(owner)).toBe(before);
  });

  test("refuses a reservation that does not match the targeted approval", () => {
    const expiredAt = Date.now() - 1_000;
    const { root, owner } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    useSoloEnv(root);
    const ids = armedAndMinted(root);
    const before = ownerState(owner);

    const result = capture(() =>
      handleApprove([
        "application-design",
        "--user-input",
        "1",
        "--target-intent-id",
        ids.targetIntentId,
        "--presence-reservation-id",
        ids.reservationId,
      ]),
    );

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain(
      "Presence reservation does not match the targeted approval",
    );
    expect(ownerState(owner)).toBe(before);
  });

  test("refuses a reservation whose recorded HUMAN_TURN provenance drifted", () => {
    const expiredAt = Date.now() - 1_000;
    const { root, owner } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    useSoloEnv(root);
    const ids = armedAndMinted(root);
    const marker = readPresenceReservation(root, ids.reservationId)!;
    writeFileSync(
      join(root, "amadeus", ".amadeus-sessions", "presence-reservations", `${ids.reservationId}.json`),
      `${JSON.stringify({ ...marker, humanTurnTimestamp: "2026-01-01T00:00:00.000Z" }, null, 2)}\n`,
    );
    const before = ownerState(owner);

    const result = capture(() => handleApprove(humanArgs(ids)));

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain("Invalid targeted human presence");
    expect(ownerState(owner)).toBe(before);
  });

  test("refuses a targeted approval whose HUMAN_TURN predates the open gate", () => {
    const expiredAt = Date.now() - 1_000;
    const { root, owner } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    useSoloEnv(root);
    const ids = armedAndMinted(root);
    // A later gate-open event makes the recorded human turn stale: the human
    // answered an older opening of this gate.
    const shard = join(owner, "audit", auditShardName(root));
    writeFileSync(
      shard,
      `${readFileSync(shard, "utf-8")}
## Stage Awaiting Approval
**Timestamp**: ${new Date(Date.now() + 60_000).toISOString()}
**Event**: STAGE_AWAITING_APPROVAL
**Stage**: ${STAGE}

---
`,
    );
    const before = ownerState(owner);

    const result = capture(() => handleApprove(humanArgs(ids)));

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain("not fresh for the open gate");
    expect(ownerState(owner)).toBe(before);
  });

  // Scan budget: the grant-backed commit resolves the receipt with one
  // space-wide pass and revalidates the grant against the receipt owner's
  // shards only, so the audit events it visits stay within E + E_owner.
  test("visits at most E + E_owner audit events for a grant-backed commit", () => {
    const { root, owner } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    const budget = padAuditFixture(root, owner);
    expect(budget.ownerEvents).toBe(OWNER_EVENT_BUDGET);
    expect(budget.spaceEvents).toBe(SPACE_EVENT_BUDGET);
    useSoloEnv(root);
    const observer = createStandingGrantTestObserver();

    const result = capture(() => handleApprove(grantArgs(), observer));

    expect(result.exited).toBe(false);
    expect(JSON.parse(result.stdout)).toEqual({ kind: "approved" });
    const visited = SCAN_PASSES.reduce(
      (total, pass) => total + observer.snapshot(pass).eventVisited,
      0,
    );
    expect(visited).toBeLessThanOrEqual(budget.spaceEvents + budget.ownerEvents);
  });
});
