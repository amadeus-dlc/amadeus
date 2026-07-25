// t292 — local protocol and aggregate checks for five distribution workloads.
// covers: scripts/mirror-distribution-benchmark*.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { performance } from "node:perf_hooks";
import {
  benchmarkWorkloads,
  MIRROR_BENCHMARK_PROTOCOL,
  type MirrorBenchmarkWorkload,
} from "../../scripts/mirror-distribution-benchmark.ts";
import { aggregateMirrorBenchmarks } from "../../scripts/mirror-distribution-benchmark-aggregate.ts";
import { checkMirrorDistribution } from "../../scripts/mirror-distribution-check.ts";
import { validateMirrorDocs } from "../../scripts/mirror-docs-contract.ts";
import { scanPublicProjections } from "../../scripts/scan-public-projections.ts";

function replica(
  p95Ms = 10,
  imageVersion = "20260720.1",
  rssBytes = 64 * 1024 * 1024,
) {
  const workloads = Object.fromEntries(
    Object.keys(MIRROR_BENCHMARK_PROTOCOL.workloads).map((name) => [
      name,
      { runs: 20, p95Ms, rssBytes },
    ]),
  ) as Record<
    MirrorBenchmarkWorkload,
    { runs: number; p95Ms: number; rssBytes: number }
  >;
  return {
    schema: 2 as const,
    image: {
      os: "ubuntu24",
      version: imageVersion,
      arch: "X64",
      bun: "1.3.13",
    },
    workloads,
  };
}

describe("t292 distribution performance protocol", () => {
  test("defines 3 warmups, 20 runs, and all PERF-DD-01 through 05 workloads", () => {
    expect(MIRROR_BENCHMARK_PROTOCOL.warmups).toBe(3);
    expect(MIRROR_BENCHMARK_PROTOCOL.runs).toBe(20);
    expect(Object.keys(MIRROR_BENCHMARK_PROTOCOL.workloads)).toEqual([
      "packageWrite",
      "packageCheck",
      "promote",
      "docsParity",
      "digestMatrix",
    ]);
  });

  test("runs the clean read-only workload 20 times within a loose local envelope", () => {
    const started = performance.now();
    for (let index = 0; index < 20; index++) {
      expect(checkMirrorDistribution(process.cwd()).findings).toEqual([]);
      expect(validateMirrorDocs(process.cwd())).toEqual([]);
      expect(scanPublicProjections(process.cwd())).toEqual([]);
    }
    // The three-replica benchmark is authoritative; this only catches a
    // catastrophic local regression without failing on a loaded shared runner.
    expect(performance.now() - started).toBeLessThan(10_000);
  });

  test("drives every benchmark workload in-process for coverage attribution", () => {
    const results = benchmarkWorkloads(process.cwd());
    expect(Object.keys(results)).toEqual(
      Object.keys(MIRROR_BENCHMARK_PROTOCOL.workloads),
    );
    for (const result of Object.values(results)) {
      expect(result.runs).toBe(MIRROR_BENCHMARK_PROTOCOL.runs);
      expect(result.p95Ms).toBeGreaterThanOrEqual(0);
      expect(result.rssBytes).toBeGreaterThan(0);
    }
  });

  test("requires three same-image complete replicas and enforces dispersion and budgets", () => {
    expect(aggregateMirrorBenchmarks([
      replica(10),
      replica(12),
      replica(15),
    ])).toEqual([]);
    expect(aggregateMirrorBenchmarks([replica(), replica()])[0]).toContain(
      "missing benchmark replica",
    );
    expect(aggregateMirrorBenchmarks([
      replica(10),
      replica(11, "other"),
      replica(30),
    ])).toEqual(expect.arrayContaining([
      "benchmark runner image mismatch",
      expect.stringContaining("dispersion"),
    ]));
    expect(aggregateMirrorBenchmarks([
      replica(3_000),
      replica(3_000),
      replica(3_000),
    ])).toEqual(expect.arrayContaining([
      expect.stringContaining("docsParity: median p95"),
      expect.stringContaining("digestMatrix: median p95"),
    ]));
  });
});
