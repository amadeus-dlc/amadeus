// covers: function:auditLockDir, function:acquireAuditLock, function:releaseAuditLock, function:withAuditLock, function:holdsAuditLock
//
// t161 — P3 per-intent lock keying + stale-lock reaper. Mechanism: in-process
// for the keying invariants + the reaper liveness logic (deterministic, no LLM,
// no process boundary); t145 covers the cross-process state-lock race separately.
//
// The audit lock is now keyed PER INTENT (composite projectDir+space+intent), so
// two intents lock independently; an intent-OMITTED call hashes a RESERVED
// __workspace__ sentinel bucket distinct from every per-intent bucket (P4's
// auto-birth + every intents.json write depend on this). The reaper stamps owner
// PID+start-time on acquire and reclaims a provably-dead (ESRCH) or over-age lock
// — a live, under-threshold holder is NEVER robbed.
//
// SOURCE UNDER TEST (dist/claude/.claude/tools/amadeus-lib.ts):
//   auditLockDir(pd, intent?, space?) / auditLockIdentity — per-intent + sentinel.
//   acquireAuditLock(pd, retries, ms, intent?, space?) — stamps owner.json, reaps.
//   releaseAuditLock / withAuditLock — composite-keyed depth + exit handlers.
//   WORKSPACE_LOCK_SENTINEL / DEFAULT_LOCK_STALE_MS (AMADEUS_LOCK_STALE_MS env).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  acquireAuditLock,
  auditLockDir,
  auditLockIdentity,
  detectLeakedLocks,
  holdsAuditLock,
  releaseAuditLock,
  WORKSPACE_LOCK_SENTINEL,
  withAuditLock,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const PD = "/tmp/amadeus-t161-project";

// Clean any lock dirs this test family might leave under tmpdir() between cases.
function cleanLocks(): void {
  for (const f of readdirSync(tmpdir())) {
    if (f.startsWith(".amadeus-audit-") || f.includes(".amadeus-audit-")) {
      try { rmSync(join(tmpdir(), f), { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

beforeEach(cleanLocks);
afterEach(cleanLocks);

describe("t161 keying invariants", () => {
  test("intent-omitted hashes the __workspace__ sentinel, NOT a per-intent bucket", () => {
    const ws = auditLockIdentity(PD);
    expect(ws).toContain(WORKSPACE_LOCK_SENTINEL);
    const perIntent = auditLockIdentity(PD, "auth-aaaaaaaa", "default");
    expect(perIntent).not.toBe(ws);
    expect(perIntent).not.toContain(WORKSPACE_LOCK_SENTINEL);
  });

  test("two different intents key different lock dirs; same intent keys the same", () => {
    const a = auditLockDir(PD, "auth-aaaaaaaa", "default");
    const b = auditLockDir(PD, "export-bbbbbbbb", "default");
    const a2 = auditLockDir(PD, "auth-aaaaaaaa", "default");
    expect(a).not.toBe(b);
    expect(a).toBe(a2);
    // The workspace bucket is distinct from both per-intent buckets.
    const ws = auditLockDir(PD);
    expect(ws).not.toBe(a);
    expect(ws).not.toBe(b);
  });

  test("intent-omitted does NOT resolve activeIntent() (stable even with intents on disk)", () => {
    // auditLockIdentity for the omitted case is a pure sentinel — it must not
    // read the project's active-intent (at birth there is no active intent).
    // Calling it against a bogus pd that has no amadeus/ dir must not throw and must
    // return the sentinel bucket.
    expect(() => auditLockIdentity("/nonexistent/path/xyz")).not.toThrow();
    expect(auditLockIdentity("/nonexistent/path/xyz")).toContain(WORKSPACE_LOCK_SENTINEL);
  });
});

describe("t161 per-intent lock independence", () => {
  test("two intents can be held concurrently in-process without contention", () => {
    expect(acquireAuditLock(PD, 0, 1, "auth-aaaaaaaa", "default")).toBe(true);
    // A DIFFERENT intent acquires immediately (0 retries) — no shared lock.
    expect(acquireAuditLock(PD, 0, 1, "export-bbbbbbbb", "default")).toBe(true);
    releaseAuditLock(PD, "auth-aaaaaaaa", "default");
    releaseAuditLock(PD, "export-bbbbbbbb", "default");
  });

  test("the SAME intent's lock is mutually exclusive (0-retry second acquire fails)", () => {
    expect(acquireAuditLock(PD, 0, 1, "auth-aaaaaaaa", "default")).toBe(true);
    // Same intent, 0 retries: the dir exists, owner is alive (this process) +
    // fresh, so the reaper must NOT reclaim → acquire fails.
    expect(acquireAuditLock(PD, 0, 1, "auth-aaaaaaaa", "default")).toBe(false);
    releaseAuditLock(PD, "auth-aaaaaaaa", "default");
  });

  test("withAuditLock keys depth per-identity — two intents don't share a depth counter", () => {
    let innerRan = false;
    withAuditLock(PD, () => {
      expect(holdsAuditLock(PD, "auth-aaaaaaaa", "default")).toBe(false); // not held yet
      withAuditLock(PD, () => {
        innerRan = true;
        expect(holdsAuditLock(PD, "auth-aaaaaaaa", "default")).toBe(true);
        expect(holdsAuditLock(PD, "export-bbbbbbbb", "default")).toBe(false);
      }, "auth-aaaaaaaa", "default");
    });
    expect(innerRan).toBe(true);
    expect(holdsAuditLock(PD, "auth-aaaaaaaa", "default")).toBe(false); // released
  });
});

describe("t161 stale-lock reaper", () => {
  const INTENT = "auth-aaaaaaaa";

  function stampOwner(pid: number, ageMs: number): void {
    const lockDir = auditLockDir(PD, INTENT, "default");
    mkdirSync(lockDir, { recursive: true });
    // startedAtMs is measured by the lib via performance.timeOrigin+now(); a
    // stamp "ageMs in the past" is (now - ageMs). We approximate "now" the same
    // way the lib does so the age delta is honoured.
    const now = Math.floor(performance.timeOrigin + performance.now());
    writeFileSync(join(lockDir, "owner.json"), JSON.stringify({ pid, startedAtMs: now - ageMs }), "utf-8");
  }

  test("a PID-dead lock is reclaimed (ESRCH owner gone)", () => {
    // PID 1 exists; use a very-high unlikely-live PID to force ESRCH.
    const deadPid = 2_000_000_000;
    stampOwner(deadPid, 0); // fresh stamp, but the owner is gone
    // 0 retries: the reaper must reclaim on the FIRST EEXIST and re-mkdir.
    expect(acquireAuditLock(PD, 0, 1, INTENT, "default")).toBe(true);
    releaseAuditLock(PD, INTENT, "default");
  });

  test("a live-but-OVER-AGE lock is reclaimed", () => {
    // Owner = THIS process (alive), but the stamp is far older than the threshold.
    process.env.AMADEUS_LOCK_STALE_MS = "1000"; // 1s threshold
    try {
      stampOwner(process.pid, 60_000); // 60s old → over-age
      expect(acquireAuditLock(PD, 0, 1, INTENT, "default")).toBe(true);
      releaseAuditLock(PD, INTENT, "default");
    } finally {
      delete process.env.AMADEUS_LOCK_STALE_MS;
    }
  });

  test("a live, UNDER-AGE holder is NEVER robbed", () => {
    process.env.AMADEUS_LOCK_STALE_MS = "600000"; // 10min threshold
    try {
      stampOwner(process.pid, 0); // alive + fresh
      // 0 retries: the reaper must REFUSE to reclaim → acquire fails.
      expect(acquireAuditLock(PD, 0, 1, INTENT, "default")).toBe(false);
    } finally {
      // The lock dir is "held" by the fake stamp; clean it.
      rmSync(auditLockDir(PD, INTENT, "default"), { recursive: true, force: true });
      delete process.env.AMADEUS_LOCK_STALE_MS;
    }
  });

  test("concurrent reclaimers don't double-enter (only one wins the steal-rename)", () => {
    const deadPid = 2_000_000_000;
    stampOwner(deadPid, 0);
    const lockDir = auditLockDir(PD, INTENT, "default");
    // Two back-to-back 0-retry acquires: the first reaps + acquires; the second
    // now sees a LIVE (this process) fresh lock → must FAIL, never double-enter.
    const first = acquireAuditLock(PD, 0, 1, INTENT, "default");
    const second = acquireAuditLock(PD, 0, 1, INTENT, "default");
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(existsSync(lockDir)).toBe(true);
    releaseAuditLock(PD, INTENT, "default");
  });

  test("detectLeakedLocks finds + clears a dead-owner lock for a real project", () => {
    // Build a real per-intent layout on disk so detectLeakedLocks enumerates it.
    const realPd = join(tmpdir(), `amadeus-t161-detect-${process.pid}`);
    rmSync(realPd, { recursive: true, force: true });
    const recDir = join(realPd, "amadeus", "spaces", "default", "intents", "auth-deadbeef");
    mkdirSync(recDir, { recursive: true });
    writeFileSync(join(recDir, "amadeus-state.md"), "- **Current Stage**: x\n", "utf-8");
    writeFileSync(join(realPd, "amadeus", "active-space"), "default\n", "utf-8");
    // Stamp a DEAD-owner lock on that intent's bucket.
    const lockDir = auditLockDir(realPd, "auth-deadbeef", "default");
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(join(lockDir, "owner.json"), JSON.stringify({ pid: 2_000_000_000, startedAtMs: 0 }), "utf-8");
    try {
      // clear=false → pure read, lock survives.
      const found = detectLeakedLocks(realPd, false);
      expect(found.some((l) => l.bucket === "default/auth-deadbeef" && l.reason === "dead-owner")).toBe(true);
      expect(existsSync(lockDir)).toBe(true);
      // clear=true → the leaked lock is removed loudly.
      const cleared = detectLeakedLocks(realPd, true);
      expect(cleared.length).toBeGreaterThan(0);
      expect(existsSync(lockDir)).toBe(false);
    } finally {
      rmSync(realPd, { recursive: true, force: true });
    }
  });
});

// #831 — the release owner-stamp guard. auditLockDir keys on md5[:8] = 32 bits,
// so two distinct identities can share ONE tmpdir path. Before the guard,
// releaseAuditLock did an UNCONDITIONAL rmSync, so a colliding identity's
// release destroyed a live lock a different identity held at the same path
// (the t76 test-12 flake: a parallel merge's release freed a waiter that should
// have timed out). The guard removes the dir ONLY when it still carries our own
// owner stamp (pid + startedAtMs), symmetric to the reaper's "never rob a live
// holder" contract. These run in-process (the seam) so the new lines are covered.
describe("t161 release owner-stamp guard (#831)", () => {
  const INTENT = "guard-cccccccc";

  test("release REMOVES a lock we acquired (normal path, no regression)", () => {
    expect(acquireAuditLock(PD, 0, 1, INTENT, "default")).toBe(true);
    const lockDir = auditLockDir(PD, INTENT, "default");
    expect(existsSync(lockDir)).toBe(true);
    releaseAuditLock(PD, INTENT, "default");
    expect(existsSync(lockDir)).toBe(false);
  });

  test("release REFUSES to remove a lock re-stamped by a colliding identity", () => {
    // We acquire (records our owned stamp). A colliding identity then re-stamps
    // the shared path with ITS live owner (foreign pid) — modeled by overwriting
    // owner.json. Our release must NOT delete the foreign-held lock.
    expect(acquireAuditLock(PD, 0, 1, INTENT, "default")).toBe(true);
    const lockDir = auditLockDir(PD, INTENT, "default");
    const foreign = { pid: 999_999, startedAtMs: Math.floor(performance.timeOrigin + performance.now()) };
    writeFileSync(join(lockDir, "owner.json"), JSON.stringify(foreign), "utf-8");
    releaseAuditLock(PD, INTENT, "default");
    expect(existsSync(lockDir)).toBe(true); // survived — the flake is closed
    // Cleanup (test owns the fixture regardless of the guard).
    rmSync(lockDir, { recursive: true, force: true });
  });

  test("release of a bare (unstamped) dir we hold still cleans it up", () => {
    // Best-effort stamp write can fail; an unstamped dir at our own path is ours.
    const lockDir = auditLockDir(PD, INTENT, "default");
    mkdirSync(lockDir, { recursive: true }); // no owner.json
    releaseAuditLock(PD, INTENT, "default");
    expect(existsSync(lockDir)).toBe(false);
  });

  test("bare release (no in-process acquire) falls back to pid identity", () => {
    const lockDir = auditLockDir(PD, INTENT, "default");
    // Foreign pid, never acquired in this process → refuse.
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(join(lockDir, "owner.json"), JSON.stringify({ pid: 999_999, startedAtMs: 0 }), "utf-8");
    releaseAuditLock(PD, INTENT, "default");
    expect(existsSync(lockDir)).toBe(true);
    // Our own pid, never acquired → the live-pid fallback proves authorship → remove.
    writeFileSync(
      join(lockDir, "owner.json"),
      JSON.stringify({ pid: process.pid, startedAtMs: Math.floor(performance.timeOrigin + performance.now()) }),
      "utf-8",
    );
    releaseAuditLock(PD, INTENT, "default");
    expect(existsSync(lockDir)).toBe(false);
  });
});
