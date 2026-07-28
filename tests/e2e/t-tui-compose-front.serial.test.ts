// covers: file:skills/amadeus/SKILL.md, file:agents/amadeus-composer-agent.md
//
// t-tui-compose-front.serial.test.ts - the P2 front-composer journey through a
// REAL claude TUI (the render half of what t192 proves on the SDK): drive
// `/amadeus compose "<task>"` on a fresh workspace, answer the rendered
// approve/edit/reject gate by keystroke (Enter = the leading option, which the
// SKILL.md composer block pins to Approve), and TERMINATE on the born state
// landing on disk.
//
// What it proves on the SHIPPED tree that the SDK path cannot see: the compose
// gate RENDERS as a real AskUserQuestion menu a human answers, and answering
// it drives the write + same-turn birth - one /amadeus invocation, keystrokes
// only.
//
// Disk assertions (the same P2 contract t192 pins):
//   - an 11th scope .md + an 11th scope-grid.json key exist (the two-file write),
//   - the born amadeus-state.md carries the composed (non-stock) scope.
//
// SPENDS Claude credits - gated behind AMADEUS_TUI_LIVE=1 with skip-reasons;
// tmux-backend only (mirrors t-tui-t50's gating).

import { describe, expect, test } from "bun:test";
import {
  runTuiDriver,
  waitForTui,
  runTuiDriverToExit,
  tmuxUnavailableReason,
} from "../harness/tui-client.ts";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stateFilePathFor } from "../harness/sdk-drive.ts";
import { cleanupTuiProject, setupTuiProject } from "../harness/tui-fixtures.ts";

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "1800", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 1800) * 1000;

const TASK =
  "harden the deployment pipeline and add observability for our existing service - no new features, compose a custom plan for exactly this";

const STOCK_SCOPES = new Set([
  "bugfix", "chore", "enterprise", "feature", "infra", "mvp", "poc", "refactor",
  "security-patch", "workshop",
]);

function skipReason(): string | null {
  if (process.env.AMADEUS_TUI_LIVE !== "1") {
    return "set AMADEUS_TUI_LIVE=1 to run the live compose TUI journey (uses Claude credits)";
  }
  const tmuxReason = tmuxUnavailableReason();
  if (tmuxReason !== null) return tmuxReason;
  if (spawnSync("claude", ["--version"], { encoding: "utf-8" }).status !== 0) {
    return "claude CLI not found";
  }
  return null;
}
const SKIP_REASON = skipReason();

describe("t-tui compose front journey (live claude TUI)", () => {
  test.skipIf(SKIP_REASON !== null)(
    `/amadeus compose renders the gate; answering births the composed scope${SKIP_REASON ? ` - SKIP: ${SKIP_REASON}` : ""}`,
    async () => {
      const session = `amadeus_tui_compose_${process.pid}`;
      const sandbox = setupTuiProject({ brownfieldStub: true, noAidlcDocs: true });
      try {
        expect(runTuiDriver([
          "start", "--session", session, "--cwd", sandbox,
          "--width", "120", "--height", "45",
          "--", "claude", "--dangerously-skip-permissions",
        ]).rc).toBe(0);

        if (waitForTui(session, "trust this folder", 60000, 600)) {
          runTuiDriver(["send", "--session", session, "--keys", "1"]);
        }
        if (waitForTui(session, "Bypass Permissions mode", 15000, 600)) {
          runTuiDriver(["send", "--session", session, "--keys", "2"]);
        }
        expect(waitForTui(session, "\\[AIDLC\\].*ready", 45000, 800)).toBe(true);

        runTuiDriver([
          "send", "--session", session, "--keys",
          `/amadeus compose "${TASK}"`,
          "--literal", "--no-enter",
        ]);
        runTuiDriver(["send", "--session", session, "--keys", "Enter", "--no-enter"]);

        // Answer every rendered gate with the leading (Recommended/Approve)
        // option; terminate the moment the born state carries ANY Scope field
        // (birth = the journey's last deterministic mutation). No per-gate
        // timeout - the disk terminator is the pass condition.
        const gateRc = await runTuiDriverToExit([
          "answer-gate",
          "--session", session,
          "--project-dir", sandbox,
          "--until-state-field", "Scope=\\S+",
          "--overall-timeout-ms", String(Math.max(60000, TEST_TIMEOUT_MS - 30000)),
        ]);
        expect(gateRc).toBe(0);

        // The two-file write landed: an 11th scope .md + an 11th grid key.
        const scopesDir = join(sandbox, ".claude", "scopes");
        const scopeFiles = readdirSync(scopesDir).filter(
          (f) => f.startsWith("amadeus-") && f.endsWith(".md"),
        );
        expect(scopeFiles.length).toBe(11);
        const grid = JSON.parse(
          readFileSync(join(sandbox, ".claude", "tools", "data", "scope-grid.json"), "utf-8"),
        ) as Record<string, unknown>;
        expect(Object.keys(grid).length).toBe(11);
        const composed = Object.keys(grid).find((k) => !STOCK_SCOPES.has(k));
        expect(composed).toBeDefined();

        // The born state froze the composed scope.
        const stateMd = readFileSync(stateFilePathFor(sandbox), "utf8");
        expect(stateMd).toContain(`- **Scope**: ${composed}`);
      } finally {
        runTuiDriver(["kill", "--session", session]);
        cleanupTuiProject(sandbox);
      }
    },
    TEST_TIMEOUT_MS,
  );
});
