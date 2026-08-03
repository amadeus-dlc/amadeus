// covers: file:skills/amadeus/SKILL.md
//
// t-exec-codex-status.serial.test.ts — drive `$amadeus --status` through Codex
// CLI's headless surface (`codex exec`) against the SHIPPED dist/codex tree,
// and assert on the engine's real outputs. The codex-exec driver is the
// structured "logic half" for the Codex harness — the analogue of kiro's ACP
// driver (no tmux, no painted screen; the model's final message + the
// project's on-disk state are the observables).
//
// MR-6-PROVEN (2026-06-12, codex-cli 0.139.0): the same rig shape
// ran a FULL poc workflow (INIT → 7 stages → Completed, 43 audit rows) with
// hooks live — transcript archived in the journey write-up. This test pins
// the cheap status journey so a local live run can re-verify the shipped tree
// end-to-end without burning a whole workflow.
//
// SCOPE: the no-state case ONLY (status with no workflow = print-directive
// terminal arm — turn-stable). With an ACTIVE workflow the conductor may
// legitimately resume it inside the same exec turn (the forwarding loop lives
// in-turn), so a with-state "status is read-only" assert is not turn-stable
// here; that contract holds on the interactive TUI, where turn boundaries are
// human-paced.
//
// What this proves on the SHIPPED tree, structurally:
//   - skill discovery at .agents/skills/amadeus under a real codex session;
//   - the engine's print-directive terminal arm (status names no workflow);
//   - nothing is scaffolded by a read-only utility (no amadeus-docs creature).
//
// LIVE GATE: disabled on GitHub Actions. Locally, requires
// AMADEUS_CODEX_EXEC_LIVE=1 + a codex >= 0.139.0 binary
// (AMADEUS_CODEX_BIN or PATH) + AMADEUS_CODEX_EXEC_AUTH_HOME pointing to a
// normal Codex auth.json. Skips cleanly otherwise.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  codexExecChildEnvironment,
  codexExecLiveRequirementsSkipReason,
  setupCodexExecProject,
} from "../harness/codex-exec-live.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CODEX_DIST = join(REPO_ROOT, "dist", "codex");
const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const AUTH_HOME = process.env.AMADEUS_CODEX_EXEC_AUTH_HOME;
const OPENAI_MODEL = process.env.AMADEUS_CODEX_EXEC_MODEL ?? "gpt-5.6-sol";

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "600", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 600) * 1000;

const SKIP_REASON = codexExecLiveRequirementsSkipReason({
  env: process.env,
  codexBin: CODEX_BIN,
  distributionDir: CODEX_DIST,
});

const PROJECT_SETUP = {
  prefix: "codex-exec-",
  authHome: AUTH_HOME,
  distributionDir: CODEX_DIST,
  repositoryRoot: REPO_ROOT,
  model: OPENAI_MODEL,
  rulesDir: ".codex/amadeus-rules",
};

function execCodex(proj: string, home: string, prompt: string): { rc: number; out: string } {
  const r = spawnSync(CODEX_BIN, ["exec", prompt], {
    cwd: proj,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: codexExecChildEnvironment(home),
    timeout: TEST_TIMEOUT_MS,
  });
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
}

describe("t-exec-codex-status — $amadeus --status on the shipped dist/codex via codex exec", () => {
  test.skipIf(SKIP_REASON !== null)(
    `no-state: status renders 'no active workflow' and scaffolds nothing${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    () => {
      const { proj, home, cleanup } = setupCodexExecProject(PROJECT_SETUP);
      try {
        const r = execCodex(proj, home, "Use the $amadeus skill to run: /amadeus --status");
        expect(r.rc).toBe(0);
        // The engine's no-workflow status text, surfaced verbatim by the
        // print-directive terminal arm.
        expect(r.out.toLowerCase()).toContain("no active");
        // Read-only: the status path must not scaffold a workspace. The
        // hooks-health heartbeat dir is hook plumbing (the byte-shared Stop
        // hook writes it on every turn, same as the Claude harness) — the
        // workspace signals are the state file and the scaffold tree.
        expect(existsSync(join(proj, "amadeus-docs", "amadeus-state.md"))).toBe(false);
        expect(existsSync(join(proj, "amadeus-docs", "ideation"))).toBe(false);
      } finally {
        cleanup();
      }
    },
    TEST_TIMEOUT_MS,
  );
});
