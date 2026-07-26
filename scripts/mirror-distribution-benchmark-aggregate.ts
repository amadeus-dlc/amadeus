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

// A ratio is not meaningful when the absolute spread is below 5% of the
// workload budget. The authoritative median p95 budget remains unchanged.
const DISPERSION_NOISE_FLOOR_FRACTION = 0.05;

function median(values: readonly number[]): number {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

function exceedsDispersionLimit(
  values: readonly number[],
  p95BudgetMs: number,
): boolean {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum <= 0) return true;
  const absoluteSpread = maximum - minimum;
  const noiseFloor = p95BudgetMs * DISPERSION_NOISE_FLOOR_FRACTION;
  return maximum / minimum > 2 && absoluteSpread > noiseFloor;
}

export function aggregateMirrorBenchmarks(
  replicas: readonly Replica[],
): readonly string[] {
  const findings: string[] = [];
  if (replicas.length !== 3)
    return [`missing benchmark replica: expected 3, received ${replicas.length}`];
  const image = JSON.stringify(replicas[0].image);
  if (replicas.some((replica) => replica.schema !== 2))
    findings.push("benchmark schema mismatch");
  if (replicas.some((replica) => JSON.stringify(replica.image) !== image))
    findings.push("benchmark runner image mismatch");
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
      findings.push(`${name}: replica dispersion exceeds 2.0`);
    if (median(p95) > budget.p95BudgetMs)
      findings.push(`${name}: median p95 exceeds ${budget.p95BudgetMs}ms`);
    if (median(samples.map((sample) => sample.rssBytes)) > budget.rssBudgetBytes)
      findings.push(`${name}: median RSS exceeds ${budget.rssBudgetBytes}`);
  }
  return findings;
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
  const findings = aggregateMirrorBenchmarks(replicas);
  for (const finding of findings) console.error(finding);
  if (findings.length > 0) process.exit(1);
  console.log("mirror-distribution-benchmark-aggregate: OK (3 replicas, 5 workloads)");
}
