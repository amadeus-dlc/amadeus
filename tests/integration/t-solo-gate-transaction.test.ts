// covers: function:handleReport, function:handleApprove, file:tools/amadeus-presence-reservation.ts

import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  appendAuditEntry,
} from "../../packages/framework/core/tools/amadeus-audit.ts";
import {
  directiveSelfCheckExamples,
  type RunStageDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";
import {
  routeSoloStandingGrantDirective,
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  auditShardName,
  type StageEntry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  consumePresenceReservation,
  hostSessionCapability,
  mintHumanPresence,
  readPresenceReservation,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import {
  validateSoloStandingGrantById,
} from "../../packages/framework/core/tools/amadeus-grant-authorization.ts";
import { handleApprove } from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  createTestProject,
  DEFAULT_INTENT_UUID,
  seededRecordDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STATE = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-state.ts",
);
const MINT = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-mint-presence.ts",
);
const GRAPH_PATH = join(REPO_ROOT, ".codex", "tools", "data", "stage-graph.json");
const GRAPH = JSON.parse(readFileSync(GRAPH_PATH, "utf-8")) as StageEntry[];
const STAGE = "requirements-analysis";
const GRANT_ID = "cafe0001";
const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";
const SESSION_ID = "trusted-solo-session";
const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function stateEnv(root: string): Record<string, string> {
  return {
    ...process.env,
    CLAUDE_PROJECT_DIR: root,
    AMADEUS_OPERATING_MODE: "solo",
    AMADEUS_STAGE_GRAPH: GRAPH_PATH,
    AMADEUS_SKIP_ARTIFACT_GUARD: "1",
    AMADEUS_TRUSTED_SESSION_ID: SESSION_ID,
  };
}

function runState(
  root: string,
  args: string[],
): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const result = spawnSync(
    process.execPath,
    [STATE, ...args, "--project-dir", root],
    { encoding: "utf-8", env: stateEnv(root) },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function captureStdout(fn: () => void): string {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...values: unknown[]) => lines.push(values.join(" "));
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines.join("\n");
}

function appendGrant(
  root: string,
  expiresAt: string,
  grantId: string = GRANT_ID,
): string {
  const intent = seededRecordDir(root).split("/").at(-1)!;
  const human = appendAuditEntry("HUMAN_TURN", {}, root, intent);
  appendAuditEntry(
    "GRANT_ISSUED",
    {
      "Grant Id": grantId,
      Scope: "stage-gates",
      "Expires At": expiresAt,
      "Includes Phase Boundary": "true",
      "Issuer Space": "default",
      "Issuer Intent": intent,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": human.timestamp,
    },
    root,
    intent,
  );
  return human.timestamp;
}

function revokeGrant(root: string, humanTs: string, grantId: string): void {
  const intent = seededRecordDir(root).split("/").at(-1)!;
  appendAuditEntry(
    "GRANT_REVOKED",
    {
      "Grant Id": grantId,
      "Issuer Space": "default",
      "Issuer Intent": intent,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": humanTs,
    },
    root,
    intent,
  );
}

// Rewrite the issued grant's Issuer Intent so the owner-lock revalidation sees
// an issuer that is not the receipt owner (TR-23), without touching any other
// audit field.
function breakGrantIssuerIntent(root: string): void {
  const shard = join(seededRecordDir(root), "audit", auditShardName(root));
  const content = readFileSync(shard, "utf-8");
  const intent = seededRecordDir(root).split("/").at(-1)!;
  writeFileSync(
    shard,
    content.replace(
      `**Issuer Intent**: ${intent}`,
      "**Issuer Intent**: some-other-intent-00000001",
    ),
  );
}

function setup(expiresAt: string, routeNow: number): {
  readonly root: string;
  readonly owner: string;
  readonly humanTs: string;
} {
  const root = createTestProject();
  roots.push(root);
  seedStateFile(root, "state-mid-inception.md");
  const registryPath = join(
    root,
    "amadeus",
    "spaces",
    "default",
    "intents",
    "intents.json",
  );
  const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as Array<
    Record<string, unknown>
  >;
  registry[0].dirName = seededRecordDir(root).split("/").at(-1)!;
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  const phaseCheck = join(seededRecordDir(root), "verification");
  mkdirSync(phaseCheck, { recursive: true });
  writeFileSync(
    join(phaseCheck, "phase-check-inception.md"),
    "# Inception phase check\n",
  );
  expect(runState(root, ["gate-start", STAGE]).status).toBe(0);
  const humanTs = appendGrant(root, expiresAt);
  const state = readFileSync(seededStateFile(root), "utf-8");
  const ownerIntent = seededRecordDir(root).split("/").at(-1)!;
  const validation = validateSoloStandingGrantById(
    root,
    ownerIntent,
    GRANT_ID,
    STAGE,
    state,
    GRAPH,
    routeNow,
  );
  if (validation.kind !== "valid") {
    throw new Error(`fixture grant is invalid: ${validation.reason}`);
  }
  const example = directiveSelfCheckExamples.find(
    (candidate) => candidate.kind === "run-stage" && candidate.gate === true,
  );
  if (example === undefined || example.kind !== "run-stage") {
    throw new Error("run-stage fixture is unavailable");
  }
  const routedInput: RunStageDirective = {
    ...example,
    stage: STAGE,
    phase: "inception",
    gate: true,
  };
  const directive = routeSoloStandingGrantDirective({
    directive: routedInput,
    projectDir: root,
    stateContent: state,
    graph: GRAPH,
    operatingMode: "solo",
    nowMs: routeNow,
    routeIdFactory: () => ROUTE_ID,
  });
  expect(directive.standing_grant_id).toBe(GRANT_ID);
  expect(directive.standing_grant_route_id).toBe(ROUTE_ID);
  return { root, owner: seededRecordDir(root), humanTs };
}

function switchCursorToNonOwner(root: string): string {
  const uuid = "00000000-0000-7000-8000-000000000002";
  const dir = "non-owner-8000000000000002";
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  mkdirSync(join(intents, dir, "audit"), { recursive: true });
  writeFileSync(join(intents, dir, "amadeus-state.md"), "# Non-owner state\n");
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      {
        uuid: DEFAULT_INTENT_UUID,
        slug: "fixture",
        dirName: seededRecordDir(root).split("/").at(-1)!,
        status: "in-flight",
      },
      { uuid, slug: "non-owner", dirName: dir, status: "in-flight" },
    ], null, 2)}\n`,
  );
  writeFileSync(join(intents, "active-intent"), `${dir}\n`);
  return join(intents, dir);
}

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

// ---------------------------------------------------------------------------
// The same approval commits, driven in-process.
//
// The suite above proves the shipped CLI journey across a process boundary. The
// block below drives handleApprove directly so the carrier commit path is also
// exercised as a function: every rejection is asserted on the state file and
// the audit ledger, not on a subprocess's exit code alone.
// ---------------------------------------------------------------------------
describe("in-process carrier approval commits", () => {
  const ENV_KEYS = [
    "CLAUDE_PROJECT_DIR",
    "AMADEUS_OPERATING_MODE",
    "AMADEUS_STAGE_GRAPH",
    "AMADEUS_SKIP_ARTIFACT_GUARD",
    "AMADEUS_TRUSTED_SESSION_ID",
  ] as const;
  let savedEnv: Record<string, string | undefined> = {};

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

  function useProject(root: string): void {
    savedEnv = {};
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
    process.env.CLAUDE_PROJECT_DIR = root;
    process.env.AMADEUS_OPERATING_MODE = "solo";
    process.env.AMADEUS_STAGE_GRAPH = GRAPH_PATH;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    process.env.AMADEUS_TRUSTED_SESSION_ID = SESSION_ID;
  }

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
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
    useProject(root);
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
    useProject(root);

    const result = capture(() => handleApprove(grantArgs()));

    expect(result.exited).toBe(false);
    expect(JSON.parse(result.stdout)).toEqual({ kind: "approved" });
    expect(ownerState(owner)).toContain(`- [x] ${STAGE}`);
    expect(readFileSync(join(nonOwner, "amadeus-state.md"), "utf-8")).toBe(nonOwnerBefore);
    expect(ownerAudit(root, owner)).toContain(`**Grant Id**: ${GRANT_ID}`);
  });

  test("refuses a route id that matches no receipt", () => {
    const { root, owner } = setup(new Date(Date.now() + 60_000).toISOString(), Date.now());
    useProject(root);
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
    useProject(root);
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
    useProject(root);
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
    useProject(root);
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
    useProject(root);
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
    useProject(root);
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
    useProject(root);
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
    useProject(root);
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
    useProject(root);
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

// ---------------------------------------------------------------------------
// Targeted approval audit-prefix arms.
//
// The commit reads the owner's audit prefix to decide whether it is opening the
// gate, resuming a half-written approval, or recovering a completed one. Each
// arm below is asserted on what the ledger and the state file end up holding —
// the recovery arms must never append a second approval.
// ---------------------------------------------------------------------------
describe("targeted approval prefix arms", () => {
  const ENV_KEYS = [
    "CLAUDE_PROJECT_DIR",
    "AMADEUS_OPERATING_MODE",
    "AMADEUS_STAGE_GRAPH",
    "AMADEUS_SKIP_ARTIFACT_GUARD",
    "AMADEUS_TRUSTED_SESSION_ID",
  ] as const;
  let savedEnv: Record<string, string | undefined> = {};

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
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
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
    savedEnv = {};
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
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
    let text = readFileSync(shard, "utf-8");
    for (const [index, event] of blocks.entries()) {
      text += `
## ${event}
**Timestamp**: ${new Date(Date.parse(later) + index).toISOString()}
**Event**: ${event}
**Stage**: ${STAGE}

---
`;
    }
    writeFileSync(shard, text);
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
    expect((auditAfter.match(/\*\*Event\*\*: PHASE_STARTED/g) ?? []).length).toBeGreaterThan(
      (auditBefore.match(/\*\*Event\*\*: PHASE_STARTED/g) ?? []).length,
    );
    expect(
      (auditAfter.match(/\*\*Event\*\*: GATE_APPROVED/g) ?? []).length,
    ).toBe(
      (auditBefore.match(/\*\*Event\*\*: GATE_APPROVED/g) ?? []).length,
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
    expect(readFileSync(join(owner, "audit", auditShardName(root)), "utf-8"))
      .toContain("**Event**: WORKFLOW_COMPLETED");
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
