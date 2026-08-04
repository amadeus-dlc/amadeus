// Local-only walking skeleton for the shared live E2E production kernel.
// The test self-skips before scratch/process work unless the strict adapter
// opt-in, supported CLI, distribution, and isolated environment credential are
// all present. It never falls back to the user's Codex home or auth files.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { codexExecLiveRequirementsSkipReason } from "../harness/codex-exec-live.ts";
import {
  CodexExecAdapter,
  CodexScratchAllocator,
  EnvironmentCredentialSource,
} from "../harness/live-e2e/codex.ts";
import { createCodexAnchorJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import { sanitizeText } from "../harness/live-e2e/contract.ts";
import {
  currentGitSha,
  LIVE_E2E_LEDGER,
  liveScratchLeakCheck,
} from "../harness/live-e2e/testing/live-kernel.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const CODEX_DIST = join(REPO_ROOT, "dist", "codex");
const SKIP_REASON = codexExecLiveRequirementsSkipReason({
  env: process.env,
  codexBin: CODEX_BIN,
  distributionDir: CODEX_DIST,
});

describe("Codex live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real codex-exec anchor journey${SKIP_REASON ? ` [SKIP: ${sanitizeText(SKIP_REASON, 120)}]` : ""}`,
    async () => {
      const adapter = new CodexExecAdapter({
        codexBin: CODEX_BIN,
        distributionDir: CODEX_DIST,
        parentEnv: process.env,
        model: process.env.AMADEUS_CODEX_EXEC_MODEL,
      });
      const result = await runLiveJourney(adapter, createCodexAnchorJourney(), {
        env: process.env,
        gitSha: currentGitSha(),
        now: () => new Date(),
        ledgerPath: LIVE_E2E_LEDGER,
        durability: "file-and-directory",
        credentialSource: new EnvironmentCredentialSource(process.env),
        allocator: new CodexScratchAllocator({
          prefix: "amadeus-codex-live-",
          distributionDir: CODEX_DIST,
        }),
        leakCheck: liveScratchLeakCheck,
      });
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
    },
    180_000,
  );
});
