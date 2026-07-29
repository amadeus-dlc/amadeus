// covers: hook:amadeus-statusline
//
// t-tui-journey-orientation.serial.test.ts — the RENDER-HALF of the P10 / Stage E
// workspace journey (the logic-half rides the SDK·ACP·exec drivers in
// t-journey-workspace.sdk / t-acp-kiro-journey-workspace / t-exec-codex-journey-
// workspace). It proves the vision §3 "you are here" promise PAINTS on a REAL
// terminal: when more than one space exists, the statusline shows the active
// `<space> · <intent> · <phase>` orientation prefix as a persistent cwd-style
// breadcrumb, so work never lands in the wrong space.
//
// WHY THIS IS THE NET-NEW RENDER ASSERTION (verified 2026-06-19):
//   - The deterministic twin t168 already SPAWNS the shipped hook directly and
//     asserts the `teamB · export-bug · CONSTRUCTION` two-space string — so the
//     prefix LOGIC is unit-proven token-free. What t168 CANNOT prove is that the
//     prefix survives the real TUI render path (the host pipes the workspace
//     JSON to the statusLine command and paints its stdout into the pane). This
//     test closes exactly that gap, live, in tmux.
//   - The sibling render test t-tui-render-statusline.serial seeds a SINGLE-space
//     fixture (setupTuiProject with no secondSpace), so its statusline never
//     paints the `<space> ·` segment — it matches `[Amadeus-DLC].*IDEATION` loosely and
//     asserts the bar/counter/stage, never the orientation prefix. So the
//     >1-space orientation paint is genuinely net-new here, riding the new
//     `secondSpace` fixture variant (tui-fixtures.ts).
//
// HARNESS MATRIX — Claude TUI ONLY, by surface limitation (stated, not faked):
//   The orientation prefix is the amadeus-statusline.ts hook, wired ONLY through
//   Claude Code's settings.json `statusLine` key (dist/claude/.claude/
//   settings.json). Kiro has NO statusline surface at all — dist/kiro/AGENTS.md
//   and harness/kiro/skills/amadeus/SKILL.md both state "there is no statusline;
//   use /amadeus --status and the progress lines at gates", and dist/kiro ships
//   amadeus-statusline.ts but nothing invokes it as a status row. Codex likewise
//   has no statusline host (and no TUI surface — tui-drive.ts has zero codex
//   awareness). So the render-half statusline-orientation matrix is Claude-only:
//   there is no Kiro/Codex statusline pane to scrape. A Kiro-TUI sibling was NOT
//   written because the surface it would assert against does not exist — mirror
//   the plan's "stated, not faked" honesty rather than a hollow skip. The Kiro
//   render path IS exercised (read-only status through the print-directive arm)
//   by t-tui-kiro-status.serial; that surfaces the same scope/stage strings, but
//   in the chat transcript, not a statusline.
//
// COST: launches the claude TUI but submits NO prompt — it reaches the workflow
// statusline purely from the seeded per-intent state file (state-mid-ideation),
// spending NO Bedrock tokens, exactly like t-tui-render-statusline. Still gated
// on AMADEUS_TUI_LIVE (the watched live-TUI tier) + tmux + claude + the
// distributable; absent any of those it SKIPs with a reason — never a hollow
// pass. (P10 hazard: the live-TUI legs are flaky-by-nature; re-run a flake ~5x
// watched before calling it red.)
//
// SPAWN, not import (D-TUI-7): Bun spawns the tmux-backed tui-drive.ts.

import { describe, expect, test } from "bun:test";
import {
  runTuiDriver,
  waitForTui,
  tmuxUnavailableReason,
} from "../harness/tui-client.ts";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AMADEUS_SRC, cleanupTuiProject, setupTuiProject } from "../harness/tui-fixtures.ts";

const FIXTURE = join(import.meta.dir, "..", "fixtures", "state-mid-ideation.md");

// Gate: the watched live-TUI tier (AMADEUS_TUI_LIVE) + the substrate. On POSIX the
// substrate is tmux; claude is needed on every platform; the distributable +
// the fixture must be present. A creds-less / binary-less machine SKIPs with a
// reason — never a hard fail (the P10 live-leg posture).
function absentReason(): string | null {
  if (process.env.AMADEUS_TUI_LIVE !== "1") {
    return "set AMADEUS_TUI_LIVE=1 to run the live Claude TUI orientation render (watched tier)";
  }
  const tmuxReason = tmuxUnavailableReason();
  if (tmuxReason !== null) return tmuxReason;
  if (spawnSync("claude", ["--version"], { encoding: "utf-8" }).status !== 0) {
    return "claude CLI not found";
  }
  if (!existsSync(AMADEUS_SRC)) return `distributable missing: ${AMADEUS_SRC}`;
  if (!existsSync(FIXTURE)) return `fixture missing: ${FIXTURE}`;
  return null;
}
const ABSENT_REASON = absentReason();

// Launch the claude TUI on the >1-space + active-intent fixture and return the
// captured pane once the orientation-bearing workflow statusline has painted.
function captureOrientationStatusline(): string {
  const session = `amadeus_tui_journey_orient_${process.pid}`;
  // setupTuiProject seeds the per-intent shell (default space's record + cursors)
  // and writes the mid-ideation state into it; secondSpace seeds a non-default
  // sibling space so listSpaces().length > 1 and the orientation prefix paints
  // its `<space> ·` segment. With the active space still `default`, the prefix
  // renders `default · fixture · IDEATION …`. No prompt, no tokens.
  const sandbox = setupTuiProject({ withState: "state-mid-ideation.md", secondSpace: true });
  try {
    // The statusLine key is what wires amadeus-statusline.ts into the TUI; a copy
    // that dropped it would render no [Amadeus-DLC] line at all.
    expect(readFileSync(join(sandbox, ".claude", "settings.json"), "utf8")).toContain(
      '"statusLine"',
    );

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

    // Clear the two startup modals (idempotent — only act if present).
    if (waitForTui(session, "trust this folder", 60000, 600)) {
      runTuiDriver(["send", "--session", session, "--keys", "1"]);
    }
    if (waitForTui(session, "Bypass Permissions mode", 15000, 600)) {
      runTuiDriver(["send", "--session", session, "--keys", "2"]);
    }

    // Wait for the FULL orientation prefix to paint: `default · fixture ·`
    // immediately before IDEATION. This is the net-new assertion — a single-space
    // fixture would paint only `fixture · IDEATION` (no space token), so matching
    // the space segment proves the >1-space rule fired live in the pane.
    const sawMarker = waitForTui(session, "default · fixture · IDEATION", 45000, 1000);
    const pane = runTuiDriver(["capture", "--session", session]).stdout;
    if (!sawMarker) {
      throw new Error(
        `orientation statusline "default · fixture · IDEATION" never painted.\n` +
          `---- last pane ----\n${pane}\n-------------------`,
      );
    }
    return pane;
  } finally {
    runTuiDriver(["kill", "--session", session]);
    cleanupTuiProject(sandbox);
  }
}

describe("t-tui-journey-orientation (live Claude TUI — the render-half 'you are here')", () => {
  let PANE: string | null = null;
  function pane(): string {
    if (PANE === null) PANE = captureOrientationStatusline();
    return PANE;
  }

  // The full orientation prefix: space token (because >1 space) + intent slug +
  // phase, in the `<space> · <intent> · <phase>` order the builder emits. This is
  // the genuinely-new render assertion — no existing TUI test scrapes the space
  // segment (t-tui-render-statusline seeds a single space).
  test.skipIf(ABSENT_REASON !== null)(
    `paints the "default · fixture · IDEATION" orientation prefix (>1 space)${ABSENT_REASON ? ` — SKIP: ${ABSENT_REASON}` : ""}`,
    () => {
      expect(pane()).toContain("default · fixture · IDEATION");
    },
    90_000,
  );

  // The orientation rides BEFORE the phase progress bar — the same painted line
  // also carries the seeded stage, so the breadcrumb and the stage coexist on the
  // one statusline (proves the prefix didn't displace the rest of the row).
  test.skipIf(ABSENT_REASON !== null)(
    `the oriented line still carries the stage "> Feasibility"${ABSENT_REASON ? ` — SKIP: ${ABSENT_REASON}` : ""}`,
    () => {
      expect(pane()).toContain("> Feasibility");
    },
    90_000,
  );
});
