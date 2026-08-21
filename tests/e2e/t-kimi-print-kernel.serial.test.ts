// Local-only Kimi Code print live journey. The adapter owns a fresh
// project/home; Kimi's OAuth lives under the user's own KIMI_CODE_HOME, so the
// scratch home binds the `credentials` and `oauth` entries by reference —
// nothing is copied into scratch, and the source home is never written to,
// edited, or deleted by the adapter.
//
// SPENDS Kimi credits: exactly one short print session per run, behind
// AMADEUS_KIMI_PRINT_LIVE=1 and denied outright on GitHub Actions.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { kimiPrintLiveRequirementsSkipReason } from "../harness/kimi-print-live.ts";
import { createKimiPrintJourney } from "../harness/live-e2e/journey.ts";
import {
  defaultKimiSourceHome,
  KimiHomeCredentialSource,
  KimiScratchAllocator,
} from "../harness/live-e2e/kimi.ts";
import { KimiPrintAdapter } from "../harness/live-e2e/kimi-print.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  currentGitSha,
  LIVE_E2E_LEDGER,
  liveScratchLeakCheck,
} from "../harness/live-e2e/testing/live-kernel.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const KIMI_BIN = process.env.AMADEUS_KIMI_BIN ?? "kimi";
const KIMI_DIST = join(REPO_ROOT, "dist", "kimi");
const SOURCE_HOME = defaultKimiSourceHome(process.env);
const SKIP_REASON = kimiPrintLiveRequirementsSkipReason({
  env: process.env,
  kimiBin: KIMI_BIN,
  distributionDir: KIMI_DIST,
  sourceHome: SOURCE_HOME,
});

// business-rules BR-KIMI-15: the journey budget is 600,000 ms and the enclosing
// Bun timeout must stay strictly above it so a journey timeout is reported as a
// journey timeout rather than as the test harness giving up first. Both sides
// pass through scaleTestTime, so the ordering survives TEST_TIME_FACTOR — a
// fixed outer bound would invert the moment the factor is raised (#1830).
const TEST_TIMEOUT_MS = scaleTestTime(660_000);

describe("Kimi print live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real kimi-print anchor journey${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const result = await runLiveJourney(
        new KimiPrintAdapter({
          kimiBin: KIMI_BIN,
          distributionDir: KIMI_DIST,
          parentEnv: process.env,
        }),
        createKimiPrintJourney(),
        {
          env: process.env,
          gitSha: currentGitSha(),
          now: () => new Date(),
          ledgerPath: LIVE_E2E_LEDGER,
          durability: "file-and-directory",
          credentialSource: new KimiHomeCredentialSource({ sourceHome: SOURCE_HOME }),
          allocator: new KimiScratchAllocator({
            prefix: "amadeus-kimi-print-live-",
            distributionDir: KIMI_DIST,
          }),
          leakCheck: liveScratchLeakCheck,
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "kimi-print",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
    },
    TEST_TIMEOUT_MS,
  );
});
