// Nearest-rank p95, shared by the perf-tier benchmarks that REPORT a tail
// latency (t257, t258). Kept out of lib/latency-median-budget-gate.ts on
// purpose: that module documents at length why the p95 was rejected as the
// pass/fail verdict (#1511), so hosting the p95 there would blur the line
// between the number a benchmark prints for provenance and the number a gate
// decides on. Nothing here is a verdict.
//
// Nearest rank (no interpolation): the smallest sample whose rank covers 95% of
// the set, i.e. sorted[ceil(0.95 * n) - 1]. Returns NaN for an empty set rather
// than undefined, so a broken measurement propagates as a visibly non-finite
// number instead of a silent hole.
export function nearestRankP95(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? Number.NaN;
}
