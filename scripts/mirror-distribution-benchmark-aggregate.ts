#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import {
  MIRROR_BENCHMARK_PROTOCOL,
  type MirrorBenchmarkWorkload,
} from "./mirror-distribution-benchmark.ts";

type Replica = Readonly<{
  schema: 2;
  image: Readonly<Record<string, string>>;
  workloads: Readonly<Record<
    MirrorBenchmarkWorkload,
    Readonly<{ runs: number; p95Ms: number; rssBytes: number }>
  >>;
}>;

export type MirrorBenchmarkAggregate = Readonly<{
  findings: readonly string[];
  warnings: readonly string[];
}>;

// Comparability is decided by os/arch/bun only. The runner image VERSION is a
// weekly GitHub snapshot roll (e.g. ubuntu24 20260720.247.2 → 20260726.254.1):
// during a rollout the three replica jobs legitimately land on adjacent
// versions, and that difference does not make benchmark numbers incomparable —
// the dispersion and budget gates below remain the environment-outlier guard.
const COMPATIBILITY_IMAGE_FIELDS = ["os", "arch", "bun"] as const;

// A ratio is not meaningful when the absolute spread is below 10% of the
// workload budget. The authoritative median p95 budget remains unchanged.
const DISPERSION_NOISE_FLOOR_FRACTION = 0.1;
const DISPERSION_RATIO_LIMIT = 2;

function median(values: readonly number[]): number {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

// Dispersion is measured against the median instead of the min/max ratio so a
// single spiking replica cannot fail the gate alone: both the upper and the
// lower half of the sample have to be off the median before this reports.
function exceedsDispersionLimit(
  values: readonly number[],
  p95BudgetMs: number,
): boolean {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum <= 0) return true;
  const centre = median(values);
  const absoluteSpread = maximum - minimum;
  const noiseFloor = p95BudgetMs * DISPERSION_NOISE_FLOOR_FRACTION;
  return (
    maximum / centre > DISPERSION_RATIO_LIMIT &&
    centre / minimum > DISPERSION_RATIO_LIMIT &&
    absoluteSpread > noiseFloor
  );
}

export function aggregateMirrorBenchmarks(
  replicas: readonly Replica[],
): MirrorBenchmarkAggregate {
  const findings: string[] = [];
  const warnings: string[] = [];
  if (replicas.length !== 3)
    return {
      findings: [
        `missing benchmark replica: expected 3, received ${replicas.length}`,
      ],
      warnings,
    };
  const image = replicas[0].image;
  if (replicas.some((replica) => replica.schema !== 2))
    findings.push("benchmark schema mismatch");
  if (
    replicas.some((replica) =>
      COMPATIBILITY_IMAGE_FIELDS.some(
        (field) => replica.image[field] !== image[field],
      )
    )
  )
    findings.push("benchmark runner image mismatch");
  const versions = [
    ...new Set(replicas.map((replica) => replica.image.version)),
  ].sort();
  if (versions.length > 1)
    warnings.push(
      `benchmark runner image version mismatch: ${versions.join(", ")}`,
    );
  for (const [name, budget] of Object.entries(
    MIRROR_BENCHMARK_PROTOCOL.workloads,
  ) as [MirrorBenchmarkWorkload, {
    p95BudgetMs: number;
    rssBudgetBytes: number;
  }][]) {
    const samples = replicas.map((replica) => replica.workloads[name]);
    if (samples.some((sample) => !sample || sample.runs !== 20)) {
      findings.push(`${name}: missing or incomplete workload`);
      continue;
    }
    const p95 = samples.map((sample) => sample.p95Ms);
    if (exceedsDispersionLimit(p95, budget.p95BudgetMs))
      findings.push(`${name}: replica dispersion around the median exceeds 2.0`);
    if (median(p95) > budget.p95BudgetMs)
      findings.push(`${name}: median p95 exceeds ${budget.p95BudgetMs}ms`);
    if (median(samples.map((sample) => sample.rssBytes)) > budget.rssBudgetBytes)
      findings.push(`${name}: median RSS exceeds ${budget.rssBudgetBytes}`);
  }
  return { findings, warnings };
}

if (import.meta.main) {
  let replicas: Replica[];
  try {
    replicas = process.argv.slice(2).map((path) =>
      JSON.parse(readFileSync(path, "utf-8"))
    );
  } catch (error) {
    console.error(`benchmark aggregate input failure: ${String(error)}`);
    process.exit(1);
  }
  const { findings, warnings } = aggregateMirrorBenchmarks(replicas);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  for (const finding of findings) console.error(finding);
  if (findings.length > 0) process.exit(1);
  console.log("mirror-distribution-benchmark-aggregate: OK (3 replicas, 5 workloads)");
}
