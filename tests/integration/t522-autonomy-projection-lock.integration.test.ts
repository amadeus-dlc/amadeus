// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts
// size: medium
//
// t522 — the autonomy state projection write must run its read-modify-write of
// the Intent's amadeus-state.md under the same audit-lock bucket as every other
// writer of that file (issue #2730).
//
// THE DEFECT. writeAutonomyStateProjection read the state file, edited three
// fields (`Intent Autonomy Mode`, `Intent Grant`, `Construction Autonomy Mode`)
// and wrote the whole file back with no lock at all. Of its three entrances
// only ONE was covered: `amadeus-bolt set-autonomy` happens to wrap its call in
// withAuditLock, while the `--autonomy` launch flag (amadeus-orchestrate) and
// the intent-birth declaration (amadeus-utility, deliberately outside birth's
// own lock) reached the section bare. A concurrent state writer in that window
// loses its edit, or has its own write clobbered by this whole-file write.
//
// THE BUCKET is the WORKSPACE SENTINEL, not the owner-intent bucket. This
// section writes the MAIN record's state file resolved through the active
// cursor (`readStateFile(projectDir)` / `writeStateFile(projectDir, ...)` with
// no selector), and the other writers of that same file — `amadeus-state.ts`'s
// set / checkbox / mirror-boundary handlers with no `--intent` selector — all
// take `withAuditLock(pd)`, the sentinel. handleSetAutonomy takes the sentinel
// too, so its wrap re-enters this one (withAuditLock is reentrant per key
// within a process) instead of deadlocking.
//
// No order inversion: the autonomy TRANSACTION takes an owner-intent bucket of
// its own inside the repository, and it has been released by the time the
// projection write runs — so the only nesting that ever occurs is
// sentinel-outer → intent-inner (handleSetAutonomy's order), never the reverse.
//
// THE CONTRACT this pins:
//   - a foreign process holding the WORKSPACE sentinel blocks the projection
//     write: the acquire budget is exhausted, the call reports the failure, and
//     the state file is left byte-identical. (Before the fix the write ignored
//     the lock and went straight through.)
//   - the same holds for the idempotent re-declaration entrance, the second
//     call site of the same section.
//   - a foreign holder of an UNRELATED bucket does NOT block it — the negative
//     control that keeps this from passing by locking everything.
//   - the lock is released on the happy path.
//
// Mechanism: in-process — applyProductionAutonomyMode is the seam all three
// entrances funnel through, and both the acquire path and the state write are
// reachable without a spawn. A "foreign holder" is a lock dir planted on disk
// with an owner stamp naming a LIVE pid, which is precisely what
// acquireAuditLock's reaper refuses to steal (the shape t161, t505 and t506
// use).

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolate this run's audit-lock dirs (#831) BEFORE anything resolves one: the
// planted "foreign holder" dirs below must never alias a concurrent run's real
// lock in the shared tmpdir. Set before the tool import so every spawned child
// inherits it too.
const LOCK_BASE_DIR = mkdtempSync(join(tmpdir(), "amadeus-t522-locks-"));
process.env.AMADEUS_LOCK_BASE_DIR = LOCK_BASE_DIR;

import { auditLockDir } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { applyProductionAutonomyMode } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const BUN = process.execPath;

// The default acquire budget is 50 x 100ms, so a blocked section takes ~5s.
const BLOCKED_ACQUIRE_TIMEOUT_MS = 30_000;

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

function recordDir(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  const active = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return join(intents, active);
}

function statePath(projectDir: string): string {
  return join(recordDir(projectDir), "amadeus-state.md");
}

function state(projectDir: string): string {
  return readFileSync(statePath(projectDir), "utf8");
}

/** A HUMAN_TURN the declaration's provenance resolver can consume. */
function appendHumanTurn(projectDir: string): void {
  const auditDir = join(recordDir(projectDir), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "projection-lock-test.jsonl");
  const seq = existsSync(path)
    ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1
    : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "projection-lock-test",
    intentId: "projection-lock-test",
    timestamp: new Date().toISOString(),
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  })}\n`);
}

function bornProject(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const result = spawnSync(
    BUN,
    [
      join(projectDir, ".claude", "tools", "amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "feature",
      "--project-dir",
      projectDir,
    ],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  if ((result.status ?? -1) !== 0) {
    // Carry the child's stderr into the failure: a bare status assertion drops
    // the one thing that says why birth gave up.
    throw new Error(`intent-birth failed (${result.status}): ${result.stderr ?? ""}`);
  }
  // Birth takes locks of its own; start each test from a clean slate.
  cleanLocks();
  return projectDir;
}

function declareSemi(projectDir: string): ReturnType<typeof applyProductionAutonomyMode> {
  return applyProductionAutonomyMode({
    projectDir,
    stateContent: state(projectDir),
    mode: "semi",
  });
}

/** The workspace sentinel bucket (intent omitted) — the one this section takes. */
function workspaceLockDir(projectDir: string): string {
  return auditLockDir(projectDir);
}

/** A bucket nothing in this section touches — the negative control. */
function unrelatedLockDir(projectDir: string): string {
  return auditLockDir(projectDir, "260101-some-other-record-deadbeef", "default");
}

let projectDir = "";

beforeEach(cleanLocks);

afterEach(() => {
  cleanLocks();
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

afterAll(() => {
  delete process.env.AMADEUS_LOCK_BASE_DIR;
  try {
    rmSync(LOCK_BASE_DIR, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

describe("t522 the autonomy state projection takes the workspace audit-lock bucket (#2730)", () => {
  test(
    "a foreign holder of the workspace bucket blocks the projection write",
    () => {
      projectDir = bornProject();
      appendHumanTurn(projectDir);
      const before = state(projectDir);
      plantLiveForeignLock(workspaceLockDir(projectDir));

      const applied = declareSemi(projectDir);

      expect(applied.ok).toBe(false);
      if (applied.ok) return;
      expect(applied.error).toContain("Failed to acquire audit lock");
      // A blocked acquire never enters the section, so no field lands.
      expect(state(projectDir)).toBe(before);
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );

  test(
    "a foreign holder of the workspace bucket blocks the idempotent re-declaration write",
    () => {
      projectDir = bornProject();
      appendHumanTurn(projectDir);
      const first = declareSemi(projectDir);
      expect(first).toMatchObject({ ok: true });
      // Repair the projection out from under the record so the re-declaration
      // has something to converge — the second entrance writes the same fields
      // through the same section without committing a new transaction.
      writeFileSync(
        statePath(projectDir),
        state(projectDir).replace("- **Intent Autonomy Mode**: semi", "- **Intent Autonomy Mode**: none"),
        "utf-8",
      );
      const drifted = state(projectDir);
      expect(drifted.split("\n")).toContain("- **Intent Autonomy Mode**: none");
      cleanLocks();
      plantLiveForeignLock(workspaceLockDir(projectDir));

      const again = declareSemi(projectDir);

      expect(again.ok).toBe(false);
      if (again.ok) return;
      expect(again.error).toContain("Failed to acquire audit lock");
      expect(state(projectDir)).toBe(drifted);
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );

  // The negative control. A wrap that locked "everything" would block here too;
  // this keeps the pin honest about WHICH bucket the section takes.
  test(
    "a foreign holder of an unrelated bucket does NOT block the projection write",
    () => {
      projectDir = bornProject();
      appendHumanTurn(projectDir);
      plantLiveForeignLock(unrelatedLockDir(projectDir));

      expect(declareSemi(projectDir)).toMatchObject({ ok: true, projection: { mode: "semi" } });
      expect(state(projectDir).split("\n")).toContain("- **Intent Autonomy Mode**: semi");
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );

  // The lock must be RELEASED on the happy path (the withAuditLock finally), or
  // it poisons the next operation for the full retry budget.
  test(
    "the projection write releases the workspace lock on success",
    () => {
      projectDir = bornProject();
      appendHumanTurn(projectDir);

      expect(declareSemi(projectDir)).toMatchObject({ ok: true });
      expect(existsSync(workspaceLockDir(projectDir))).toBe(false);
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );
});
