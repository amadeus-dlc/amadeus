// covers: subcommand:amadeus-state:archive subcommand:amadeus-state:unarchive
// size: large
//
// perf tier (#1830 FR-1): the real-time half of t258, split out of
// tests/integration/t258-lifecycle-transaction.test.ts so a loaded shared CI
// runner cannot turn wall-clock measurement into a red build. The CLI
// functional tests and the pure falling-proof for this same verdict path stay
// in the integration file and keep running under --ci.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpus } from "node:os";
import { join } from "node:path";
import { currentGitSha } from "../harness/git-sha.ts";
import {
  exceedsMedianLatencyBudget,
  median,
} from "../lib/latency-median-budget-gate.ts";
import { nearestRankP95 } from "../lib/percentile.ts";

const BENCHMARK_CHILD = join(import.meta.dir, "../helpers/lifecycle-transaction-benchmark-child.ts");

type LifecycleBenchmarkSample = {
  mode: "archive" | "recovery" | "noop";
  size: number;
  elapsedMs: number;
  rssDeltaBytes: number;
  fixtureSha256: string;
};

function benchmarkChild(mode: LifecycleBenchmarkSample["mode"]): LifecycleBenchmarkSample {
  const result = spawnSync(process.execPath, [BENCHMARK_CHILD, "10000", mode], {
    encoding: "utf-8",
  });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout) as LifecycleBenchmarkSample;
}

// Absolute latency budgets (#1424). Unchanged in value; the verdict now gates
// the median rather than the nearest-rank p95 so shared-runner load spikes are
// absorbed while a genuine regression still reports (#1511, median ruling).
const ARCHIVE_LATENCY_BUDGET_MS = 500;
const RECOVERY_LATENCY_BUDGET_MS = 750;

describe("intent lifecycle transaction performance contract", () => {
  // Budget derivation (#1830 path A / #1835 cross-review, 22 CI sections):
  // max observed = 122,147.12 ms (fail tail). budget = ceil(2 * max / 10^4) * 10^4
  // = 250_000 ms (headroom ≈ 2.05x). t257 stays at 120_000 (measured 28.6 s = 24% of budget).
  test("records 100-child p95 and paired incremental RSS with provenance", () => {
    for (let index = 0; index < 10; index++) {
      benchmarkChild("archive");
      benchmarkChild("recovery");
      benchmarkChild("noop");
    }
    const archive = Array.from({ length: 100 }, () => benchmarkChild("archive"));
    const recovery = Array.from({ length: 100 }, () => benchmarkChild("recovery"));
    const noop = Array.from({ length: 100 }, () => benchmarkChild("noop"));
    const rss = archive.map((sample, index) =>
      Math.max(0, sample.rssDeltaBytes - noop[index].rssDeltaBytes)
    );
    const archiveLatencies = archive.map((sample) => sample.elapsedMs);
    const recoveryLatencies = recovery.map((sample) => sample.elapsedMs);
    const result = {
      samples: 100,
      warmups: 10,
      archiveP95Ms: nearestRankP95(archiveLatencies),
      recoveryP95Ms: nearestRankP95(recoveryLatencies),
      archiveMedianMs: median(archiveLatencies),
      recoveryMedianMs: median(recoveryLatencies),
      rssDifferenceP95MiB: nearestRankP95(rss) / (1024 * 1024),
      fixtureSha256: archive[0].fixtureSha256,
      gitSha: currentGitSha(),
      bunVersion: Bun.version,
      runnerImage: process.env.ImageOS ?? process.env.RUNNER_OS ?? "local",
      cpuModel: cpus()[0]?.model ?? "unknown",
    };
    console.log(`LIFECYCLE_TRANSACTION_BENCHMARK ${JSON.stringify(result)}`);
    expect(exceedsMedianLatencyBudget(archiveLatencies, ARCHIVE_LATENCY_BUDGET_MS)).toBe(false);
    expect(exceedsMedianLatencyBudget(recoveryLatencies, RECOVERY_LATENCY_BUDGET_MS)).toBe(false);
    expect(result.rssDifferenceP95MiB).toBeLessThanOrEqual(96);
    expect(new Set(archive.map((sample) => sample.fixtureSha256)).size).toBe(1);
    expect(new Set(recovery.map((sample) => sample.fixtureSha256)).size).toBe(1);
  }, 250_000);
});
