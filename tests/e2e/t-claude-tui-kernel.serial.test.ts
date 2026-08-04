// Local-only Claude Code rendered TUI live journey. The adapter owns a fresh
// project/home and a run-private tmux socket/session; it never touches the
// developer's default tmux server or source Claude configuration.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { claudeTuiLiveRequirementsSkipReason } from "../harness/claude-tui-live.ts";
import { ClaudeTuiAdapter } from "../harness/live-e2e/claude-tui.ts";
import {
  ClaudeAmbientCredentialSource,
  ClaudeScratchAllocator,
  probeClaudeNativeCredential,
} from "../harness/live-e2e/claude.ts";
import { createClaudeTuiJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CLAUDE_BIN = process.env.AMADEUS_CLAUDE_BIN ?? "claude";
const TMUX_BIN = process.env.AMADEUS_TMUX_BIN ?? "tmux";
const CLAUDE_DIST = join(REPO_ROOT, "dist", "claude");
const LEDGER = join(REPO_ROOT, "tests", "harness", "live-e2e", "runs.jsonl");
const SKIP_REASON = claudeTuiLiveRequirementsSkipReason({
  env: process.env,
  claudeBin: CLAUDE_BIN,
  tmuxBin: TMUX_BIN,
  distributionDir: CLAUDE_DIST,
});

function currentGitSha(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error("unable to resolve the current Git SHA");
  return result.stdout.trim();
}

describe("Claude TUI live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real claude-tui anchor journey${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const nativeKeychainAvailable = !process.env.ANTHROPIC_API_KEY &&
        probeClaudeNativeCredential(CLAUDE_BIN, process.env);
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
          ledgerPath: LEDGER,
          durability: "file-and-directory",
          credentialSource: new ClaudeAmbientCredentialSource(process.env, { nativeKeychainAvailable }),
          allocator: new ClaudeScratchAllocator({
            prefix: "amadeus-claude-tui-live-",
            distributionDir: CLAUDE_DIST,
          }),
          leakCheck: async (target) =>
            existsSync(target.scratch.root) ? ["scratch root remained after cleanup"] : [],
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
