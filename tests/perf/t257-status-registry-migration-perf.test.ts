// covers: function:migrateClosedSwarmDriverRegistryLocked, function:writeFileAtomic
// size: large
//
// perf tier (#1830 FR-1): the real-time half of t257, split out of
// tests/integration/t257-status-registry-migration.test.ts. The byte-preserving
// migration and atomic-write contracts stay in the integration file and keep
// running under --ci; only the wall-clock measurement moved here. The 120_000 ms
// budget is unchanged (measured 28.6 s = 24% of budget).
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

const BENCHMARK_CHILD = join(
  import.meta.dir,
  "..",
  "helpers",
  "status-registry-benchmark-child.ts",
);

type BenchmarkSample = {
  mode: "active" | "noop";
  size: number;
  strictReadMs: number;
  migrationMs: number;
  rssDeltaBytes: number;
  fixtureSha256: string;
  correct: boolean;
};

function benchmarkChild(size: number, mode: "active" | "noop"): BenchmarkSample {
  const result = spawnSync(process.execPath, [BENCHMARK_CHILD, String(size), mode], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(`benchmark child failed: ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as BenchmarkSample;
}

// Absolute latency budgets (#1424). Unchanged in value; the verdict now gates
// the median rather than the nearest-rank p95 so shared-runner load spikes are
// absorbed while a genuine regression still reports (#1511, median ruling —
// same canonical predicate as t258).
const STRICT_READ_LATENCY_BUDGET_MS = 100;
const MIGRATION_LATENCY_BUDGET_MS = 250;

describe("t257 status registry performance contract", () => {
  test("records complete 100-child p95, RSS pairs, growth, and provenance", () => {
    for (let index = 0; index < 10; index++) {
      benchmarkChild(10_000, "active");
      benchmarkChild(10_000, "noop");
    }

    const active = Array.from({ length: 100 }, () => benchmarkChild(10_000, "active"));
    const noop = Array.from({ length: 100 }, () => benchmarkChild(10_000, "noop"));
    const rssDifferences = active.map((sample, index) =>
      Math.max(0, sample.rssDeltaBytes - noop[index].rssDeltaBytes)
    );
    const growthSizes = [1_000, 2_000, 5_000, 10_000];
    const growth = growthSizes.map((size) => {
      const samples = Array.from({ length: 10 }, () => benchmarkChild(size, "active"));
      return {
        size,
        strictReadP95Ms: nearestRankP95(samples.map((sample) => sample.strictReadMs)),
        migrationP95Ms: nearestRankP95(samples.map((sample) => sample.migrationMs)),
        correct: samples.every((sample) => sample.correct),
      };
    });

    const strictReadLatencies = active.map((sample) => sample.strictReadMs);
    const migrationLatencies = active.map((sample) => sample.migrationMs);
    const result = {
      samples: active.length,
      warmups: 10,
      strictReadP95Ms: nearestRankP95(strictReadLatencies),
      migrationP95Ms: nearestRankP95(migrationLatencies),
      strictReadMedianMs: median(strictReadLatencies),
      migrationMedianMs: median(migrationLatencies),
      rssDifferenceP95MiB: nearestRankP95(rssDifferences) / (1024 * 1024),
      growth,
      growthRatio10x: {
        strictRead: growth[3].strictReadP95Ms / growth[0].strictReadP95Ms,
        migration: growth[3].migrationP95Ms / growth[0].migrationP95Ms,
      },
      correctness: active.every((sample) => sample.correct) &&
        noop.every((sample) => sample.correct) &&
        growth.every((sample) => sample.correct),
      fixtureSha256: active[0]?.fixtureSha256,
      gitSha: currentGitSha(),
      bunVersion: Bun.version,
      runnerImage: process.env.ImageOS ?? process.env.RUNNER_OS ?? "local",
      cpuModel: cpus()[0]?.model ?? "unknown",
    };
    console.log(`STATUS_REGISTRY_BENCHMARK ${JSON.stringify(result)}`);

    expect(result.samples).toBe(100);
    expect(result.correctness).toBe(true);
    expect(new Set(active.map((sample) => sample.fixtureSha256)).size).toBe(1);
    expect(exceedsMedianLatencyBudget(strictReadLatencies, STRICT_READ_LATENCY_BUDGET_MS)).toBe(false);
    expect(exceedsMedianLatencyBudget(migrationLatencies, MIGRATION_LATENCY_BUDGET_MS)).toBe(false);
    expect(result.rssDifferenceP95MiB).toBeLessThanOrEqual(64);
    expect(result.growthRatio10x.strictRead).toBeLessThanOrEqual(25);
    expect(result.growthRatio10x.migration).toBeLessThanOrEqual(25);
  }, 120_000);
});
