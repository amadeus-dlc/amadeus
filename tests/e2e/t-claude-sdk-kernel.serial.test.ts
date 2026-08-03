// Local-only Claude Agent SDK live journey. The hard gate and capability
// preflight run before scratch allocation, worker spawn, model use, or ledger.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { claudeSdkLiveRequirementsSkipReason } from "../harness/claude-sdk-live.ts";
import { ClaudeSdkAdapter } from "../harness/live-e2e/claude-sdk.ts";
import {
  ClaudeAmbientCredentialSource,
  ClaudeScratchAllocator,
  probeClaudeNativeCredential,
} from "../harness/live-e2e/claude.ts";
import { createClaudeSdkJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CLAUDE_BIN = process.env.AMADEUS_CLAUDE_BIN ?? "claude";
const CLAUDE_DIST = join(REPO_ROOT, "dist", "claude");
const LEDGER = join(REPO_ROOT, "tests", "harness", "live-e2e", "runs.jsonl");
const SKIP_REASON = claudeSdkLiveRequirementsSkipReason({
  env: process.env,
  claudeBin: CLAUDE_BIN,
  distributionDir: CLAUDE_DIST,
  packageJsonPath: join(REPO_ROOT, "package.json"),
});

function currentGitSha(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error("unable to resolve the current Git SHA");
  return result.stdout.trim();
}

describe("Claude SDK live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real claude-sdk structured journey${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const nativeKeychainAvailable = !process.env.ANTHROPIC_API_KEY &&
        probeClaudeNativeCredential(CLAUDE_BIN, process.env);
      const result = await runLiveJourney(
        new ClaudeSdkAdapter({ distributionDir: CLAUDE_DIST, parentEnv: process.env }),
        createClaudeSdkJourney(),
        {
          env: process.env,
          gitSha: currentGitSha(),
          now: () => new Date(),
          ledgerPath: LEDGER,
          durability: "file-and-directory",
          credentialSource: new ClaudeAmbientCredentialSource(process.env, { nativeKeychainAvailable }),
          allocator: new ClaudeScratchAllocator({
            prefix: "amadeus-claude-sdk-live-",
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
          adapterId: "claude-sdk",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
    },
    120_000,
  );
});
