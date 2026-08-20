// covers: hook:amadeus-mint-presence, function:handleGateReserve,
//         function:handleGateReject, function:handleReport,
//         function:handleApprove, function:detectHarnessTypeForAuthorization
// size: medium
//
// t2326 — the gating call sites that read the harness type, pinned one per site
// against the environment.
//
// #2326 closed the bypass at authorizeMainConductor, but the same env-first
// detector still fed five decisions that are gates rather than labels: the
// presence-mint route requirement, the gate-approve reservation-carrier
// requirement, the Kimi-only availability of gate-reserve and gate-reject, and
// the choice of where a trusted session id comes from. Each was reachable by
// exporting AMADEUS_HARNESS_TYPE — in one direction to relax a Kimi-only
// requirement on a real Kimi host, in the other to impose a Kimi-only
// requirement on a host that never established a carrier.
//
// Mechanism: the real handlers, driven in-process against real workspace
// fixtures under the OS temp dir, plus one spawn of the shipped mint-presence
// hook (it is a top-level script, so its own line is only reachable by running
// it). Every case sets AMADEUS_HARNESS_TYPE to the value that USED to flip the
// outcome and asserts the outcome the workspace's real marker dictates.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  handleGateReject,
  handleGateReserve,
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { handleApprove } from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  armPresenceReservation,
  findActivePresenceReservation,
  readPresenceReservation,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { readAllAuditShards } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { runAdapter } from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";
import {
  AMADEUS_SRC,
  createTestProject,
  DEFAULT_INTENT_UUID,
  REPO_ROOT,
  seededRecordDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";
import {
  armAndMintTargetedApproval,
  cleanupSoloGateRoots,
  restoreSoloEnv,
  setup as soloSetup,
  STAGE as SOLO_STAGE,
  useSoloEnv,
} from "../harness/solo-gate-fixture.ts";

const MINT = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-mint-presence.ts",
);
const SESSION_START = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-session-start.ts",
);
const GRAPH = join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
const STAGE = "requirements-analysis";
const MAIN_SESSION = "main-session";
const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";

const roots: string[] = [];

const TOUCHED_ENV = [
  "AMADEUS_HARNESS_TYPE",
  "AMADEUS_HARNESS_DIR",
  "AMADEUS_STAGE_GRAPH",
  "AMADEUS_SKIP_ARTIFACT_GUARD",
  "AMADEUS_TRUSTED_SESSION_ID",
  "CLAUDE_PROJECT_DIR",
] as const;
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = {};
  for (const key of TOUCHED_ENV) savedEnv[key] = process.env[key];
  // The baseline is env-neutral so no case inherits a harness override from the
  // surrounding session; each case sets exactly the override it is pinning.
  delete process.env.AMADEUS_HARNESS_TYPE;
  process.env.AMADEUS_STAGE_GRAPH = GRAPH;
  process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
});

afterEach(() => {
  for (const key of TOUCHED_ENV) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function alignSeededRegistry(root: string): void {
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
  registry[0].dirName = seededRecordDir(root).split("/").at(-1);
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

function baseWorkflow(harnessDirName: string): string {
  resetOtelPerProject();
  const root = createTestProject();
  roots.push(root);
  seedStateFile(root, "state-mid-inception.md");
  alignSeededRegistry(root);
  mkdirSync(join(root, harnessDirName, "tools"), { recursive: true });
  mkdirSync(join(root, "amadeus", ".amadeus-sessions"), { recursive: true });
  return root;
}

/** A workspace whose REAL evidence is Kimi, with the carrier SessionStart mints. */
function kimiWorkflow(): string {
  const root = baseWorkflow(".kimi-code");
  const payload = JSON.stringify({
    hook_event_name: "SessionStart",
    source: "startup",
    session_id: MAIN_SESSION,
    cwd: root,
  });
  runAdapter("session-start", payload, root, () => ({ stdout: "", code: 0 }));
  const child = Bun.spawnSync([process.execPath, SESSION_START], {
    cwd: root,
    stdin: Buffer.from(payload, "utf-8"),
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      AMADEUS_HARNESS_DIR: ".kimi-code",
      AMADEUS_HARNESS_TYPE: "kimi",
      AMADEUS_STAGE_GRAPH: GRAPH,
      AMADEUS_SKIP_ARTIFACT_GUARD: "1",
    },
  });
  if (child.exitCode !== 0) {
    throw new Error(child.stderr.toString() || child.stdout.toString());
  }
  return root;
}

/** The same workspace on a harness none of the Kimi-only gates apply to. */
function claudeWorkflow(): string {
  return baseWorkflow(".claude");
}

function withHarnessTypeEnv<T>(value: string, action: () => T): T {
  const saved = process.env.AMADEUS_HARNESS_TYPE;
  process.env.AMADEUS_HARNESS_TYPE = value;
  try {
    return action();
  } finally {
    if (saved === undefined) delete process.env.AMADEUS_HARNESS_TYPE;
    else process.env.AMADEUS_HARNESS_TYPE = saved;
  }
}

/** One emitted engine directive, parsed. Mirrors t365's capture. */
function captureDirective(action: () => void): Record<string, unknown> {
  const output: string[] = [];
  const original = console.log;
  console.log = (value: unknown) => {
    output.push(String(value));
  };
  try {
    action();
  } finally {
    console.log = original;
  }
  if (output.length !== 1) {
    throw new Error(`Expected one directive, received ${output.length}`);
  }
  return JSON.parse(output[0] as string) as Record<string, unknown>;
}

// The state CLI's refusals terminate the process, so the in-process drive traps
// process.exit the way the sibling solo-gate tests do.
class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureExit(
  action: () => void,
): { exited: boolean; stdout: string; stderr: string } {
  let stdout = "";
  let stderr = "";
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
    action();
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

function armFor(root: string): string {
  return armPresenceReservation({
    projectDir: root,
    sessionId: MAIN_SESSION,
    space: "default",
    targetIntentId: DEFAULT_INTENT_UUID,
    stage: STAGE,
    routeId: ROUTE_ID,
  }).reservationId;
}

/** Fire the shipped UserPromptSubmit hook with `prompt` under `harnessType`. */
function firePrompt(root: string, prompt: string, harnessType: string): void {
  const child = Bun.spawnSync([process.execPath, MINT], {
    cwd: root,
    stdin: Buffer.from(
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        session_id: MAIN_SESSION,
        cwd: root,
        prompt,
      }),
      "utf-8",
    ),
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: root,
      AMADEUS_HARNESS_TYPE: harnessType,
      AMADEUS_STAGE_GRAPH: GRAPH,
      AMADEUS_SKIP_ARTIFACT_GUARD: "1",
    },
  });
  if (child.exitCode !== 0) {
    throw new Error(child.stderr.toString() || child.stdout.toString());
  }
}

describe("presence mint: the Kimi route requirement is not env-settable", () => {
  // A route that does not carry the Reservation Id is exactly what the Kimi
  // route binding exists to reject. Under the old detector a "claude-code"
  // override made requireReservationRoute false, so this prompt minted the
  // owner-targeted HUMAN_TURN anyway — a subagent could hand itself the
  // approval carrier by exporting one variable.
  test("a non-Kimi override cannot relax it on a real Kimi workspace", () => {
    const root = kimiWorkflow();
    const reservationId = armFor(root);
    const auditBefore = readAllAuditShards(root);

    firePrompt(root, "please approve the stage", "claude-code");

    expect(readPresenceReservation(root, reservationId)?.state).toBe("armed");
    // The hook DID run and DID record presence — it took the untargeted path,
    // which is what "the reservation was not minted" has to mean here.
    expect(readAllAuditShards(root)).not.toBe(auditBefore);
    expect(readAllAuditShards(root)).toContain("HUMAN_TURN");
  });

  test("a kimi override cannot impose it on a workspace that is not Kimi", () => {
    const root = claudeWorkflow();
    const reservationId = armFor(root);

    firePrompt(root, "please approve the stage", "kimi");

    expect(readPresenceReservation(root, reservationId)?.state).toBe("minted");
  });
});

describe("gate approve: the reservation-carrier requirement is not env-settable", () => {
  test("a non-Kimi override cannot skip it on a real Kimi workspace", () => {
    const root = kimiWorkflow();
    const stateBefore = readFileSync(seededStateFile(root), "utf-8");

    const directive = withHarnessTypeEnv("claude-code", () =>
      captureDirective(() =>
        handleReport([
          "--stage",
          STAGE,
          "--result",
          "approved",
          "--user-input",
          "Approve",
        ], root)
      ));

    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain(
      "requires the stage reservation carrier",
    );
    // The refusal leaves the workflow state untouched and is itself recorded,
    // so nothing about the stage advanced under the override.
    expect(readFileSync(seededStateFile(root), "utf-8")).toBe(stateBefore);
    expect(readAllAuditShards(root)).toContain(
      "requires the stage reservation carrier",
    );
  });

  test("a kimi override cannot impose it on a workspace that is not Kimi", () => {
    const root = claudeWorkflow();

    const directive = withHarnessTypeEnv("kimi", () =>
      captureDirective(() =>
        handleReport([
          "--stage",
          STAGE,
          "--result",
          "approved",
          "--user-input",
          "Approve",
        ], root)
      ));

    expect(String(directive.message ?? "")).not.toContain(
      "requires the stage reservation carrier",
    );
  });
});

describe("gate-reserve / gate-reject: Kimi-only by evidence, not by env", () => {
  // Two sites in one case: the availability check must let a real Kimi caller
  // through under a "codex" override, and the trusted session id it then uses
  // must come from the host-stamped carrier — NOT from AMADEUS_TRUSTED_SESSION_ID,
  // which the same override used to route it to.
  test("a real Kimi caller reserves under a codex override, bound to the carrier session", () => {
    const root = kimiWorkflow();
    process.env.AMADEUS_TRUSTED_SESSION_ID = "forged-session";

    const directive = withHarnessTypeEnv("codex", () =>
      captureDirective(() => handleGateReserve(["--stage", STAGE], root)));

    expect(directive.kind).toBe("await-approval");
    expect(findActivePresenceReservation(root, MAIN_SESSION)).not.toBeNull();
    expect(findActivePresenceReservation(root, "forged-session")).toBeNull();
  });

  test("a kimi override does not open gate-reserve on a non-Kimi workspace", () => {
    const root = claudeWorkflow();

    const directive = withHarnessTypeEnv("kimi", () =>
      captureDirective(() => handleGateReserve(["--stage", STAGE], root)));

    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain(
      "gate-reserve is available only on the Kimi harness",
    );
  });

  test("a kimi override does not open gate-reject on a non-Kimi workspace", () => {
    const root = claudeWorkflow();

    const directive = withHarnessTypeEnv("kimi", () =>
      captureDirective(() =>
        handleGateReject([
          "--stage",
          STAGE,
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          ROUTE_ID,
        ], root)
      ));

    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain(
      "gate-reject is available only on the Kimi harness",
    );
  });
});

describe("state CLI: the trusted session source follows the workspace", () => {
  afterEach(() => {
    restoreSoloEnv();
    cleanupSoloGateRoots();
  });

  // The sign-flipped defect: an inherited AMADEUS_HARNESS_TYPE=kimi used to
  // send a legitimate Claude Code approval to readCurrentSessionId(), which a
  // non-Kimi workspace never stamps, and the approval died on "Trusted session
  // identity is unavailable". The real marker decides now, so the solo route
  // keeps its own env-supplied trusted session.
  test("a kimi override does not strand a solo approval on a non-Kimi workspace", () => {
    const { root, owner } = soloSetup();
    mkdirSync(join(root, ".claude", "tools"), { recursive: true });
    useSoloEnv(root);
    const ids = armAndMintTargetedApproval(root);

    const result = captureExit(() =>
      withHarnessTypeEnv("kimi", () =>
        handleApprove([
          SOLO_STAGE,
          "--user-input",
          "1",
          "--target-intent-id",
          ids.targetIntentId,
          "--presence-reservation-id",
          ids.reservationId,
        ]))
    );

    // captureExit, not a bare call: the refusal this pins exits the process, so
    // without the trap a regression would kill the test runner mid-file instead
    // of reporting a failure.
    expect(result.exited).toBe(false);
    expect(result.stderr).not.toContain("Trusted session identity is unavailable");
    expect(JSON.parse(result.stdout)).toEqual({ kind: "approved" });
    expect(readFileSync(join(owner, "amadeus-state.md"), "utf-8")).toContain(
      `- [x] ${SOLO_STAGE}`,
    );
  });
});
