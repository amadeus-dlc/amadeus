// covers: function:handleApprove, file:tools/amadeus-presence-reservation.ts
//
// Targeted approval audit-prefix arms: opening a gate, resuming a
// half-written approval, and recovering a completed one.

import { normalizeAuditRecord } from "../harness/audit-records.ts";
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
  consumePresenceReservation,
  hostSessionCapability,
  mintHumanPresence,
  readPresenceReservation,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import {
  handleApprove,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  GRANT_ID,
  ROUTE_ID,
  SESSION_ID,
  STAGE,
  captureStdout,
  cleanupSoloGateRoots,
  restoreSoloEnv,
  setup,
  useSoloEnv,
} from "../harness/solo-gate-fixture.ts";

afterAll(() => {
  cleanupSoloGateRoots();
});

// ---------------------------------------------------------------------------
// Targeted approval audit-prefix arms.
//
// The commit reads the owner's audit prefix to decide whether it is opening the
// gate, resuming a half-written approval, or recovering a completed one. Each
// arm below is asserted on what the ledger and the state file end up holding —
// the recovery arms must never append a second approval.
// ---------------------------------------------------------------------------
describe("targeted approval prefix arms", () => {
  class ExitSignal extends Error {
    constructor(readonly code: number) {
      super(`exit ${code}`);
    }
  }

  function capture(fn: () => void): { exited: boolean; stdout: string; stderr: string } {
    let stdout = "";
    let stderr = "";
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
    } finally {
      process.exit = originalExit;
      console.log = originalLog;
      console.error = originalError;
    }
    return { exited, stdout, stderr };
  }

  afterEach(() => {
    restoreSoloEnv();
  });

  // A workspace whose grant has already expired, with the fallback reservation
  // armed and minted: the state every case below starts from.
  function fallbackFixture(): {
    root: string;
    owner: string;
    ids: { targetIntentId: string; reservationId: string };
  } {
    const expiredAt = Date.now() - 1_000;
    const { root, owner } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    useSoloEnv(root);
    const fallback = JSON.parse(
      captureStdout(() => {
        handleReport(
          [
            "--stage", STAGE, "--result", "approved",
            "--standing-grant-id", GRANT_ID,
            "--standing-grant-route-id", ROUTE_ID,
          ],
          root,
        );
      }),
    ) as { kind: string; target_intent_id: string; presence_reservation_id: string };
    expect(fallback.kind).toBe("await-approval");
    mintHumanPresence({ projectDir: root, capability: hostSessionCapability(SESSION_ID) });
    return {
      root,
      owner,
      ids: {
        targetIntentId: fallback.target_intent_id,
        reservationId: fallback.presence_reservation_id,
      },
    };
  }

  function approve(ids: { targetIntentId: string; reservationId: string }) {
    return capture(() =>
      handleApprove([
        STAGE,
        "--user-input", "1",
        "--target-intent-id", ids.targetIntentId,
        "--presence-reservation-id", ids.reservationId,
      ]),
    );
  }

  // Append raw audit blocks dated after the reservation's HUMAN_TURN, which is
  // what the prefix counter measures.
  function appendBlocks(root: string, owner: string, blocks: string[]): void {
    const shard = join(owner, "audit", auditShardName(root));
    const later = new Date(Date.now() + 30_000).toISOString();
    const lines = readFileSync(shard, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    // Reuse the shard's own identity so the appended records stay a valid
    // continuation of this clone's ledger (dense seq, same clone/intent).
    const prev = JSON.parse(lines[lines.length - 1]!) as {
      cloneId: string;
      intentId: string;
    };
    for (const [index, event] of blocks.entries()) {
      lines.push(
        JSON.stringify({
          schemaVersion: 1,
          seq: lines.length + 1,
          cloneId: prev.cloneId,
          intentId: prev.intentId,
          timestamp: new Date(Date.parse(later) + index).toISOString(),
          heading: event,
          event,
          fields: { Stage: STAGE },
        }),
      );
    }
    writeFileSync(shard, `${lines.join("\n")}\n`);
  }

  /** Count records carrying <event> in a JSONL shard buffer. */
  function eventCount(shardBody: string, event: string): number {
    return shardBody
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => normalizeAuditRecord(JSON.parse(l)) as unknown as { event: string | null })
      .filter((r) => r.event === event).length;
  }

  function stateFile(owner: string): string {
    return readFileSync(join(owner, "amadeus-state.md"), "utf-8");
  }

  test("refuses an ambiguous prefix of two gate approvals", () => {
    const { root, owner, ids } = fallbackFixture();
    appendBlocks(root, owner, ["GATE_APPROVED", "GATE_APPROVED"]);
    const before = stateFile(owner);

    const result = approve(ids);

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain("audit prefix is ambiguous");
    expect(stateFile(owner)).toBe(before);
  });

  test("refuses a consumed reservation on a still-open gate", () => {
    const { root, ids, owner } = fallbackFixture();
    consumePresenceReservation({
      projectDir: root,
      sessionId: SESSION_ID,
      reservationId: ids.reservationId,
      targetIntentId: ids.targetIntentId,
      stage: STAGE,
    });
    const before = stateFile(owner);

    const result = approve(ids);

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain(
      "Consumed reservation cannot authorize an open gate",
    );
    expect(stateFile(owner)).toBe(before);
  });

  test.each([
    ["a half-written gate approval", ["GATE_APPROVED"]],
    ["a gate approval and a stage completion", ["GATE_APPROVED", "STAGE_COMPLETED"]],
  ] as const)("resumes an open gate that already carries %s", (_label, blocks) => {
    const { root, owner, ids } = fallbackFixture();
    appendBlocks(root, owner, [...blocks]);

    const result = approve(ids);

    expect(result.exited).toBe(false);
    expect(JSON.parse(result.stdout)).toEqual({ kind: "approved" });
    expect(stateFile(owner)).toContain(`- [x] ${STAGE}`);
    expect(readPresenceReservation(root, ids.reservationId)?.state).toBe("consumed");
  });

  test("refuses a completed gate whose approval prefix is not unique", () => {
    const { root, owner, ids } = fallbackFixture();
    const before = stateFile(owner);
    writeFileSync(
      join(owner, "amadeus-state.md"),
      before.replace(`- [?] ${STAGE}`, `- [x] ${STAGE}`),
    );
    const marked = stateFile(owner);
    expect(marked).toContain(`- [x] ${STAGE}`);

    const result = approve(ids);

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain("has no unique audit prefix");
    expect(stateFile(owner)).toBe(marked);
  });

  test("recovers a completed gate whose advance never landed", () => {
    const { root, owner, ids } = fallbackFixture();
    const committed = approve(ids);
    expect(JSON.parse(committed.stdout)).toEqual({ kind: "approved" });
    // Simulate a crash between the approval commit and the advance: the stage is
    // completed, but Current Stage never moved on.
    const advanced = stateFile(owner);
    writeFileSync(
      join(owner, "amadeus-state.md"),
      advanced.replace(/- \*\*Current Stage\*\*: .*/, `- **Current Stage**: ${STAGE}`),
    );
    const auditBefore = readFileSync(join(owner, "audit", auditShardName(root)), "utf-8");

    const recovery = approve(ids);

    expect(recovery.exited).toBe(false);
    expect(JSON.parse(recovery.stdout)).toEqual({ kind: "approved" });
    // Recovery re-runs the advance only: no second approval is written.
    const auditAfter = readFileSync(join(owner, "audit", auditShardName(root)), "utf-8");
    expect(eventCount(auditAfter, "PHASE_STARTED")).toBeGreaterThan(
      eventCount(auditBefore, "PHASE_STARTED"),
    );
    expect(eventCount(auditAfter, "GATE_APPROVED")).toBe(
      eventCount(auditBefore, "GATE_APPROVED"),
    );
  });

  test("refuses recovery when the owner state carries an invalid Scope", () => {
    const { root, owner, ids } = fallbackFixture();
    expect(JSON.parse(approve(ids).stdout)).toEqual({ kind: "approved" });
    const advanced = stateFile(owner);
    writeFileSync(
      join(owner, "amadeus-state.md"),
      advanced
        .replace(/- \*\*Current Stage\*\*: .*/, `- **Current Stage**: ${STAGE}`)
        .replace(/- \*\*Scope\*\*: .*/, "- **Scope**: not-a-real-scope"),
    );

    const recovery = approve(ids);

    expect(recovery.exited).toBe(true);
    expect(JSON.parse(recovery.stderr).error).toContain("owner has an invalid Scope");
  });

  test("recovers a completed final stage by closing the workflow", () => {
    const { root, owner, ids } = fallbackFixture();
    expect(JSON.parse(approve(ids).stdout)).toEqual({ kind: "approved" });
    // Every remaining stage is SKIP, so the recovered advance has nowhere to go
    // and must close the workflow instead.
    const advanced = stateFile(owner);
    writeFileSync(
      join(owner, "amadeus-state.md"),
      advanced
        .replace(/- \*\*Current Stage\*\*: .*/, `- **Current Stage**: ${STAGE}`)
        .replace(/ — EXECUTE/g, " — SKIP"),
    );

    const recovery = approve(ids);

    expect(recovery.exited).toBe(false);
    expect(JSON.parse(recovery.stdout)).toEqual({ kind: "approved" });
    expect(
      eventCount(
        readFileSync(join(owner, "audit", auditShardName(root)), "utf-8"),
        "WORKFLOW_COMPLETED",
      ),
    ).toBe(1);
  });

  test("refuses a targeted approval when the owner gate is neither open nor completed", () => {
    const { root, owner, ids } = fallbackFixture();
    const before = stateFile(owner);
    writeFileSync(
      join(owner, "amadeus-state.md"),
      before.replace(`- [?] ${STAGE}`, `- [-] ${STAGE}`),
    );
    const reset = stateFile(owner);

    const result = approve(ids);

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain("gate is not open or completed");
    expect(stateFile(owner)).toBe(reset);
  });

  test("refuses a reservation marker that does not parse", () => {
    const { root, owner, ids } = fallbackFixture();
    writeFileSync(
      join(root, "amadeus", ".amadeus-sessions", "presence-reservations", `${ids.reservationId}.json`),
      '{"version":1}\n',
    );
    const before = stateFile(owner);

    const result = approve(ids);

    expect(result.exited).toBe(true);
    expect(JSON.parse(result.stderr).error).toContain("Invalid presence reservation");
    expect(stateFile(owner)).toBe(before);
  });
});
