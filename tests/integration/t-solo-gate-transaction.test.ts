// covers: function:handleReport, function:handleApprove, file:tools/amadeus-presence-reservation.ts
//
// Grant-backed commits and receipt ownership, driven through the shipped
// state CLI across a real process boundary. The in-process arms of the same
// transaction live in the sibling t-solo-gate-transaction-*.test.ts files.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appendAuditEntry,
} from "../../packages/framework/core/tools/amadeus-audit.ts";
import {
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  auditShardName,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  readPresenceReservation,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import {
  validateSoloStandingGrantById,
} from "../../packages/framework/core/tools/amadeus-grant-authorization.ts";
import {
  DEFAULT_INTENT_UUID,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import {
  GRANT_ID,
  GRAPH,
  GRAPH_PATH,
  MINT,
  ROUTE_ID,
  SESSION_ID,
  STAGE,
  STATE,
  appendGrant,
  breakGrantIssuerIntent,
  captureStdout,
  cleanupSoloGateRoots,
  revokeGrant,
  runState,
  setup,
  stateEnv,
  switchCursorToNonOwner,
} from "../harness/solo-gate-fixture.ts";

afterAll(() => {
  cleanupSoloGateRoots();
});

describe("solo gate approval transaction", () => {
  test("pins a valid grant commit to the receipt owner after a cursor switch", () => {
    const { root, owner } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    const nonOwner = switchCursorToNonOwner(root);
    const nonOwnerBefore = readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8");

    const result = runState(root, [
      "approve",
      STAGE,
      "--standing-grant-id",
      GRANT_ID,
      "--standing-grant-route-id",
      ROUTE_ID,
    ]);

    expect(result).toEqual({
      status: 0,
      stdout: '{"kind":"approved"}\n',
      stderr: "",
    });
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toContain("- [x] requirements-analysis");
    expect(readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8"))
      .toBe(nonOwnerBefore);
    const ownerAudit = readFileSync(
      join(owner, "audit", auditShardName(root)),
      "utf-8",
    );
    expect(ownerAudit).toContain("**Event**: GATE_APPROVED");
    expect(ownerAudit).toContain(`**Grant Id**: ${GRANT_ID}`);
  });

  test("falls back through a session reservation and commits targeted human approval", () => {
    const expiredAt = Date.now() - 1_000;
    const { root, owner } = setup(
      new Date(expiredAt).toISOString(),
      expiredAt - 1_000,
    );
    const nonOwner = switchCursorToNonOwner(root);
    const nonOwnerBefore = readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8");
    process.env.CLAUDE_PROJECT_DIR = root;
    process.env.AMADEUS_OPERATING_MODE = "solo";
    process.env.AMADEUS_STAGE_GRAPH = GRAPH_PATH;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    process.env.AMADEUS_TRUSTED_SESSION_ID = SESSION_ID;

    const fallbackJson = captureStdout(() => {
      handleReport([
        "--stage",
        STAGE,
        "--result",
        "approved",
        "--standing-grant-id",
        GRANT_ID,
        "--standing-grant-route-id",
        ROUTE_ID,
      ], root);
    });
    const fallback = JSON.parse(fallbackJson) as {
      kind: string;
      message?: string;
      target_intent_id: string;
      presence_reservation_id: string;
    };
    if (fallback.kind === "error") {
      throw new Error(fallback.message ?? fallbackJson);
    }
    expect(fallback.kind).toBe("await-approval");
    expect(fallback.target_intent_id).toBe(DEFAULT_INTENT_UUID);
    expect(readPresenceReservation(root, fallback.presence_reservation_id)?.state)
      .toBe("armed");

    const hook = spawnSync(process.execPath, [MINT], {
      encoding: "utf-8",
      input: JSON.stringify({
        session_id: SESSION_ID,
        hook_event_name: "UserPromptSubmit",
        prompt: "1",
        cwd: root,
      }),
      env: stateEnv(root),
    });
    expect(hook.status).toBe(0);
    expect(readPresenceReservation(root, fallback.presence_reservation_id)?.state)
      .toBe("minted");

    const committed = captureStdout(() => {
      handleReport([
        "--stage",
        STAGE,
        "--result",
        "approved",
        "--user-input",
        "1",
        "--target-intent-id",
        fallback.target_intent_id,
        "--presence-reservation-id",
        fallback.presence_reservation_id,
      ], root);
    });
    const committedDirective = JSON.parse(committed) as {
      kind: string;
      message?: string;
    };
    if (committedDirective.kind === "error") {
      throw new Error(committedDirective.message ?? committed);
    }
    expect(committedDirective.kind).toBe("done");
    expect(readPresenceReservation(root, fallback.presence_reservation_id)?.state)
      .toBe("consumed");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toContain("- [x] requirements-analysis");
    expect(readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8"))
      .toBe(nonOwnerBefore);
    const ownerAuditBeforeReplay = readFileSync(
      join(owner, "audit", auditShardName(root)),
      "utf-8",
    );
    const replay = captureStdout(() => {
      handleReport([
        "--stage",
        STAGE,
        "--result",
        "approved",
        "--user-input",
        "1",
        "--target-intent-id",
        fallback.target_intent_id,
        "--presence-reservation-id",
        fallback.presence_reservation_id,
      ], root);
    });
    expect(JSON.parse(replay).kind).toBe("done");
    expect(readFileSync(join(owner, "audit", auditShardName(root)), "utf-8"))
      .toBe(ownerAuditBeforeReplay);
  });

  test("falls back when the routed grant is revoked before the commit", () => {
    const { root, owner, humanTs } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    revokeGrant(root, humanTs, GRANT_ID);
    const ownerStateBefore = readFileSync(join(owner, "amadeus-state.md"), "utf-8");

    const result = runState(root, [
      "approve",
      STAGE,
      "--standing-grant-id",
      GRANT_ID,
      "--standing-grant-route-id",
      ROUTE_ID,
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      kind: "await-approval",
      stage: STAGE,
      reason: "standing-grant-no-longer-authorizes",
      target_intent_id: DEFAULT_INTENT_UUID,
    });
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toBe(ownerStateBefore);
  });

  test("falls back when the routed grant no longer belongs to the receipt owner", () => {
    const { root, owner } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    breakGrantIssuerIntent(root);
    const ownerIntent = seededRecordDir(root).split("/").at(-1)!;
    expect(
      validateSoloStandingGrantById(
        root,
        ownerIntent,
        GRANT_ID,
        STAGE,
        readFileSync(seededStateFile(root), "utf-8"),
        GRAPH,
        Date.now(),
      ),
    ).toEqual({ kind: "invalid", reason: "intent-mismatch" });
    const ownerStateBefore = readFileSync(join(owner, "amadeus-state.md"), "utf-8");

    const result = runState(root, [
      "approve",
      STAGE,
      "--standing-grant-id",
      GRANT_ID,
      "--standing-grant-route-id",
      ROUTE_ID,
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout).kind).toBe("await-approval");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toBe(ownerStateBefore);
  });

  test("commits the routed Grant Id and never substitutes a later-expiring grant", () => {
    const { root, owner } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    const higherPriority = "cafe0002";
    appendGrant(root, new Date(Date.now() + 600_000).toISOString(), higherPriority);

    const result = runState(root, [
      "approve",
      STAGE,
      "--standing-grant-id",
      GRANT_ID,
      "--standing-grant-route-id",
      ROUTE_ID,
    ]);

    expect(result).toEqual({
      status: 0,
      stdout: '{"kind":"approved"}\n',
      stderr: "",
    });
    const ownerAudit = readFileSync(
      join(owner, "audit", auditShardName(root)),
      "utf-8",
    );
    expect(ownerAudit).toContain(`**Grant Id**: ${GRANT_ID}`);
    const approvedBlock = ownerAudit
      .split(/\n---\n/)
      .filter((block) => block.includes("**Event**: GATE_APPROVED"));
    expect(approvedBlock).toHaveLength(1);
    expect(approvedBlock[0]).toContain(`**Grant Id**: ${GRANT_ID}`);
    expect(approvedBlock[0]).not.toContain(higherPriority);
  });

  test("rejects the carrier in team mode before any mutation", () => {
    const { root, owner } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    const ownerStateBefore = readFileSync(join(owner, "amadeus-state.md"), "utf-8");
    const ownerAuditBefore = readFileSync(
      join(owner, "audit", auditShardName(root)),
      "utf-8",
    );

    const result = spawnSync(
      process.execPath,
      [
        STATE,
        "approve",
        STAGE,
        "--standing-grant-id",
        GRANT_ID,
        "--standing-grant-route-id",
        ROUTE_ID,
        "--project-dir",
        root,
      ],
      {
        encoding: "utf-8",
        env: { ...stateEnv(root), AMADEUS_OPERATING_MODE: "team" },
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Invalid approval authority");
    expect(result.stdout).toBe("");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toBe(ownerStateBefore);
    expect(readFileSync(join(owner, "audit", auditShardName(root)), "utf-8"))
      .toBe(ownerAuditBefore);
  });

  test("treats a missing receipt as a fatal protocol error without state mutation", () => {
    const { root, owner } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    const ownerStateBefore = readFileSync(join(owner, "amadeus-state.md"), "utf-8");
    const result = runState(root, [
      "approve",
      STAGE,
      "--standing-grant-id",
      GRANT_ID,
      "--standing-grant-route-id",
      "87654321-4321-4abc-8def-1234567890ab",
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("cardinality must be exactly one; got 0");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toBe(ownerStateBefore);
  });

  test("falls back when the unique receipt fields do not match the carrier", () => {
    const { root, owner } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    const ownerStateBefore = readFileSync(join(owner, "amadeus-state.md"), "utf-8");
    const result = runState(root, [
      "approve",
      STAGE,
      "--standing-grant-id",
      "deadbeef",
      "--standing-grant-route-id",
      ROUTE_ID,
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      kind: "await-approval",
      stage: STAGE,
      reason: "standing-grant-no-longer-authorizes",
      target_intent_id: DEFAULT_INTENT_UUID,
    });
    expect(result.stderr).toBe("");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toBe(ownerStateBefore);
  });

  // FR-09 / FR-23: the fallback continuation must not re-run the stage. Every
  // directive emitted after the route is counted; a re-run would appear as a
  // run-stage/present-gate directive or as stage_file / reviewer /
  // sensors_applicable fields, so the expected increment for all four is 0.
  test("adds zero body, reviewer, sensor and learnings work during the fallback continuation", () => {
    const expiredAt = Date.now() - 1_000;
    const { root } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    process.env.CLAUDE_PROJECT_DIR = root;
    process.env.AMADEUS_OPERATING_MODE = "solo";
    process.env.AMADEUS_STAGE_GRAPH = GRAPH_PATH;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    process.env.AMADEUS_TRUSTED_SESSION_ID = SESSION_ID;
    const emitted: Array<Record<string, unknown>> = [];

    emitted.push(
      JSON.parse(
        captureStdout(() => {
          handleReport([
            "--stage",
            STAGE,
            "--result",
            "approved",
            "--standing-grant-id",
            GRANT_ID,
            "--standing-grant-route-id",
            ROUTE_ID,
          ], root);
        }),
      ),
    );
    const fallback = emitted[0] as {
      kind: string;
      target_intent_id: string;
      presence_reservation_id: string;
    };
    expect(fallback.kind).toBe("await-approval");

    expect(
      spawnSync(process.execPath, [MINT], {
        encoding: "utf-8",
        input: JSON.stringify({
          session_id: SESSION_ID,
          hook_event_name: "UserPromptSubmit",
          prompt: "1",
          cwd: root,
        }),
        env: stateEnv(root),
      }).status,
    ).toBe(0);

    emitted.push(
      JSON.parse(
        captureStdout(() => {
          handleReport([
            "--stage",
            STAGE,
            "--result",
            "approved",
            "--user-input",
            "1",
            "--target-intent-id",
            fallback.target_intent_id,
            "--presence-reservation-id",
            fallback.presence_reservation_id,
          ], root);
        }),
      ),
    );
    expect(emitted[1].kind).toBe("done");

    const counts = {
      body: emitted.filter((directive) => "stage_file" in directive).length,
      reviewer: emitted.filter((directive) => "reviewer" in directive).length,
      sensors: emitted.filter((directive) => "sensors_applicable" in directive).length,
      learnings: emitted.filter(
        (directive) => directive.kind === "run-stage" || directive.kind === "present-gate",
      ).length,
    };
    expect(counts).toEqual({ body: 0, reviewer: 0, sensors: 0, learnings: 0 });
  });

  test("treats duplicate receipt owners as fatal without choosing either owner", () => {
    const { root, owner } = setup(
      new Date(Date.now() + 60_000).toISOString(),
      Date.now(),
    );
    const other = switchCursorToNonOwner(root);
    appendAuditEntry(
      "GATE_AUTHORIZATION_SELECTED",
      {
        "Route Id": ROUTE_ID,
        Stage: STAGE,
        "Grant Id": GRANT_ID,
      },
      root,
      other.split("/").at(-1)!,
    );
    const ownerBefore = readFileSync(join(owner, "amadeus-state.md"), "utf-8");
    const otherBefore = readFileSync(join(other, "amadeus-state.md"), "utf-8");
    const result = runState(root, [
      "approve",
      STAGE,
      "--standing-grant-id",
      GRANT_ID,
      "--standing-grant-route-id",
      ROUTE_ID,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("cardinality must be exactly one; got 2");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8")).toBe(ownerBefore);
    expect(readFileSync(join(other, "amadeus-state.md"), "utf-8")).toBe(otherBefore);
  });
});
