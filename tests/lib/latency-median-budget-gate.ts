// Decision surface for the lifecycle/registry latency budget contracts
// (t258-lifecycle-transaction, t257-status-registry-migration). The predicate
// lives here, apart from the spawnSync measurement loops, so the verdict can be
// driven in-process from recorded samples — the integration tests can only
// exercise whatever the shared runner happens to produce on the day, which is
// exactly the property that made the old absolute p95 ceiling flaky (#1511).
//
// SHAPE. The verdict is `median(samples) > budget`, not `p95(samples) > budget`.
// The budgets are unchanged (t258: archive 500 ms / recovery 750 ms; t257:
// strictRead 100 ms / migration 250 ms), but they now gate the median instead
// of the 95th percentile.
//
// WHY MEDIAN, NOT THE NOOP-RELATIVE FORM. The #1511 false red is shared-runner
// load contention that inflates individual samples inside the ~40 ms archive
// I/O window while `bun run test:ci -- -P 4` runs four integration tests at
// once. The nearest-rank p95 (`sorted[94]` of 100) crosses an absolute ceiling
// as soon as 6 of 100 samples spike, so ordinary runner jitter turns the gate
// red. The median (`sorted[49..50]` of 100) needs *half* the samples to be slow
// before it moves, so a burst of spikes on an otherwise-healthy run is absorbed
// while a genuine across-the-board regression still reports.
//
// A noop-relative baseline was considered and rejected: the benchmark's noop
// mode measures an empty ~40 ns timing window with no I/O, so it does not share
// the archive window's contention and does not co-spike. Measured on an
// unchanged child under host load, the archive p95 rose 38.19 ms -> 86.90 ms
// (2.3x) while the noop p95 stayed flat at 0.0008 ms — zero correlation — so
// `mode - noop` collapses to `mode` and the relative term is a no-op against
// the real flake. (User ruling 2026-07-26, canonical escalation list item 4 —
// see requirements FR-1 approval lineage.)

// Length-independent median. A fixed-index form (e.g. sorted[49]/sorted[50])
// silently returns a different quantile for any sample count other than the one
// it was written for.
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

// True when the median latency breaches the absolute budget. Fails closed on a
// measurement it cannot interpret — an empty sample set or any non-finite
// sample or budget reports rather than silently passing, so a broken benchmark
// run surfaces as a red gate instead of a false green.
export function exceedsMedianLatencyBudget(
  samplesMs: readonly number[],
  budgetMs: number,
): boolean {
  if (samplesMs.length === 0) return true;
  if (!Number.isFinite(budgetMs)) return true;
  if (!samplesMs.every((sample) => Number.isFinite(sample))) return true;
  return median(samplesMs) > budgetMs;
}
