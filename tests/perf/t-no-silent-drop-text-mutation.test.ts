// covers: function:setCheckbox, function:setStageSuffix, function:validateStageState
// size: medium
//
// PERF-TM-05 / SCALE-TM: deterministic L1/L4/L8 capacity evidence for the
// validated stage-text mutation boundary. The benchmark keeps the production
// reparse and postcondition checks enabled; it does not substitute a cheaper
// mutation path for timing.
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import {
  requireChanged,
  setCheckbox,
  setStageSuffix,
  validateStageState,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

type Tier = "L1" | "L4" | "L8";
type Mutation = {
  readonly slug: string;
  readonly dimension: "checkbox" | "suffix";
};
type Counters = {
  parse: number;
  setter: number;
  write: number;
  audit: number;
  success: number;
  retry: number;
  resync: number;
};
type TransactionResult =
  | { readonly kind: "changed"; readonly content: string; readonly counters: Counters }
  | { readonly kind: "not-found"; readonly target: string; readonly counters: Counters }
  | { readonly kind: "duplicate-target"; readonly target: string; readonly counters: Counters };

const TIER_SIZE: Readonly<Record<Tier, number>> = { L1: 32, L4: 128, L8: 256 };
const DOCUMENT_LIMIT: Readonly<Record<Tier, number>> = {
  L1: 256 * 1024,
  L4: 512 * 1024,
  L8: 1024 * 1024,
};
const MEASUREMENT_RUNS = 10;
const WARMUP_RUNS = 3;
const LATENCY_LIMIT_MS = 1000;
const RSS_LIMIT_MIB = 128;

function emptyCounters(): Counters {
  return { parse: 0, setter: 0, write: 0, audit: 0, success: 0, retry: 0, resync: 0 };
}

function stageSlug(index: number): string {
  return `stage-${index.toString().padStart(3, "0")}`;
}

function fixture(tier: Tier): { content: string; targets: Mutation[]; digest: string } {
  const size = TIER_SIZE[tier];
  const rows = Array.from({ length: size }, (_, index) =>
    `- [ ] ${stageSlug(index)} — EXECUTE: deterministic-fixture-${index.toString().padStart(3, "0")}`
  );
  const content = [
    "# AI-DLC State Tracking",
    "",
    "## Stage Progress",
    "<!-- Checkbox states: canonical -->",
    "",
    "### CONSTRUCTION PHASE",
    ...rows,
    "",
    "## Current Status",
    "- **Status**: Running",
    "",
  ].join("\n");
  const targets = Array.from({ length: size }, (_, index) => ({
    slug: stageSlug(index),
    dimension: index % 2 === 0 ? "checkbox" as const : "suffix" as const,
  }));
  return {
    content,
    targets,
    digest: createHash("sha256").update(content).digest("hex"),
  };
}

function mutationKey(target: Mutation): string {
  return `${target.slug}\0${target.dimension}`;
}

function transact(original: string, requested: readonly Mutation[]): TransactionResult {
  const counters = emptyCounters();
  const keys = new Set<string>();
  for (const target of requested) {
    const key = mutationKey(target);
    if (keys.has(key)) return { kind: "duplicate-target", target: target.slug, counters };
    keys.add(key);
  }

  const targets = [...requested].sort((left, right) =>
    mutationKey(left).localeCompare(mutationKey(right), "en")
  );
  let current = original;
  counters.parse += 1;
  let state = validateStageState(current);
  for (const target of targets) {
    counters.setter += 1;
    const result = target.dimension === "checkbox"
      ? setCheckbox(state, target.slug, "completed")
      : setStageSuffix(state, target.slug, "SKIP");
    if (result.kind === "not-found") {
      return { kind: "not-found", target: result.target, counters };
    }
    // Each successful production setter reparses once to verify its postcondition.
    counters.parse += 1;
    current = requireChanged(result, `perf:${target.dimension}`);
    counters.parse += 1;
    state = validateStageState(current);
  }
  counters.parse += 1;
  validateStageState(current);
  counters.write = current === original ? 0 : 1;
  counters.audit = 1;
  counters.success = 1;
  return { kind: "changed", content: current, counters };
}

function resourceMaxRssBytes(): number {
  const maxRss = process.resourceUsage().maxRSS;
  const currentRss = process.memoryUsage().rss;
  // Bun reports bytes on macOS and KiB on Linux. Detect the unit against the
  // current RSS so the same 128 MiB contract is portable across both runners.
  return maxRss > currentRss / 128 ? maxRss : maxRss * 1024;
}

function measured(run: () => TransactionResult): {
  elapsedMs: number;
  result: TransactionResult;
} {
  const started = performance.now();
  const result = run();
  return { elapsedMs: performance.now() - started, result };
}

describe("validated stage-text mutation performance", () => {
  test("L1, L4, and L8 fixtures are deterministic and stay within their byte budgets", () => {
    for (const tier of ["L1", "L4", "L8"] as const) {
      const first = fixture(tier);
      const second = fixture(tier);
      expect(first.digest).toBe(second.digest);
      expect(first.content).toBe(second.content);
      expect(Buffer.byteLength(first.content)).toBeLessThanOrEqual(DOCUMENT_LIMIT[tier]);
      expect(first.targets).toHaveLength(TIER_SIZE[tier]);
      expect(new Set(first.targets.map((target) => target.slug)).size).toBe(TIER_SIZE[tier]);
    }
  });

  test("L8 success, tail not-found, and duplicate-target stay below latency and RSS limits", () => {
    const l8 = fixture("L8");
    const missing = [...l8.targets.slice(0, -1), { slug: "stage-missing", dimension: "checkbox" as const }];
    const duplicate = [...l8.targets, l8.targets[0]];
    const cases = [
      { name: "success", run: () => transact(l8.content, l8.targets) },
      { name: "tail-not-found", run: () => transact(l8.content, missing) },
      { name: "duplicate-target", run: () => transact(l8.content, duplicate) },
    ] as const;

    for (const benchmark of cases) {
      for (let index = 0; index < WARMUP_RUNS; index++) benchmark.run();
    }
    const rssBefore = resourceMaxRssBytes();
    const evidence = cases.map((benchmark) => ({
      name: benchmark.name,
      samples: Array.from({ length: MEASUREMENT_RUNS }, () => measured(benchmark.run)),
    }));
    const rssDeltaMiB = Math.max(0, resourceMaxRssBytes() - rssBefore) / (1024 * 1024);

    const success = evidence[0].samples[0].result;
    expect(success.kind).toBe("changed");
    if (success.kind === "changed") {
      expect(success.counters).toEqual({
        parse: 2 * TIER_SIZE.L8 + 2,
        setter: TIER_SIZE.L8,
        write: 1,
        audit: 1,
        success: 1,
        retry: 0,
        resync: 0,
      });
      expect(success.content).not.toBe(l8.content);
    }
    const notFound = evidence[1].samples[0].result;
    expect(notFound.kind).toBe("not-found");
    if (notFound.kind === "not-found") {
      expect(notFound.target).toBe("stage-missing");
      expect(notFound.counters.write).toBe(0);
      expect(notFound.counters.audit).toBe(0);
      expect(notFound.counters.success).toBe(0);
    }
    const duplicateTarget = evidence[2].samples[0].result;
    expect(duplicateTarget).toEqual({
      kind: "duplicate-target",
      target: l8.targets[0].slug,
      counters: emptyCounters(),
    });

    const elapsed = evidence.flatMap((entry) =>
      entry.samples.map((sample) => sample.elapsedMs)
    );
    const benchmarkRecord = {
      tier: "L8",
      stages: TIER_SIZE.L8,
      targets: TIER_SIZE.L8,
      fixtureBytes: Buffer.byteLength(l8.content),
      fixtureDigest: l8.digest,
      warmups: WARMUP_RUNS,
      measurements: MEASUREMENT_RUNS,
      maximumElapsedMs: Math.max(...elapsed),
      rssDeltaMiB,
      bunVersion: Bun.version,
      runnerImage: process.env.ImageOS ?? process.env.RUNNER_OS ?? "local",
      cpuModel: cpus()[0]?.model ?? "unknown",
    };
    console.log(`TEXT_MUTATION_BENCHMARK ${JSON.stringify(benchmarkRecord)}`);
    expect(Math.max(...elapsed)).toBeLessThanOrEqual(LATENCY_LIMIT_MS);
    expect(rssDeltaMiB).toBeLessThanOrEqual(RSS_LIMIT_MIB);
  }, 120_000);
});
