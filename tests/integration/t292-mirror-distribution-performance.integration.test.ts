// t292 — local protocol and aggregate checks for five distribution workloads.
// covers: scripts/mirror-distribution-benchmark*.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MIRROR_BENCHMARK_PROTOCOL,
  type MirrorBenchmarkWorkload,
} from "../../scripts/mirror-distribution-benchmark.ts";
import { aggregateMirrorBenchmarks } from "../../scripts/mirror-distribution-benchmark-aggregate.ts";

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

  test("keeps rolling runner image versions advisory at the aggregate and CLI seams", () => {
    const replicas = [
      replica(10, "20260726.254.1"),
      replica(10, "20260720.247.2"),
      replica(10, "20260720.247.2"),
    ];
    expect(aggregateMirrorBenchmarks(replicas)).toEqual({
      findings: [],
      warnings: [
        "benchmark runner image version mismatch: 20260720.247.2, 20260726.254.1",
      ],
    });

    const root = mkdtempSync(join(tmpdir(), "mirror-benchmark-aggregate-"));
    try {
      const paths = replicas.map((current, index) => {
        const path = join(root, `replica-${index + 1}.json`);
        writeFileSync(path, JSON.stringify(current));
        return path;
      });
      const result = Bun.spawnSync({
        cmd: [
          process.execPath,
          "scripts/mirror-distribution-benchmark-aggregate.ts",
          ...paths,
        ],
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain(
        "mirror-distribution-benchmark-aggregate: OK",
      );
      expect(result.stderr.toString()).toContain(
        "warning: benchmark runner image version mismatch: 20260720.247.2, 20260726.254.1",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("requires three runtime-compatible complete replicas and enforces dispersion and budgets", () => {
    expect(aggregateMirrorBenchmarks([
      replica(10),
      replica(12),
      replica(15),
    ]).findings).toEqual([]);
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
    expect(aggregateMirrorBenchmarks(lowLatencyReplicas).findings).toEqual([]);
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
    expect(
      aggregateMirrorBenchmarks(hostedRunnerNoiseReplicas).findings,
    ).toEqual([]);
    expect(
      aggregateMirrorBenchmarks([replica(), replica()]).findings[0],
    ).toContain("missing benchmark replica");
    const incomplete = replica();
    incomplete.workloads.packageWrite.runs = 19;
    expect(aggregateMirrorBenchmarks([
      incomplete,
      replica(),
      replica(),
    ]).findings).toContain("packageWrite: missing or incomplete workload");
    const mixedVersionWithDispersion = aggregateMirrorBenchmarks([
      replica(10),
      replica(40, "other"),
      replica(250),
    ]);
    expect(mixedVersionWithDispersion.findings).toEqual(expect.arrayContaining([
      expect.stringContaining("dispersion"),
    ]));
    expect(mixedVersionWithDispersion.findings).not.toContain(
      "benchmark runner image mismatch",
    );
    expect(mixedVersionWithDispersion.warnings).toEqual([
      "benchmark runner image version mismatch: 20260720.1, other",
    ]);
    expect(aggregateMirrorBenchmarks([
      replica(3_000),
      replica(3_000),
      replica(3_000),
    ]).findings).toEqual(expect.arrayContaining([
      expect.stringContaining("docsParity: median p95"),
      expect.stringContaining("digestMatrix: median p95"),
    ]));
  });

  test("keeps os, arch, and bun mismatches fatal", () => {
    for (
      const [field, value] of [
        ["os", "ubuntu22"],
        ["arch", "ARM64"],
        ["bun", "1.3.12"],
      ] as const
    ) {
      const incompatible = replica();
      incompatible.image[field] = value;
      const aggregate = aggregateMirrorBenchmarks([
        replica(),
        incompatible,
        replica(),
      ]);
      expect(aggregate.findings, field).toContain(
        "benchmark runner image mismatch",
      );
      expect(aggregate.warnings, field).toEqual([]);
    }
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
      expect(
        aggregateMirrorBenchmarks(replicasFor(name, p95Series)).findings,
      ).toEqual([]);
    }
  });

  // Series measured twice on PR #1540. Both fast read-only workloads stayed
  // far below their 2s budgets while hosted-runner tail jitter crossed the old
  // 100ms floor.
  test("keeps sub-budget hosted-runner tail jitter green", () => {
    for (
      const [name, p95Series] of [
        ["docsParity", [3.8, 8.6, 104.3]],
        ["digestMatrix", [47.3, 107.6, 215.4]],
      ] as [MirrorBenchmarkWorkload, number[]][]
    ) {
      expect(
        aggregateMirrorBenchmarks(replicasFor(name, p95Series)).findings,
      ).toEqual([]);
    }
  });

  // 40/100/250 puts both median ratios at 2.5 and the spread at 210ms, which
  // exceeds the 200ms digestMatrix noise floor — neither half can be dismissed
  // as the single-replica jitter measured on PR #1487.
  test("still reports dispersion and uniform degradation across every replica", () => {
    expect(
      aggregateMirrorBenchmarks(
        replicasFor("digestMatrix", [40, 100, 250]),
      ).findings,
    ).toContain("digestMatrix: replica dispersion around the median exceeds 2.0");
    expect(
      aggregateMirrorBenchmarks(
        replicasFor("digestMatrix", [2_200, 2_400, 2_600]),
      ).findings,
    ).toContain("digestMatrix: median p95 exceeds 2000ms");
  });
});
