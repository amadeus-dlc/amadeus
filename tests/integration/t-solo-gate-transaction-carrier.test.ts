// covers: function:handleApprove, function:handleReport, file:tools/amadeus-presence-reservation.ts

import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handleReport } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { readPresenceReservation } from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { handleApprove } from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  STAGE,
  armAndMintTargetedApproval,
  captureStdout,
  cleanupSoloGateRoots,
  restoreSoloEnv,
  setup,
  switchCursorToNonOwner,
  useSoloEnv,
} from "../harness/solo-gate-fixture.ts";

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

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
  process.exit = ((value?: number) => {
    throw new ExitSignal(value ?? 0);
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

function humanArgs(
  ids: { readonly targetIntentId: string; readonly reservationId: string },
): string[] {
  return [
    STAGE,
    "--user-input",
    "1",
    "--target-intent-id",
    ids.targetIntentId,
    "--presence-reservation-id",
    ids.reservationId,
  ];
}

afterAll(cleanupSoloGateRoots);
afterEach(restoreSoloEnv);

describe("retired standing-grant carrier rejection", () => {
  test("state approval refuses the former carrier before mutation", () => {
    const { root, owner } = setup();
    useSoloEnv(root);
    const before = readFileSync(join(owner, "amadeus-state.md"), "utf-8");
    const result = capture(() => handleApprove([
      STAGE,
      "--standing-grant-id",
      "cafe0001",
      "--standing-grant-route-id",
      "12345678-1234-4abc-8def-1234567890ab",
    ]));
    expect(result.exited).toBe(true);
    expect(result.stderr).toContain("Standing-grant approval carriers are retired");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8")).toBe(before);
  });

  test("report refuses the former carrier before mutation", () => {
    const { root, owner } = setup();
    const before = readFileSync(join(owner, "amadeus-state.md"), "utf-8");
    const directive = JSON.parse(captureStdout(() => handleReport([
      "--stage",
      STAGE,
      "--result",
      "approved",
      "--standing-grant-id",
      "cafe0001",
      "--standing-grant-route-id",
      "12345678-1234-4abc-8def-1234567890ab",
    ], root))) as { kind: string; message: string };
    expect(directive.kind).toBe("error");
    expect(directive.message).toContain("Standing-grant approval carriers are retired");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8")).toBe(before);
  });
});

describe("targeted human approval", () => {
  test("commits against the reservation owner and consumes the reservation", () => {
    const { root, owner } = setup();
    useSoloEnv(root);
    const ids = armAndMintTargetedApproval(root);
    const nonOwner = switchCursorToNonOwner(root);
    const nonOwnerBefore = readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8");

    const result = capture(() => handleApprove(humanArgs(ids)));

    expect(result.exited).toBe(false);
    expect(JSON.parse(result.stdout)).toEqual({ kind: "approved" });
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toContain(`- [x] ${STAGE}`);
    expect(readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8")).toBe(nonOwnerBefore);
    expect(readPresenceReservation(root, ids.reservationId)?.state).toBe("consumed");
  });

  test("refuses targeted approval without the trusted session identity", () => {
    const { root, owner } = setup();
    useSoloEnv(root);
    const ids = armAndMintTargetedApproval(root);
    const before = readFileSync(join(owner, "amadeus-state.md"), "utf-8");
    delete process.env.AMADEUS_TRUSTED_SESSION_ID;

    const result = capture(() => handleApprove(humanArgs(ids)));

    expect(result.exited).toBe(true);
    expect(result.stderr).toContain("Trusted session identity is unavailable");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8")).toBe(before);
  });

  test("report with a valid carrier passes the advisory hold check before committing", () => {
    const { root, owner } = setup();
    useSoloEnv(root);
    const ids = armAndMintTargetedApproval(root);

    // The carrier path consults advisoryReportHoldReason (with the plugin
    // activation host root) before handing over to the authorized commit; with
    // no advisory store the hold is null and the report commits.
    const directive = JSON.parse(captureStdout(() => handleReport([
      "--stage",
      STAGE,
      "--result",
      "approved",
      "--user-input",
      "1",
      "--target-intent-id",
      ids.targetIntentId,
      "--presence-reservation-id",
      ids.reservationId,
    ], root))) as { kind: string };
    expect(directive.kind).toBe("committed");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8"))
      .toContain(`- [x] ${STAGE}`);
  });

  test("refuses a reservation that targets another stage", () => {
    const { root, owner } = setup();
    useSoloEnv(root);
    const ids = armAndMintTargetedApproval(root);
    const before = readFileSync(join(owner, "amadeus-state.md"), "utf-8");

    const result = capture(() => handleApprove([
      "application-design",
      ...humanArgs(ids).slice(1),
    ]));

    expect(result.exited).toBe(true);
    expect(result.stderr).toContain("Presence reservation does not match");
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8")).toBe(before);
  });
});
