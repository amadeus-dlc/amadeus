// Local-only Kiro CLI rendered TUI live journey. The adapter owns a fresh
// project/home and a run-private tmux socket/session. Kiro authentication is
// on disk under the user's home, so the scratch home binds it by reference —
// nothing is copied into scratch, and the source home is never written to,
// edited, or deleted by the adapter.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { kiroTuiLiveRequirementsSkipReason } from "../harness/kiro-tui-live.ts";
import { createKiroTuiJourney } from "../harness/live-e2e/journey.ts";
import {
  defaultKiroSourceHome,
  KiroHomeCredentialSource,
  KiroScratchAllocator,
} from "../harness/live-e2e/kiro.ts";
import { KiroTuiAdapter } from "../harness/live-e2e/kiro-tui.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  currentGitSha,
  LIVE_E2E_LEDGER,
  liveScratchLeakCheck,
} from "../harness/live-e2e/testing/live-kernel.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const KIRO_BIN = process.env.AMADEUS_KIRO_BIN ?? "kiro-cli";
const TMUX_BIN = process.env.AMADEUS_TMUX_BIN ?? "tmux";
const KIRO_DIST = join(REPO_ROOT, "dist", "kiro");
const SOURCE_HOME = defaultKiroSourceHome(process.env);
const SKIP_REASON = kiroTuiLiveRequirementsSkipReason({
  env: process.env,
  kiroBin: KIRO_BIN,
  tmuxBin: TMUX_BIN,
  distributionDir: KIRO_DIST,
  sourceHome: SOURCE_HOME,
});

describe("Kiro TUI live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real kiro-tui anchor journey${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const result = await runLiveJourney(
        new KiroTuiAdapter({
          kiroBin: KIRO_BIN,
          tmuxBin: TMUX_BIN,
          distributionDir: KIRO_DIST,
          sourceHome: SOURCE_HOME,
          parentEnv: process.env,
        }),
        createKiroTuiJourney(),
        {
          env: process.env,
          gitSha: currentGitSha(),
          now: () => new Date(),
          ledgerPath: LIVE_E2E_LEDGER,
          durability: "file-and-directory",
          credentialSource: new KiroHomeCredentialSource({ sourceHome: SOURCE_HOME, env: process.env }),
          allocator: new KiroScratchAllocator({
            prefix: "amadeus-kiro-tui-live-",
            distributionDir: KIRO_DIST,
          }),
          leakCheck: liveScratchLeakCheck,
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "kiro-tui",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
    },
    240_000,
  );
});
