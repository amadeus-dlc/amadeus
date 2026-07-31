// covers: scope:fix
//
// t-tui-kiro-fix-scope.serial.test.ts — the Kiro twin of
// t-tui-t50-fix-scope: drive the fix-scope workflow through a REAL
// keystroke-driven `kiro-cli chat` on the shipped dist/kiro tree, answering
// every numbered-prose gate with "1" (the recommended option per the Kiro
// question-rendering annex), and TERMINATE on the on-disk Completed counter
// crossing the post-init milestone — the same milestone the Claude twin (and
// its .sh ancestor) pinned: init=3 + >=2 Inception stages = Completed >= 5.
//
// The gate loop is the kiro-intent-capture pattern (idle footer → send "1" →
// re-check disk): disk is the terminator, never the screen (§1.1).
//
// What it proves on the SHIPPED tree:
//   - `/amadeus fix <description>` on a fresh BROWNFIELD workspace detects
//     brownfield, skips Ideation (fix scope), and runs Initialization +
//     early Inception with real keystroke-answered gates,
//   - state: scope=fix, Project Type=Brownfield, Completed >= 5 and ==
//     the count of [x] lines,
//   - audit: WORKFLOW_STARTED + >=1 GATE_APPROVED (a human-shaped approval
//     actually landed).
//
// COST: the long Kiro journey (the Claude twin budgets 2400s). Gated behind
// AMADEUS_KIRO_TUI_LIVE=1 with skip-reasons; tmux-backend only.

import { describe, expect, test } from "bun:test";
import {
  runTuiDriver,
  waitForTui,
  tmuxUnavailableReason,
} from "../harness/tui-client.ts";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { stateFilePathFor } from "../harness/sdk-drive.ts";
import { cleanupTuiProject, KIRO_SRC, setupTuiProject } from "../harness/tui-fixtures.ts";

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "2400", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 2400) * 1000;

function send(session: string, keys: string): void {
  runTuiDriver([
    "send",
    "--session",
    session,
    "--keys",
    keys,
    "--literal",
    "--no-enter",
  ]);
  runTuiDriver(["send", "--session", session, "--keys", "Enter", "--no-enter"]);
}

const IDLE_PATTERN = "ask a question or describe a task";

function skipReason(): string | null {
  if (process.env.AMADEUS_KIRO_TUI_LIVE !== "1") {
    return "set AMADEUS_KIRO_TUI_LIVE=1 to run the live Kiro fix journey (uses Kiro credits)";
  }
  const tmuxReason = tmuxUnavailableReason();
  if (tmuxReason !== null) return tmuxReason;
  if (spawnSync("kiro-cli", ["--version"], { encoding: "utf-8" }).status !== 0) {
    return "kiro-cli not found";
  }
  if (spawnSync("kiro-cli", ["whoami"], { encoding: "utf-8" }).status !== 0) {
    return "kiro-cli not authenticated (run `kiro-cli login`)";
  }
  if (!existsSync(KIRO_SRC)) return `distributable missing: ${KIRO_SRC}`;
  return null;
}
const SKIP_REASON = skipReason();

function completedCount(sandbox: string): number {
  try {
    const s = readFileSync(stateFilePathFor(sandbox), "utf-8");
    const m = /\*\*Completed\*\*:[ \t]*(\d+)/.exec(s);
    return m ? Number.parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}

describe("t-tui-kiro-fix-scope (brownfield fix journey, numbered-prose gates)", () => {
  test.skipIf(SKIP_REASON !== null)(
    `kiro: /amadeus fix advances past init into Inception with real answered gates${SKIP_REASON ? ` — SKIP: ${SKIP_REASON}` : ""}`,
    async () => {
      const session = `amadeus_tui_kiro_bf_${process.pid}`;
      const sandbox = setupTuiProject({
        harness: "kiro",
        noAidlcDocs: true,
        brownfieldStub: true,
      });
      try {
        expect(
          runTuiDriver([
            "start",
            "--session",
            session,
            "--cwd",
            sandbox,
            "--width",
            "200",
            "--height",
            "50",
            "--",
            "kiro-cli",
            "chat",
            "--trust-all-tools",
          ]).rc,
        ).toBe(0);
        if (waitForTui(session, "Yes, I accept", 30000, 400)) {
          runTuiDriver(["send", "--session", session, "--keys", "Down", "--no-enter"]);
          runTuiDriver(["send", "--session", session, "--keys", "Enter", "--no-enter"]);
        }
        expect(waitForTui(session, IDLE_PATTERN, 60000, 600)).toBe(true);

        send(
          session,
          "/amadeus fix Fix the duplicate-todo bug when adding items quickly",
        );

        // Gate loop: idle ⇒ answer "1" ⇒ re-check disk, until Completed >= 5
        // (init 3 + >=2 Inception — the Claude twin's milestone).
        const deadline = Date.now() + Math.max(120000, TEST_TIMEOUT_MS - 120000);
        let answers = 0;
        const MAX_ANSWERS = 60;
        while (Date.now() < deadline && answers < MAX_ANSWERS) {
          if (completedCount(sandbox) >= 5) break;
          if (!waitForTui(session, IDLE_PATTERN, 300000, 1500)) continue;
          if (completedCount(sandbox) >= 5) break;
          send(session, "1");
          answers += 1;
        }
        expect(completedCount(sandbox)).toBeGreaterThanOrEqual(5);

        // State surface — the Claude twin's assertion shapes (t50:309-330):
        // loose scope/brownfield matches (live init writes vary the field
        // wording), strict counter-vs-grid consistency.
        const state = readFileSync(stateFilePathFor(sandbox), "utf-8");
        expect(state).toMatch(/^- \*\*Scope\*\*: fix$/m);
        expect(state).toMatch(/brownfield/i);
        const xCount = (state.match(/^- \[x\]/gm) ?? []).length;
        expect(completedCount(sandbox)).toBe(xCount);

        // Audit: the workflow really started and at least one gate approval
        // landed through the numbered-prose protocol.
        const audit = readAllAuditShards(sandbox);
        expect(audit).toContain("WORKFLOW_STARTED");
        expect(audit).toContain("GATE_APPROVED");
      } finally {
        runTuiDriver(["kill", "--session", session]);
        cleanupTuiProject(sandbox);
      }
    },
    TEST_TIMEOUT_MS,
  );
});
