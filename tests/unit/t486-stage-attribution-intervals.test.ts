// covers: file:packages/framework/core/tools/amadeus-stage-attribution-intervals.ts
import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  accountAttributionPopulation,
  clipInterval,
  intervalSeconds,
  subtractIntervals,
  unionIntervals,
  type AttributionPopulationInput,
} from "../../packages/framework/core/tools/amadeus-stage-attribution-intervals.ts";
import {
  createAttributionWindow,
  createAttributionWindowId,
  createCandidateId,
  createIntentIdentity,
  createLifecycleIdentity,
  createSecondInterval,
  parseTargetStage,
  type AccountingInvariantError,
  type AttributionCategory,
  type AttributionResult,
  type AttributionWindow,
  type ExplicitLifecycleInterval,
  type IntentIdentity,
  type SecondInterval,
  type TargetStage,
} from "../../packages/framework/core/tools/amadeus-stage-attribution-domain.ts";

type PopulationAccountingError = Extract<
  AccountingInvariantError,
  { readonly code: "invalid-population-accounting" }
>;

function unwrap<T, E>(result: AttributionResult<T, E>): T {
  if (!result.ok) throw new TypeError("expected successful construction");
  return result.value;
}

const intentA = unwrap(createIntentIdentity("intent-a"));
const intentB = unwrap(createIntentIdentity("intent-b"));
const codeGeneration = unwrap(parseTargetStage("code-generation"));
const verification = unwrap(parseTargetStage("verification"));

function interval(start: number, end: number): SecondInterval {
  return unwrap(createSecondInterval(start, end));
}

function window(
  id: string,
  start: number,
  end: number,
  netSeconds: number,
  intent: IntentIdentity = intentA,
  stage: TargetStage = codeGeneration,
): AttributionWindow {
  return unwrap(createAttributionWindow({
    windowId: unwrap(createAttributionWindowId(id)),
    intent,
    stage,
    measuredInterval: interval(start, end),
    netSeconds,
  }));
}

function candidate(
  id: string,
  start: number,
  end: number,
  category: AttributionCategory = "sensor-execution",
  intent: IntentIdentity = intentA,
  stage: TargetStage = codeGeneration,
): ExplicitLifecycleInterval {
  return {
    type: "explicit-lifecycle-interval",
    candidateId: unwrap(createCandidateId(id)),
    explicitIntent: intent,
    lifecycleIdentity: unwrap(createLifecycleIdentity(`lifecycle-${id}`)),
    family: category === "sensor-execution" ? "sensor" : "bolt",
    category,
    stage,
    interval: interval(start, end),
  };
}

function input(overrides: Partial<AttributionPopulationInput> = {}): AttributionPopulationInput {
  return {
    windows: [window("window-a", 0, 20, 15)],
    intervals: [candidate("candidate-a", 2, 18)],
    idleIndex: { byIntent: [{ intent: intentA, intervals: [interval(8, 13)] }] },
    ...overrides,
  };
}

describe("interval primitives", () => {
  test("use half-open bounds and canonicalize nested, identical, adjacent, overlapping, and disjoint intervals", () => {
    expect(clipInterval(interval(0, 5), interval(5, 10))).toBeNull();
    expect(clipInterval(interval(0, 8), interval(3, 6))).toEqual(interval(3, 6));

    const source = Object.freeze([
      interval(10, 12),
      interval(1, 4),
      interval(2, 3),
      interval(4, 8),
      interval(1, 4),
      interval(15, 16),
    ]);
    expect(unionIntervals(source)).toEqual([interval(1, 8), interval(10, 12), interval(15, 16)]);
    expect(source).toEqual([
      interval(10, 12),
      interval(1, 4),
      interval(2, 3),
      interval(4, 8),
      interval(1, 4),
      interval(15, 16),
    ]);
  });

  test("subtracts unioned exclusions into positive fragments", () => {
    expect(subtractIntervals(interval(0, 20), [interval(-5, 2), interval(8, 12), interval(10, 14), interval(18, 30)])).toEqual([
      interval(2, 8),
      interval(14, 18),
    ]);
    expect(subtractIntervals(interval(0, 20), [interval(-5, 30)])).toEqual([]);
    expect(subtractIntervals(interval(0, 20), [interval(20, 30)])).toEqual([interval(0, 20)]);
  });

  test("counts union seconds and rejects unsafe totals", () => {
    expect(intervalSeconds([interval(0, 5), interval(3, 8), interval(10, 12)])).toBe(10);
    expect(() => intervalSeconds([{ start: Number.MIN_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER }])).toThrow(RangeError);
    expect(() => intervalSeconds([interval(0, 10), { start: 5, end: 4 }])).toThrow(RangeError);
  });

  test("union is idempotent and invariant under shuffled input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: -100, max: 99 }), fc.integer({ min: 1, max: 20 })), { maxLength: 40 }),
        fc.array(fc.integer(), { maxLength: 40 }),
        (pairs, orderKeys) => {
          const intervals = pairs.map(([start, length]) => ({ start, end: start + length }));
          // Permute via a shrinkable order-key input instead of fc.sample,
          // which would sit outside the property's shrink tree.
          const shuffled = intervals
            .map((value, index) => ({ key: orderKeys[index] ?? 0, index, value }))
            .sort((left, right) => left.key - right.key || left.index - right.index)
            .map(({ value }) => value);
          const expected = unionIntervals(intervals);
          expect(unionIntervals(shuffled)).toEqual(expected);
          expect(unionIntervals(expected)).toEqual(expected);
        },
      ),
      { seed: 48603, numRuns: 100 },
    );
  });
});

describe("population interval accounting", () => {
  test("clips by explicit intent and stage, subtracts idle, and reports closed category accounting", () => {
    const result = accountAttributionPopulation(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.dispositions).toEqual([
      {
        type: "accounted",
        candidateId: unwrap(createCandidateId("candidate-a")),
        contributions: [
          {
            type: "candidate-window-contribution",
            windowId: unwrap(createAttributionWindowId("window-a")),
            fragments: [interval(2, 8), interval(13, 18)],
          },
        ],
      },
    ]);
    expect(result.value.windows).toHaveLength(1);
    const accountedWindow = result.value.windows[0]!;
    expect(accountedWindow.categories.map(({ category }) => category)).toEqual([
      "sensor-execution",
      "swarm-lifecycle",
      "bolt-lifecycle",
      "subagent-lifecycle",
      "loop-monitor-lifecycle",
      "merge-dispatch-lifecycle",
      "execution-lifecycle",
      "unit-pool-lifecycle",
      "transaction-lifecycle",
    ]);
    expect(accountedWindow.categories[0]).toEqual({
      category: "sensor-execution",
      fragments: [interval(2, 8), interval(13, 18)],
      seconds: 11,
      share: 11 / 15,
    });
    for (const category of accountedWindow.categories.slice(1)) {
      expect(category.fragments).toEqual([]);
      expect(category.seconds).toBe(0);
      expect(category.share).toBe(0);
    }
    expect(accountedWindow.categorySumSeconds).toBe(11);
    expect(accountedWindow.observableFragments).toEqual([interval(2, 8), interval(13, 18)]);
    expect(accountedWindow.observableSeconds).toBe(11);
    expect(accountedWindow.overlapSeconds).toBe(0);
    expect(accountedWindow.unattributableSeconds).toBe(4);
    expect(accountedWindow.coverage).toBe(11 / 15);
    expect(accountedWindow.unattributableRate).toBe(1 - 11 / 15);
    expect(accountedWindow.observableSeconds + accountedWindow.unattributableSeconds).toBe(accountedWindow.netSeconds);
  });

  test("aggregates multiple eligible windows into one disposition without inferring identity from containment", () => {
    const windows = [
      window("window-b", 20, 40, 20),
      window("window-other-intent", 0, 20, 20, intentB),
      window("window-other-stage", 0, 20, 15, intentA, verification),
      window("window-a", 0, 20, 15),
    ];
    const intervals = [
      candidate("candidate-outside", 40, 50),
      candidate("candidate-multi", 2, 38),
      candidate("candidate-empty", 8, 13),
      candidate("candidate-other-intent", 2, 4, "sensor-execution", intentB),
      candidate("candidate-other-stage", 2, 4, "sensor-execution", intentA, verification),
    ];
    const result = accountAttributionPopulation({
      windows,
      intervals,
      idleIndex: {
        byIntent: [
          { intent: intentA, intervals: [interval(8, 13)] },
          { intent: intentB, intervals: [] },
        ],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.windows.map(({ windowId }) => String(windowId))).toEqual([
      "window-a",
      "window-other-stage",
      "window-b",
      "window-other-intent",
    ]);
    expect(result.value.dispositions.map(({ candidateId }) => String(candidateId))).toEqual([
      "candidate-empty",
      "candidate-multi",
      "candidate-other-intent",
      "candidate-other-stage",
      "candidate-outside",
    ]);
    expect(result.value.dispositions[0]).toMatchObject({ type: "rejected", reason: "empty-after-idle" });
    expect(result.value.dispositions[4]).toMatchObject({ type: "rejected", reason: "outside-window" });
    expect(result.value.dispositions[1]).toEqual({
      type: "accounted",
      candidateId: unwrap(createCandidateId("candidate-multi")),
      contributions: [
        {
          type: "candidate-window-contribution",
          windowId: unwrap(createAttributionWindowId("window-a")),
          fragments: [interval(2, 8), interval(13, 20)],
        },
        {
          type: "candidate-window-contribution",
          windowId: unwrap(createAttributionWindowId("window-b")),
          fragments: [interval(20, 38)],
        },
      ],
    });
    expect(result.value.dispositions).toHaveLength(intervals.length);
  });

  test("unions within categories separately from the global observable union", () => {
    const result = accountAttributionPopulation({
      windows: [window("window-overlap", 0, 20, 20)],
      intervals: [
        candidate("candidate-sensor", 2, 10),
        candidate("candidate-bolt", 6, 14, "bolt-lifecycle"),
      ],
      idleIndex: { byIntent: [] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const accountedWindow = result.value.windows[0]!;
    expect(accountedWindow.categories[0]).toMatchObject({ fragments: [interval(2, 10)], seconds: 8 });
    expect(accountedWindow.categories[2]).toMatchObject({ fragments: [interval(6, 14)], seconds: 8 });
    expect(accountedWindow.categorySumSeconds).toBe(16);
    expect(accountedWindow.observableFragments).toEqual([interval(2, 14)]);
    expect(accountedWindow.observableSeconds).toBe(12);
    expect(accountedWindow.overlapSeconds).toBe(4);
    expect(accountedWindow.unattributableSeconds).toBe(8);
    expect(accountedWindow.coverage).toBe(0.6);
    expect(accountedWindow.unattributableRate).toBe(0.4);
  });

  test("supports empty candidates and empty windows while preserving total population accounting", () => {
    const noCandidates = accountAttributionPopulation({
      windows: [window("window-empty", 0, 10, 10)],
      intervals: [],
      idleIndex: { byIntent: [] },
    });
    expect(noCandidates.ok).toBe(true);
    if (noCandidates.ok) {
      expect(noCandidates.value.dispositions).toEqual([]);
      expect(noCandidates.value.windows[0]).toMatchObject({
        categorySumSeconds: 0,
        observableSeconds: 0,
        overlapSeconds: 0,
        unattributableSeconds: 10,
        coverage: 0,
        unattributableRate: 1,
      });
    }

    const noWindows = accountAttributionPopulation({
      windows: [],
      intervals: [candidate("candidate-no-window", 0, 10)],
      idleIndex: { byIntent: [] },
    });
    expect(noWindows).toEqual({
      ok: true,
      value: {
        windows: [],
        dispositions: [
          {
            type: "rejected",
            candidateId: unwrap(createCandidateId("candidate-no-window")),
            reason: "outside-window",
          },
        ],
      },
    });
  });

  test("fails closed on duplicate identities, unsafe values, non-canonical idle, and net mismatch", () => {
    const valid = input();
    const unsafeWindow = {
      ...valid.windows[0]!,
      measuredInterval: { start: 0, end: Number.MAX_SAFE_INTEGER + 1 },
    } as AttributionWindow;
    const unsafeCandidate = {
      ...valid.intervals[0]!,
      interval: { start: 0, end: Number.MAX_SAFE_INTEGER + 1 },
    } as ExplicitLifecycleInterval;
    const overflowingWindow = {
      ...valid.windows[0]!,
      measuredInterval: { start: Number.MIN_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER },
    } as AttributionWindow;
    const mismatchedWindow = window("window-mismatch", 0, 20, 20);
    const invalidInputs: Array<[
      AttributionPopulationInput,
      PopulationAccountingError["invariant"],
    ]> = [
      [{ ...valid, windows: [valid.windows[0]!, valid.windows[0]!] }, "duplicate-window-id"],
      [{ ...valid, intervals: [valid.intervals[0]!, valid.intervals[0]!] }, "duplicate-candidate-id"],
      [{ ...valid, windows: [unsafeWindow] }, "invalid-interval"],
      [{ ...valid, intervals: [unsafeCandidate] }, "invalid-interval"],
      [{ ...valid, windows: [overflowingWindow] }, "unsafe-interval-seconds"],
      [{ ...valid, windows: [{ ...valid.windows[0]!, netSeconds: 0 } as AttributionWindow] }, "invalid-window-net-seconds"],
      [{ ...valid, windows: [mismatchedWindow] }, "window-net-idle-mismatch"],
      [
        {
          ...valid,
          idleIndex: {
            byIntent: [
              { intent: intentA, intervals: [interval(8, 13)] },
              { intent: intentA, intervals: [] },
            ],
          },
        },
        "duplicate-idle-intent",
      ],
      [
        { ...valid, idleIndex: { byIntent: [{ intent: intentA, intervals: [interval(8, 10), interval(10, 13)] }] } },
        "non-canonical-idle-index",
      ],
      [
        {
          ...valid,
          idleIndex: {
            byIntent: [
              { intent: intentB, intervals: [] },
              { intent: intentA, intervals: [interval(8, 13)] },
            ],
          },
        },
        "non-canonical-idle-index",
      ],
    ];

    for (const [invalidInput, expectedInvariant] of invalidInputs) {
      const result = accountAttributionPopulation(invalidInput);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("accounting-invariant");
        if (result.error.code === "invalid-population-accounting") expect(result.error.invariant).toBe(expectedInvariant);
      }
    }
  });

  test("is deterministic under shuffles and never mutates caller-owned inputs", () => {
    const windows = Object.freeze([window("window-b", 20, 30, 10), window("window-a", 0, 20, 15)]);
    const intervals = Object.freeze([candidate("candidate-b", 21, 25), candidate("candidate-a", 2, 18)]);
    const idleIntervals = Object.freeze([interval(8, 13)]);
    const idleIndex = Object.freeze({ byIntent: Object.freeze([Object.freeze({ intent: intentA, intervals: idleIntervals })]) });
    const original = { windows, intervals, idleIndex };

    const first = accountAttributionPopulation(original);
    const shuffled = accountAttributionPopulation({ windows: [...windows].reverse(), intervals: [...intervals].reverse(), idleIndex });
    expect(first).toEqual(shuffled);
    expect(windows.map(({ windowId }) => String(windowId))).toEqual(["window-b", "window-a"]);
    expect(intervals.map(({ candidateId }) => String(candidateId))).toEqual(["candidate-b", "candidate-a"]);
    expect(idleIntervals).toEqual([interval(8, 13)]);
  });

  test("preserves accounting identities for generated candidate populations", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            start: fc.integer({ min: -20, max: 69 }),
            length: fc.integer({ min: 1, max: 20 }),
            bolt: fc.boolean(),
          }),
          { maxLength: 30 },
        ),
        (generated) => {
          const intervals = generated.map(({ start, length, bolt }, index) =>
            candidate(`generated-${index}`, start, start + length, bolt ? "bolt-lifecycle" : "sensor-execution"),
          );
          const generatedInput = {
            windows: [window("generated-window", 0, 50, 40)],
            intervals,
            idleIndex: { byIntent: [{ intent: intentA, intervals: [interval(20, 30)] }] },
          };
          const result = accountAttributionPopulation(generatedInput);
          const reversed = accountAttributionPopulation({ ...generatedInput, intervals: [...intervals].reverse() });
          expect(result).toEqual(reversed);
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(result.value.dispositions).toHaveLength(intervals.length);
          expect(new Set(result.value.dispositions.map(({ candidateId }) => candidateId)).size).toBe(intervals.length);
          const accountedWindow = result.value.windows[0]!;
          expect(accountedWindow.observableSeconds + accountedWindow.unattributableSeconds).toBe(accountedWindow.netSeconds);
          expect(accountedWindow.categorySumSeconds - accountedWindow.observableSeconds).toBe(accountedWindow.overlapSeconds);
          expect(Number.isFinite(accountedWindow.coverage)).toBe(true);
          expect(Number.isFinite(accountedWindow.unattributableRate)).toBe(true);
        },
      ),
      { seed: 48604, numRuns: 100 },
    );
  });
});
