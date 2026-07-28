// covers: harness-instrument:tui-drive-calibration
//
// t-tui-preflight.serial.tui.test.ts — the tui tier's CAPABILITY GATE (§6.2).
//
// This is the FIRST file in the tui tier (it is `*.serial.*`, so the runner's
// serial partition runs it before the parallel fan-out — run-tests.sh:495-497),
// and it gates the rest: it proves the terminal rendering SUBSTRATE actually
// WORKS, with the t19 discipline of distinguishing ABSENT (skip-with-reason)
// from PRESENT-BUT-BROKEN (fail loud). It spends NO tokens and never touches
// claude — it drives a known-answer target in tmux and asserts the captured
// grid carries the sentinel.
//
// Why a probe, not a bare `command -v` (§6.2): presence != working.
//   - tmux can be installed yet `capture-pane` returns nothing useful. A
//     `command -v` does not detect that.
//
// SPAWN, not import (D-TUI-7): this `.test.ts` spawns tui-drive.ts as a Bun
// subprocess on every platform. The same spawn-not-import pattern is used by
// t17/t27 for CLI tools.
//
// The `covers:` header above claims the tui-drive instrument-calibration unit
// this preflight doubles as (§6.2/§7) — a harness-instrument claim, the same
// no-op-join form gen-coverage-registry.test.ts uses for the coverage generator
// (there is no enumerated `harness-instrument` unit class; the claim documents
// the calibration intent without inflating any covered count). The six
// `render-surface:*` statusline units the registry now enumerates are NOT
// claimed by these tests: as written, the tui tests assert the base `[Amadeus-DLC]
// ready` render, the live phase token, and the AUQ menu strip/footer — none is a
// glyph-level assertion of a specific statusline branch (phase bar / counter /
// stage name / colour / align / COMPLETE). Per the coverage-plan §4.2 "no
// guarantee weaker than the claim" rule they stay DEFERRED-tui (honestly listed),
// until a test asserts a specific branch's painted output.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Locate the driver. Bun runs the TypeScript entrypoint directly (§2.1, D-TUI-7).
// ---------------------------------------------------------------------------
const DRIVER = join(import.meta.dir, "..", "harness", "tui-drive.ts");

// The known-answer target — no claude, no tokens. A bash printf holds the pane
// open. The driver's `start` runs `<cmd...>` after `--`.
const SENTINEL = "AMADEUS_TUI_PREFLIGHT_OK";
const TARGET_CMD = ["bash", "-c", `printf '${SENTINEL}\\n'; sleep 10`];

interface Run {
  rc: number;
  stdout: string;
  stderr: string;
}

function drive(args: string[]): Run {
  const res = spawnSync(process.execPath, [DRIVER, ...args], { encoding: "utf-8" });
  return { rc: res.status ?? -1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

// ---------------------------------------------------------------------------
// ABSENT detection — runs OUTSIDE the test body so skipIf can gate the whole
// describe. A clean ABSENT result SKIPs with a reason (the .test.ts analogue of
// the spikes' TAP `1..0 # SKIP`); the band's other files then also skip. A
// PRESENT-but-BROKEN substrate is NOT caught here — it is caught inside the test
// and FAILS LOUD, so a contributor gets one clear diagnostic line.
// ---------------------------------------------------------------------------
function substrateAbsentReason(): string | null {
  const tmuxOk = spawnSync("tmux", ["-V"], { encoding: "utf-8" }).status === 0;
  if (!tmuxOk) return "tmux not found";
  return null;
}

const ABSENT_REASON = substrateAbsentReason();

describe("t-tui-preflight (terminal substrate capability gate)", () => {
  // skipIf carries the reason in the test name so the SKIP is never silent —
  // it surfaces in the bun output and the junit <skipped/> the runner aggregates.
  test.skipIf(ABSENT_REASON !== null)(
    `substrate present and a known-answer round-trip reconstructs the grid${
      ABSENT_REASON ? ` — SKIP: ${ABSENT_REASON}` : ""
    }`,
    () => {
      const session = `amadeus_tui_preflight_${process.pid}`;
      const sandbox = mkdtempSync(join(tmpdir(), "amadeus-tui-preflight-"));
      try {
        // 1) start the known-answer target in a fixed-size session.
        const started = drive([
          "start",
          "--session",
          session,
          "--cwd",
          sandbox,
          "--width",
          "80",
          "--height",
          "24",
          "--",
          ...TARGET_CMD,
        ]);
        // A start spawn-failure (exit 2 / nonzero) IS the present-but-broken
        // case — fail loud with the driver's stderr, never skip past it.
        if (started.rc !== 0) {
          throw new Error(
            `tui-drive start failed (rc=${started.rc}) — substrate present but ` +
              `the driver could not launch a session.\n${started.stderr}`,
          );
        }

        // 2) wait for the sentinel to paint on the reconstructed grid. A timeout
        // here is the BROKEN signal: the substrate resolved (we are past the
        // ABSENT skip) but capture returned nothing useful — e.g. tmux
        // capture-pane returning empty.
        const waited = drive([
          "wait",
          "--session",
          session,
          "--pattern",
          SENTINEL,
          "--timeout-ms",
          "15000",
          "--stable-ms",
          "300",
        ]);
        if (waited.rc !== 0) {
          throw new Error(
            `tui-drive wait timed out for the known-answer sentinel — the ` +
              `substrate is PRESENT but BROKEN (tmux capture empty?). ` +
              `This is a fail-loud diagnostic, not a skip.\n${waited.stderr}`,
          );
        }

        // 3) capture the grid and assert the sentinel is really there — proves
        // the round-trip (send-or-emit -> render -> capture) closes.
        const captured = drive(["capture", "--session", session]);
        expect(captured.rc).toBe(0);
        expect(captured.stdout).toContain(SENTINEL);
      } finally {
        drive(["kill", "--session", session]);
        if (existsSync(sandbox)) rmSync(sandbox, { recursive: true, force: true });
      }
    },
  );
});
