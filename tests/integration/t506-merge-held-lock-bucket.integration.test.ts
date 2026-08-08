// covers: subcommand:amadeus-bolt:hold-merge, subcommand:amadeus-bolt:release-merge
//
// t506 — hold-merge / release-merge must run their read-modify-write of the
// per-Bolt forked state file under the SAME audit-lock bucket as the only other
// writer of that file (issue #2624).
//
// THE DEFECT. setMergeHeld read the forked state file, edited the Merge-Held
// field and wrote it back with no lock at all, so a concurrent writer of the
// same file could have its edit clobbered (lost update). Its sibling
// handleSetAutonomy wraps its state read-modify-write in withAuditLock; every
// read-modify-write handler in amadeus-state.ts does the same.
//
// THE BUCKET. The lock identity matters as much as the lock. The only other
// writer of a GIVEN forked state file is the fork transaction in
// amadeus-state.ts (`writeStateFile(wtPath, wtContent, wtRecord, space)`),
// whose wrapping lock is keyed on the RESOLVED main-record intent + space —
// `withAuditLock(pd, ..., resolvedIntent, space)` with
// `resolvedIntent = activeIntent(pd, space, intent) ?? undefined` — NOT the
// workspace sentinel. Taking the sentinel here would serialise against nothing
// that writes this file (and would re-introduce the P3 shared-lock cliff by
// blocking unrelated intents).
//
// No order inversion is possible in the chosen direction: the only callers of
// setMergeHeld are the two top-level CLI handlers, and neither they nor
// amadeus-swarm's finalize (which spawns `release-merge` as a subprocess) hold
// any audit lock when they call in — so this lock is always the outermost one.
//
// THE CONTRACT this pins:
//   - a foreign process holding the OWNER-INTENT bucket blocks hold-merge and
//     release-merge: each exhausts its acquire budget and leaves the forked
//     state file byte-identical. (Before the fix they ignored the lock and
//     wrote straight through.)
//   - a foreign process holding the WORKSPACE sentinel does NOT block them.
//     This is the order-inversion regression pin: moving the wrap to the
//     sentinel bucket turns this case into a ~5s acquire failure.
//   - the lock is released on the happy path.
//
// Mechanism: in-process for the handlers under test (the acquire path and the
// forked-state write are both reachable without a spawn), with the fixture's
// fork chain spawned exactly as t82 does. A "foreign holder" is a lock dir
// planted on disk with an owner stamp naming a LIVE pid, which is precisely
// what acquireAuditLock's reaper refuses to steal — the same shape t161 and
// t505 use.

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolate this run's audit-lock dirs (#831) BEFORE anything resolves one: the
// planted "foreign holder" dirs below must never alias a concurrent run's real
// lock in the shared tmpdir. Set before the tool import so every spawned child
// inherits it too.
const LOCK_BASE_DIR = mkdtempSync(join(tmpdir(), "amadeus-t506-locks-"));
process.env.AMADEUS_LOCK_BASE_DIR = LOCK_BASE_DIR;

import { handleBoltCommand } from "../../packages/framework/core/tools/amadeus-bolt.ts";
import {
  auditLockDir,
  AuditLockAcquireError,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedAuditFile,
  seedStateFile,
} from "../harness/fixtures.ts";

resetAidlcEnv();

const BUN = process.execPath;
const BOLT_TOOL = join(AMADEUS_SRC, "tools", "amadeus-bolt.ts");
const STATE_FIXTURE = join(FIXTURES_DIR, "state-construction.md");

// The default acquire budget is 50 x 100ms, so a blocked handler takes ~5s.
const BLOCKED_ACQUIRE_TIMEOUT_MS = 30_000;

const projects: string[] = [];

function cleanLocks(): void {
  for (const name of readdirSync(LOCK_BASE_DIR)) {
    if (!name.includes(".amadeus-audit-")) continue;
    try {
      rmSync(join(LOCK_BASE_DIR, name), { recursive: true, force: true });
    } catch {
      // A best-effort sweep: a dir already gone is the state we wanted.
    }
  }
}

// Plant a lock dir owned by a LIVE process. acquireAuditLock reaps only DEAD or
// long-unstamped holders, so a stamp naming this very process is an
// unreclaimable holder for the whole acquire budget.
function plantLiveForeignLock(lockDir: string): void {
  mkdirSync(lockDir, { recursive: true });
  writeFileSync(
    join(lockDir, "owner.json"),
    JSON.stringify({ pid: process.pid, startedAtMs: 1 }),
    "utf-8",
  );
}

/** The per-Bolt forked state file hold-merge writes the Merge-Held marker into. */
function forkedState(proj: string, slug: string): string {
  return join(
    proj,
    ".amadeus",
    "worktrees",
    `bolt-${slug}`,
    "amadeus",
    "spaces",
    DEFAULT_SPACE,
    "intents",
    DEFAULT_RECORD_DIR,
    "amadeus-state.md",
  );
}

/**
 * A construction-state project with a forked Bolt at `slug`. `start --worktree`
 * fans out to state-fork / audit-fork / fragment-fork, materialising the forked
 * state file — the same setup t82 uses, spawned for the same reason.
 */
function setupForkedProject(slug: string): string {
  const proj = createTestProject();
  projects.push(proj);
  seedStateFile(proj, STATE_FIXTURE);
  seedAuditFile(proj);
  mkdirSync(join(proj, ".amadeus", "worktrees", `bolt-${slug}`), { recursive: true });
  const r = spawnSync(
    BUN,
    [BOLT_TOOL, "start", "--name", `Bolt${slug}`, "--batch", "1", "--worktree", "--slug", slug, "--project-dir", proj],
    { encoding: "utf-8" },
  );
  expect(r.status).toBe(0);
  expect(existsSync(forkedState(proj, slug))).toBe(true);
  // The fork chain takes locks of its own; start each test from a clean slate.
  cleanLocks();
  return proj;
}

/** The bucket the fork transaction locks: the resolved main record + space. */
function ownerIntentLockDir(proj: string): string {
  return auditLockDir(proj, DEFAULT_RECORD_DIR, DEFAULT_SPACE);
}

/** The workspace sentinel bucket (intent omitted). */
function workspaceLockDir(proj: string): string {
  return auditLockDir(proj);
}

beforeEach(cleanLocks);
afterEach(cleanLocks);

afterAll(() => {
  for (const p of projects) cleanupTestProject(p);
  delete process.env.AMADEUS_LOCK_BASE_DIR;
  try {
    rmSync(LOCK_BASE_DIR, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

describe("t506 hold-merge/release-merge take the owner-intent audit-lock bucket (#2624)", () => {
  test(
    "a foreign holder of the owner-intent bucket blocks the hold-merge write",
    () => {
      const proj = setupForkedProject("hmlock1");
      const before = readFileSync(forkedState(proj, "hmlock1"), "utf-8");
      plantLiveForeignLock(ownerIntentLockDir(proj));

      expect(() => handleBoltCommand("hold-merge", ["--slug", "hmlock1"], proj)).toThrow(
        AuditLockAcquireError,
      );
      // A blocked acquire never enters the section, so the marker never lands.
      expect(readFileSync(forkedState(proj, "hmlock1"), "utf-8")).toBe(before);
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );

  test(
    "a foreign holder of the owner-intent bucket blocks the release-merge write",
    () => {
      const proj = setupForkedProject("hmlock2");
      handleBoltCommand("hold-merge", ["--slug", "hmlock2"], proj);
      const held = readFileSync(forkedState(proj, "hmlock2"), "utf-8");
      expect(held.split("\n")).toContain("- **Merge-Held**: true");
      plantLiveForeignLock(ownerIntentLockDir(proj));

      expect(() => handleBoltCommand("release-merge", ["--slug", "hmlock2"], proj)).toThrow(
        AuditLockAcquireError,
      );
      // Still held: the release never reached the write.
      expect(readFileSync(forkedState(proj, "hmlock2"), "utf-8")).toBe(held);
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );

  // The regression pin. It passes trivially today (setMergeHeld never touches
  // the workspace bucket) and its whole job is to fail LOUDLY if the wrap is
  // ever moved there: the budget is generous enough that the failure surfaces
  // as an AuditLockAcquireError, not as a bare timeout.
  test(
    "a foreign holder of the workspace bucket does NOT block hold-merge",
    () => {
      const proj = setupForkedProject("hmlock3");
      plantLiveForeignLock(workspaceLockDir(proj));

      handleBoltCommand("hold-merge", ["--slug", "hmlock3"], proj);
      expect(readFileSync(forkedState(proj, "hmlock3"), "utf-8").split("\n")).toContain(
        "- **Merge-Held**: true",
      );

      handleBoltCommand("release-merge", ["--slug", "hmlock3"], proj);
      expect(readFileSync(forkedState(proj, "hmlock3"), "utf-8").split("\n")).toContain(
        "- **Merge-Held**: false",
      );
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );

  // The lock must be RELEASED on the happy path (the withAuditLock finally), or
  // it poisons the next operation for the full retry budget.
  test(
    "hold-merge and release-merge release the owner-intent lock on success",
    () => {
      const proj = setupForkedProject("hmlock4");
      handleBoltCommand("hold-merge", ["--slug", "hmlock4"], proj);
      expect(existsSync(ownerIntentLockDir(proj))).toBe(false);
      handleBoltCommand("release-merge", ["--slug", "hmlock4"], proj);
      expect(existsSync(ownerIntentLockDir(proj))).toBe(false);
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );
});
