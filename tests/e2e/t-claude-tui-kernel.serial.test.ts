// Local-only Claude Code rendered TUI live journey. The adapter owns a fresh
// project/home and a run-private tmux socket/session; it never touches the
// developer's default tmux server or source Claude configuration.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { claudeTuiLiveRequirementsSkipReason } from "../harness/claude-tui-live.ts";
import { ClaudeTuiAdapter } from "../harness/live-e2e/claude-tui.ts";
import {
  ClaudeAmbientCredentialSource,
  ClaudeScratchAllocator,
} from "../harness/live-e2e/claude.ts";
import { createClaudeTuiJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  currentGitSha,
  LIVE_E2E_LEDGER,
  liveScratchLeakCheck,
} from "../harness/live-e2e/testing/live-kernel.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CLAUDE_BIN = process.env.AMADEUS_CLAUDE_BIN ?? "claude";
const TMUX_BIN = process.env.AMADEUS_TMUX_BIN ?? "tmux";
const CLAUDE_DIST = join(REPO_ROOT, "dist", "claude");
const SKIP_REASON = claudeTuiLiveRequirementsSkipReason({
  env: process.env,
  claudeBin: CLAUDE_BIN,
  tmuxBin: TMUX_BIN,
  distributionDir: CLAUDE_DIST,
});

describe("Claude TUI live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real claude-tui anchor journey${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const result = await runLiveJourney(
        new ClaudeTuiAdapter({
          claudeBin: CLAUDE_BIN,
          tmuxBin: TMUX_BIN,
          distributionDir: CLAUDE_DIST,
          parentEnv: process.env,
        }),
        createClaudeTuiJourney(),
        {
          env: process.env,
          gitSha: currentGitSha(),
          now: () => new Date(),
          ledgerPath: LIVE_E2E_LEDGER,
          durability: "file-and-directory",
          credentialSource: new ClaudeAmbientCredentialSource(process.env),
          allocator: new ClaudeScratchAllocator({
            prefix: "amadeus-claude-tui-live-",
            distributionDir: CLAUDE_DIST,
          }),
          leakCheck: liveScratchLeakCheck,
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "claude-tui",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
    },
    180_000,
  );
});
