// Local-only Claude Agent SDK live journey. The hard gate and capability
// preflight run before scratch allocation, worker spawn, model use, or ledger.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { claudeSdkLiveRequirementsSkipReason } from "../harness/claude-sdk-live.ts";
import { ClaudeSdkAdapter } from "../harness/live-e2e/claude-sdk.ts";
import {
  ClaudeAmbientCredentialSource,
  ClaudeScratchAllocator,
} from "../harness/live-e2e/claude.ts";
import { sanitizeText } from "../harness/live-e2e/contract.ts";
import { createClaudeSdkJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  currentGitSha,
  LIVE_E2E_LEDGER,
  liveScratchLeakCheck,
} from "../harness/live-e2e/testing/live-kernel.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CLAUDE_BIN = process.env.AMADEUS_CLAUDE_BIN ?? "claude";
const CLAUDE_DIST = join(REPO_ROOT, "dist", "claude");
const SKIP_REASON = claudeSdkLiveRequirementsSkipReason({
  env: process.env,
  claudeBin: CLAUDE_BIN,
  distributionDir: CLAUDE_DIST,
  packageJsonPath: join(REPO_ROOT, "package.json"),
});

describe("Claude SDK live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real claude-sdk structured journey${SKIP_REASON ? ` [SKIP: ${sanitizeText(SKIP_REASON, 120)}]` : ""}`,
    async () => {
      const result = await runLiveJourney(
        new ClaudeSdkAdapter({ distributionDir: CLAUDE_DIST, parentEnv: process.env }),
        createClaudeSdkJourney(),
        {
          env: process.env,
          gitSha: currentGitSha(),
          now: () => new Date(),
          ledgerPath: LIVE_E2E_LEDGER,
          durability: "file-and-directory",
          credentialSource: new ClaudeAmbientCredentialSource(process.env),
          allocator: new ClaudeScratchAllocator({
            prefix: "amadeus-claude-sdk-live-",
            distributionDir: CLAUDE_DIST,
          }),
          leakCheck: liveScratchLeakCheck,
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
