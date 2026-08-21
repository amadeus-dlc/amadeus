// t-tui-statusline.serial.tui.test.ts — render-fidelity: the AI-DLC statusline
// draws in a REAL terminal (§5.2). A faithful port of the working spike
// tests/spike/t-tui-statusline.sh (91 lines, plan 3) — SAME flow, expressed in
// TS over the spawned tui-drive.ts subprocess instead of bash. No logic change.
//
// The flow the spike proved, step for step:
//   1. Copy the distributable exactly as the README says:
//        cp -r dist/claude/.claude/ <sandbox>/.claude/
//      (dest .claude must NOT pre-exist, or cp nests it).
//   2. Launch `claude` in a fixed-size session via the driver.
//   3. Clear the two startup modals the spike discovered:
//        a. workspace-trust dialog     -> "1. Yes, I trust"
//        b. bypass-permissions warning  -> "2. Yes, I accept"
//   4. Wait for the canonical statusline marker to paint and settle.
//   5. Assert the captured pane contains the canonical marker plus "ready" — the no-workflow
//      statusline output from amadeus-statusline.ts (no amadeus-docs/ present).
//
// COST: this launches the claude TUI but submits NO prompt, so it reaches the
// `ready` statusline state WITHOUT a Bedrock turn — it spends NO tokens (unlike
// t-tui-workshop, which is AMADEUS_TUI_LIVE-gated). It needs tmux + claude + the
// distributable; absent any of those it SKIPs with a reason.
//
// SPAWN, not import (D-TUI-7): Bun spawns the tmux-backed tui-drive.ts.

import { describe, expect, test } from "bun:test";
import {
  runTuiDriver,
  waitForTui,
  tmuxUnavailableReason,
} from "../harness/tui-client.ts";
import { copyTreeWithRetry, requireOnboardingDoc } from "../harness/fixtures.ts";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STATUSLINE_PREFIX } from "../../packages/framework/core/hooks/amadeus-statusline.ts";

const AMADEUS_SRC = join(import.meta.dir, "..", "..", "dist", "claude", ".claude");
const STATUSLINE_MARKER_PATTERN = STATUSLINE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Bun runs the TypeScript entrypoint natively on every platform.

// `wait` returns nonzero on timeout — we want a boolean for the idempotent modal
// clears (only act if the modal is present), mirroring the spike's
// `if drive wait ...; then send; fi`.
// ABSENT detection (skip-with-reason). On POSIX the substrate is tmux; claude
// is needed on every platform; the distributable must be present to copy.
function absentReason(): string | null {
  const tmuxReason = tmuxUnavailableReason();
  if (tmuxReason !== null) return tmuxReason;
  if (spawnSync("claude", ["--version"], { encoding: "utf-8" }).status !== 0) {
    return "claude CLI not found";
  }
  if (!existsSync(AMADEUS_SRC)) return `distributable missing: ${AMADEUS_SRC}`;
  return null;
}
const ABSENT_REASON = absentReason();

describe("t-tui-statusline (statusline renders in a real terminal)", () => {
  test.skipIf(ABSENT_REASON !== null)(
    `${STATUSLINE_PREFIX} ready paints in the launched TUI${ABSENT_REASON ? ` — SKIP: ${ABSENT_REASON}` : ""}`,
    () => {
      const session = `amadeus_tui_statusline_${process.pid}`;
      const sandbox = mkdtempSync(join(tmpdir(), "amadeus-tui-statusline-"));
      try {
        // --- step 1: copy the distributable per the README ---------------------
        // README: `cp -r dist/claude/.claude/ your-project/.claude/`. The
        // dest .claude must NOT pre-exist or cp nests it — we copy SRC -> <sandbox>/.claude.
        const destClaude = join(sandbox, ".claude");
        copyTreeWithRetry(AMADEUS_SRC, destClaude);
        // #3388: the onboarding doc ships as the real project-root CLAUDE.md.
        const claudeMd = join(sandbox, "CLAUDE.md");
        if (!existsSync(claudeMd)) cpSync(requireOnboardingDoc(), claudeMd);
        const settingsExample = join(destClaude, "settings.json.example");
        const settingsPath = join(destClaude, "settings.json");
        if (!existsSync(settingsPath) && existsSync(settingsExample)) cpSync(settingsExample, settingsPath);
        expect(existsSync(settingsPath)).toBe(true);
        // P0a — the retired spike (git show 4ce826b:tests/spike/t-tui-statusline.sh
        // ~L55) also required settings.json to CARRY the "statusLine" key, not just
        // exist: that key is what wires amadeus-statusline.ts into the TUI, so a copy
        // that drops it would render no statusline marker at all. Restore that guard.
        expect(readFileSync(settingsPath, "utf8")).toContain('"statusLine"');

        // --- step 2: launch the claude TUI ------------------------------------
        const started = runTuiDriver([
          "start",
          "--session",
          session,
          "--cwd",
          sandbox,
          "--width",
          "120",
          "--height",
          "40",
          "--",
          "claude",
          "--dangerously-skip-permissions",
        ]);
        expect(started.rc).toBe(0);

        // --- step 3: clear the two startup modals (idempotent) ----------------
        // 3a. workspace-trust dialog: "1. Yes, I trust this folder".
        if (waitForTui(session, "trust this folder", 60000, 600)) {
          runTuiDriver(["send", "--session", session, "--keys", "1"]);
        }
        // 3b. bypass-permissions warning: "2. Yes, I accept" (only with
        // --dangerously-skip-permissions).
        if (waitForTui(session, "Bypass Permissions mode", 15000, 600)) {
          runTuiDriver(["send", "--session", session, "--keys", "2"]);
        }

        // --- step 4: wait for the statusline marker ---------------------------
        const sawMarker = waitForTui(session, STATUSLINE_MARKER_PATTERN, 45000, 1000);
        if (!sawMarker) {
          const pane = runTuiDriver(["capture", "--session", session]).stdout;
          throw new Error(
            `statusline marker ${STATUSLINE_PREFIX} never appeared in the TUI.\n` +
              `---- last pane ----\n${pane}\n-------------------`,
          );
        }

        // --- step 5: assert the rendered statusline content -------------------
        // The no-workflow state (no amadeus-docs/ present) renders the marker plus "ready"
        // (amadeus-statusline.ts). This is the one thing the SDK path cannot see —
        // the painted statusline.
        const pane = runTuiDriver(["capture", "--session", session]).stdout;
        expect(pane).toContain(`${STATUSLINE_PREFIX} ready`);
      } finally {
        runTuiDriver(["kill", "--session", session]);
        if (existsSync(sandbox)) rmSync(sandbox, { recursive: true, force: true });
      }
    },
    90_000,
  );
});
