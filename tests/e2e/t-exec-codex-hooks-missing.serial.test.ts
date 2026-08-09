// covers: function:amadeus-orchestrate:refuseInactiveCodexHooks
//
// t-exec-codex-hooks-missing.serial.test.ts — the #2703 fail-fast guard, proven
// on the SHIPPED dist/codex tree through Codex CLI's headless surface
// (`codex exec`), the same logic-half rig the sibling codex-exec journeys use.
//
// WHAT IT PINS. `.codex/hooks.json` is per-clone runtime state and gitignored,
// so a fresh clone or worktree carries only the tracked
// `.codex/hooks.json.example`. Without the active file Codex fires no Amadeus
// hook at all, no HUMAN_TURN is ever minted, and the workflow used to run
// happily until it deadlocked — silently — at the first human checkpoint. The
// engine now refuses at `next` and names the recovery. The unit-layer contract
// lives in t513; this test proves the refusal survives the real distribution and
// a real Codex session, and that activating the file clears it.
//
// EXPLICITLY OUT OF SCOPE: whether headless `codex exec` fires the
// UserPromptSubmit hook (the `mint` target) at all. The sibling journeys already
// route around that question by naming deterministic utilities directly, and the
// mint → HUMAN_TURN → checkpoint chain is pinned off the adapter's own stdin
// surface in t514. This test is about the guard, not about presence.
//
// The setup helper normally activates hooks.json for us; the missing-file state
// is produced by deleting it in prepareProject, AFTER the helper's copy — so the
// fixture differs from a healthy install in exactly the one byte-level fact
// under test, and `.codex/hooks.json.example` (which the guard also requires) is
// left in place.
//
// LIVE GATE: disabled on GitHub Actions. Locally, requires
// AMADEUS_CODEX_EXEC_LIVE=1 + a codex >= 0.139.0 binary
// (AMADEUS_CODEX_BIN or PATH) and OPENAI_API_KEY. Skips cleanly otherwise.
// Serial.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  codexExecChildEnvironment,
  codexExecLiveRequirementsSkipReason,
  setupCodexExecProject,
} from "../harness/codex-exec-live.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CODEX_DIST = join(REPO_ROOT, "dist", "codex");
const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const OPENAI_MODEL = process.env.AMADEUS_CODEX_EXEC_MODEL ?? "gpt-5.6-sol";

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "900", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 900) * 1000;
const EXEC_MS = 420_000;

const SKIP_REASON = codexExecLiveRequirementsSkipReason({
  env: process.env,
  codexBin: CODEX_BIN,
  distributionDir: CODEX_DIST,
});

const ACTIVE_HOOKS = join(".codex", "hooks.json");
const CANONICAL_HOOKS = join(".codex", "hooks.json.example");

// The guard's recovery command, as the operator must see it. Asserting on the
// command rather than the prose keeps the test tied to the actionable half of
// the message.
const RECOVERY_FRAGMENT = "amadeus-codex-hooks.ts activate";

const PROJECT_SETUP = {
  prefix: "codex-exec-hooks-missing-",
  distributionDir: CODEX_DIST,
  repositoryRoot: REPO_ROOT,
  model: OPENAI_MODEL,
  rulesDir: ".codex/amadeus-rules",
  // Undo the helper's activation: this fixture IS the un-activated clone.
  prepareProject: (projectDir: string): void => {
    rmSync(join(projectDir, ACTIVE_HOOKS), { force: true });
  },
};

// Name the exact engine command and stop. A freeform `/amadeus` prompt would let
// the conductor pick its own route (and, once hooks are active, run a whole
// stage); the guard sits at `next`, so `next` is what we drive.
function nextPrompt(): string {
  return (
    "Run this exact command with the shell, then report its complete output " +
    "verbatim and stop. Do NOT try to repair, activate, or work around anything, " +
    "and do NOT run any other amadeus command: " +
    "bun .codex/tools/amadeus-orchestrate.ts next"
  );
}

function execCodex(proj: string, home: string, prompt: string): { rc: number; out: string } {
  const r = spawnSync(CODEX_BIN, ["exec", prompt], {
    cwd: proj,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: codexExecChildEnvironment(home),
    timeout: EXEC_MS,
  });
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
}

describe("t-exec-codex-hooks-missing — the #2703 fail-fast guard on the shipped dist/codex", () => {
  test.skipIf(SKIP_REASON !== null)(
    `next refuses without .codex/hooks.json and proceeds once activated${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    () => {
      const { proj, home, root, cleanup } = setupCodexExecProject(PROJECT_SETUP);
      try {
        // The fixture precondition, asserted rather than assumed: canonical
        // present, active absent.
        expect(existsSync(join(proj, CANONICAL_HOOKS))).toBe(true);
        expect(existsSync(join(proj, ACTIVE_HOOKS))).toBe(false);

        // (a) The refusal, with its recovery command, reaches the operator.
        const refused = execCodex(proj, home, nextPrompt());
        expect(refused.rc).toBe(0);
        expect(refused.out).toContain(ACTIVE_HOOKS);
        expect(refused.out).toContain(RECOVERY_FRAGMENT);

        // (b) Activate exactly as the message instructs (copy canonical to
        // active — what `amadeus-codex-hooks.ts activate` does) and re-drive.
        copyFileSync(join(proj, CANONICAL_HOOKS), join(proj, ACTIVE_HOOKS));
        const allowed = execCodex(proj, home, nextPrompt());
        expect(allowed.rc).toBe(0);
        expect(allowed.out).not.toContain(RECOVERY_FRAGMENT);
      } finally {
        cleanup();
        // Scratch leak check: the helper's verified removal must leave nothing
        // behind — an isolated CODEX_HOME lives under this root.
        expect(existsSync(root)).toBe(false);
      }
    },
    TEST_TIMEOUT_MS,
  );
});
