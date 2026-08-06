// covers: function:reclaimRoleMarkerLock, function:writeRoleLockOwner,
//         function:updateKimiSubagentRole
// size: medium
//
// t456 — the role-marker lock is OWNED. Before this, SessionStart deleted the
// lock directory unconditionally on the premise that "a fresh-session boundary
// cannot have an in-flight operation". The premise does not hold when a second
// Kimi process in the same project dir is inside withRoleMarkerLock's
// operation(): SessionStart would delete that lock, acquire its own on top, and
// interleave a baseline write with an in-flight read-modify-write of the same
// carrier.
//
// The replacement is not a stronger premise but an enforced one: a lock records
// its owner, and a lock is only ever reclaimed when that owner is observably
// gone (or when the mtime backstop has expired). Both directions are pinned
// here — a live owner's lock survives, and a dead owner's lock is reclaimed
// immediately rather than after the 30s staleness window that the ~500ms retry
// budget can never reach.
//
// Real filesystem and real process liveness, so: integration layer. Liveness is
// controlled deterministically (a child process awaited to exit), never polled.

import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ROLE_LOCK_STALE_MS,
  reclaimRoleMarkerLock,
  runAdapter,
  updateKimiSubagentRole,
  writeRoleLockOwner,
} from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";

const MAIN_SESSION = "main-session";
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function markerPathOf(root: string): string {
  return join(root, "amadeus", ".amadeus-sessions", "kimi-active-subagents.json");
}

/** A project dir whose Kimi carrier already names a main session. */
function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-kimi-lock-"));
  roots.push(root);
  const markerPath = markerPathOf(root);
  mkdirSync(join(root, "amadeus", ".amadeus-sessions"), { recursive: true });
  writeFileSync(
    markerPath,
    `${
      JSON.stringify({
        version: 1,
        mainSessionId: MAIN_SESSION,
        roles: {},
      })
    }\n`,
    "utf-8",
  );
  return root;
}

/** A lock directory held by `pid`, written through the production owner writer. */
function heldLock(root: string, pid: number): string {
  const lockPath = `${markerPathOf(root)}.lock`;
  mkdirSync(lockPath, { recursive: true });
  writeRoleLockOwner(lockPath, pid);
  return lockPath;
}

/** A pid that is deterministically gone: a child awaited to completion. */
async function reapedPid(): Promise<number> {
  const child = Bun.spawn([process.execPath, "-e", "process.exit(0)"], {
    stdout: "ignore",
    stderr: "ignore",
  });
  const pid = child.pid;
  await child.exited;
  return pid;
}

function ageLockPastStaleWindow(lockPath: string): void {
  const past = (Date.now() - ROLE_LOCK_STALE_MS * 2) / 1000;
  utimesSync(lockPath, past, past);
}

function readRoles(root: string): Record<string, number> {
  return JSON.parse(readFileSync(markerPathOf(root), "utf-8")).roles;
}

function sessionStart(root: string): void {
  runAdapter(
    "session-start",
    JSON.stringify({
      hook_event_name: "SessionStart",
      source: "startup",
      session_id: MAIN_SESSION,
      cwd: root,
    }),
    root,
    () => ({ stdout: "", code: 0 }),
  );
}

describe("reclaimRoleMarkerLock refuses to take a lock from a live owner", () => {
  test("a lock owned by a running process is never reclaimed", () => {
    const root = workspace();
    const lockPath = heldLock(root, process.pid);

    expect(reclaimRoleMarkerLock(lockPath)).toBe(false);
    expect(existsSync(lockPath)).toBe(true);
  });

  // The mtime backstop is what keeps a recycled pid from wedging the lock
  // forever: an owner that looks alive but has held the lock past the staleness
  // window is reclaimed anyway, exactly as before this change.
  test("a lock past the staleness window is reclaimed even with a live owner", () => {
    const root = workspace();
    const lockPath = heldLock(root, process.pid);
    ageLockPastStaleWindow(lockPath);

    expect(reclaimRoleMarkerLock(lockPath)).toBe(true);
    expect(existsSync(lockPath)).toBe(false);
  });

  test("a lock with no owner file yet is left alone until the mtime backstop", () => {
    const root = workspace();
    const lockPath = `${markerPathOf(root)}.lock`;
    mkdirSync(lockPath, { recursive: true });

    expect(reclaimRoleMarkerLock(lockPath)).toBe(false);
    expect(existsSync(lockPath)).toBe(true);

    ageLockPastStaleWindow(lockPath);
    expect(reclaimRoleMarkerLock(lockPath)).toBe(true);
    expect(existsSync(lockPath)).toBe(false);
  });

  test("an absent lock is not reclaimable", () => {
    const root = workspace();
    expect(reclaimRoleMarkerLock(`${markerPathOf(root)}.lock`)).toBe(false);
  });

  // A stamp that cannot be read as an owner is worth exactly as much as no
  // stamp: it names nobody to ask about, so it falls to the mtime backstop
  // rather than licensing a seizure.
  test.each([
    ["a non-numeric pid", JSON.stringify({ pid: "1", startedAt: 1 })],
    ["a fractional pid", JSON.stringify({ pid: 1.5, startedAt: 1 })],
    ["a non-positive pid", JSON.stringify({ pid: 0, startedAt: 1 })],
    ["a missing startedAt", JSON.stringify({ pid: 1 })],
    ["an unparseable body", "{not json"],
  ])("a lock stamped with %s is treated as unstamped", (_label, body) => {
    const root = workspace();
    const lockPath = `${markerPathOf(root)}.lock`;
    mkdirSync(lockPath, { recursive: true });
    writeFileSync(join(lockPath, "owner.json"), `${body}\n`, "utf-8");

    expect(reclaimRoleMarkerLock(lockPath)).toBe(false);
    ageLockPastStaleWindow(lockPath);
    expect(reclaimRoleMarkerLock(lockPath)).toBe(true);
  });

  test("a lock whose owner is gone is reclaimed immediately", async () => {
    const root = workspace();
    const lockPath = heldLock(root, await reapedPid());

    expect(reclaimRoleMarkerLock(lockPath)).toBe(true);
    expect(existsSync(lockPath)).toBe(false);
  });
});

describe("SessionStart does not seize an in-flight lock", () => {
  // The regression: an unconditional rmSync let SessionStart delete a lock a
  // live process was holding and then acquire its own on top of it.
  test("a lock held by a live owner survives the SessionStart baseline", () => {
    const root = workspace();
    const lockPath = heldLock(root, process.pid);
    const ownerBefore = readFileSync(join(lockPath, "owner.json"), "utf-8");

    sessionStart(root);

    expect(existsSync(lockPath)).toBe(true);
    expect(readFileSync(join(lockPath, "owner.json"), "utf-8")).toBe(
      ownerBefore,
    );
  });

  test("a lock left by a dead owner is reclaimed and the baseline lands", async () => {
    const root = workspace();
    const lockPath = heldLock(root, await reapedPid());

    sessionStart(root);

    expect(existsSync(lockPath)).toBe(false);
    expect(JSON.parse(readFileSync(markerPathOf(root), "utf-8"))).toEqual({
      version: 1,
      mainSessionId: MAIN_SESSION,
      roles: {},
    });
  });
});

describe("withRoleMarkerLock reclaims a dead owner without waiting for mtime", () => {
  // The ~500ms retry budget (100 x 5ms) never reaches the 30s staleness window,
  // so before owner tracking a fresh lock from a killed process made every role
  // update give up and latch the workspace denied.
  test("a role update proceeds through a fresh lock whose owner is gone", async () => {
    const root = workspace();
    const lockPath = heldLock(root, await reapedPid());

    updateKimiSubagentRole(root, "amadeus-quality-agent", "start");

    expect(readRoles(root)).toEqual({ "amadeus-quality-agent": 1 });
    expect(existsSync(lockPath)).toBe(false);
  });

  test("a role update gives up rather than seizing a live owner's lock", () => {
    const root = workspace();
    const lockPath = heldLock(root, process.pid);

    updateKimiSubagentRole(root, "amadeus-quality-agent", "start");

    expect(existsSync(lockPath)).toBe(true);
    expect(readRoles(root)).toEqual({});
    expect(
      existsSync(
        join(root, "amadeus", ".amadeus-sessions", "kimi-subagent-transition-deny"),
      ),
    ).toBe(true);
  });
});

describe("a failed lock holder never leaks an unattributable lock", () => {
  // The owner stamp shares operation()'s try/finally, so both failure shapes
  // release the lock through the same wiring. The operation-throw arm is
  // driven end-to-end here; the stamp's own failure contract (throw loudly,
  // never hold an unstamped lock while pretending success) is pinned directly
  // below against the exported writer.
  test("an operation failure releases the lock and stays denied", () => {
    const root = workspace();
    const markerPath = markerPathOf(root);
    // No baseline: operation() throws inside the lock. The caller must keep
    // the deny latch (fail-closed) AND the finally must release the lock —
    // a leftover lock here would be exactly the unattributable residue the
    // ownership scheme exists to prevent.
    rmSync(markerPath);

    updateKimiSubagentRole(root, "amadeus-quality-agent", "start");

    expect(existsSync(`${markerPath}.lock`)).toBe(false);
    expect(
      existsSync(
        join(root, "amadeus", ".amadeus-sessions", "kimi-subagent-transition-deny"),
      ),
    ).toBe(true);
    expect(existsSync(markerPath)).toBe(false);
  });

  test("a stamp that cannot be written throws instead of holding quietly", () => {
    const root = workspace();
    const missing = join(root, "no-such-dir", "marker.lock");

    expect(() => writeRoleLockOwner(missing)).toThrow();
  });
});
