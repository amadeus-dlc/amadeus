// covers: file:lib/percentile.ts
// size: small
//
// The perf-tier benchmarks that consume nearestRankP95 (t257, t258) do not run
// under --ci, so the helper's contract is pinned here in-process instead.
import { describe, expect, test } from "bun:test";
import { nearestRankP95 } from "../lib/percentile.ts";

describe("nearestRankP95", () => {
  test("takes the ceil(0.95 * n) - 1 rank of a 100-sample set", () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(nearestRankP95(values)).toBe(95);
  });

  test("sorts before ranking, so input order does not matter", () => {
    expect(nearestRankP95([5, 1, 4, 2, 3])).toBe(nearestRankP95([1, 2, 3, 4, 5]));
  });

  test("does not interpolate — the result is always a sample", () => {
    const values = [10, 20, 30, 40];
    expect(values).toContain(nearestRankP95(values));
    expect(nearestRankP95(values)).toBe(40);
  });

  test("returns the single sample of a one-element set", () => {
    expect(nearestRankP95([7])).toBe(7);
  });

  test("returns NaN for an empty set rather than undefined", () => {
    expect(nearestRankP95([])).toBeNaN();
  });

  test("leaves the caller's array unmutated", () => {
    const values = [3, 1, 2];
    nearestRankP95(values);
    expect(values).toEqual([3, 1, 2]);
  });
});
