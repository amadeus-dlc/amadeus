// covers: function:runAdapter(session-start), function:authorizeMainConductor,
//         file:packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts
// size: medium
//
// t452 — the AUTOMATIC recovery layer (FR-3). A Kimi SessionStart is the
// framework's promise that a new session re-establishes its own main-conductor
// carrier; this test pins that promise as a closure over the denial reasons a
// cross-harness handover actually produces: an absent marker (C1), a
// `.current-session` claimed by another harness (C2), and a retained
// session-ended tombstone (C3). It additionally pins the residual role-marker
// lock, which requirements FR-3 names as the gap to close inside this FR.
//
// Mechanism: the real Kimi adapter (in-process) plus the real core session-start
// hook (spawned — it is the sole writer of `.current-session`), then the real
// guard read in-process. Nothing about the carrier is stubbed, so a passing
// case proves the shipped recovery path and not a fixture.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  CURRENT_SESSION_RELATIVE_PATH,
  authorizeMainConductor,
  KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
  KIMI_SESSION_ENDED_DENY_RELATIVE_PATH,
  KIMI_SUBAGENT_DENY_RELATIVE_PATH,
} from "../../packages/framework/core/tools/amadeus-caller-authorization.ts";
import {
  ROLE_LOCK_STALE_MS,
  runAdapter,
  writeRoleLockOwner,
} from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";
import {
  AMADEUS_SRC,
  createTestProject,
  REPO_ROOT,
  seedStateFile,
} from "../harness/fixtures.ts";

const SESSION_START = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-session-start.ts",
);
const GRAPH = join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
const RECOVERED_SESSION = "recovered-session";

const roots: string[] = [];
let previousHarnessType: string | undefined;

beforeEach(() => {
  resetOtelPerProject();
  previousHarnessType = process.env.AMADEUS_HARNESS_TYPE;
  process.env.AMADEUS_HARNESS_TYPE = "kimi";
});

afterEach(() => {
  if (previousHarnessType === undefined) {
    delete process.env.AMADEUS_HARNESS_TYPE;
  } else {
    process.env.AMADEUS_HARNESS_TYPE = previousHarnessType;
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function freshProject(): string {
  const root = createTestProject();
  roots.push(root);
  seedStateFile(root, "state-mid-inception.md");
  mkdirSync(join(root, ".kimi-code", "tools"), { recursive: true });
  mkdirSync(join(root, "amadeus", ".amadeus-sessions"), { recursive: true });
  return root;
}

/** The shipped SessionStart pair: the Kimi adapter, then the core hook. */
function fireSessionStart(root: string, sessionId = RECOVERED_SESSION): void {
  const payload = JSON.stringify({
    hook_event_name: "SessionStart",
    source: "startup",
    session_id: sessionId,
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
}

function writeCarrierFile(root: string, relative: string, body: string): void {
  writeFileSync(join(root, relative), body, "utf-8");
}

function seedCoherentCarrier(root: string, sessionId: string): void {
  writeCarrierFile(
    root,
    KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
    `${JSON.stringify({ version: 1, mainSessionId: sessionId, roles: {} })}\n`,
  );
  writeCarrierFile(root, CURRENT_SESSION_RELATIVE_PATH, `${sessionId}\n`);
}

describe("Kimi SessionStart recovers every carrier denial reason (FR-3)", () => {
  test("C1 — an absent role marker recovers to authorized", () => {
    const root = freshProject();
    writeCarrierFile(root, CURRENT_SESSION_RELATIVE_PATH, "stale-session\n");
    expect(authorizeMainConductor(root)).toEqual({
      kind: "denied",
      reason: "marker-absent",
      role: "unknown",
    });

    fireSessionStart(root);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });

  test("C2 — a session id claimed by another harness recovers to authorized", () => {
    const root = freshProject();
    seedCoherentCarrier(root, "kimi-previous-session");
    writeCarrierFile(
      root,
      CURRENT_SESSION_RELATIVE_PATH,
      "claude-code-session\n",
    );
    expect(authorizeMainConductor(root)).toEqual({
      kind: "denied",
      reason: "session-mismatch",
      role: "unknown",
    });

    fireSessionStart(root);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });

  test("C3 — a retained session-ended tombstone recovers to authorized", () => {
    const root = freshProject();
    seedCoherentCarrier(root, "kimi-previous-session");
    writeCarrierFile(
      root,
      KIMI_SESSION_ENDED_DENY_RELATIVE_PATH,
      "session-ended\n",
    );
    writeCarrierFile(
      root,
      KIMI_SUBAGENT_DENY_RELATIVE_PATH,
      "session-ended\n",
    );
    expect(authorizeMainConductor(root)).toEqual({
      kind: "denied",
      reason: "deny-latch",
      role: "unknown",
    });

    fireSessionStart(root);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });

  // REVISED CONTRACT. This case used to assert that SessionStart clears ANY
  // lock directory it finds, on the premise that a fresh-session boundary can
  // have nothing in flight. That premise is false when a second Kimi process in
  // the same project dir is inside a role-marker operation, so the lock is now
  // owner-stamped and only reclaimed when the owner is observably gone (t456).
  //
  // FR-3's promise is unchanged and still pinned here — a lock left by a killed
  // session must not leave the workspace denied — but it is now closed by the
  // owner check rather than by an unconditional delete. The two shapes a
  // residual lock can take are pinned separately below.
  test("a residual lock left by a dead owner recovers to authorized", async () => {
    const root = freshProject();
    seedCoherentCarrier(root, "kimi-previous-session");
    const lockPath = join(root, `${KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH}.lock`);
    mkdirSync(lockPath, { recursive: true });
    const child = Bun.spawn([process.execPath, "-e", "process.exit(0)"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    const deadPid = child.pid;
    await child.exited;
    writeRoleLockOwner(lockPath, deadPid);
    expect(authorizeMainConductor(root)).toEqual({
      kind: "denied",
      reason: "deny-latch",
      role: "unknown",
    });

    fireSessionStart(root);
    expect(existsSync(lockPath)).toBe(false);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });

  // An unstamped lock is the narrow window between mkdir and the owner write,
  // and any lock left by a pre-ownership build. It cannot be attributed, so it
  // is held until the mtime backstop expires — fail-safe first, then recovered.
  test("an unstamped residual lock recovers once the mtime backstop expires", () => {
    const root = freshProject();
    seedCoherentCarrier(root, "kimi-previous-session");
    const lockPath = join(root, `${KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH}.lock`);
    mkdirSync(lockPath, { recursive: true });

    fireSessionStart(root);
    expect(existsSync(lockPath)).toBe(true);

    const past = (Date.now() - ROLE_LOCK_STALE_MS * 2) / 1000;
    utimesSync(lockPath, past, past);
    fireSessionStart(root);
    expect(existsSync(lockPath)).toBe(false);
    expect(authorizeMainConductor(root)).toEqual({ kind: "authorized" });
  });
});
