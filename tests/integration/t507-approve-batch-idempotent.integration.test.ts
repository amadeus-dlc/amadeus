// covers: subcommand:amadeus-bolt:approve-batch
//
// t507 — approve-batch is idempotent: re-approving a batch already on the
// ledger is a no-op that emits NO second GATE_APPROVED and writes no state
// (issue #2589).
//
// WHY IN-PROCESS. t145 drives approve-batch through spawned CLI processes
// because what it pins is a two-process lock race — that shape needs real
// processes. The idempotent arm needs no concurrency at all: it is a plain
// second call against a ledger that already carries the batch. Driving it
// in-process through the exported handleBoltCommand seam (the t506 precedent)
// both keeps the assertion direct and puts the branch inside bun's coverage
// universe, which a spawned child is structurally outside of.
//
// WHY ONE PROJECT FOR THE WHOLE FILE. The audit emitter bootstraps OTel logs
// once per process and refuses to re-bootstrap for a second workspace ("one
// workspace per process"). An in-process driver therefore gets exactly one
// fixture project, so the arms below run in sequence against a shared ledger
// rather than each rebuilding its own.
//
// THE CONTRACT this pins:
//   - the first approve-batch lands the number and emits exactly one
//     GATE_APPROVED;
//   - a second approve-batch of the SAME number returns the idempotent
//     envelope ({already_approved: true, state_updated: false}) and leaves both
//     the state file byte-identical and the audit trail at ONE GATE_APPROVED —
//     a replayed command cannot inflate the ledger;
//   - a DIFFERENT batch number still appends normally afterwards, so the
//     idempotent early return is scoped to the replayed number and does not
//     wedge the handler.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolate this run's audit-lock dirs (#831) BEFORE the tool import, so the
// locks approve-batch takes never alias a concurrent run's real lock in the
// shared tmpdir.
const LOCK_BASE_DIR = mkdtempSync(join(tmpdir(), "amadeus-t507-locks-"));
process.env.AMADEUS_LOCK_BASE_DIR = LOCK_BASE_DIR;

// Standalone hermeticity (issue #698): the suite runner injects these guard
// bypasses into every test file's env (tests/run-tests.ts), so this file only
// went green under the runner. Default them here as well so a bare
// `bun test <this file>` behaves the same. Guard-enforcement tests re-enable
// a guard by deleting its var in their own spawn env, so these defaults do
// not mask enforcement coverage.
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";

import { handleBoltCommand } from "../../packages/framework/core/tools/amadeus-bolt.ts";
import {
  getField,
  SWARM_BATCH_APPROVALS_FIELD,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedAuditFile,
  seededAuditDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

resetAidlcEnv();

const STATE_FIXTURE = join(FIXTURES_DIR, "state-construction.md");

let proj: string;

/**
 * Count the GATE_APPROVED rows across the record's audit shards. Rows are read
 * in both shard schemas the fixture trail and the live emitter produce: the v1
 * `event` key and the v2 `attributes.Event` / `eventName` pair.
 */
function gateApprovedCount(p: string): number {
  let count = 0;
  for (const name of readdirSync(seededAuditDir(p))) {
    if (!name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(seededAuditDir(p), name), "utf-8").split("\n")) {
      if (!line.trim()) continue;
      let row: { event?: string; attributes?: { Event?: string } };
      try {
        row = JSON.parse(line) as typeof row;
      } catch {
        continue; // a shard header or other non-JSON separator line
      }
      if (row.event === "GATE_APPROVED" || row.attributes?.Event === "GATE_APPROVED") count += 1;
    }
  }
  return count;
}

function readState(p: string): string {
  return readFileSync(seededStateFile(p), "utf-8");
}

// A trapped process.exit, carried out of the CLI as a value (issue #3280).
class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

/**
 * Run a bolt subcommand in-process, capturing what it printed to stdout.
 *
 * The exit trap is the t414 / t-approve-batch-presence-guard pattern: every
 * amadeus-bolt refusal goes through error() -> emitError(), which ends in
 * process.exit(1). Left untrapped that does not fail this file's test — it
 * kills the whole Bun runner mid-file, so no pass/fail summary is printed and,
 * in a multi-file invocation, the OTHER files' results are lost with it
 * (issue #3280).
 *
 * Unlike those two files this one returns the printed lines rather than
 * {rc, out}: they assert ON the refusal, so an exit code is their subject,
 * while nothing here consumes one. A trapped exit is therefore surfaced as a
 * legible test failure instead of a field no assertion reads.
 */
function boltCapture(subcommand: string, args: string[], p: string): string[] {
  const printed: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit.bind(process);
  console.log = (...parts: unknown[]) => {
    printed.push(parts.map(String).join(" "));
  };
  console.error = (...parts: unknown[]) => {
    printed.push(parts.map(String).join(" "));
  };
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  try {
    handleBoltCommand(subcommand, args, p);
  } catch (e) {
    if (!(e instanceof ExitSignal)) throw e;
    throw new Error(
      `amadeus-bolt ${subcommand} exited ${e.code} instead of returning: ${printed.join(" | ")}`,
    );
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  }
  return printed;
}

beforeAll(() => {
  proj = createTestProject();
  seedStateFile(proj, STATE_FIXTURE);
  seedAuditFile(proj);
});

afterAll(() => {
  cleanupTestProject(proj);
  delete process.env.AMADEUS_LOCK_BASE_DIR;
  try {
    rmSync(LOCK_BASE_DIR, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

describe("t507 approve-batch idempotence (#2589)", () => {
  test("a replayed approve-batch is a no-op: no second GATE_APPROVED, no state write", () => {
    const baseline = gateApprovedCount(proj);

    const first = boltCapture("approve-batch", ["--batch", "1"], proj);
    expect(JSON.parse(first[0])).toMatchObject({
      emitted: "GATE_APPROVED",
      batch: 1,
      approved_batches: [1],
      state_updated: true,
    });
    expect(getField(readState(proj), SWARM_BATCH_APPROVALS_FIELD)).toBe("1");
    expect(gateApprovedCount(proj)).toBe(baseline + 1);

    const afterFirst = readState(proj);

    // The replay. It must take the early return inside the lock section.
    const second = boltCapture("approve-batch", ["--batch", "1"], proj);
    expect(JSON.parse(second[0])).toEqual({
      batch: 1,
      already_approved: true,
      state_updated: false,
    });
    // Byte-identical: the idempotent arm returns before setOrInsertField.
    expect(readState(proj)).toBe(afterFirst);
    // And the audit trail is NOT inflated by the replay.
    expect(gateApprovedCount(proj)).toBe(baseline + 1);
  });

  // Runs against the ledger the arm above left behind (one workspace per
  // process), which is exactly the state this arm needs: batch 1 already
  // approved and already replayed once.
  test("the early return is scoped to the replayed number — a new batch still appends", () => {
    const before = gateApprovedCount(proj);

    const third = boltCapture("approve-batch", ["--batch", "2"], proj);
    expect(JSON.parse(third[0])).toMatchObject({
      emitted: "GATE_APPROVED",
      batch: 2,
      approved_batches: [1, 2],
      state_updated: true,
    });
    expect(getField(readState(proj), SWARM_BATCH_APPROVALS_FIELD)).toBe("1, 2");
    expect(gateApprovedCount(proj)).toBe(before + 1);
  });
});
