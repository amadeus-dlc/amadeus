// covers: function:acquireAuditLock, function:releaseAuditLock, function:detectLeakedLocks
//
// t427 — the audit lock never steals from a LIVE owner (issue #1906).
//
// WHY: the mkdir-based audit lock used to reclaim a lock whose owner process is
// still alive as soon as the owner's stamp aged past AMADEUS_LOCK_STALE_MS. The
// same lock guards both the audit-journal append and the state transition, so a
// steal put two processes inside the same critical section and both the state
// increment and the audit rows were lost with every process exiting 0. The
// post-CAS `stampMatches` verify could not catch it: a live holder never
// re-stamps, so the judged stamp always matched. The only precondition was
// "critical section outlives lockStaleMs()".
//
// The fix makes `dead-owner-only` universal on the ACQUIRE path: a live owner is
// never reclaimed at any age, and an acquire whose owner stamp cannot be written
// fails closed instead of entering the section unstamped.
//
// Recovery paths that must SURVIVE the fix are pinned here too, so the deletion
// cannot silently take them with it:
//   - a wedged LIVE over-age holder is still reported (and cleared on request)
//     by detectLeakedLocks — the `/amadeus --doctor` probe;
//   - a DEAD owner is still reaped automatically, so a crashed holder does not
//     wedge every waiter.
//
// SOURCE UNDER TEST (dist/claude/.claude/tools/amadeus-lib.ts):
//   acquireAuditLock / reapStaleLock / finalizeAuditLockAcquire / detectLeakedLocks.
//
// LAYER: integration — real filesystem lock dirs and a real child process.
//
// FIXTURE DISCIPLINE: per-test temp project dir plus a per-run private lock base
// dir (AMADEUS_LOCK_BASE_DIR), both rm-rf'd in afterEach/afterAll. Nothing under
// tests/fixtures/**.

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireAuditLock,
  auditLockDir,
  detectLeakedLocks,
  releaseAuditLock,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const INTENT = "auth-aaaaaaaa";
const SPACE = "default";
const DEAD_PID = 2_000_000_000;

// Private lock base dir for this run so a concurrent lock test on the same
// machine can never see (or sweep) our lock dirs.
const LOCK_BASE_DIR = mkdtempSync(join(tmpdir(), "amadeus-t427-locks-"));
process.env.AMADEUS_LOCK_BASE_DIR = LOCK_BASE_DIR;

let proj: string;
let lockDir: string;
const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["AMADEUS_LOCK_STALE_MS", "AMADEUS_LOCK_UNSTAMPED_GRACE_MS"];

// The lib measures startedAtMs as performance.timeOrigin + performance.now();
// mirror it so an "ageMs in the past" stamp is honoured by the same clock family.
function nowMs(): number {
  return Math.floor(performance.timeOrigin + performance.now());
}

function stampOwner(pid: number, ageMs: number): void {
  mkdirSync(lockDir, { recursive: true });
  writeFileSync(
    join(lockDir, "owner.json"),
    JSON.stringify({ pid, startedAtMs: nowMs() - ageMs }),
    "utf-8",
  );
}

function readStamp(): { pid: number; startedAtMs: number } {
  return JSON.parse(readFileSync(join(lockDir, "owner.json"), "utf-8"));
}

beforeEach(() => {
  proj = mkdtempSync(join(tmpdir(), "amadeus-t427-"));
  lockDir = auditLockDir(proj, INTENT, SPACE);
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.AMADEUS_LOCK_UNSTAMPED_GRACE_MS = "10000";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  if (existsSync(lockDir)) chmodSync(lockDir, 0o700);
  rmSync(lockDir, { recursive: true, force: true });
  rmSync(`${lockDir}.reap`, { recursive: true, force: true });
  rmSync(proj, { recursive: true, force: true });
});

afterAll(() => {
  rmSync(LOCK_BASE_DIR, { recursive: true, force: true });
});

describe("t427 — audit lock never steals from a live owner", () => {
  // FR-1. The falling discriminator for the whole issue: pre-fix the acquire
  // returns true (the steal) and the holder's stamp is replaced by ours.
  test("FR-1: a LIVE over-age holder is never reclaimed, at any staleness threshold", () => {
    process.env.AMADEUS_LOCK_STALE_MS = "1"; // every stamp is instantly over-age
    stampOwner(process.pid, 60_000); // owner is THIS process → provably alive
    expect(acquireAuditLock(proj, 0, 1, INTENT, SPACE)).toBe(false);
    // The live holder's own stamp is still in place — nothing was robbed.
    expect(existsSync(lockDir)).toBe(true);
    expect(readStamp().pid).toBe(process.pid);
  });

  // FR-2. Pre-fix the default acquire reported success even when its owner stamp
  // could not be written, entering the critical section UNSTAMPED — invisible to
  // every liveness check, so a waiter walked straight in behind it.
  //
  // INJECTION: a umask that strips every write bit, so the lock dir acquire
  // mkdirs is unwritable and writeOwnerStamp's writeFileSync fails. This is
  // permission-based, so it behaves identically on macOS and Linux (unlike
  // readFileSync-on-a-directory, which is EISDIR on macOS and an empty read on
  // Linux).
  test("FR-2: an acquire whose owner stamp cannot be written fails CLOSED", () => {
    process.env.AMADEUS_LOCK_STALE_MS = "600000";
    const previousUmask = process.umask(0o666);
    try {
      expect(acquireAuditLock(proj, 0, 1, INTENT, SPACE)).toBe(false);
      // The failed acquire leaves no dir behind, so the next acquire is not
      // wedged by our own debris.
      expect(existsSync(lockDir)).toBe(false);
    } finally {
      process.umask(previousUmask);
    }
  });

  // FR-3a. REGRESSION PIN for the recovery path that must SURVIVE the deletion.
  // Retiring the acquire-side over-age steal removes the only automatic way out
  // of a wedged LIVE holder, so the operator probe is now load-bearing: it must
  // still classify a live over-age holder as "over-age" and still clear it on
  // request. If the deletion had over-reached into detectLeakedLocks, this goes
  // red (measured: deleting the probe's over-age arm turns it red — see below).
  test("FR-3a: a wedged LIVE over-age holder is still reported and cleared by the doctor probe", () => {
    process.env.AMADEUS_LOCK_STALE_MS = "1";
    // The probe enumerates real intent RECORD dirs (a dir holding an
    // amadeus-state.md), so the bucket must exist on disk to be walked.
    const record = join(proj, "amadeus", "spaces", SPACE, "intents", INTENT);
    mkdirSync(record, { recursive: true });
    writeFileSync(join(record, "amadeus-state.md"), "# state\n", "utf-8");
    stampOwner(process.pid, 60_000); // alive, far over-age → wedged holder

    const found = detectLeakedLocks(proj).filter((l) => l.lockDir === lockDir);
    expect(found.length).toBe(1);
    expect(found[0].reason).toBe("over-age");
    expect(found[0].ownerPid).toBe(process.pid);
    // Pure-read: reporting alone must not remove anything.
    expect(existsSync(lockDir)).toBe(true);

    const cleared = detectLeakedLocks(proj, true).filter((l) => l.lockDir === lockDir);
    expect(cleared.length).toBe(1);
    expect(existsSync(lockDir)).toBe(false);
  });

  // FR-3b. REGRESSION PIN: a crashed holder must NOT wedge every waiter. The
  // child acquires the lock and is SIGKILLed, so no exit handler runs and the
  // stamp survives with a now-dead PID — exactly the crash shape the dead-owner
  // reap exists for. A deletion that took the whole reaper with it goes red here.
  test("FR-3b: a crashed holder's lock is still reaped, so the next waiter gets in", async () => {
    process.env.AMADEUS_LOCK_STALE_MS = "600000"; // age can play no part
    const libPath = join(
      import.meta.dir,
      "..",
      "..",
      "dist",
      "claude",
      ".claude",
      "tools",
      "amadeus-lib.ts",
    );
    const driver = join(proj, "hold-then-die.ts");
    writeFileSync(
      driver,
      [
        `import { acquireAuditLock } from ${JSON.stringify(libPath)};`,
        `const won = acquireAuditLock(${JSON.stringify(proj)}, 0, 1, ${JSON.stringify(INTENT)}, ${JSON.stringify(SPACE)});`,
        `process.stdout.write(won ? "WON" : "LOST");`,
        // SIGKILL self: no exit handler, no release — the stamp outlives us.
        `process.kill(process.pid, "SIGKILL");`,
      ].join("\n"),
      "utf-8",
    );

    const child = Bun.spawn({
      cmd: [process.execPath, driver],
      stdout: "pipe",
      stderr: "ignore",
      env: { ...process.env },
    });
    await child.exited;
    expect(await new Response(child.stdout).text()).toBe("WON");

    // The dead holder's lock dir and stamp are still on disk...
    expect(existsSync(lockDir)).toBe(true);
    expect(readStamp().pid).not.toBe(process.pid);
    // ...and the next waiter reclaims it on liveness, not on age.
    expect(acquireAuditLock(proj, 0, 1, INTENT, SPACE)).toBe(true);
    releaseAuditLock(proj, INTENT, SPACE);
  }, 30000);
});
