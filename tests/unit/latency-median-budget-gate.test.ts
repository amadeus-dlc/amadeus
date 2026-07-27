// covers: function:exceedsMedianLatencyBudget, function:median
// size: small
//
// latency-median-budget-gate.test.ts — pins the lifecycle/registry latency
// verdict (#1511). Pure in-process: the integration tests can only exercise
// whatever the shared runner produces on the day, so the two properties that
// matter are asserted directly here instead of being left to host luck.
//
//   1. FALSE-RED SIDE (spike absorption). A burst of load-contention spikes on
//      an otherwise-healthy run turned the old absolute p95 ceiling red; the
//      median must stay green through it.
//   2. DETECTION SIDE (falling proof). A genuine across-the-board regression
//      must still report — otherwise the median swap would be a no-op.
//
// The median cases also pin length-independence: a fixed-index form returns a
// silently wrong quantile for any sample count other than the one it targets.
//
// SYNTHETIC DATA. #1511's logs preserve only aggregates (recovery p95
// 767.446207 ms / archive p95 886.793806 ms — LIFECYCLE_TRANSACTION_BENCHMARK
// lines), not raw per-sample arrays, so the sample vectors below are
// *constructed*, not replayed. Construction: `spikeVector(normalMs, spikeMs, n)`
// returns 100 samples = n copies of the recorded spike magnitude + (100 - n)
// copies of the recorded healthy magnitude. Normal magnitudes are the CI p95
// recorded on #1424 (archive 41.177 / recovery 29.314). These are estimates of
// a distribution shape, labelled synthetic — not measurements of a #1511 run.

import { describe, expect, test } from "bun:test";
import {
  exceedsMedianLatencyBudget,
  median,
} from "../lib/latency-median-budget-gate.ts";

// The old, flaky verdict: nearest-rank p95 vs the absolute budget. Reproduced
// here verbatim from t258/t257 (`sorted[Math.ceil(len*0.95)-1]`) so the
// old-red/new-green contrast is asserted on identical inputs.
function oldP95CeilingRed(samplesMs: number[], budgetMs: number): boolean {
  const sorted = [...samplesMs].sort((left, right) => left - right);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  return p95 > budgetMs;
}

// 100 samples: `spikeCount` copies of `spikeMs`, the rest `normalMs`.
function spikeVector(normalMs: number, spikeMs: number, spikeCount: number): number[] {
  return Array.from({ length: 100 }, (_, index) =>
    index < spikeCount ? spikeMs : normalMs,
  );
}

// Recorded #1511 aggregate spike magnitudes and #1424 healthy p95 magnitudes.
const ARCHIVE_BUDGET_MS = 500;
const ARCHIVE_NORMAL_MS = 41.177;
const ARCHIVE_SPIKE_MS = 886.793806;
const RECOVERY_BUDGET_MS = 750;
const RECOVERY_NORMAL_MS = 29.314;
const RECOVERY_SPIKE_MS = 767.446207;

describe("median latency budget gate — spike absorption (false-red side)", () => {
  // nearest-rank p95 of 100 crosses the ceiling at 6 spikes; the median needs
  // 51. Every count in [6, 49] is old-red / new-green — the exact band that
  // produced #1511's flakes. 49 is the last count where < 50 samples are slow,
  // so the median (mean of sorted[49]=normal and sorted[50]=normal) stays healthy.
  test.each([6, 20, 49])(
    "%i archive spikes: old p95 ceiling red, new median green",
    (spikeCount) => {
      const samples = spikeVector(ARCHIVE_NORMAL_MS, ARCHIVE_SPIKE_MS, spikeCount);
      expect(oldP95CeilingRed(samples, ARCHIVE_BUDGET_MS)).toBe(true);
      expect(exceedsMedianLatencyBudget(samples, ARCHIVE_BUDGET_MS)).toBe(false);
    },
  );

  test.each([6, 20, 49])(
    "%i recovery spikes: old p95 ceiling red, new median green",
    (spikeCount) => {
      const samples = spikeVector(RECOVERY_NORMAL_MS, RECOVERY_SPIKE_MS, spikeCount);
      expect(oldP95CeilingRed(samples, RECOVERY_BUDGET_MS)).toBe(true);
      expect(exceedsMedianLatencyBudget(samples, RECOVERY_BUDGET_MS)).toBe(false);
    },
  );

  test("a healthy run stays green under both verdicts", () => {
    const samples = spikeVector(ARCHIVE_NORMAL_MS, ARCHIVE_SPIKE_MS, 0);
    expect(oldP95CeilingRed(samples, ARCHIVE_BUDGET_MS)).toBe(false);
    expect(exceedsMedianLatencyBudget(samples, ARCHIVE_BUDGET_MS)).toBe(false);
  });
});

describe("median latency budget gate — genuine regression (falling proof)", () => {
  test("an across-the-board regression reports (all samples over budget)", () => {
    const regressed = Array.from({ length: 100 }, () => ARCHIVE_BUDGET_MS + 100);
    expect(exceedsMedianLatencyBudget(regressed, ARCHIVE_BUDGET_MS)).toBe(true);
  });

  test("a majority-slow run reports (51 of 100 over budget)", () => {
    // 51 spikes => sorted[49] and sorted[50] are both the spike magnitude, so
    // the median exceeds the budget. This is the first count the median catches.
    const samples = spikeVector(ARCHIVE_NORMAL_MS, ARCHIVE_SPIKE_MS, 51);
    expect(exceedsMedianLatencyBudget(samples, ARCHIVE_BUDGET_MS)).toBe(true);
  });

  test("50-of-100 slow is still absorbed (median is the healthy/spike midpoint)", () => {
    // sorted[49]=normal, sorted[50]=spike => median below budget for these
    // magnitudes. Pins the exact absorb/report boundary at the median rank.
    const samples = spikeVector(ARCHIVE_NORMAL_MS, ARCHIVE_SPIKE_MS, 50);
    expect(exceedsMedianLatencyBudget(samples, ARCHIVE_BUDGET_MS)).toBe(false);
  });

  test("small-budget metric (strictRead 100 ms) reports a real regression", () => {
    const regressed = Array.from({ length: 100 }, () => 150);
    expect(exceedsMedianLatencyBudget(regressed, 100)).toBe(true);
  });
});

describe("median latency budget gate — edges and fail-closed", () => {
  test("empty sample set fails closed", () => {
    expect(exceedsMedianLatencyBudget([], ARCHIVE_BUDGET_MS)).toBe(true);
  });

  test("a non-finite sample fails closed", () => {
    expect(exceedsMedianLatencyBudget([1, Number.NaN, 2], ARCHIVE_BUDGET_MS)).toBe(true);
    expect(
      exceedsMedianLatencyBudget([1, Number.POSITIVE_INFINITY, 2], ARCHIVE_BUDGET_MS),
    ).toBe(true);
  });

  test("a non-finite budget fails closed", () => {
    expect(exceedsMedianLatencyBudget([1, 2, 3], Number.NaN)).toBe(true);
  });

  test("median exactly at the budget passes (strict greater-than)", () => {
    const atBudget = Array.from({ length: 100 }, () => ARCHIVE_BUDGET_MS);
    expect(exceedsMedianLatencyBudget(atBudget, ARCHIVE_BUDGET_MS)).toBe(false);
  });

  test("median one unit over the budget reports", () => {
    const overBudget = Array.from({ length: 100 }, () => ARCHIVE_BUDGET_MS + 1);
    expect(exceedsMedianLatencyBudget(overBudget, ARCHIVE_BUDGET_MS)).toBe(true);
  });
});

describe("median — length-independent quantile", () => {
  test("odd length returns the middle element", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  test("even length returns the mean of the two middle elements", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  test("does not assume a fixed sample count", () => {
    expect(median([10, 20, 30, 40, 50, 60, 70])).toBe(40);
    expect(median(Array.from({ length: 100 }, (_, index) => index))).toBe(49.5);
  });
});
