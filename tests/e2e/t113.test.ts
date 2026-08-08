// covers: audit:WORKFLOW_COMPLETED, audit:PHASE_VERIFIED, audit:PHASE_COMPLETED
//         (+ terminal-event ORDERING + re-run IDEMPOTENCY — see TECHNIQUE)
//
// t113 — complete-workflow TERMINAL-EVENT ORDERING + IDEMPOTENCY. The audit
// trail's load-bearing contract at the end of a workflow is that the final
// phase's closure events land IN THIS EXACT ORDER:
//
//     STAGE_COMPLETED -> PHASE_COMPLETED -> PHASE_VERIFIED -> WORKFLOW_COMPLETED
//       -> INTENT_AUTONOMY_TRANSACTION_COMMITTED
//
// WORKFLOW_COMPLETED closes the lifecycle stream and fires EXACTLY ONCE; the
// Intent-autonomy terminalization commits immediately after it (#2211,
// amadeus-state.ts emitWorkflowCompletionAuditRows -> the very next statement
// calls commitProductionIntentCompletion, whose audit-backed repository emits
// INTENT_AUTONOMY_TRANSACTION_COMMITTED). That autonomy row is the ONLY event
// allowed after WORKFLOW_COMPLETED — the intent registry row flips to
// "complete" right after it, and the post-complete audit seal (#1248) refuses
// every later append. t51:295-299 pins the same followed-only-by contract at
// the integration layer; this file pins the full five-event terminal tail plus
// re-run idempotency of the final approve. If a refactor reordered the emits
// in handleCompleteWorkflow — e.g. moved the WORKFLOW_COMPLETED emit before
// PHASE_VERIFIED, or dropped the alreadyMarkedCompleted guard so the final
// STAGE_COMPLETED doubled — the counts could still look plausible while the
// SEQUENCE lied about what happened. (History: before #2211 this file pinned
// WORKFLOW_COMPLETED as dead-last; #2211 moved that contract in t51 but this
// file's pins were left behind — #2456 records the ruling that the new order
// is canonical and the pins here follow it.)
//
// SOURCE (amadeus-state.ts):
//   - handleApprove (:675) validates the slug is `awaiting-approval` (:685),
//     flips it to [x], emits GATE_APPROVED + STAGE_COMPLETED (:703-708), then
//     auto-advances: nextInScopeStage -> handleAdvance, OR (final stage)
//     handleCompleteWorkflow (:729-739).
//   - handleCompleteWorkflow (:520) sets Status=Completed and emits, IN ORDER,
//     STAGE_COMPLETED (suppressed when alreadyMarkedCompleted, :574) ->
//     PHASE_COMPLETED (:580) -> PHASE_VERIFIED (:585) -> WORKFLOW_COMPLETED
//     (:593). For the final-stage approve path the STAGE_COMPLETED was already
//     emitted by approve (:705), so the guard suppresses the duplicate and the
//     observed terminal tail is exactly STAGE_COMPLETED -> PHASE_COMPLETED ->
//     PHASE_VERIFIED -> WORKFLOW_COMPLETED.
//
// IDEMPOTENCY — verified by probe, asserting the REAL behaviour of each seam:
//   - approve PAST THE END is idempotent: once the final slug is [x],
//     re-running `approve build-and-test` fails validateSlugInState (:685,
//     state 'completed' not 'awaiting-approval') WITHOUT reaching the terminal
//     sequence, so WORKFLOW_COMPLETED stays at exactly 1 (and no second
//     STAGE_COMPLETED lands). This is the realistic re-run scenario in the
//     deterministic walk (the orchestrator replays an approve), so it is the
//     behavioural contract pinned here. NOTE the failed approve still routes
//     through error() -> emitError, but the post-complete audit stop (#1248,
//     amadeus-audit.ts intentStatusForAudit gate) refuses the ERROR_LOGGED
//     append once the intent is complete, so the sealed trail does NOT grow
//     and the autonomy terminalization stays the last row, with
//     WORKFLOW_COMPLETED immediately before it. The test asserts that real
//     shape, plus the suppression note on stderr.
//   - SOURCE SURPRISE (not the asserted path, noted for the record): re-running
//     `complete-workflow build-and-test` DIRECTLY is NOT idempotent — it has no
//     already-Completed early return, and the alreadyMarkedCompleted guard
//     suppresses only the duplicate STAGE_COMPLETED, so PHASE_COMPLETED /
//     PHASE_VERIFIED / WORKFLOW_COMPLETED all re-emit, doubling the count to 2.
//     A future fix that guards handleCompleteWorkflow against an
//     already-Completed Status would make that path idempotent too; this test
//     would not break (it asserts only the approve seam).
//
// TECHNIQUE: invariant. Drive the SHORTEST scope (fix, 6 EXECUTE stages) from
// init to completion with NO claude — `amadeus-utility.ts init` to bootstrap, then
// gate-start -> approve per remaining stage (approve auto-advances; the final
// approve reaches handleCompleteWorkflow). Same seam t51 uses. Then parse the
// resulting audit.md and assert on the FILE bytes (never prose). fix has 3
// PHASE_VERIFIED (initialization, inception, construction); we assert the FINAL
// phase's terminal ordering and the singleton WORKFLOW_COMPLETED.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { auditRowsFrom } from "../harness/audit-records.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
} from "../harness/fixtures.ts";
// P4: audit is sharded per clone under the born intent's record; read the
// merged shards via the shipped helper (default-resolves the active intent).
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

// Standalone hermeticity (issue #698): the suite runner injects these guard
// bypasses into every test file's env (tests/run-tests.ts), so this file only
// went green under the runner. Default them here as well so a bare
// `bun test <this file>` behaves the same. Guard-enforcement tests re-enable
// a guard by deleting its var in their own spawn env, so these defaults do
// not mask enforcement coverage.
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";

const UTIL = join(AMADEUS_SRC, "tools", "amadeus-utility.ts");
const STATE = join(AMADEUS_SRC, "tools", "amadeus-state.ts");
const GOAL = join(AMADEUS_SRC, "tools", "amadeus-goal.ts");

// Spawn a state/utility subcommand via the SAME bun that runs this test
// (process.execPath), cwd-independent. Mirrors t51's `bun "$STATE" ...` calls.
function run(
  tool: string,
  args: string[],
  proj: string,
  extraEnv: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  const res = spawnSync(
    process.execPath,
    [amadeusToolTarget(tool), ...args, "--project-dir", proj],
    { encoding: "utf8", env: { ...process.env, ...extraEnv } },
  );
  return {
    status: res.status ?? -1,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

// gate-start -> approve a single stage, exactly as t51's walk_stage does.
function walkStage(slug: string, proj: string): void {
  const gs = run(STATE, ["gate-start", slug], proj);
  expect(gs.status).toBe(0);
  const ap = run(STATE, ["approve", slug, "--user-input", "approve"], proj);
  expect(ap.status).toBe(0);
}

function reconcileGoal(proj: string): void {
  const proof = "fix workflow evidence\n";
  writeFileSync(join(proj, "goal-proof.txt"), proof);
  writeFileSync(
    join(proj, "goal-items.json"),
    JSON.stringify([
      {
        id: "goal-statement",
        verdict: "ACHIEVED",
        evidence: [
          {
            kind: "deterministic-check",
            reference: "goal-proof.txt",
            digest: createHash("sha256").update(proof).digest("hex"),
          },
        ],
      },
    ]),
  );
  const result = run(
    GOAL,
    [
      "reconcile",
      "--items",
      "goal-items.json",
      "--final-stage",
      "build-and-test",
      "--completion-instance",
      "terminal:build-and-test",
    ],
    proj,
  );
  expect(result.status).toBe(0);
}

// Each audit block carries `**Timestamp**: <iso>` + `**Event**: <TYPE>`
// (amadeus-audit.ts). P4 shards audit per clone, so a multi-spawn drive lands its
// blocks across several shards; readAllAuditShards concatenates them (block
// boundaries preserved) but cross-shard order is by clone-id filename, NOT
// chronology. So parse (timestamp, event) per block and STABLE-sort by timestamp
// — buffer position is the documented tiebreak for same-second blocks (isoTimestamp
// is second-precision), which is exactly how the engine's block parsers order. The
// terminal four (emitted in one complete-workflow process, one shard) stay in
// their emit order under this sort.
function eventSequence(proj: string): string[] {
  const parsed: { ts: string; event: string; pos: number }[] = [];
  auditRowsFrom(readAllAuditShards(proj)).forEach((rec, pos) => {
    // append-raw records carry event: null — they are not part of the typed
    // terminal-ordering contract this file pins.
    if (!rec.event) return;
    parsed.push({ ts: String(rec.timestamp), event: rec.event, pos });
  });
  parsed.sort((a, b) => (a.ts === b.ts ? a.pos - b.pos : a.ts < b.ts ? -1 : 1));
  return parsed.map((p) => p.event);
}

function countEvent(seq: string[], type: string): number {
  return seq.filter((e) => e === type).length;
}

// Drive a complete fix workflow once; return the project dir (audit is read
// from the born intent's shards via readAllAuditShards(proj)). Bootstrap via
// init (emits WORKFLOW_STARTED + init phase + 2x PHASE_SKIPPED and pre-completes
// the 3 init stages), then walk the remaining EXECUTE stages.
function driveFixToCompletion(): { proj: string } {
  const proj = createTestProject();
  const init = run(
    UTIL,
    ["init", "--scope", "fix"],
    proj,
    { AMADEUS_WORKFLOW_INTENT: "t113 terminal-ordering test" },
  );
  expect(init.status).toBe(0);

  // fix post-init EXECUTE stages, in order (reverse-engineering is
  // SKIP-overridden on greenfield; init pre-completes the 3 init stages).
  walkStage("requirements-analysis", proj);
  walkStage("code-generation", proj);
  reconcileGoal(proj);
  walkStage("build-and-test", proj); // final stage -> handleCompleteWorkflow

  return { proj };
}

const projects: string[] = [];
afterAll(() => {
  for (const p of projects) cleanupTestProject(p);
});

// Each `bun <tool>.ts` cold-start costs ~hundreds of ms and a full fix drive
// is ~9 spawns; driving once per test blows bun:test's default 5s per-test
// timeout. So drive the workflow ONCE per describe in a beforeAll (the walk is
// deterministic) and share the resulting audit across the assertions. Generous
// explicit timeouts on the drives keep this honest on a cold/loaded machine.
const DRIVE_TIMEOUT_MS = 60_000;

describe("complete-workflow terminal-event ordering (fix, no claude)", () => {
  let seq: string[];

  beforeAll(() => {
    const { proj } = driveFixToCompletion();
    projects.push(proj);
    seq = eventSequence(proj);
  }, DRIVE_TIMEOUT_MS);

  test("the FINAL five events are STAGE_COMPLETED -> PHASE_COMPLETED -> PHASE_VERIFIED -> WORKFLOW_COMPLETED -> INTENT_AUTONOMY_TRANSACTION_COMMITTED, in that order", () => {
    // Sanity: a non-trivial trail was produced.
    expect(seq.length).toBeGreaterThan(10);

    // The terminal tail — the canonical workflow-closure sequence, including
    // the #2211 autonomy terminalization row. The last FIVE events as an
    // ordered slice catch any REORDER of the emits in handleCompleteWorkflow,
    // a dropped phase-closure event, or an event slipping in between
    // WORKFLOW_COMPLETED and the autonomy commit.
    expect(seq.slice(-5)).toEqual([
      "STAGE_COMPLETED",
      "PHASE_COMPLETED",
      "PHASE_VERIFIED",
      "WORKFLOW_COMPLETED",
      "INTENT_AUTONOMY_TRANSACTION_COMMITTED",
    ]);

    // NO ADJACENT-DUPLICATE STAGE_COMPLETED in the terminal closure. The
    // slice(-5) check above does NOT catch a doubled final STAGE_COMPLETED:
    // the duplicate lands just before the pinned window, leaving the last
    // five bytes unchanged. Dropping the alreadyMarkedCompleted guard
    // (amadeus-state.ts:574) produces exactly that doubling. Assert that no two
    // STAGE_COMPLETED events are adjacent ANYWHERE in the trail — the final
    // approve's STAGE_COMPLETED must not be re-emitted by handleCompleteWorkflow.
    const adjacentDup = seq.some(
      (e, i) => e === "STAGE_COMPLETED" && seq[i + 1] === "STAGE_COMPLETED",
    );
    expect(adjacentDup).toBe(false);
  });

  test("WORKFLOW_COMPLETED fires exactly once and is followed only by the Intent-autonomy terminalization", () => {
    // Mirror of t51:295-299 at the e2e layer: the autonomy commit is the ONLY
    // event allowed after WORKFLOW_COMPLETED (#2211), and both fire once.
    expect(seq[seq.length - 2]).toBe("WORKFLOW_COMPLETED");
    expect(seq[seq.length - 1]).toBe("INTENT_AUTONOMY_TRANSACTION_COMMITTED");
    expect(countEvent(seq, "WORKFLOW_COMPLETED")).toBe(1);
    expect(countEvent(seq, "INTENT_AUTONOMY_TRANSACTION_COMMITTED")).toBe(1);
  });

  test("the FINAL phase's closure ordering holds: the last PHASE_VERIFIED is immediately followed by WORKFLOW_COMPLETED, with PHASE_COMPLETED before it", () => {
    // fix crosses 3 phase boundaries -> 3 PHASE_VERIFIED / 3 PHASE_COMPLETED.
    // We pin the FINAL phase's ordering specifically (the others are mid-stream
    // boundaries emitted by handleAdvance; this one is the terminal handler).
    expect(countEvent(seq, "PHASE_VERIFIED")).toBe(3);
    expect(countEvent(seq, "PHASE_COMPLETED")).toBe(3);

    const lastVerified = seq.lastIndexOf("PHASE_VERIFIED");
    const lastCompletedPhase = seq.lastIndexOf("PHASE_COMPLETED");
    const workflowDone = seq.lastIndexOf("WORKFLOW_COMPLETED");

    // PHASE_COMPLETED precedes PHASE_VERIFIED precedes WORKFLOW_COMPLETED, and
    // the final PHASE_VERIFIED sits exactly one slot before WORKFLOW_COMPLETED.
    expect(lastCompletedPhase).toBeLessThan(lastVerified);
    expect(lastVerified).toBeLessThan(workflowDone);
    expect(workflowDone - lastVerified).toBe(1);
  });
});

describe("complete-workflow idempotency: re-running the final approve emits no second WORKFLOW_COMPLETED", () => {
  let proj: string;

  beforeAll(() => {
    const driven = driveFixToCompletion();
    proj = driven.proj;
    projects.push(proj);
  }, DRIVE_TIMEOUT_MS);

  test("approve PAST THE END fails (slug already [x]) and appends NOTHING — the completed intent's audit ledger is sealed (#1248)", () => {
    // Precondition: the clean walk landed exactly one WORKFLOW_COMPLETED,
    // followed only by the autonomy terminalization row (#2211).
    const before = eventSequence(proj);
    expect(countEvent(before, "WORKFLOW_COMPLETED")).toBe(1);
    expect(before[before.length - 2]).toBe("WORKFLOW_COMPLETED");
    expect(before[before.length - 1]).toBe("INTENT_AUTONOMY_TRANSACTION_COMMITTED");
    const stageCompletedBefore = countEvent(before, "STAGE_COMPLETED");

    // Re-run approve on the (now [x]) final stage. handleApprove's
    // validateSlugInState (amadeus-state.ts:685) requires 'awaiting-approval';
    // the slug is 'completed', so this MUST fail WITHOUT reaching the terminal
    // sequence — the realistic orchestrator-replay idempotency contract.
    const replay = run(
      STATE,
      ["approve", "build-and-test", "--user-input", "approve"],
      proj,
    );
    expect(replay.status).not.toBe(0);
    // The error names the state-machine guard it tripped (asserts the cause,
    // not just "it failed somehow").
    expect(replay.stdout + replay.stderr).toContain("awaiting-approval");
    // And the error's audit row was refused by the post-complete seal — the
    // suppression note proves the sealed-ledger path ran, not a silent no-op.
    expect(replay.stderr).toContain("suppressed amadeus.operation.failed v2 append");

    // The IDEMPOTENCY contract on the audit FILE: still exactly one
    // WORKFLOW_COMPLETED and one autonomy terminalization (the replay must
    // not re-commit an autonomy transaction), and no extra STAGE_COMPLETED
    // for the final stage.
    const after = eventSequence(proj);
    expect(countEvent(after, "WORKFLOW_COMPLETED")).toBe(1);
    expect(countEvent(after, "INTENT_AUTONOMY_TRANSACTION_COMMITTED")).toBe(1);
    expect(countEvent(after, "STAGE_COMPLETED")).toBe(stageCompletedBefore);

    // REAL behaviour of the failed replay (asserted, not assumed): the error
    // path still routes through error() -> emitError, but the post-complete
    // audit stop (#1248, amadeus-audit.ts intentStatusForAudit gate) refuses
    // every append once the intent's registry row is "complete" — including
    // the replay's ERROR_LOGGED row. So the sealed trail does NOT grow and
    // the terminal tail keeps its shape. Pinning this guards two regressions
    // at once: a failed past-the-end approve falling through to the terminal
    // emits, and the ledger seal reopening after completion. The suppression
    // mechanism itself is covered by t243-post-complete-audit-stop.
    expect(after.length).toBe(before.length);
    expect(after[after.length - 2]).toBe("WORKFLOW_COMPLETED");
    expect(after[after.length - 1]).toBe("INTENT_AUTONOMY_TRANSACTION_COMMITTED");
  });
});
