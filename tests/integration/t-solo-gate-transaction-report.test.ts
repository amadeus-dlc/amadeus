// covers: function:handleReport, file:tools/amadeus-orchestrate.ts
//
// Report-side carrier rejections and protocol errors: handleReport is the
// only door a carrier can enter through, so each refusal below must emit an
// error directive and leave the commit unattempted.

import { afterAll, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  hostSessionCapability,
  mintHumanPresence,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { seededRecordDir } from "../harness/fixtures.ts";
import {
  GRANT_ID,
  GRAPH_PATH,
  ROUTE_ID,
  SESSION_ID,
  STAGE,
  captureStdout,
  cleanupSoloGateRoots,
  setup,
} from "../harness/solo-gate-fixture.ts";

afterAll(() => {
  cleanupSoloGateRoots();
});

// ---------------------------------------------------------------------------
// Report-side carrier rejections. handleReport is the only door a carrier can
// enter through, so each refusal below must emit an error directive and leave
// the commit unattempted.
// ---------------------------------------------------------------------------
describe("carrier report rejections", () => {
  function reportError(root: string, args: string[]): string {
    const directive = JSON.parse(captureStdout(() => handleReport(args, root))) as {
      kind: string;
      message?: string;
    };
    expect(directive.kind).toBe("error");
    return directive.message ?? "";
  }

  const carrier = [
    "--standing-grant-id",
    GRANT_ID,
    "--standing-grant-route-id",
    ROUTE_ID,
  ];

  test("rejects a partial carrier", () => {
    const { root } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    expect(
      reportError(root, [
        "--stage", STAGE, "--result", "approved", "--standing-grant-id", GRANT_ID,
      ]),
    ).toContain("Invalid approval authority: partial authorization carrier");
  });

  test("rejects a carrier on a single-stage report", () => {
    const { root } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    expect(
      reportError(root, ["--stage", STAGE, "--result", "approved", "--single", ...carrier]),
    ).toContain("valid only for a main-workflow stage report");
  });

  test("rejects a carrier without an explicit --stage", () => {
    const { root } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    expect(reportError(root, ["--result", "approved", ...carrier])).toContain(
      "require an explicit --stage",
    );
  });

  test("reports a rejected transition when the state commit fails", () => {
    const { root, owner } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    const before = readFileSync(join(owner, "amadeus-state.md"), "utf-8");
    const message = reportError(root, [
      "--stage", STAGE, "--result", "approved",
      "--standing-grant-id", GRANT_ID,
      "--standing-grant-route-id", "87654321-4321-4abc-8def-1234567890ab",
    ]);
    expect(message).toContain(`Transition rejected by amadeus-state.ts approve for "${STAGE}"`);
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8")).toBe(before);
  });

  test("refuses to arm a continuation without a trusted host session identity", () => {
    const expiredAt = Date.now() - 1_000;
    const { root } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    process.env.CLAUDE_PROJECT_DIR = root;
    process.env.AMADEUS_OPERATING_MODE = "solo";
    process.env.AMADEUS_STAGE_GRAPH = GRAPH_PATH;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    const saved = process.env.AMADEUS_TRUSTED_SESSION_ID;
    delete process.env.AMADEUS_TRUSTED_SESSION_ID;
    try {
      expect(
        reportError(root, ["--stage", STAGE, "--result", "approved", ...carrier]),
      ).toContain("Cannot arm human continuation without trusted host session identity");
    } finally {
      if (saved === undefined) delete process.env.AMADEUS_TRUSTED_SESSION_ID;
      else process.env.AMADEUS_TRUSTED_SESSION_ID = saved;
    }
  });

  test("refuses to arm a second continuation for the same session", () => {
    const expiredAt = Date.now() - 1_000;
    const { root } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    process.env.CLAUDE_PROJECT_DIR = root;
    process.env.AMADEUS_OPERATING_MODE = "solo";
    process.env.AMADEUS_STAGE_GRAPH = GRAPH_PATH;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    process.env.AMADEUS_TRUSTED_SESSION_ID = SESSION_ID;
    const first = JSON.parse(
      captureStdout(() => {
        handleReport(["--stage", STAGE, "--result", "approved", ...carrier], root);
      }),
    ) as { kind: string };
    expect(first.kind).toBe("await-approval");

    // The armed reservation is still unconsumed, so a second fallback for the
    // same session must be refused rather than silently re-armed.
    expect(
      reportError(root, ["--stage", STAGE, "--result", "approved", ...carrier]),
    ).toContain(`Cannot arm human continuation for "${STAGE}"`);
  });
});
// The engine treats any stderr from the state process as a protocol error: a
// commit that also emitted diagnostics is not a commit the engine may report as
// clean success.
describe("carrier report protocol errors", () => {
  test("reports a protocol error when the state process writes diagnostics", () => {
    const expiredAt = Date.now() - 1_000;
    const { root } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
    process.env.CLAUDE_PROJECT_DIR = root;
    process.env.AMADEUS_OPERATING_MODE = "solo";
    process.env.AMADEUS_STAGE_GRAPH = GRAPH_PATH;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    process.env.AMADEUS_TRUSTED_SESSION_ID = SESSION_ID;
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

    // Seal the owner's ledger behind a stale "complete" row that shadows the
    // same directory: the appends the commit makes are suppressed to stderr.
    const registryPath = join(root, "amadeus", "spaces", "default", "intents", "intents.json");
    const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as Array<Record<string, unknown>>;
    const ownerDir = seededRecordDir(root).split("/").at(-1)!;
    writeFileSync(
      registryPath,
      `${JSON.stringify([
        { uuid: "99999999-9999-7999-8999-999999999999", slug: "sealed", dirName: ownerDir, status: "complete" },
        ...registry,
      ], null, 2)}\n`,
    );
    const directive = JSON.parse(
      captureStdout(() => {
        handleReport(
          [
            "--stage", STAGE, "--result", "approved", "--user-input", "1",
            "--target-intent-id", fallback.target_intent_id,
            "--presence-reservation-id", fallback.presence_reservation_id,
          ],
          root,
        );
      }),
    ) as { kind: string; message?: string };

    // The engine must surface the diagnostics instead of emitting a clean
    // "done" for a commit it cannot vouch for.
    expect(directive.kind).toBe("error");
    expect(directive.message).toContain(`Approval process protocol error for "${STAGE}"`);
    expect(directive.message).toContain("wrote stderr");
  });
});
