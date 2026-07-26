// Decision surface for the U2 plugin stage discovery performance contract
// (tests/integration/t-plugin-stage-discovery-performance.integration.test.ts).
//
// The predicate lives here, apart from the measurement loop, so the verdict can
// be driven in-process from recorded samples: the integration test can only
// exercise whatever the host happens to produce on the day, which is exactly
// the property that made the gate flaky (#1525).
//
// SHAPE. A bare relative limit is not meaningful when the denominator is a few
// milliseconds, so the verdict is the AND of a relative ratio and an absolute
// noise floor — the same construction the mirror benchmark dispersion gate uses
// (scripts/mirror-distribution-benchmark-aggregate.ts,
// DISPERSION_NOISE_FLOOR_FRACTION).

export const DISCOVERY_OVERHEAD_RATIO_LIMIT = 0.2;

// Derived from the hosted-runner measurements recorded on #1525, two ways that
// converge on the same magnitude:
//
//   1. Worst pure-jitter excursion. The largest additionalRatio observed on an
//      unchanged discovery implementation is 0.338102 (job 89775717608) and the
//      largest CI baseline median observed is 12.896 ms (job 89783604336), so
//      jitter alone reaches 0.338102 * 12.896 = 4.36 ms of "additional" time.
//   2. Within-sample spread. The baseline samples of that same run span
//      8.55-18.70 ms, i.e. 10.15 ms, for a median of 12.896 ms.
//
// 10 ms is ~2.3x (1) and ~= (2), so ordinary scheduler noise cannot reach it.
//
// DETECTION POWER, STATED HONESTLY. The real cost of the 100-plugin treatment
// is 0.06-0.31 ms locally against a ~3.5 ms baseline; scaled by the CI/local
// baseline ratio (12.896 / 3.5 = 3.7x) that is roughly 1 ms on a hosted runner
// — an order of magnitude *below* the noise floor. The current per-plugin cost
// therefore cannot be gated on at all on hosted hardware; pretending otherwise
// is what produced a gate that fired on ~36% of measurements while its own
// green runs reported a negative ratio (-0.004053, job 89783604336: the
// treatment strictly does more work yet measured faster).
//
// What survives is a gross-regression gate: with a ~13 ms CI baseline the
// treatment has to reach ~23 ms (1.8x) to report, and with a ~3.5 ms local
// baseline it has to reach ~13.5 ms (3.9x). That catches the accidental
// order-of-magnitude regressions this contract exists for (per-stage re-reads,
// per-plugin spawns, quadratic enumeration) and nothing else.
export const DISCOVERY_OVERHEAD_NOISE_FLOOR_MS = 10;

// Length-independent median. The previous inline version indexed sorted[4] and
// sorted[5] directly, which silently returned a different quantile for any
// sample count other than ten.
export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error("median requires at least one sample");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

// True when the treatment overhead breaches BOTH the relative limit and the
// absolute floor. A non-positive or non-finite baseline makes the ratio
// meaningless, so it reports rather than dividing — the gate fails closed on a
// measurement it cannot interpret.
export function exceedsDiscoveryOverhead(
  baselineMedianMs: number,
  treatmentMedianMs: number,
): boolean {
  if (!(baselineMedianMs > 0) || !Number.isFinite(treatmentMedianMs)) return true;
  const additionalMs = treatmentMedianMs - baselineMedianMs;
  return (
    additionalMs / baselineMedianMs > DISCOVERY_OVERHEAD_RATIO_LIMIT &&
    additionalMs > DISCOVERY_OVERHEAD_NOISE_FLOOR_MS
  );
}
