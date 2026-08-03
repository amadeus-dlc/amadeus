// Local-only walking skeleton for the shared live E2E production kernel.
// The test self-skips before scratch/process work unless the strict adapter
// opt-in, supported CLI, distribution, and isolated environment credential are
// all present. It never falls back to the user's Codex home or auth files.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { codexExecLiveRequirementsSkipReason } from "../harness/codex-exec-live.ts";
import {
  CodexExecAdapter,
  CodexScratchAllocator,
  EnvironmentCredentialSource,
} from "../harness/live-e2e/codex.ts";
import { createCodexAnchorJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const CODEX_DIST = join(REPO_ROOT, "dist", "codex");
const LEDGER = join(REPO_ROOT, "tests", "harness", "live-e2e", "runs.jsonl");
const SKIP_REASON = codexExecLiveRequirementsSkipReason({
  env: process.env,
  codexBin: CODEX_BIN,
  distributionDir: CODEX_DIST,
});

function currentGitSha(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("unable to resolve the current Git SHA");
  return result.stdout.trim();
}

describe("Codex live E2E kernel", () => {
  test.skipIf(SKIP_REASON !== null)(
    `records a real codex-exec anchor journey${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
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
        ledgerPath: LEDGER,
        durability: "file-and-directory",
        credentialSource: new EnvironmentCredentialSource(process.env),
        allocator: new CodexScratchAllocator({
          prefix: "amadeus-codex-live-",
          distributionDir: CODEX_DIST,
        }),
        leakCheck: async (target) =>
          existsSync(target.scratch.root) ? ["scratch root remained after cleanup"] : [],
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
