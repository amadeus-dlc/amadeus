// covers: file:skills/amadeus/SKILL.md
//
// t-print-kimi-status.serial.test.ts — drive `/skill:amadeus --status`
// through the Kimi Code CLI's headless surface (`kimi -p`) against the SHIPPED
// dist/kimi tree, and assert on the engine's real output. The kimi-print
// driver is the kimi analogue of the codex-exec driver: no tmux, no painted
// screen; the model's final message + the project's on-disk state are the
// observables (FR-9a, journey 1).
//
// B5-DOGFOOD-PROVEN (2026-07-26, kimi CLI on the developer machine): the same
// prompt against the repo-root .kimi-code tree printed the engine's status
// output, and with hooks wired the prompt minted HUMAN_TURN into the audit
// shard (distribution-enumeration/code-generation/code-summary.md §dogfood
// 証跡). This test pins the cheap status journey so the shipped tree can be
// re-verified end-to-end without burning a whole workflow.
//
// SCOPE: the no-state case ONLY (status with no workflow = print-directive
// terminal arm — turn-stable), mirroring t-exec-codex-status.
//
// What this proves on the SHIPPED tree, structurally:
//   - skill discovery at .kimi-code/skills/amadeus under a real kimi session;
//   - the engine's print-directive terminal arm (status names no workflow);
//   - nothing is scaffolded by a read-only utility (no intents/ creature).
//
// HERMETICITY (BR-2): the project is a tmp copy of dist/kimi and
// KIMI_CODE_HOME points at a tmp home, so the developer's real
// ~/.kimi-code/config.toml is never read or written and hooks are unwired
// (no managed block in tmp → fail-open). Auth reaches the tmp home via
// symlinked credentials entries only — never a copy (see the driver's
// AUTH LOCATION note).
//
// LIVE GATE: requires AMADEUS_KIMI_PRINT_LIVE=1 + a kimi binary
// (AMADEUS_KIMI_BIN or PATH). SPENDS Kimi credits — exactly one short print
// session per run (CC-1). Skips cleanly otherwise.

import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  KIMI_DIST,
  prepareKimiHome,
  runPrintSession,
  skipReason,
  writeKimiConfig,
} from "../harness/kimi-print-drive.ts";

const SKIP_REASON = skipReason();

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "600", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 600) * 1000;

// A scratch install: dist/kimi copied verbatim (the .kimi-code payload, the
// amadeus/ workspace shell, AGENTS.md), plus a scratch KIMI_CODE_HOME with
// auth supplied by symlink (never a copy). The tmp config.toml carries only
// `default_model` (kimi refuses to start a session without one) and no
// managed block, so hooks stay unwired for this journey.
function setupKimiProject(): { proj: string; home: string; root: string } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kimi-print-")));
  const proj = join(root, "proj");
  const home = join(root, "kimi-home");
  cpSync(join(KIMI_DIST, ".kimi-code"), join(proj, ".kimi-code"), { recursive: true });
  cpSync(join(KIMI_DIST, "amadeus"), join(proj, "amadeus"), { recursive: true });
  cpSync(join(KIMI_DIST, "AGENTS.md"), join(proj, "AGENTS.md"));
  prepareKimiHome(home);
  writeKimiConfig(home);
  return { proj, home, root };
}

describe("t-print-kimi-status — /skill:amadeus --status on the shipped dist/kimi via kimi -p", () => {
  test.skipIf(SKIP_REASON !== null)(
    `no-state: status renders 'no active workflow' and scaffolds nothing${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const { proj, home, root } = setupKimiProject();
      try {
        const r = await runPrintSession({
          cwd: proj,
          prompt: "/skill:amadeus --status",
          env: { KIMI_CODE_HOME: home },
        });
        expect(r.error).toBeUndefined();
        expect(r.timedOut).toBe(false);
        expect(r.rc).toBe(0);
        // The engine's no-workflow status text, surfaced verbatim by the
        // print-directive terminal arm (byte-identical engine on every
        // harness — the codex journey asserts the same string).
        expect(r.out.toLowerCase()).toContain("no active");
        // Read-only: the status path must not birth an intent. The shipped
        // shell carries amadeus/active-space + spaces/default/memory only, so
        // any intents/ tree is scaffolding.
        expect(existsSync(join(proj, "amadeus", "spaces", "default", "intents"))).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    TEST_TIMEOUT_MS,
  );
});
