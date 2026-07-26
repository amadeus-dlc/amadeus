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

function replicasFor(
  name: MirrorBenchmarkWorkload,
  p95Series: readonly number[],
) {
  return p95Series.map((p95Ms) => {
    const base = replica(10);
    return {
      ...base,
      workloads: {
        ...base.workloads,
        [name]: { ...base.workloads[name], p95Ms },
      },
    };
  });
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
    const lowLatencyReplicas = [28, 116, 123].map((p95Ms) => {
      const base = replica(100);
      return {
        ...base,
        workloads: {
          ...base.workloads,
          packageWrite: { ...base.workloads.packageWrite, p95Ms },
        },
      };
    });
    expect(aggregateMirrorBenchmarks(lowLatencyReplicas)).toEqual([]);
    const hostedRunnerNoiseReplicas = [
      [27, 36, 3],
      [115, 39, 4],
      [292, 720, 44],
    ].map(([packageWrite, packageCheck, docsParity]) => {
      const base = replica(100);
      return {
        ...base,
        workloads: {
          ...base.workloads,
          packageWrite: { ...base.workloads.packageWrite, p95Ms: packageWrite },
          packageCheck: { ...base.workloads.packageCheck, p95Ms: packageCheck },
          docsParity: { ...base.workloads.docsParity, p95Ms: docsParity },
        },
      };
    });
    expect(aggregateMirrorBenchmarks(hostedRunnerNoiseReplicas)).toEqual([]);
    expect(aggregateMirrorBenchmarks([replica(), replica()])[0]).toContain(
      "missing benchmark replica",
    );
    const incomplete = replica();
    incomplete.workloads.packageWrite.runs = 19;
    expect(aggregateMirrorBenchmarks([
      incomplete,
      replica(),
      replica(),
    ])).toContain("packageWrite: missing or incomplete workload");
    expect(aggregateMirrorBenchmarks([
      replica(10),
      replica(40, "other"),
      replica(200),
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

  // Series measured on PR #1487, where one replica spiked and the other two
  // stayed healthy. The min/max ratio failed every one of them; the median
  // ratios must not (issue #1489).
  test("keeps a single spiking replica green", () => {
    for (
      const [name, p95Series] of [
        ["digestMatrix", [31.7, 33.2, 76.2]],
        ["promote", [137.0, 18.6, 31.3]],
        ["digestMatrix", [212.7, 36.4, 34.1]],
        ["packageWrite", [246.0, 59.0, 115.0]],
        ["packageWrite", [35.0, 542.5, 66.9]],
      ] as [MirrorBenchmarkWorkload, number[]][]
    ) {
      expect(aggregateMirrorBenchmarks(replicasFor(name, p95Series))).toEqual(
        [],
      );
    }
  });

  // 40/100/250 puts both median ratios at 2.5 and the spread at 210ms, which
  // is 2.1x the 100ms digestMatrix noise floor — neither half can be dismissed
  // as the single-replica jitter measured on PR #1487.
  test("still reports dispersion and uniform degradation across every replica", () => {
    expect(
      aggregateMirrorBenchmarks(replicasFor("digestMatrix", [40, 100, 250])),
    ).toContain("digestMatrix: replica dispersion around the median exceeds 2.0");
    expect(
      aggregateMirrorBenchmarks(
        replicasFor("digestMatrix", [2_200, 2_400, 2_600]),
      ),
    ).toContain("digestMatrix: median p95 exceeds 2000ms");
  });
});
