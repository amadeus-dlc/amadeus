// Local-only Kiro CLI ACP live journey. The adapter owns a fresh project/home
// and one `kiro-cli acp` stdio session. Kiro authentication is on disk under
// the user's home, so the scratch home binds it by reference — nothing is
// copied into scratch, and the source home is never written to, edited, or
// deleted by the adapter.
//
// SPENDS Kiro credits: one short turn per run, behind AMADEUS_KIRO_ACP_LIVE=1
// and denied outright on GitHub Actions.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { kiroAcpLiveRequirementsSkipReason } from "../harness/kiro-acp-live.ts";
import { createKiroAcpJourney } from "../harness/live-e2e/journey.ts";
import {
  defaultKiroSourceHome,
  KiroHomeCredentialSource,
  KiroScratchAllocator,
} from "../harness/live-e2e/kiro.ts";
import { KiroAcpAdapter } from "../harness/live-e2e/kiro-acp.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  currentGitSha,
  LIVE_E2E_LEDGER,
  liveScratchLeakCheck,
} from "../harness/live-e2e/testing/live-kernel.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const KIRO_BIN = process.env.AMADEUS_KIRO_BIN ?? "kiro-cli";
const KIRO_DIST = join(REPO_ROOT, "dist", "kiro");
const SOURCE_HOME = defaultKiroSourceHome(process.env);
const SKIP_REASON = kiroAcpLiveRequirementsSkipReason({
  env: process.env,
  kiroBin: KIRO_BIN,
  distributionDir: KIRO_DIST,
  sourceHome: SOURCE_HOME,
});

// The journey budget is 300,000 ms; the enclosing Bun timeout sits above it and
// scales with it, so a journey timeout is reported as a journey timeout rather
// than as the harness giving up first (#1830).
const TEST_TIMEOUT_MS = scaleTestTime(360_000);

describe("Kiro ACP live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real kiro-acp anchor journey${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const result = await runLiveJourney(
        new KiroAcpAdapter({
          kiroBin: KIRO_BIN,
          distributionDir: KIRO_DIST,
          sourceHome: SOURCE_HOME,
          parentEnv: process.env,
        }),
        createKiroAcpJourney(),
        {
          env: process.env,
          gitSha: currentGitSha(),
          now: () => new Date(),
          ledgerPath: LIVE_E2E_LEDGER,
          durability: "file-and-directory",
          credentialSource: new KiroHomeCredentialSource({ sourceHome: SOURCE_HOME, env: process.env }),
          allocator: new KiroScratchAllocator({
            prefix: "amadeus-kiro-acp-live-",
            distributionDir: KIRO_DIST,
          }),
          leakCheck: liveScratchLeakCheck,
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "kiro-acp",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
    },
    TEST_TIMEOUT_MS,
  );
});
