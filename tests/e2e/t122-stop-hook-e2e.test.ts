// covers: hook:amadeus-stop
//
// t122-stop-hook-e2e.test.ts — SDK-harness port of
// tests/e2e/t122-stop-hook-e2e.sh (the .sh's TAP plan was 6 assertions; this
// port carried them as 4 test() blocks, and the human-wait carve-out adds a
// 5th — the (7)-labelled real-engine case below, numbered to continue the .sh
// assertion map, not the test()-block count). WORKFLOW-TIER end-to-end
// enforcement of the Stop hook amadeus-stop.ts — the framework's FIRST
// flow-altering hook. The feature-tier twin t121-stop-hook-enforce.test.ts
// proves the hook's block/done/guard LOGIC against a MOCK engine; THIS file
// closes the gap t121's mock leaves open: the REAL hook against the REAL
// amadeus-orchestrate engine, including one genuinely end-to-end pass through a
// LIVE driven turn (§6-E non-golden: the framework must FAIL/BLOCK correctly,
// and must never trap a session).
//
// MECHANISM (body-derived): sdk (driveAidlc drives the live e2e turn) + cli
// (spawnSync invokes the real hook directly with real Stop payloads). The cli
// invocations are NOT a mock anything — they pipe a real Stop-event payload
// into the SHIPPED hook, which spawns the SHIPPED engine over a seeded project.
//
// A hook contract has no gate.
//
// ASSERTION MAP (.sh test -> surface, equal-or-stronger):
//   1+2 run-to-done, genuinely e2e
//       -> driveAidlc("/amadeus --status") over a COMPLETED workflow under the
//          LIVE skill-scoped Stop hook (the project carries the real
//          .claude/settings.json whose Stop hook entry points at the real
//          amadeus-stop.ts — settings.json:110-118). The engine answers `done`,
//          the hook ALLOWS, and the headless session runs to completion: the
//          terminal result event exists and is not an error (the .sh's
//          "no exit-124 hang"), AND the deterministic status stdout landed in a
//          Bash tool_result ("Status:         Completed" — the verbatim
//          handleStatus emission, amadeus-utility.ts:296-310; deterministically
//          confirmed on this exact fixture: Completion 32/32, Status Completed).
//   3 the live hook fired and took the done->allow path
//       -> GUARDED exactly like the .sh: the skill-scoped Stop hook does not
//          fire on every headless turn, so when the heartbeat
//          (amadeus-docs/.amadeus-hooks-health/stop.last, amadeus-stop.ts:90) is
//          absent we SKIP this sub-assertion (record the skip, never fail).
//          When it IS present, the real hook ran and its terminal allow is
//          already proven by the completed turn.
//   4 pending directive -> the REAL hook BLOCKS, against the REAL engine
//       -> seed state-final-stage (final stage [-], engine emits a real
//          run-stage for feedback-optimization), pipe {"stop_hook_active":false}
//          into the real hook: stdout is a parseable {"decision":"block"} whose
//          reason names the pending stage + re-feeds the loop
//          (continuationReason, amadeus-stop.ts:298-307) and carries no
//          override-shaped verbs. Deterministic — verified by direct invocation
//          on this exact fixture (block reason names "feedback-optimization" +
//          "amadeus-orchestrate"). Exit 0 (a block rides stdout, never the code).
//   5 done directive -> the REAL hook ALLOWS, against the REAL engine
//       -> seed state-completed, same payload: empty stdout, exit 0
//          (deterministically confirmed on this fixture).
//   6 recursion release against the REAL engine (light re-confirm; t121 owns
//     the exhaustive matrix)
//       -> seed state-final-stage, consume the canonical stage budget with eight
//          distinct delivery identities, then invoke once more with
//          stop_hook_active:true: the hook RELEASES (empty stdout, exit 0) and
//          appends the drop record "recursion guard released the stop"
//          (amadeus-stop.ts:370) to .amadeus-hooks-health/stop.drops — a stuck loop
//          can never trap the session even with the directive genuinely pending.
//          Deterministically confirmed on this fixture (sig
//          feedback-optimization::2, drop line written).
//   7 human-wait carve-out against the REAL engine (NEW — no .sh predecessor;
//     t121 owns the exhaustive [?]/[R]/[-] matrix)
//       -> seed state-final-stage but flip the current stage's row from [-] to
//          [?] awaiting-approval: the real engine STILL emits a pending
//          run-stage (the [?] stage is in-flight, amadeus-orchestrate.ts
//          :1161-1176), but the hook ALLOWS the stop (empty stdout, exit 0).
//          The complement of test 4 on the SAME fixture — only the checkbox
//          state differs and the outcome flips block -> allow. This is the
//          gate-spam fix proven end-to-end.
//   8 pending-question (tier 2) carve-out against the REAL engine (NEW)
//       -> keep the final stage [-] in-progress (engine emits a pending
//          run-stage, as test 4 proved BLOCKS), but write a
//          <slug>-questions.md with a blank [Answer]: tag under the stage dir:
//          the hook ALLOWS the stop (empty stdout, exit 0). Same [-] fixture as
//          test 4, the open question is the only difference, and it flips
//          block -> allow. t121 owns the autonomy-guard / answered / no-file
//          matrix.
//   9 PARK against the REAL engine (NEW, issue #367, the requested gap)
//       -> seed the Running final stage, run the REAL `amadeus-orchestrate park`
//          (exit 0, emits a `parked` directive). Park does NOT advance: the
//          feedback-optimization checkbox stays [-] and Parked / Parked At Stage
//          are written (amadeus-state.ts:418-441). The real hook then sees the
//          engine re-emit `parked` and ALLOWS the stop (empty stdout, exit 0;
//          amadeus-stop.ts:760-771), the supported multi-session exit.
//   10 PARK in an UNATTENDED autonomous Construction run is REFUSED (issue #365
//      guard, narrowed by #3016)
//       -> inject `Construction Autonomy Mode: autonomous` into a record whose
//          ledger holds no HUMAN_TURN; the REAL `amadeus-state.ts park` refuses
//          (NON-ZERO exit, stderr names the autonomous refusal — handlePark's
//          autonomy guard). The hook is NOT a second layer of that guard: with
//          Parked markers injected by hand it ALLOWS the stop in every mode.
//   11 CONVERSATIONAL carve-out (tier 3) against the REAL engine (NEW, issue
//      #365 broader reading)
//       -> keep the final stage [-] (engine emits a pending run-stage, as test
//          4 proved BLOCKS). With a Claude chat transcript (human prompt
//          answered with TEXT only, no engine call) the hook ALLOWS (empty
//          stdout, exit 0); with an amadeus-orchestrate Bash call after the prompt
//          the SAME fixture still BLOCKS (engine engaged -> mid-loop bail).
//          t121 owns the codex / autonomy / fail-closed matrix.
//
// The human-stop carve-out (Esc) needs no test: SPIKE 1 confirmed Stop hooks
// do not fire on user interrupt (the .sh's closing note, kept).
//
// Known-answer literals (read from the SHIPPED hook/tool/fixtures, not guessed):
//   - Stop hook registration:    dist settings.json:110-118 (matcher "", amadeus-stop.ts)
//   - heartbeat write:           amadeus-stop.ts:90 (stop.last)
//   - continuation budget:       amadeus-stop.ts:262 (canonical stage budget)
//   - block JSON + reason:       amadeus-stop.ts:104,298-307
//   - release + drop record:     amadeus-stop.ts:364-371 ("recursion guard released the stop")
//   - block cap env:             amadeus-stop.ts:69 (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP, default 8)
//   - status stdout:             amadeus-utility.ts:296-310 ("Status:         Completed")
//   - fixtures: state-completed.md (Status=Completed, 32/32) /
//     state-final-stage.md (feedback-optimization [-], Status=Running)
//
// The e2e test SPENDS TOKENS — driveAidlc drives a real --status turn on
// Bedrock. Tests 4-6 are deterministic (no model in the loop) but spawn the
// real engine, so they get a generous-but-bounded spawn timeout.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  docsRoot,
  hooksHealthDir,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { assertToolResultContains } from "../harness/assert.ts";
import {
  cleanupTestProject,
  sedReplaceInFile,
  seededStateFile,
  setupIntegrationProject,
} from "../harness/fixtures.ts";
import { driveAidlc } from "../harness/sdk-drive.ts";

// ---------------------------------------------------------------------------
// Timeout budget — the .sh allotted 420s for the live turn (a completed
// workflow + a read-only status print is a single bounded turn). The driver
// aborts ~15s before bun's per-test cap so a stuck turn surfaces a partial
// DriveResult rather than an opaque hang. Direct hook invocations are bounded
// at 60s each (the hook spawns the real engine once).
// ---------------------------------------------------------------------------
const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "420", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 420) * 1000;
const DRIVE_TIMEOUT_MS = Math.max(120_000, TEST_TIMEOUT_MS - 15_000);
const HOOK_SPAWN_TIMEOUT_MS = 60_000;

const BUN = process.execPath;
// P9 per-intent layout: the stop hook's heartbeat / drops re-root under
// the active intent's record (hooksHealthDir). setupIntegrationProject
// seeds state into the record so the cursor resolves for both the in-process
// resolvers below and the spawned hook.
const heartbeatPath = (proj: string): string =>
  join(hooksHealthDir(proj), "stop.last");
const dropsPath = (proj: string): string =>
  join(hooksHealthDir(proj), "stop.drops");

// Known-answer literals from the SHIPPED handlers (see header for cites).
const STATUS_COMPLETED_LINE = "Status:         Completed"; // utility.ts:302 (padEnd shape confirmed by direct run)
const PENDING_STAGE = "feedback-optimization"; // state-final-stage.md:90 ([-] final stage)
const DROP_RECORD = "durable continuation budget released the stop";

/** Pipe a real Stop payload into the SHIPPED hook with the project's REAL
 *  engine resolved via CLAUDE_PROJECT_DIR. Returns exit code + trimmed stdout
 *  (a block rides stdout; an allow is empty). Mirrors the .sh's run_real_hook. */
function runRealHook(
  proj: string,
  payload: string,
  cap?: string,
): { rc: number; out: string } {
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    CLAUDE_PROJECT_DIR: proj,
  };
  if (cap !== undefined) env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = cap;
  const res = spawnSync(BUN, [join(proj, ".claude", "hooks", "amadeus-stop.ts")], {
    input: payload,
    encoding: "utf-8",
    env,
    timeout: HOOK_SPAWN_TIMEOUT_MS,
  });
  return { rc: res.status ?? -1, out: (res.stdout ?? "").trim() };
}

describe("t122 Stop hook end-to-end — real hook, real engine (sdk+cli)", () => {
  // =========================================================================
  // (1)+(2)+(3) GENUINELY E2E: the loop runs to `done` under the LIVE hook.
  // Seed a COMPLETED workflow; drive /amadeus --status through a live driven
  // turn. The real engine answers `done`, so the live Stop hook ALLOWS and the
  // session runs to completion (no hang).
  // =========================================================================
  test(
    "(e2e) /amadeus --status over a completed workflow runs to done under the live Stop hook; done->allow trace asserted when the hook fires",
    async () => {
      const proj = setupIntegrationProject({
        withState: "state-completed.md",
        withAudit: true,
      });
      try {
        // NO stopAfterToolResult — deliberately. The Stop hook fires when the
        // turn tries to END; aborting early would skip the very moment under
        // test. The turn must run to its natural terminal result event, which
        // is itself the proof the live hook ALLOWED the stop (a block would
        // re-feed the loop; a trap would hit the drive timeout and leave
        // resultEvent undefined).
        const r = await driveAidlc("/amadeus --status", {
          projectDir: proj,
          timeoutMs: DRIVE_TIMEOUT_MS,
        });

        // .sh test 1: the live turn did not hang under the Stop hook. A
        // 124-class hang leaves resultEvent undefined (driver abort); an error
        // result is a real failure. Both red here.
        expect(r.resultEvent).toBeDefined();
        expect(r.resultEvent?.is_error).toBe(false);

        // .sh test 2: the loop ran to done — the deterministic status stdout
        // landed in a Bash tool_result and reports the workflow Completed
        // (handleStatus's verbatim emission; the .sh grepped CLAUDE_OUTPUT for
        // 'complete|100%|32/32', we pin the tool's own Status line).
        assertToolResultContains(r, "Bash", STATUS_COMPLETED_LINE);

        // .sh test 3 (GUARDED, the .sh's exact discipline): the skill-scoped
        // Stop hook does not fire on every headless turn. When the heartbeat is
        // present, the real hook fired; terminal completion proves it allowed.
        // When absent, record the skip explicitly — the run-to-done assertions
        // above hold either way (an un-fired hook simply lets the turn end).
        if (existsSync(heartbeatPath(proj))) {
          expect(readFileSync(heartbeatPath(proj), "utf-8").trim()).not.toBe("");
        } else {
          // eslint-disable-next-line no-console
          console.log(
            "t122 (e2e) SKIP live-hook fire trace — the skill-scoped Stop hook did not fire this run (firing is non-deterministic under headless turns; the loop still ran to done)",
          );
        }
      } finally {
        cleanupTestProject(proj);
      }
    },
    TEST_TIMEOUT_MS,
  );

  // =========================================================================
  // (4) PENDING DIRECTIVE -> the REAL HOOK BLOCKS, against the REAL engine.
  // The gap t121's mock omits: the real engine emits a real run-stage; the
  // real hook emits a real {"decision":"block"} re-feeding the forwarding
  // loop. Deterministic — no model in the loop.
  // =========================================================================
  test(
    "(real engine) a pending directive blocks: real {decision:block} naming the pending stage, on-task, no override verbs",
    () => {
      const proj = setupIntegrationProject({
        withState: "state-final-stage.md",
        withAudit: true,
      });
      try {
        const r = runRealHook(proj, '{"stop_hook_active":false}');
        // A block rides STDOUT; the exit code stays 0 (amadeus-stop.ts:104-107).
        expect(r.rc).toBe(0);
        // STRONGER than the .sh's substring greps: parse the JSON and assert
        // the exact decision shape + the reason's contract in one pass.
        const parsed = JSON.parse(r.out) as { decision: string; reason: string };
        expect(parsed.decision).toBe("block");
        // The reason names the pending stage and re-feeds the loop...
        expect(parsed.reason).toContain(PENDING_STAGE);
        expect(parsed.reason).toContain("amadeus-orchestrate");
        // ...and uses no override-shaped verbs (the security property SPIKE 1
        // pinned; amadeus-stop.ts:298-307 phrases continuation, never override).
        expect(/ignore|override|disregard|bypass/i.test(parsed.reason)).toBe(
          false,
        );
      } finally {
        cleanupTestProject(proj);
      }
    },
    scaleTestTime(HOOK_SPAWN_TIMEOUT_MS + 30_000),
  );

  // =========================================================================
  // (5) `done` DIRECTIVE -> the REAL HOOK ALLOWS, against the REAL engine.
  // The direct-invocation complement of the e2e pass. Deterministic.
  // =========================================================================
  test(
    "(real engine) a done directive allows: empty stdout, exit 0",
    () => {
      const proj = setupIntegrationProject({
        withState: "state-completed.md",
        withAudit: true,
      });
      try {
        const r = runRealHook(proj, '{"stop_hook_active":false}');
        expect(r.rc).toBe(0);
        expect(r.out).toBe("");
      } finally {
        cleanupTestProject(proj);
      }
    },
    scaleTestTime(HOOK_SPAWN_TIMEOUT_MS + 30_000),
  );

  // =========================================================================
  // (6) RECURSION RELEASE against the REAL engine (light re-confirm; t121
  // owns the exhaustive matrix). Real PENDING engine + counter seeded AT the
  // cap + stop_hook_active:true -> RELEASE with a drop record. A stuck loop
  // never traps the session even when the directive is genuinely pending.
  // =========================================================================
  test(
    "(real engine) the recursion guard releases a genuinely-pending stop at the cap: no block, exit 0, drop record written",
    () => {
      const proj = setupIntegrationProject({
        withState: "state-final-stage.md",
        withAudit: true,
      });
      try {
        for (let delivery = 1; delivery <= 8; delivery++) {
          const reserved = runRealHook(
            proj,
            JSON.stringify({ stop_hook_active: true, session_id: `budget-${delivery}` }),
            "8",
          );
          expect(JSON.parse(reserved.out)).toMatchObject({ decision: "block" });
        }
        const r = runRealHook(
          proj,
          '{"stop_hook_active":true,"session_id":"budget-exhausted"}',
          "8",
        );
        // Released: empty stdout + exit 0 (the engine's directive IS pending,
        // but the cap wins — decideBlock :231 returns false at count >= cap).
        expect(r.rc).toBe(0);
        expect(r.out).toBe("");
        // The drop record documents the release (amadeus-stop.ts:364-371).
        const drops = readFileSync(dropsPath(proj), "utf-8");
        expect(drops).toContain(DROP_RECORD);
      } finally {
        cleanupTestProject(proj);
      }
    },
    scaleTestTime(HOOK_SPAWN_TIMEOUT_MS + 30_000),
  );

  // =========================================================================
  // (7) HUMAN-WAIT CARVE-OUT against the REAL engine. The complement of test
  // (4): test (4) seeds the final stage [-] in-progress and proves the real
  // hook still BLOCKS the pending run-stage. Here we flip that SAME current
  // stage to [?] awaiting-approval — a conductor parked at the approval gate —
  // and prove the real hook now ALLOWS the stop even though the real engine
  // STILL emits a pending run-stage for feedback-optimization (a [?] stage is
  // in-flight, so amadeus-orchestrate.ts:1161-1176 re-emits run-stage). This is
  // the gate-spam fix proven end-to-end: same fixture, same real engine, only
  // the checkbox state differs, and the outcome flips block -> allow.
  // Deterministic (no model in the loop). t121 owns the [?]/[R]/[-] matrix.
  // =========================================================================
  test(
    "(real engine) the human-wait carve-out allows a pending stop at an approval gate: current stage [?] -> empty stdout, exit 0",
    () => {
      const proj = setupIntegrationProject({
        withState: "state-final-stage.md",
        withAudit: true,
      });
      try {
        // Flip the current stage's checkbox from [-] in-progress to [?]
        // awaiting-approval in the seeded state. The fixture's row is
        // `- [-] feedback-optimization — EXECUTE` (state-final-stage.md:86).
        sedReplaceInFile(
          seededStateFile(proj),
          `- [-] ${PENDING_STAGE} — EXECUTE`,
          `- [?] ${PENDING_STAGE} — EXECUTE`,
        );
        const r = runRealHook(proj, '{"stop_hook_active":false}');
        // The engine STILL returns a pending run-stage (the stage is in-flight
        // at [?]); the carve-out is what releases. Allowed: empty stdout, 0.
        expect(r.rc).toBe(0);
        expect(r.out).toBe("");
      } finally {
        cleanupTestProject(proj);
      }
    },
    scaleTestTime(HOOK_SPAWN_TIMEOUT_MS + 30_000),
  );

  // =========================================================================
  // (8) PENDING-QUESTION carve-out (tier 2) against the REAL engine. The
  // fixture's final stage stays [-] in-progress (so the engine genuinely emits
  // a pending run-stage), but we write a `<slug>-questions.md` with a blank
  // [Answer]: tag under the stage dir — a mid-stage clarifying question. The
  // real hook must ALLOW the stop (empty stdout, exit 0). The complement of
  // test 4: SAME [-] fixture that BLOCKS without a question now releases WITH
  // one. Deterministic. t121 owns the autonomy-guard / answered / no-file matrix.
  // =========================================================================
  test(
    "(real engine) a pending mid-stage question allows the stop: [-] + blank [Answer]: -> empty stdout, exit 0",
    () => {
      const proj = setupIntegrationProject({
        withState: "state-final-stage.md",
        withAudit: true,
      });
      try {
        // state-final-stage.md: Lifecycle Phase OPERATION, Current Stage
        // feedback-optimization at [-]. P9: the stage dir re-roots under the
        // record as <record>/operation/feedback-optimization/ (memoryPathFor shape).
        const qDir = join(
          docsRoot(proj),
          "operation",
          PENDING_STAGE,
        );
        mkdirSync(qDir, { recursive: true });
        writeFileSync(
          join(qDir, `${PENDING_STAGE}-questions.md`),
          "# Questions\n\n## Q1\nWhich rollback threshold?\n[Answer]:\n",
          "utf-8",
        );
        const r = runRealHook(proj, '{"stop_hook_active":false}');
        // [-] stage => real engine emits a pending run-stage (test 4 proved it
        // BLOCKS without a question); the blank [Answer]: now releases it.
        expect(r.rc).toBe(0);
        expect(r.out).toBe("");
      } finally {
        cleanupTestProject(proj);
      }
    },
    scaleTestTime(HOOK_SPAWN_TIMEOUT_MS + 30_000),
  );

  // =========================================================================
  // (9) PARK against the REAL engine (issue #367, the explicitly-requested
  // gap). Seed the Running final-stage workflow (the same fixture test 4 proved
  // BLOCKS a pending run-stage), then run the REAL `amadeus-orchestrate park`. It
  // shells out to `amadeus-state.ts park` which persists Parked / Parked At Stage
  // and emits WORKFLOW_PARKED (amadeus-state.ts:418-441), WITHOUT advancing any
  // stage. The real hook then consults the engine, which now re-emits the
  // terminal `parked` directive (amadeus-orchestrate.ts:1094-1102), and ALLOWS the
  // turn to end (amadeus-stop.ts:760-771), the supported multi-session exit, so
  // the agent never rubber-stamps the remaining stages to force a `done`. We
  // also pin that park did NOT flip the feedback-optimization checkbox (still
  // [-]) and DID write the Parked / Parked At Stage runtime markers.
  // Deterministic (no model in the loop). t121 owns the mock-engine matrix.
  // =========================================================================
  test(
    "(real engine) park allows the stop: real park keeps the stage [-] and writes Parked markers, then the hook allows (empty stdout, exit 0)",
    () => {
      const proj = setupIntegrationProject({
        withState: "state-final-stage.md",
        withAudit: true,
      });
      try {
        // Run the REAL park (mirrors runRealHook's spawn pattern; the engine
        // resolves the workspace via --project-dir). Park exits 0 and emits a
        // `parked` directive on stdout.
        const park = spawnSync(
          BUN,
          [
            join(proj, ".claude", "tools", "amadeus-orchestrate.ts"),
            "park",
            "--project-dir",
            proj,
          ],
          { encoding: "utf-8", timeout: HOOK_SPAWN_TIMEOUT_MS },
        );
        expect(park.status).toBe(0);
        const parkOut = JSON.parse((park.stdout ?? "").trim()) as {
          kind: string;
          stage: string;
        };
        expect(parkOut.kind).toBe("parked");
        expect(parkOut.stage).toBe(PENDING_STAGE);

        // Park must NOT advance the workflow: the final stage stays [-]
        // in-progress (parking is an inter-stage pause, never a stage
        // completion), and the runtime markers are written.
        const state = readFileSync(seededStateFile(proj), "utf-8");
        expect(state).toContain(`- [-] ${PENDING_STAGE} — EXECUTE`);
        expect(state).toMatch(/\*\*Parked\*\*:/);
        expect(state).toMatch(/\*\*Parked At Stage\*\*:\s*feedback-optimization/);

        // The real hook consults the engine (now `parked`) and ALLOWS the stop:
        // empty stdout, exit 0, the turn ends cleanly.
        const r = runRealHook(proj, '{"stop_hook_active":true}');
        expect(r.rc).toBe(0);
        expect(r.out).toBe("");
      } finally {
        cleanupTestProject(proj);
      }
    },
    scaleTestTime(HOOK_SPAWN_TIMEOUT_MS + 30_000),
  );

  // =========================================================================
  // (10) PARK in an UNATTENDED autonomous Construction run is REFUSED (issue
  // #365 guard, salvaged from the suspend branch; narrowed by #3016). Such a run
  // has no human to resume it, so `park` must refuse. This fixture's ledger
  // carries no HUMAN_TURN, which is precisely what "unattended" means to the
  // guard — a park from a real human turn is accepted (pinned by t17 and
  // t3016-park-provenance). Two deterministic surfaces:
  //   - the REAL `amadeus-state.ts park` exits NON-ZERO with stderr naming the
  //     autonomous refusal (handlePark's autonomy guard);
  //   - even if the Parked markers were somehow present, the hook's parked
  //     branch ALLOWS a durable safe-stop even under full autonomy. The generic
  //     state-tool park still refuses an unattended run; an emitted parked
  //     directive (for example REPAIR_STALLED) is terminal. Deterministic.
  // =========================================================================
  test(
    "(real engine) generic park is guarded in an unattended run, but an emitted parked directive safely ends the turn",
    () => {
      const proj = setupIntegrationProject({
        withState: "state-final-stage.md",
        withAudit: true,
      });
      try {
        // Flag the run autonomous (insert under Runtime State, mirroring the
        // skeleton-stance / parked runtime fields amadeus-state.ts writes there).
        sedReplaceInFile(
          seededStateFile(proj),
          "## Runtime State\n- **Revision Count**: 0",
          "## Runtime State\n- **Revision Count**: 0\n- **Construction Autonomy Mode**: autonomous",
        );

        // The REAL state-tool park refuses this unattended run: non-zero exit,
        // stderr names the autonomous refusal (handlePark's autonomy guard).
        const park = spawnSync(
          BUN,
          [
            join(proj, ".claude", "tools", "amadeus-state.ts"),
            "park",
            "--project-dir",
            proj,
          ],
          { encoding: "utf-8", timeout: HOOK_SPAWN_TIMEOUT_MS },
        );
        expect(park.status).not.toBe(0);
        expect((park.stderr ?? "").toLowerCase()).toContain("autonomous");

        // Inject the markers by hand to represent an authorised abnormal-stop
        // projection. The real engine re-emits `parked` and the hook allows it.
        const sf = seededStateFile(proj);
        sedReplaceInFile(
          sf,
          "- **Construction Autonomy Mode**: autonomous",
          "- **Construction Autonomy Mode**: autonomous\n- **Parked**: 2026-06-26T00:00:00Z\n- **Parked At Stage**: feedback-optimization",
        );
        const r = runRealHook(proj, '{"stop_hook_active":false}');
        expect(r.rc).toBe(0);
        expect(r.out).toBe("");
      } finally {
        cleanupTestProject(proj);
      }
    },
    scaleTestTime(HOOK_SPAWN_TIMEOUT_MS + 30_000),
  );

  // =========================================================================
  // (11) CONVERSATIONAL carve-out (tier 3, issue #365 broader reading) against
  // the REAL engine. The final stage stays [-] in-progress (so the real engine
  // emits a pending run-stage, as test 4 proved BLOCKS), but the ending turn was
  // CONVERSATIONAL: a Claude transcript whose most recent human prompt was
  // answered with TEXT only, no workflow-engine call. The real hook ALLOWS the
  // stop (empty stdout, exit 0). The complement: the SAME fixture with an
  // amadeus-orchestrate Bash call after the human prompt still BLOCKS (a conductor
  // that engaged the engine and then quit mid-loop must still be nudged).
  // Deterministic (no model in the loop). t121 owns the codex / autonomy /
  // fail-closed matrix.
  // =========================================================================
  test(
    "(real engine) a conversational turn allows the stop: chat transcript -> empty stdout; an engine Bash call after the prompt still BLOCKS",
    () => {
      const proj = setupIntegrationProject({
        withState: "state-final-stage.md",
        withAudit: true,
      });
      try {
        // Claude-format chat transcript: a human prompt answered with TEXT only.
        const chatPath = join(proj, "transcript.jsonl");
        writeFileSync(
          chatPath,
          `${JSON.stringify({
            type: "user",
            message: { role: "user", content: "Why does this stage matter?" },
          })}\n${JSON.stringify({
            type: "assistant",
            message: {
              role: "assistant",
              content: [{ type: "text", text: "It closes the feedback loop." }],
            },
          })}\n`,
          "utf-8",
        );
        const allowed = runRealHook(
          proj,
          JSON.stringify({ stop_hook_active: false, transcript_path: chatPath }),
        );
        // The real engine STILL returns a pending run-stage (the [-] stage is
        // in-flight); the conversational carve-out is what releases.
        expect(allowed.rc).toBe(0);
        expect(allowed.out).toBe("");

        // Complement: the responding turn ran the engine -> a mid-loop bail that
        // must still be nudged. Same fixture, only the transcript differs.
        const enginePath = join(proj, "transcript-engine.jsonl");
        writeFileSync(
          enginePath,
          `${JSON.stringify({
            type: "user",
            message: { role: "user", content: "Continue the workflow." },
          })}\n${JSON.stringify({
            type: "assistant",
            message: {
              role: "assistant",
              content: [
                {
                  type: "tool_use",
                  name: "Bash",
                  input: {
                    command: "bun .claude/tools/amadeus-orchestrate.ts next",
                  },
                },
              ],
            },
          })}\n`,
          "utf-8",
        );
        const blocked = runRealHook(
          proj,
          JSON.stringify({
            stop_hook_active: false,
            transcript_path: enginePath,
          }),
        );
        expect(blocked.rc).toBe(0);
        expect((JSON.parse(blocked.out) as { decision?: string }).decision).toBe(
          "block",
        );
      } finally {
        cleanupTestProject(proj);
      }
    },
    scaleTestTime(HOOK_SPAWN_TIMEOUT_MS + 30_000),
  );
});
