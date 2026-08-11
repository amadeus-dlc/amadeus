// covers: scope:fix
//
// t-tui-t139-revision-loop-idempotency.serial.tui.test.ts — METAMORPHIC INVARIANT
// (§5-D, Phase 4): revision-loop idempotency, as a TUI JOURNEY. Drive the REAL
// claude TUI by keystroke through TWO fix run-throughs and assert that a
// reject->revise->approve cycle leaves the SAME terminal on-disk state as a clean
// approve, MODULO Revision Count.
//
// ⚠️ WHY TUI, NOT sdk (the §5-D doc says {sdk} — this is the documented exception,
// user-decided 2026-06-07). The {sdk} routing is INFEASIBLE and the doc label is a
// bug, proven by live diagnostic (tmp/phase4-runs/diag-t128.log, 2026-06-07): a
// single driveAidlc() run STOPS at the first gated stage — it emits SESSION_ENDED
// with Status=Running, Current Stage=requirements-analysis, and the ONLY
// AskUserQuestion it ever presents is the scope-confirmation menu, NEVER an
// {Approve, Request changes} approval gate. So an sdk run cannot drive reject->
// approve in one continuous query: there is no approval AUQ for canUseTool to
// answer. This is exactly what the DRIVER-SPLIT INVARIANT predicts (memory
// project_v0harness_driver_split_invariant, user-locked): a journey that must
// CONTINUE PAST a user-stop (answer a gate, then keep going) is TUI, not sdk -
// using sdk multi-turn to fake it rebuilds the auto-approve fake the mission
// kills. The revision loop is the canonical continue-past-a-stop journey,
// so it is driven through the real TUI like a human: the gate PAINTS, a keystroke
// answers it (Enter = Approve, or Down+Enter = Request changes), and the workflow
// continues. Auto-approving every gate skips the revision loop entirely (no
// Request changes path, stage-protocol.md:24), so it could never exercise this.
//
// THE METAMORPHIC RELATION (asserted as on-disk DATA, never on prose):
//   CLEAN   = terminal amadeus-state.md after a run that APPROVES every gate.
//   REVISED = terminal amadeus-state.md after an identical run whose FIRST approval
//             gate is REJECTED once (Down+Enter = "Request changes") then, on the
//             re-presented gate, approved — every later gate approved too.
//   INVARIANT: CLEAN and REVISED agree on Scope, Lifecycle Phase, and the set of
//   completed stages (the `- [x]` grid), differing ONLY in Revision Count
//   (REVISED > 0, CLEAN == 0). The revision loop is a no-op on the destination.
//
// Both runs terminate on the SAME on-disk milestone (the answer-gate's
// --until-state-field "Completed=([5-9]|...)" — the post-init Completed counter,
// the t50 terminator). Timers are WEDGE-BACKSTOPS, never budgets: each run passes
// the instant its disk milestone lands; the overall deadline only trips a genuine
// wedge. A reject that does not take (Revision Count stays 0) is a real FINDING and
// reds the vacuous-pass guard — NEVER softened (IRON RULE).
//
// SOURCE-PINNED FACTS (verify-never-guess):
//   - gate options exactly {Approve(1), Request changes(2)} (stage-protocol.md:41-42,
//     165-167); option 1 is the highlighted Recommended default.
//   - selecting "Request changes" -> amadeus-state.ts handleReject (:769): emits
//     GATE_REJECTED + STAGE_REVISING, marks [?]->[R], Revision Count++ (:786).
//     The orchestrator then re-runs the stage and re-presents the SAME gate.
//   - fix scope: Ideation entirely SKIP; first post-init EXECUTE gate is
//     requirements-analysis on a brownfield workspace (reverse-engineering runs
//     first; scope-mapping.json "fix" + amadeus-utility.ts greenfield downgrade).
//   - Completed counter == `- [x]` grid count (amadeus-state.ts:256-258 sync); the
//     terminator + the cross-run comparison both read this field.
//   - the AUQ gate footer + caret signal is gridHasMenu (tui-drive.ts).
//
// SERIAL (.serial. in the filename): two full back-to-back TUI run-throughs in one
// test, each its own claude session, sequential. SPENDS REAL TOKENS (two fix
// workflows on Opus/Bedrock — the heaviest journey in the §5-D set). Gated behind
// AMADEUS_TUI_LIVE=1; tmux/claude/distributable absence SKIPs with a reason —
// never a hollow pass.
//
// SPAWN, not import (D-TUI-7): Bun spawns tui-drive.ts on every platform. The
// runTuiDriver() is what DERIVES the `tui` mechanism (Phase 0). Platform-
// invariant plain-text grid asserts.

import { describe, expect, test } from "bun:test";
import {
  runTuiDriver,
  waitForTui,
  runTuiDriverToExit,
  tmuxUnavailableReason,
} from "../harness/tui-client.ts";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stateFilePathFor } from "../harness/sdk-drive.ts";
import { gridHasMenu } from "../harness/tui-drive.ts";
import { canonicalCompletedSlugs } from "../harness/fixtures.ts";
import { cleanupTuiProject, setupTuiProject } from "../harness/tui-fixtures.ts";
import { scaleTestTime } from "../lib/test-time-factor.ts";

const AMADEUS_SRC = join(import.meta.dir, "..", "..", "dist", "claude", ".claude");

// Two full run-throughs back-to-back. The bun:test cap is the hard ceiling; each
// run's pass condition is its on-disk Completed milestone, not the clock.
const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "2400", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 2400) * 1000;
// Each run gets ~half the overall ceiling as its answer-gate hang-backstop; they
// run sequentially so neither alone needs the full budget.
const PER_RUN_OVERALL_MS = Math.max(120_000, Math.floor(TEST_TIMEOUT_MS / 2) - 30_000);

// The post-init Completed milestone both runs terminate on (the t50 terminator):
// init 3 + >= 2 Inception (reverse-engineering + requirements-analysis) >= 5.
const UNTIL_COMPLETED = "Completed=([5-9]|[1-9][0-9])";

function skipReason(): string | null {
  if (process.env.AMADEUS_TUI_LIVE !== "1") {
    return "set AMADEUS_TUI_LIVE=1 to run the live revision-loop journey (uses Bedrock tokens — two run-throughs)";
  }
  const tmuxReason = tmuxUnavailableReason();
  if (tmuxReason !== null) return tmuxReason;
  if (spawnSync("claude", ["--version"], { encoding: "utf-8" }).status !== 0) {
    return "claude CLI not found";
  }
  if (!existsSync(AMADEUS_SRC)) return `distributable missing: ${AMADEUS_SRC}`;
  return null;
}
const SKIP_REASON = skipReason();

/** Run the answer-gate primitive to the Completed milestone. Approve-only by
 *  default (Enter = Recommended per menu); when rejectFirstGate is true it selects
 *  "Request changes" on the FIRST approval gate once, then approves the rest —
 *  driving one reject→revise→approve cycle (the gate is identified by its "Request
 *  Changes" option, so the clarifying-question menus that precede it are NOT
 *  mistaken for it; that mis-targeting was the first-attempt finding). Long-lived
 *  subprocess; its own backstops error loud, so a hang exits nonzero (never a
 *  manufactured pass — IRON RULE). */
function runAnswerGateToMilestone(
  session: string,
  sandbox: string,
  rejectFirstGate: boolean,
): Promise<number> {
  return runTuiDriverToExit([
    "answer-gate",
    "--session",
    session,
    "--project-dir",
    sandbox,
    "--until-state-field",
    UNTIL_COMPLETED,
    "--overall-timeout-ms",
    String(PER_RUN_OVERALL_MS),
    ...(rejectFirstGate ? ["--reject-first-gate"] : []),
  ]);
}

interface Terminal {
  scope: string | undefined;
  phase: string | undefined;
  revisionCount: number;
  completedCounter: number;
  completedGrid: number;
  completedSlugs: string[];
  rawState: string;
}

/** Read the comparable terminal fields off the post-run amadeus-state.md. */
function readTerminal(sandbox: string): Terminal {
  const md = readFileSync(stateFilePathFor(sandbox), "utf8");
  const scope = /\*\*Scope\*\*:[ \t]*(\S+)/.exec(md)?.[1];
  const phase = /\*\*Lifecycle Phase\*\*:[ \t]*([^\r\n]+)/.exec(md)?.[1]?.trim();
  const revisionCount = Number.parseInt(
    /\*\*Revision Count\*\*:[ \t]*(\d+)/.exec(md)?.[1] ?? "0",
    10,
  );
  const completedCounter = Number.parseInt(
    /Completed\*\*:[ \t]*(\d+)/.exec(md)?.[1] ?? "-1",
    10,
  );
  // The set of completed EXECUTE-effective stage slugs. Completed SKIP rows are
  // historical state and do not contribute to canonical plan progress.
  const completedSlugs = canonicalCompletedSlugs(md).sort();
  return {
    scope,
    phase,
    revisionCount,
    completedCounter,
    completedGrid: completedSlugs.length,
    completedSlugs,
    rawState: md,
  };
}

/** Launch claude on a fresh brownfield fix project, clear modals, submit the
 *  fix command. Returns the session name (caller drives gates + reads disk). */
function launchBugfix(session: string, sandbox: string): void {
  expect(
    runTuiDriver([
      "start",
      "--session",
      session,
      "--cwd",
      sandbox,
      "--width",
      "120",
      "--height",
      "45",
      "--",
      "claude",
      "--dangerously-skip-permissions",
    ]).rc,
  ).toBe(0);
  if (waitForTui(session, "trust this folder", 60000, 600)) {
    runTuiDriver(["send", "--session", session, "--keys", "1"]);
  }
  if (waitForTui(session, "Bypass Permissions mode", 15000, 600)) {
    runTuiDriver(["send", "--session", session, "--keys", "2"]);
  }
  expect(waitForTui(session, "\\[AIDLC\\].*ready", 45000, 800)).toBe(true);

  // Explicit `--scope fix` (not the bare keyword) so the shipped
  // AMADEUS_DEFAULT_SCOPE=workshop env-default does NOT trigger a scope-
  // disambiguation gate at START (the t50 lesson, SKILL.md:105 "explicit CLI flag
  // wins"). The trailing description satisfies the step-6 "what to build?" prompt
  // up front (answer-gate can't type free text).
  runTuiDriver([
    "send",
    "--session",
    session,
    "--keys",
    "/amadeus --scope fix the todo checkbox state is not persisted after page reload",
    "--literal",
    "--no-enter",
  ]);
  runTuiDriver(["send", "--session", session, "--keys", "Enter", "--no-enter"]);
  // Do not require an intermediate phase/statusline paint here. Fresh brownfield
  // bootstraps can spend minutes routing while the statusline still shows ready
  // or an interim phase; the answer-gate's on-disk Completed terminator below is
  // the deterministic progress proof (same lesson as t50).
}

describe("t-tui-t139 revision-loop idempotency (reject->approve == clean approve, modulo Revision Count)", () => {
  test.skipIf(SKIP_REASON !== null)(
    `reject-then-approve reaches the same terminal state as clean approve${SKIP_REASON ? ` — SKIP: ${SKIP_REASON}` : ""}`,
    async () => {
      // ===================================================================
      // RUN 1 — CLEAN: approve every gate, drive to the Completed milestone.
      // ===================================================================
      const cleanSession = `amadeus_tui_t139_clean_${process.pid}`;
      const cleanSandbox = setupTuiProject({ brownfieldStub: true, noAidlcDocs: true });
      let revisedSession = "";
      let revisedSandbox = "";
      try {
        launchBugfix(cleanSession, cleanSandbox);
        const cleanRc = await runAnswerGateToMilestone(cleanSession, cleanSandbox, false);
        expect(cleanRc).toBe(0);
        const clean = readTerminal(cleanSandbox);
        runTuiDriver(["kill", "--session", cleanSession]);

        // CLEAN sanity: it reached the milestone with NO rejection.
        expect(clean.scope).toBe("fix");
        expect(clean.completedCounter).toBeGreaterThanOrEqual(5);
        expect(clean.completedCounter).toBe(clean.completedGrid); // counter==grid sync
        expect(clean.revisionCount).toBe(0); // clean path never rejected

        // ===================================================================
        // RUN 2 — REVISED: reject the FIRST approval gate once (Down+Enter =
        // "Request changes"), then approve the rest to the same milestone.
        // ===================================================================
        revisedSession = `amadeus_tui_t139_revised_${process.pid}`;
        revisedSandbox = setupTuiProject({ brownfieldStub: true, noAidlcDocs: true });

        // Render value-add: prove a gate painted at least once during the run.
        let sawMenu = false;
        let pollTimer: ReturnType<typeof setInterval> | undefined;
        try {
          launchBugfix(revisedSession, revisedSandbox);

          // Drive the gates with --reject-first-gate: the answer-gate loop selects
          // "Request changes" on the FIRST APPROVAL gate (the menu whose options
          // contain "Request changes" — distinguishing it from the clarifying-
          // QUESTION menus requirements-analysis presents first, which a blind
          // pre-loop keystroke would mis-target — the verified first-attempt
          // finding 2026-06-07), then approves the re-presented gate and every
          // later gate to the SAME Completed milestone. The reject fires
          // handleReject (GATE_REJECTED + STAGE_REVISING + Revision Count++,
          // amadeus-state.ts:769,786). Tail the grid for the render proof while it
          // runs (mirrors t50's pollTimer). The answer-gate's own backstops are
          // HANG-only; pass is the on-disk Completed>=5 terminator, never the clock.
          pollTimer = setInterval(() => {
            const grid = runTuiDriver(["capture", "--session", revisedSession]).stdout;
            if (gridHasMenu(grid)) sawMenu = true;
          }, scaleTestTime(1000));
          const revisedRc = await runAnswerGateToMilestone(
            revisedSession,
            revisedSandbox,
            true, // reject the first approval gate once
          );
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = undefined;
          expect(revisedRc).toBe(0);

          const revised = readTerminal(revisedSandbox);

          // --- VACUOUS-PASS GUARD: the reject ACTUALLY took. ----------------
          // Without this, a run that silently approved everything would make the
          // comparison a tautology (two clean runs trivially match). Revision Count
          // > 0 is the on-disk proof the reject->revise cycle fired (handleReject
          // increments it, amadeus-state.ts:786). The audit pair is asserted via the
          // state too: a nonzero Revision Count is set ONLY by handleReject.
          expect(revised.revisionCount).toBeGreaterThan(0);

          // The gate rendered (the tui-only value-add the sdk path is blind to).
          expect(sawMenu).toBe(true);

          // --- THE METAMORPHIC INVARIANT: same terminal state, modulo Revision
          //     Count. ----------------------------------------------------------
          // Same scope.
          expect(revised.scope).toBe(clean.scope);
          // Same lifecycle phase at the milestone.
          expect(revised.phase).toBe(clean.phase);
          // Same SET of completed stages (order-independent) — the revision loop
          // neither added nor dropped a completed stage.
          expect(revised.completedSlugs).toEqual(clean.completedSlugs);
          // Same completed count, and counter==grid sync holds in the revised run.
          expect(revised.completedCounter).toBe(clean.completedCounter);
          expect(revised.completedCounter).toBe(revised.completedGrid);

          // The ONE allowed difference: Revision Count diverges (revised > clean).
          expect(revised.revisionCount).toBeGreaterThan(clean.revisionCount);
        } finally {
          if (pollTimer) clearInterval(pollTimer);
          if (revisedSession) runTuiDriver(["kill", "--session", revisedSession]);
        }
      } finally {
        runTuiDriver(["kill", "--session", cleanSession]);
        cleanupTuiProject(cleanSandbox);
        if (revisedSandbox) cleanupTuiProject(revisedSandbox);
      }
    },
    TEST_TIMEOUT_MS,
  );
});
