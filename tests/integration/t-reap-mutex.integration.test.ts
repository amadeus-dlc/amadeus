// covers: function:acquireAuditLock, function:withAuditLock
//
// t-reap-mutex — the reap MUTEX contract introduced for issue #1344.
//
// WHY: reapStaleLock's decide→rename sequence used to run unserialised, so a
// reaper could judge staleness on a long-stale read, rob a competitor's FRESH
// re-acquired lock, and — when its restore rename failed against a third
// process's mkdir — silently destroy the robbed holder's stamp (two concurrent
// holders; deterministically reproduced in #1344). The fix serialises reapers
// on a sibling mkdir mutex (`<lockDir>.reap`) and moves the staleness read
// inside it. These tests pin the mutex's observable contract:
//
//   1. a HELD (fresh) mutex refuses the steal — the falling discriminator: on
//      the pre-#1344 reaper a stray `<lockDir>.reap` dir is meaningless and the
//      stale lock is reaped anyway (measured red pre-fix, green post-fix);
//   2. a STALE mutex (holder died mid-reap) is recovered by age and the steal
//      proceeds;
//   3. the mutex is released after a successful steal;
//   4. the mutex is released after a refusal (fresh live holder).
//
// SOURCE UNDER TEST (dist/claude/.claude/tools/amadeus-lib.ts):
//   acquireReapMutex / reapStaleLock / acquireAuditLock.
//
// FIXTURE DISCIPLINE: per-test temp project dir, rm-rf'd in afterEach; the lock
// dir lives under auditLockDir(proj). Nothing under tests/fixtures/**.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireAuditLock, auditLockDir, releaseAuditLock } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const INTENT = "auth-aaaaaaaa";
const SPACE = "default";

let proj: string;
let lockDir: string;
let mutexDir: string;
const savedEnv: Record<string, string | undefined> = {};

function seedStaleLock(): void {
  rmSync(lockDir, { recursive: true, force: true });
  mkdirSync(lockDir, { recursive: true });
  writeFileSync(join(lockDir, "owner.json"), JSON.stringify({ pid: 2_000_000_000, startedAtMs: 0 }), "utf-8");
}

beforeEach(() => {
  proj = mkdtempSync(join(tmpdir(), "amadeus-reap-mutex-"));
  lockDir = auditLockDir(proj, INTENT, SPACE);
  mutexDir = `${lockDir}.reap`;
  for (const key of ["AMADEUS_LOCK_STALE_MS", "AMADEUS_LOCK_UNSTAMPED_GRACE_MS", "AMADEUS_REAP_MUTEX_STALE_MS"]) savedEnv[key] = process.env[key];
  process.env.AMADEUS_LOCK_STALE_MS = "600000";
  process.env.AMADEUS_LOCK_UNSTAMPED_GRACE_MS = "10000";
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(mutexDir, { recursive: true, force: true });
  rmSync(lockDir, { recursive: true, force: true });
  rmSync(proj, { recursive: true, force: true });
});

describe("reap mutex — reapers are serialised and never rob through a vacancy (#1344)", () => {
  test("a held (fresh) reap mutex refuses the steal of a provably-dead lock", () => {
    seedStaleLock();
    mkdirSync(mutexDir); // a concurrent reaper is mid-steal
    // 0 retries: a single honest "could THIS attempt reclaim" probe.
    expect(acquireAuditLock(proj, 0, 1, INTENT, SPACE)).toBe(false);
    // the dead lock was NOT robbed while the mutex was held
    expect(existsSync(lockDir)).toBe(true);
  });

  test("a stale reap mutex (holder died mid-reap) is recovered and the steal proceeds", () => {
    seedStaleLock();
    mkdirSync(mutexDir);
    const past = (Date.now() - 60_000) / 1000; // utimes takes seconds
    utimesSync(mutexDir, past, past);
    expect(acquireAuditLock(proj, 0, 1, INTENT, SPACE)).toBe(true);
    // the winner's own mutex is released again after the steal
    expect(existsSync(mutexDir)).toBe(false);
    releaseAuditLock(proj, INTENT, SPACE);
  });

  test("the reap mutex is released after a successful steal", () => {
    seedStaleLock();
    expect(acquireAuditLock(proj, 0, 1, INTENT, SPACE)).toBe(true);
    expect(existsSync(mutexDir)).toBe(false);
    releaseAuditLock(proj, INTENT, SPACE);
  });

  test("the reap mutex is released after refusing a fresh live holder", () => {
    rmSync(lockDir, { recursive: true, force: true });
    mkdirSync(lockDir, { recursive: true });
    // a LIVE (this process), under-age holder — the reaper must refuse it
    writeFileSync(join(lockDir, "owner.json"), JSON.stringify({ pid: process.pid, startedAtMs: Date.now() }), "utf-8");
    expect(acquireAuditLock(proj, 0, 1, INTENT, SPACE)).toBe(false);
    expect(existsSync(mutexDir)).toBe(false);
    expect(existsSync(lockDir)).toBe(true);
  });
});
