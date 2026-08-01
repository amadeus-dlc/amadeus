// t292 perf — the real-time half of the distribution workload checks.
// covers: scripts/mirror-distribution-benchmark*.ts
// size: large
//
// perf tier (#1830 FR-1): split out of
// tests/integration/t292-mirror-distribution-performance.integration.test.ts.
// The pure aggregator/protocol assertions stay in the integration file and keep
// running under --ci; only the two wall-clock workload drives moved here.
import { describe, expect, test } from "bun:test";
import { performance } from "node:perf_hooks";
import {
  benchmarkWorkloads,
  MIRROR_BENCHMARK_PROTOCOL,
} from "../../scripts/mirror-distribution-benchmark.ts";
import { checkMirrorDistribution } from "../../scripts/mirror-distribution-check.ts";
import { validateMirrorDocs } from "../../scripts/mirror-docs-contract.ts";
import { scanPublicProjections } from "../../scripts/scan-public-projections.ts";

describe("t292 distribution performance workloads", () => {
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
});
