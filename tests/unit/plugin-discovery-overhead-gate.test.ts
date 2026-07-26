// covers: function:exceedsDiscoveryOverhead, function:median
// size: small
//
// plugin-discovery-overhead-gate.test.ts — pins the U2 plugin discovery
// overhead verdict (#1525). Pure in-process: every sample below is a recorded
// measurement, so the two properties that matter are asserted directly instead
// of being left to whatever the host produces on the day.
//
//   1. FALSE-RED SIDE. Hosted-runner jitter recorded on #1525 against an
//      unchanged discovery implementation must not report. These are the
//      measurements that actually turned CI red.
//   2. DETECTION SIDE. A treatment that breaches both the ratio and the
//      absolute floor must report — otherwise the floor would have turned the
//      gate into a no-op.
//
// The median cases pin length-independence: the previous inline implementation
// hard-coded sorted[4]/sorted[5] and returned a silently wrong quantile for any
// sample count other than ten.

import { describe, expect, test } from "bun:test";
import {
  DISCOVERY_OVERHEAD_NOISE_FLOOR_MS,
  DISCOVERY_OVERHEAD_RATIO_LIMIT,
  exceedsDiscoveryOverhead,
  median,
} from "../lib/plugin-discovery-overhead-gate.ts";

describe("exceedsDiscoveryOverhead", () => {
  // Recorded on #1525. Each pair is (baselineMedianMs, treatmentMedianMs) from
  // a run whose discovery implementation was NOT the cause; the old bare
  // ratio > 0.2 gate reported on every one of them.
  const recordedJitter: ReadonlyArray<readonly [string, number, number]> = [
    // job 89780125726, additionalRatio 0.21715 (verbatim medians from the
    // benchmark JSON quoted in the issue).
    ["job 89780125726", 10.2435, 12.4679],
    // job 89775717608, the worst observed excursion (0.338102), against the
    // largest observed CI baseline median (12.896, job 89783604336).
    ["worst excursion 0.338102", 12.896, 12.896 * 1.338102],
    // job 89769831966 on aef8fad20 — the plain readdirSync+statSync
    // implementation, i.e. before either #1518 change: 0.333572.
    ["aef8fad20 0.333572", 12.896, 12.896 * 1.333572],
    // job 89779295143 (0.237944) and 89783082650 (0.209735).
    ["job 89779295143", 10.2435, 10.2435 * 1.237944],
    ["job 89783082650", 10.2435, 10.2435 * 1.209735],
    // job 89775498733 (0.222127).
    ["job 89775498733", 10.2435, 10.2435 * 1.222127],
  ];

  for (const [label, baselineMedianMs, treatmentMedianMs] of recordedJitter) {
    test(`recorded hosted-runner jitter does not report (${label})`, () => {
      // Guard the fixture: these must all breach the old bare ratio gate,
      // otherwise the case proves nothing about the regression it pins.
      const ratio = (treatmentMedianMs - baselineMedianMs) / baselineMedianMs;
      expect(ratio).toBeGreaterThan(DISCOVERY_OVERHEAD_RATIO_LIMIT);
      expect(exceedsDiscoveryOverhead(baselineMedianMs, treatmentMedianMs)).toBe(false);
    });
  }

  test("the negative-ratio green run does not report", () => {
    // job 89783604336: the treatment strictly does more work yet measured
    // faster (additionalRatio -0.004053).
    expect(exceedsDiscoveryOverhead(12.896, 12.896 * 0.995947)).toBe(false);
  });

  test("a gross regression breaching both the ratio and the floor reports", () => {
    // 12.896 ms CI baseline against a treatment that adds 15 ms: ratio 1.16,
    // additionalMs 15 > 10.
    expect(exceedsDiscoveryOverhead(12.896, 27.896)).toBe(true);
    // 3.5 ms local baseline against a treatment that adds 20 ms.
    expect(exceedsDiscoveryOverhead(3.5, 23.5)).toBe(true);
  });

  test("breaching only one of the two conditions does not report", () => {
    // Floor breached, ratio not: a 200 ms baseline plus 15 ms is only 7.5%.
    expect(exceedsDiscoveryOverhead(200, 215)).toBe(false);
    // Ratio breached, floor not: 3.5 ms baseline plus 2 ms is 57% but 2 < 10.
    expect(exceedsDiscoveryOverhead(3.5, 5.5)).toBe(false);
  });

  test("both conditions are exclusive at their boundary", () => {
    // Exactly at the floor (10 ms added) with the ratio far exceeded.
    expect(DISCOVERY_OVERHEAD_NOISE_FLOOR_MS).toBe(10);
    expect(exceedsDiscoveryOverhead(10, 20)).toBe(false);
    expect(exceedsDiscoveryOverhead(10, 20.5)).toBe(true);
    // Exactly at the ratio limit (20% added) with the floor far exceeded.
    expect(DISCOVERY_OVERHEAD_RATIO_LIMIT).toBe(0.2);
    expect(exceedsDiscoveryOverhead(100, 120)).toBe(false);
    expect(exceedsDiscoveryOverhead(100, 120.5)).toBe(true);
  });

  test("an uninterpretable baseline fails closed", () => {
    expect(exceedsDiscoveryOverhead(0, 5)).toBe(true);
    expect(exceedsDiscoveryOverhead(-1, 5)).toBe(true);
    expect(exceedsDiscoveryOverhead(Number.NaN, 5)).toBe(true);
    expect(exceedsDiscoveryOverhead(10, Number.NaN)).toBe(true);
  });
});

describe("median", () => {
  test("even sample counts average the two central values", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    // Ten samples: the quantile the old sorted[4]/sorted[5] form produced.
    expect(median([10, 1, 9, 2, 8, 3, 7, 4, 6, 5])).toBe(5.5);
  });

  test("odd sample counts take the central value", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([7])).toBe(7);
    // Eleven samples: sorted[4]/sorted[5] would have returned 5.5 here.
    expect(median([11, 1, 10, 2, 9, 3, 8, 4, 7, 5, 6])).toBe(6);
  });

  test("the input is not mutated", () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });

  test("an empty sample throws rather than returning NaN", () => {
    expect(() => median([])).toThrow("median requires at least one sample");
  });
});
