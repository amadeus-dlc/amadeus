#!/usr/bin/env bun

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { DistributionTransactionCoordinator } from "./distribution-transaction.ts";
import { checkMirrorDistribution } from "./mirror-distribution-check.ts";
import { validateMirrorDocs } from "./mirror-docs-contract.ts";

export const MIRROR_BENCHMARK_PROTOCOL = {
  warmups: 3,
  runs: 20,
  workloads: {
    packageWrite: { p95BudgetMs: 30_000, rssBudgetBytes: 512 * 1024 * 1024 },
    packageCheck: { p95BudgetMs: 30_000, rssBudgetBytes: 512 * 1024 * 1024 },
    promote: { p95BudgetMs: 20_000, rssBudgetBytes: 512 * 1024 * 1024 },
    docsParity: { p95BudgetMs: 2_000, rssBudgetBytes: 512 * 1024 * 1024 },
    digestMatrix: { p95BudgetMs: 2_000, rssBudgetBytes: 128 * 1024 * 1024 },
  },
} as const;

export type MirrorBenchmarkWorkload =
  keyof typeof MIRROR_BENCHMARK_PROTOCOL.workloads;

function percentile95(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

function assertClean(count: number, workload: string): void {
  if (count !== 0) throw new Error(`${workload} benchmark requires clean input`);
}

function transactionFixture(paths: readonly string[]): {
  root: string;
  run(): void;
} {
  const root = mkdtempSync(join(tmpdir(), "mirror-package-benchmark-"));
  let generation = 0;
  const coordinator = new DistributionTransactionCoordinator(root);
  return {
    root,
    run: () => {
      generation += 1;
      coordinator.apply(paths.map((path) => ({
        path,
        bytes: Buffer.from(`generation-${generation}`),
      })));
    },
  };
}

export function benchmarkWorkloads(root: string) {
  const packageWrite = transactionFixture([
    "dist/claude/.claude/tools/amadeus-mirror.ts",
    "dist/codex/.codex/tools/amadeus-mirror.ts",
    "dist/cursor/.cursor/tools/amadeus-mirror.ts",
    "dist/kiro/.kiro/tools/amadeus-mirror.ts",
    "dist/kiro-ide/.kiro/tools/amadeus-mirror.ts",
    "dist/opencode/.opencode/tools/amadeus-mirror.ts",
  ]);
  const promote = transactionFixture([
    ".claude/tools/amadeus-mirror.ts",
    ".codex/tools/amadeus-mirror.ts",
    ".cursor/tools/amadeus-mirror.ts",
    ".opencode/tools/amadeus-mirror.ts",
  ]);
  const temporaryRoots = [packageWrite.root, promote.root];
  const workloads: Record<MirrorBenchmarkWorkload, () => void> = {
    packageWrite: packageWrite.run,
    packageCheck: () =>
      assertClean(checkMirrorDistribution(root).findings.length, "packageCheck"),
    promote: promote.run,
    docsParity: () =>
      assertClean(validateMirrorDocs(root).length, "docsParity"),
    digestMatrix: () =>
      assertClean(checkMirrorDistribution(root).findings.length, "digestMatrix"),
  };
  const results = {} as Record<
    MirrorBenchmarkWorkload,
    {
      runs: number;
      p95Ms: number;
      rssBytes: number;
      p95BudgetMs: number;
      rssBudgetBytes: number;
    }
  >;
  try {
    for (const [name, workload] of Object.entries(workloads) as [
      MirrorBenchmarkWorkload,
      () => void,
    ][]) {
      for (let index = 0; index < MIRROR_BENCHMARK_PROTOCOL.warmups; index++)
        workload();
      const durations: number[] = [];
      for (let index = 0; index < MIRROR_BENCHMARK_PROTOCOL.runs; index++) {
        const started = performance.now();
        workload();
        durations.push(performance.now() - started);
      }
      results[name] = {
        runs: durations.length,
        p95Ms: percentile95(durations),
        rssBytes: process.memoryUsage().rss,
        ...MIRROR_BENCHMARK_PROTOCOL.workloads[name],
      };
    }
  } finally {
    for (const temporaryRoot of temporaryRoots)
      rmSync(temporaryRoot, { recursive: true, force: true });
  }
  return results;
}

if (import.meta.main) {
  console.log(JSON.stringify({
    schema: 2,
    image: {
      os: process.env.ImageOS ?? process.platform,
      version: process.env.ImageVersion ?? "local",
      arch: process.env.RUNNER_ARCH ?? process.arch,
      bun: Bun.version,
    },
    workloads: benchmarkWorkloads(process.cwd()),
  }));
}
