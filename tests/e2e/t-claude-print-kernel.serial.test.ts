// Local-only Claude Code print/headless live journey. The strict gate and
// preflight run before scratch, model, or ledger work. It never reads user or
// local settings and never copies a source auth/config path.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { claudePrintLiveRequirementsSkipReason } from "../harness/claude-print-live.ts";
import {
  ClaudeAmbientCredentialSource,
  ClaudePrintAdapter,
  ClaudeScratchAllocator,
} from "../harness/live-e2e/claude.ts";
import { createClaudeStructuredJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  currentGitSha,
  LIVE_E2E_LEDGER,
  liveScratchLeakCheck,
} from "../harness/live-e2e/testing/live-kernel.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CLAUDE_BIN = process.env.AMADEUS_CLAUDE_BIN ?? "claude";
const CLAUDE_DIST = join(REPO_ROOT, "dist", "claude");
const SKIP_REASON = claudePrintLiveRequirementsSkipReason({
  env: process.env,
  claudeBin: CLAUDE_BIN,
  distributionDir: CLAUDE_DIST,
});

describe("Claude print live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real claude-print structured journey${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const result = await runLiveJourney(
        new ClaudePrintAdapter({
          claudeBin: CLAUDE_BIN,
          distributionDir: CLAUDE_DIST,
          parentEnv: process.env,
        }),
        createClaudeStructuredJourney(),
        {
          env: process.env,
          gitSha: currentGitSha(),
          now: () => new Date(),
          ledgerPath: LIVE_E2E_LEDGER,
          durability: "file-and-directory",
          credentialSource: new ClaudeAmbientCredentialSource(process.env),
          allocator: new ClaudeScratchAllocator({
            prefix: "amadeus-claude-print-live-",
            distributionDir: CLAUDE_DIST,
          }),
          leakCheck: liveScratchLeakCheck,
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "claude-print",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
    },
    120_000,
  );
});
