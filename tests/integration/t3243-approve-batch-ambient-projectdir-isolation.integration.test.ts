// covers: subcommand:amadeus-bolt:approve-batch, function:handleApproveBatch
//
// t3243 — handleApproveBatch's internal error-path must never fall back to
// an AMBIENT project dir when the caller passed an EXPLICIT one (#3243).
//
// Root cause: handleApproveBatch's internal error() calls (Missing --batch,
// Invalid --batch, a presence refusal, an audit-emission failure) omitted
// error()'s second (explicitProjectDir) argument, even though the handler had
// already resolved `pd` from its own explicitProjectDir parameter. A bare
// error(msg) instead falls back through resolveProjectDir(undefined), whose
// cwd-workspace-marker rung (findWorkspaceMarkerAncestor(process.cwd())) picks
// up WHATEVER OTHER amadeus workspace the process happens to be sitting
// inside of — completely independent of the explicit project dir the caller
// (a test fixture, or any embedder driving handleBoltCommand programmatically)
// actually passed.
//
// Once OTel bootstraps for that wrong (ambient) workspace via that stray
// error() call, the one-workspace-per-process invariant (packages/framework/
// core/otel/bootstrap.ts) refuses every later emit against the real, explicit
// one for the rest of the process — this is the exact mechanism behind
// #3243's "OTel logs already bootstrapped ... refusing to re-bootstrap"
// failure in t-approve-batch-presence-guard.integration.test.ts when a real
// active-intent cursor happens to be present, and the reason an
// error()-triggered ERROR_LOGGED row can land in a REAL Intent's audit shard
// instead of the caller's own (#3032's residual).
//
// This test reproduces the defect DETERMINISTICALLY, without depending on any
// real active-intent cursor (a clean CI checkout never has one — which is
// exactly why #3243 was invisible to CI): it chdir()s into a second,
// throwaway fixture project that itself carries a workspace marker (the
// .claude/tools + amadeus/ shape hasWorkspaceMarker checks for), simulating
// "the process happens to be running inside a real amadeus workspace" the
// same way a developer's own checkout does.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LOCK_BASE_DIR = mkdtempSync(join(tmpdir(), "amadeus-t3243-locks-"));
process.env.AMADEUS_LOCK_BASE_DIR = LOCK_BASE_DIR;

// Same off-switch clearance as t-approve-batch-presence-guard: this file
// exercises REAL presence enforcement, so the suite-wide bypass must not hide
// the refusal path under test.
delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;

import { handleBoltCommand } from "../../packages/framework/core/tools/amadeus-bolt.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedAuditFile,
  seededAuditDir,
  seedStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

resetAidlcEnv();

const STATE_FIXTURE = join(FIXTURES_DIR, "state-construction.md");

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

// t214/t507 precedent: trap process.exit + console output so an in-process
// CLI error path (error() exits the process) does not tear down the runner.
function boltCapture(subcommand: string, args: string[], p: string): { rc: number; out: string } {
  let out = "";
  const origExit = process.exit.bind(process);
  const origLog = console.log;
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = (...a: unknown[]) => {
    out += `${a.map(String).join(" ")}\n`;
  };
  console.error = (...a: unknown[]) => {
    out += `${a.map(String).join(" ")}\n`;
  };
  let rc = 0;
  try {
    handleBoltCommand(subcommand, args, p);
  } catch (e) {
    if (e instanceof ExitSignal) rc = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    console.log = origLog;
    console.error = origErr;
  }
  return { rc, out };
}

/** Byte snapshot of every .jsonl shard in a record's audit dir. */
function shardFiles(dir: string): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    snapshot[name] = readFileSync(join(dir, name), "utf-8");
  }
  return snapshot;
}

describe("t3243: handleApproveBatch must not bootstrap OTel against an ambient project dir", () => {
  let ambient: string;
  let fixture: string;
  let originalCwd: string;

  beforeEach(() => {
    resetOtelPerProject();
    // A throwaway "ambient" workspace the process's cwd will sit inside of —
    // NOT the workspace under test. It carries no HUMAN_TURN either; if the
    // defect makes handleApproveBatch resolve against IT instead of `fixture`,
    // that would also manifest as a (differently-worded) refusal, so the
    // decisive assertion below is which project's audit shard changed, not
    // just whether the call refused.
    ambient = createTestProject();
    seedStateFile(ambient, STATE_FIXTURE);
    seedAuditFile(ambient);

    // The EXPLICIT project dir under test — analogous to any caller (a test
    // fixture, or a real embedder) passing its own resolved project dir to
    // handleBoltCommand instead of relying on ambient resolution.
    fixture = createTestProject();
    seedStateFile(fixture, STATE_FIXTURE);
    seedAuditFile(fixture); // no HUMAN_TURN -> presence refusal

    originalCwd = process.cwd();
    process.chdir(ambient);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTestProject(ambient);
    cleanupTestProject(fixture);
  });

  afterEach(() => {
    delete process.env.AMADEUS_LOCK_BASE_DIR;
    try {
      rmSync(LOCK_BASE_DIR, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  test("a presence refusal against an explicit fixture dir refuses cleanly and never touches the ambient cwd workspace's audit shard", () => {
    const ambientBefore = shardFiles(seededAuditDir(ambient));

    const { rc, out } = boltCapture("approve-batch", ["--batch", "1"], fixture);

    expect(rc).not.toBe(0);
    expect(out.toLowerCase()).toMatch(/presence|human/);
    // The decisive check: the refusal must be attributed to the EXPLICIT
    // fixture dir the caller passed, never the ambient cwd workspace this
    // process happens to be sitting inside of. Before the fix, error()'s
    // fallback resolution wrote an ERROR_LOGGED row into `ambient`'s shard
    // (or, once OTel had bootstrapped there, refused the whole operation with
    // an unrelated "already bootstrapped" message instead of the presence
    // refusal asserted above).
    expect(shardFiles(seededAuditDir(ambient))).toEqual(ambientBefore);
  });
});
