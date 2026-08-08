// covers: function:nearestRankP95, function:composeStageStats
//
// t486 — Issue #2405 (U1 stage-stats). Unit half of the twin: every pure
// function of amadeus-stage-stats.ts, driven in-process so bun --coverage
// measures the whole aggregation contract (the FS scan and the CLI spawn live
// in t487's integration layer — cid:code-generation:fs-tests-integration-first).
import { describe, expect, test } from "bun:test";
import {
  type AttributedRecord,
  buildWindows,
  composeStageStats,
  emptyExclusions,
  indexIdle,
  type MeasuredWindow,
  nearestRankP95,
  parseReviewHeadings,
  reviewAttribution,
  type StageWindow,
  subtractIdle,
  attributeModels,
  composeReport,
  HYPOTHESIS_NOTICE,
  parseArgs,
  renderCsv,
  renderMarkdown,
  serializeJson,
  tallySensors,
} from "../../packages/framework/core/tools/amadeus-stage-stats.ts";

// Independent oracle for the corpus shape: the tests hand-build v1 and v2
// journal records rather than routing through the module's own scanner, so a
// scanner defect cannot cancel against the expectation.
function v1(intent: string, event: string, timestamp: string, fields: Record<string, string> = {}): AttributedRecord {
  return { intent, record: { schemaVersion: 1, seq: 1, cloneId: "c", intentId: "intents", timestamp, heading: "h", event, fields } };
}

function v2(intent: string, event: string, timestamp: string, attrs: Record<string, unknown> = {}): AttributedRecord {
  return {
    intent,
    record: {
      schemaVersion: 2,
      eventId: "e",
      seq: 1,
      timestamp,
      eventName: "amadeus.test",
      attributes: { Event: event, ...attrs },
      intentId: "intents",
      space: "default",
      cloneId: "c",
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: `${timestamp}:${event}`,
      canonical: true,
    },
  };
}

// An independent oracle for the window shape: the tests build MeasuredWindow
// literals directly rather than calling the module's own constructor, so a
// constructor defect cannot cancel out against the expectation (BR: no
// self-referential comparison).
function win(stage: string, raw: number, net: number): MeasuredWindow {
  return { intent: "i", stage, startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:00:01Z", rawSeconds: raw, idleSeconds: raw - net, netSeconds: net };
}

describe("nearestRankP95 — nearest rank, NaN on empty", () => {
  test("empty input propagates NaN instead of collapsing to 0", () => {
    expect(nearestRankP95([])).toBeNaN();
  });
  test("nearest rank picks sorted[ceil(0.95n) - 1]", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(nearestRankP95(values)).toBe(95);
  });
  test("a single sample is its own p95", () => {
    expect(nearestRankP95([42])).toBe(42);
  });
  test("input order does not change the result", () => {
    expect(nearestRankP95([9, 1, 5, 3, 7])).toBe(nearestRankP95([1, 3, 5, 7, 9]));
  });
});

describe("composeStageStats — per-stage mean/median/p95", () => {
  test("groups by stage and reports n, raw median, and net statistics", () => {
    const stats = composeStageStats([win("a", 10, 5), win("a", 30, 15), win("b", 100, 100)]);
    expect(stats.map((s) => s.stage)).toEqual(["a", "b"]);
    const a = stats[0]!;
    expect(a.n).toBe(2);
    expect(a.rawMedian).toBe(20);
    expect(a.netMean).toBe(10);
    expect(a.netMedian).toBe(10);
    expect(a.netP95).toBe(15);
  });
  test("empty population yields an empty table, never a zero row", () => {
    expect(composeStageStats([])).toEqual([]);
  });
  test("ordering is count-desc then key-asc", () => {
    const stats = composeStageStats([win("zz", 1, 1), win("aa", 1, 1), win("aa", 1, 1)]);
    expect(stats.map((s) => s.stage)).toEqual(["aa", "zz"]);
  });
});

describe("buildWindows — pairing START with COMPLETED per intent x stage", () => {
  test("pairs both journal generations and computes raw seconds", () => {
    const { windows, buckets } = buildWindows([
      v1("i1", "STAGE_STARTED", "2026-01-01T00:00:00Z", { Stage: "design" }),
      v2("i1", "STAGE_COMPLETED", "2026-01-01T00:01:40Z", { Stage: "design" }),
    ]);
    expect(windows).toHaveLength(1);
    expect(windows[0]!.rawSeconds).toBe(100);
    expect(windows[0]!.stage).toBe("design");
    expect(buckets.windowing.unmatchedStart).toBe(0);
    expect(buckets.windowing.orphanComplete).toBe(0);
  });

  test("a START with no COMPLETED is the unmatched-start bucket, not a window", () => {
    const { windows, buckets } = buildWindows([v1("i1", "STAGE_STARTED", "2026-01-01T00:00:00Z", { Stage: "design" })]);
    expect(windows).toHaveLength(0);
    expect(buckets.windowing.unmatchedStart).toBe(1);
  });

  test("a COMPLETED with no START is the orphan-complete bucket", () => {
    const { buckets } = buildWindows([v1("i1", "STAGE_COMPLETED", "2026-01-01T00:00:00Z", { Stage: "design" })]);
    expect(buckets.windowing.orphanComplete).toBe(1);
  });

  test("the same stage in two intents does not cross-pair", () => {
    const { windows, buckets } = buildWindows([
      v1("i1", "STAGE_STARTED", "2026-01-01T00:00:00Z", { Stage: "design" }),
      v1("i2", "STAGE_COMPLETED", "2026-01-01T00:00:10Z", { Stage: "design" }),
    ]);
    expect(windows).toHaveLength(0);
    expect(buckets.windowing.unmatchedStart).toBe(1);
    expect(buckets.windowing.orphanComplete).toBe(1);
  });

  test("records are ordered by timestamp before pairing, not by input order", () => {
    const { windows } = buildWindows([
      v1("i1", "STAGE_COMPLETED", "2026-01-01T00:00:30Z", { Stage: "design" }),
      v1("i1", "STAGE_STARTED", "2026-01-01T00:00:00Z", { Stage: "design" }),
    ]);
    expect(windows).toHaveLength(1);
    expect(windows[0]!.rawSeconds).toBe(30);
  });

  test("emptyExclusions starts every bucket at zero", () => {
    const zero = emptyExclusions();
    expect(zero.corpus).toEqual({ brokenLine: 0, unreadableShard: 0 });
    expect(zero.windowing).toEqual({ unmatchedStart: 0, orphanComplete: 0, unclosedIdle: 0, zeroSecond: 0, invalidTimestamp: 0 });
    expect(zero.review).toEqual({ unparseableReviewHeading: 0 });
  });

  test("an unparseable timestamp leaves the window population and is counted, not NaN-poisoned", () => {
    const { windows, buckets } = buildWindows([
      v1("i1", "STAGE_STARTED", "not-a-timestamp", { Stage: "design" }),
      v1("i1", "STAGE_COMPLETED", "2026-01-01T00:00:30Z", { Stage: "design" }),
      v1("i1", "STAGE_STARTED", "2026-01-01T00:01:00Z", { Stage: "build" }),
      v1("i1", "STAGE_COMPLETED", "also-garbage", { Stage: "build" }),
    ]);
    expect(windows).toHaveLength(0);
    expect(buckets.windowing.invalidTimestamp).toBe(2);
    expect(buckets.windowing.orphanComplete).toBe(1);
    expect(buckets.windowing.unmatchedStart).toBe(1);
  });

  test("an idle event with an unparseable timestamp is counted instead of poisoning the intervals", () => {
    const index = indexIdle([
      v1("i1", "STAGE_AWAITING_APPROVAL", "garbage-time"),
      v1("i1", "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:05Z"),
      v1("i1", "GATE_APPROVED", "2026-01-01T00:00:10Z"),
    ]);
    expect(index.invalidTimestampCount).toBe(1);
    expect(index.intervals.get("i1")).toHaveLength(1);
  });
});

// A stage window built straight from literals, so the idle tests do not depend
// on buildWindows being correct (independent oracle).
function stageWindow(startedAt: string, completedAt: string, rawSeconds: number): StageWindow {
  return { intent: "i1", stage: "design", startedAt, completedAt, rawSeconds };
}

describe("subtractIdle — clip, merge, and exclude", () => {
  test("an approval wait inside the window makes net strictly less than raw", () => {
    const { measured } = subtractIdle(
      [stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:01:40Z", 100)],
      [
        v1("i1", "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:20Z"),
        v1("i1", "GATE_APPROVED", "2026-01-01T00:00:50Z"),
      ],
    );
    expect(measured).toHaveLength(1);
    expect(measured[0]!.idleSeconds).toBe(30);
    expect(measured[0]!.netSeconds).toBe(70);
    expect(measured[0]!.netSeconds).toBeLessThan(measured[0]!.rawSeconds);
  });

  test("a park span and a session gap both subtract", () => {
    const { measured } = subtractIdle(
      [stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:01:40Z", 100)],
      [
        v1("i1", "WORKFLOW_PARKED", "2026-01-01T00:00:10Z"),
        v1("i1", "WORKFLOW_UNPARKED", "2026-01-01T00:00:20Z"),
        v2("i1", "SESSION_ENDED", "2026-01-01T00:00:30Z"),
        v2("i1", "SESSION_RESUMED", "2026-01-01T00:00:45Z"),
      ],
    );
    expect(measured[0]!.idleSeconds).toBe(25);
    expect(measured[0]!.netSeconds).toBe(75);
  });

  test("overlapping idle spans merge — no double subtraction", () => {
    const { measured } = subtractIdle(
      [stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:01:40Z", 100)],
      [
        v1("i1", "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:10Z"),
        v1("i1", "GATE_APPROVED", "2026-01-01T00:00:50Z"),
        v1("i1", "WORKFLOW_PARKED", "2026-01-01T00:00:20Z"),
        v1("i1", "WORKFLOW_UNPARKED", "2026-01-01T00:00:40Z"),
      ],
    );
    expect(measured[0]!.idleSeconds).toBe(40);
    expect(measured[0]!.netSeconds).toBe(60);
  });

  test("idle extending past both window edges clips to the window, never negative", () => {
    const { measured } = subtractIdle(
      [stageWindow("2026-01-01T00:00:10Z", "2026-01-01T00:00:20Z", 10)],
      [
        v1("i1", "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:00Z"),
        v1("i1", "GATE_APPROVED", "2026-01-01T00:01:00Z"),
      ],
    );
    expect(measured[0]!.idleSeconds).toBe(10);
    expect(measured[0]!.netSeconds).toBe(0);
    expect(measured[0]!.netSeconds).toBeGreaterThanOrEqual(0);
  });

  test("idle abutting the window end (same-try-block gate approval) yields no negative net", () => {
    const { measured } = subtractIdle(
      [stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:00:30Z", 30)],
      [
        v1("i1", "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:20Z"),
        v1("i1", "GATE_APPROVED", "2026-01-01T00:00:30Z"),
      ],
    );
    expect(measured[0]!.netSeconds).toBe(20);
  });

  test("an idle span in a different intent does not reach this window", () => {
    const { measured } = subtractIdle(
      [stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:01:40Z", 100)],
      [
        v1("i2", "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:20Z"),
        v1("i2", "GATE_APPROVED", "2026-01-01T00:00:50Z"),
      ],
    );
    expect(measured[0]!.idleSeconds).toBe(0);
    expect(measured[0]!.netSeconds).toBe(100);
  });

  test("an unclosed idle opener drops the window from the population and is counted", () => {
    const { measured, buckets } = subtractIdle(
      [stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:01:40Z", 100)],
      [v1("i1", "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:20Z")],
    );
    expect(measured).toHaveLength(0);
    expect(buckets.windowing.unclosedIdle).toBe(1);
    expect(buckets.windowing.zeroSecond).toBe(0);
  });

  test("a zero-second window is excluded as below the timestamp resolution", () => {
    const { measured, buckets } = subtractIdle([stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", 0)], []);
    expect(measured).toHaveLength(0);
    expect(buckets.windowing.zeroSecond).toBe(1);
  });

  test("zeroSecond and unclosedIdle are mutually exclusive — a window satisfying both counts once", () => {
    const { measured, buckets } = subtractIdle(
      [stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", 0)],
      [v1("i1", "WORKFLOW_PARKED", "2026-01-01T00:00:00Z")],
    );
    expect(measured).toHaveLength(0);
    expect(buckets.windowing.unclosedIdle + buckets.windowing.zeroSecond).toBe(1);
    expect(buckets.windowing.unclosedIdle).toBe(1);
  });

  test("identity W holds: constructed windows = population + unclosedIdle + zeroSecond", () => {
    const windows = [
      stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:00:10Z", 10),
      stageWindow("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", 0),
      stageWindow("2026-01-01T00:01:00Z", "2026-01-01T00:02:00Z", 60),
    ];
    const { measured, buckets } = subtractIdle(windows, [v1("i1", "WORKFLOW_PARKED", "2026-01-01T00:01:10Z")]);
    expect(measured.length + buckets.windowing.unclosedIdle + buckets.windowing.zeroSecond).toBe(windows.length);
  });
});

describe("parseReviewHeadings — two-stage match, suffixes are reported", () => {
  test("a canonical heading yields its iteration", () => {
    const { iterations, unparseable } = parseReviewHeadings("intro\n\n## Review — Iteration 2\n\nbody\n");
    expect(iterations).toEqual([2]);
    expect(unparseable).toBe(0);
  });
  test("a suffixed heading is counted as unparseable, never dropped in silence", () => {
    const { iterations, unparseable } = parseReviewHeadings("## Review — Iteration 1 (follow-up)\n");
    expect(iterations).toEqual([]);
    expect(unparseable).toBe(1);
  });
  test("multiple canonical headings all count", () => {
    const { iterations } = parseReviewHeadings("## Review — Iteration 1\nx\n## Review — Iteration 3\n");
    expect(iterations).toEqual([1, 3]);
  });
  test("a line that only mentions the marker mid-text is not a heading", () => {
    const { iterations, unparseable } = parseReviewHeadings("see ## Review — Iteration 1 above\n");
    expect(iterations).toEqual([]);
    expect(unparseable).toBe(0);
  });
  test("an unrelated H2 is not a review heading", () => {
    expect(parseReviewHeadings("## Findings\n").unparseable).toBe(0);
  });
});

describe("reviewAttribution — stage and unit come from the path", () => {
  test("a construction unit path keeps its unit segment", () => {
    expect(reviewAttribution("construction/stage-stats-cli/functional-design/business-rules.md")).toEqual({
      stagePath: "construction/stage-stats-cli/functional-design",
      unit: "stage-stats-cli",
    });
  });
  test("a literal {unit-name} directory is displayed as-is, not corrected", () => {
    expect(reviewAttribution("construction/{unit-name}/code-generation/code-summary.md").unit).toBe("{unit-name}");
  });
  test("a non-construction path has no unit", () => {
    expect(reviewAttribution("inception/requirements-analysis/requirements.md")).toEqual({
      stagePath: "inception/requirements-analysis",
      unit: null,
    });
  });
});

describe("tallySensors — bucketed by `Stage slug`, never by `Stage`", () => {
  test("the `Stage slug` attribute wins over a differing `Stage`", () => {
    const rows = tallySensors([
      v1("i1", "SENSOR_FIRED", "2026-01-01T00:00:00Z", { "Stage slug": "design", Stage: "Design Stage" }),
      v1("i1", "SENSOR_PASSED", "2026-01-01T00:00:01Z", { "Stage slug": "design", Stage: "Design Stage" }),
      v2("i1", "SENSOR_FIRED", "2026-01-01T00:00:02Z", { "Stage slug": "design", Stage: "other" }),
      v2("i1", "SENSOR_FAILED", "2026-01-01T00:00:03Z", { "Stage slug": "design", Stage: "other" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.stageSlug).toBe("design");
    expect(rows[0]!.fired).toBe(2);
    expect(rows[0]!.passed).toBe(1);
    expect(rows[0]!.failed).toBe(1);
    expect(rows[0]!.failedRate).toBe(0.5);
  });
  test("a slug that never fired reports NaN, not a 0% pass", () => {
    const rows = tallySensors([v1("i1", "SENSOR_FAILED", "2026-01-01T00:00:00Z", { "Stage slug": "x" })]);
    expect(rows[0]!.failedRate).toBeNaN();
  });
  test("ordering is fired-desc then slug-asc", () => {
    const rows = tallySensors([
      v1("i1", "SENSOR_FIRED", "2026-01-01T00:00:00Z", { "Stage slug": "zz" }),
      v1("i1", "SENSOR_FIRED", "2026-01-01T00:00:01Z", { "Stage slug": "aa" }),
      v1("i1", "SENSOR_FIRED", "2026-01-01T00:00:02Z", { "Stage slug": "aa" }),
    ]);
    expect(rows.map((r) => r.stageSlug)).toEqual(["aa", "zz"]);
  });
});

describe("attributeModels — absence is recorded as absence", () => {
  test("attributable + unresolved equals the total (identity M)", () => {
    const attribution = attributeModels([
      v1("i1", "SUBAGENT_COMPLETED", "2026-01-01T00:00:00Z", { Model: "opus", "Model Source": "pin" }),
      v2("i1", "SUBAGENT_COMPLETED", "2026-01-01T00:00:01Z", { Model: "sonnet", "Model Source": "default" }),
      v1("i1", "SUBAGENT_COMPLETED", "2026-01-01T00:00:02Z", {}),
      v1("i1", "SUBAGENT_STARTED", "2026-01-01T00:00:03Z", { Model: "opus" }),
    ]);
    expect(attribution.totalCount).toBe(3);
    expect(attribution.attributableCount).toBe(2);
    expect(attribution.unresolvedCount).toBe(1);
    expect(attribution.attributableCount + attribution.unresolvedCount).toBe(attribution.totalCount);
    expect(attribution.byModel.get("opus")).toBe(1);
    expect(attribution.byModel.get("sonnet")).toBe(1);
    expect(attribution.byModelSource.get("pin")).toBe(1);
  });
  test("a start row never joins the population — one dispatch is one completion", () => {
    const attribution = attributeModels([v1("i1", "SUBAGENT_STARTED", "2026-01-01T00:00:00Z", { Model: "opus" })]);
    expect(attribution.totalCount).toBe(0);
    expect(attribution.byModel.size).toBe(0);
  });
  test("a blank Model is unresolved, not a model named empty string", () => {
    const attribution = attributeModels([v1("i1", "SUBAGENT_COMPLETED", "2026-01-01T00:00:00Z", { Model: "  " })]);
    expect(attribution.unresolvedCount).toBe(1);
    expect(attribution.byModel.size).toBe(0);
  });
  test("non-subagent events are outside the model population entirely", () => {
    expect(attributeModels([v1("i1", "STAGE_STARTED", "2026-01-01T00:00:00Z")]).totalCount).toBe(0);
  });
});

// A corpus exercising every reported axis at once: two paired windows, an idle
// span, an unmatched start, a zero-second window, sensors on two slugs, and one
// attributable plus one unattributable subagent row.
function mixedCorpus(): AttributedRecord[] {
  return [
    v1("i1", "STAGE_STARTED", "2026-01-01T00:00:00Z", { Stage: "design" }),
    v1("i1", "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:20Z"),
    v1("i1", "GATE_APPROVED", "2026-01-01T00:00:40Z"),
    v2("i1", "STAGE_COMPLETED", "2026-01-01T00:01:40Z", { Stage: "design" }),
    v1("i1", "STAGE_STARTED", "2026-01-01T00:02:00Z", { Stage: "build" }),
    v1("i1", "STAGE_COMPLETED", "2026-01-01T00:02:30Z", { Stage: "build" }),
    v1("i2", "STAGE_STARTED", "2026-01-01T00:03:00Z", { Stage: "design" }),
    v1("i2", "STAGE_COMPLETED", "2026-01-01T00:03:00Z", { Stage: "design" }),
    v1("i2", "STAGE_STARTED", "2026-01-01T00:04:00Z", { Stage: "orphan" }),
    v1("i1", "SENSOR_FIRED", "2026-01-01T00:00:05Z", { "Stage slug": "design", Stage: "Design" }),
    v1("i1", "SENSOR_FAILED", "2026-01-01T00:00:06Z", { "Stage slug": "design", Stage: "Design" }),
    v2("i1", "SUBAGENT_COMPLETED", "2026-01-01T00:00:07Z", { Model: "opus", "Model Source": "pin" }),
    v1("i1", "SUBAGENT_COMPLETED", "2026-01-01T00:00:08Z", {}),
  ];
}

function sampleReport() {
  return composeReport({
    scanScope: "space \"default\"",
    corpus: { records: mixedCorpus(), unreadableShardCount: 0, brokenLineCount: 2, shardCount: 3, lineCount: 13 },
    reviewBlocks: [
      { intent: "i1", stagePath: "construction/u/functional-design", unit: "u", iteration: 1 },
      { intent: "i1", stagePath: "construction/u/functional-design", unit: "u", iteration: 2 },
      { intent: "i1", stagePath: "construction/{unit-name}/code-generation", unit: "{unit-name}", iteration: 1 },
    ],
    unparseableReviewHeadingCount: 1,
  });
}

describe("composeReport — measurement ref, buckets, and the layered identity", () => {
  test("carries every corpus counter into the report", () => {
    const report = sampleReport();
    expect(report.shardCount).toBe(3);
    expect(report.lineCount).toBe(13);
    expect(report.exclusions.corpus.brokenLine).toBe(2);
    expect(report.exclusions.corpus.unreadableShard).toBe(0);
    expect(report.exclusions.review.unparseableReviewHeading).toBe(1);
  });

  test("identity W holds on the assembled report", () => {
    const report = sampleReport();
    const w = report.exclusions.windowing;
    expect(report.populationCount + w.unclosedIdle + w.zeroSecond).toBe(report.constructedWindowCount);
  });

  test("identity M holds on the assembled report", () => {
    const m = sampleReport().models;
    expect(m.attributableCount + m.unresolvedCount).toBe(m.totalCount);
  });

  test("the unmatched start is counted but is not part of identity W", () => {
    const report = sampleReport();
    expect(report.exclusions.windowing.unmatchedStart).toBe(1);
    expect(report.constructedWindowCount).toBe(3);
  });

  test("idle subtraction shows up as net below raw for the design stage", () => {
    const design = sampleReport().stages.find((s) => s.stage === "design");
    expect(design?.netMedian).toBe(80);
    expect(design?.rawMedian).toBe(100);
  });

  test("review iterations are bucketed by stage path, literal unit dirs kept", () => {
    const buckets = sampleReport().reviewBuckets;
    expect(buckets.map((b) => b.stagePath)).toContain("construction/{unit-name}/code-generation");
    const fd = buckets.find((b) => b.stagePath === "construction/u/functional-design");
    expect(fd?.blocks).toBe(2);
    expect(fd?.maxIteration).toBe(2);
  });
});

describe("renderers — deterministic, header-first, hypothesis stated", () => {
  test("markdown opens with the measurement ref and states the hypothesis", () => {
    const text = renderMarkdown(sampleReport());
    const head = text.split("\n").slice(0, 20).join("\n");
    expect(head).toContain("shards: 3");
    expect(head).toContain("lines: 13");
    expect(head).toContain("broken-line: 2");
    expect(head).toContain("unreadable-shard: 0");
    expect(head).toContain("unmatched-start: 1");
    expect(head).toContain("orphan-complete: 0");
    expect(head).toContain("unclosed-idle: 0");
    expect(head).toContain("zero-second: 1");
    expect(head).toContain("invalid-timestamp: 0");
    expect(head).toContain("unparseable-review-heading: 1");
    expect(text).toContain(HYPOTHESIS_NOTICE);
  });

  test("a stage name with control bytes and a newline is reduced at the render point", () => {
    const report = sampleReport();
    const hostile = { ...report, stages: [{ stage: "de\u0007sign\ninjected", n: 1, rawMedian: 1, netMean: 1, netMedian: 1, netP95: 1 }] };
    const markdown = renderMarkdown(hostile);
    expect(markdown).toContain("| design |");
    expect(markdown).not.toContain("injected");
    expect(markdown).not.toContain("\u0007");
  });

  test("a csv cell with a comma and a quote cannot forge an extra column", () => {
    const report = sampleReport();
    const hostile = { ...report, stages: [{ stage: 'a,"b', n: 1, rawMedian: 1, netMean: 1, netMedian: 1, netP95: 1 }] };
    const row = renderCsv(hostile).split("\n").find((line) => line.includes('a,""b'));
    expect(row).toBe('"a,""b",1,1,1,1,1');
  });

  test("csv also carries the measurement ref and the hypothesis before the rows", () => {
    const text = renderCsv(sampleReport());
    const lines = text.split("\n");
    expect(text).toContain(HYPOTHESIS_NOTICE);
    expect(lines[0]).toBe("section,key,value");
    expect(lines[1]).toContain("stage-stats");
    expect(text).toContain("zero-second,");
    // Measurement ref precedes every data section, not merely present somewhere.
    expect(text.indexOf("unparseable-review-heading")).toBeLessThan(text.indexOf("stage,n,raw_median"));
  });

  test("all three forms are byte-identical across two runs of the same input", () => {
    expect(renderMarkdown(sampleReport())).toBe(renderMarkdown(sampleReport()));
    expect(renderCsv(sampleReport())).toBe(renderCsv(sampleReport()));
    expect(JSON.stringify(serializeJson(sampleReport()))).toBe(JSON.stringify(serializeJson(sampleReport())));
  });

  test("json turns the maps into fixed-order arrays and keeps the notice", () => {
    const json = serializeJson(sampleReport()) as Record<string, unknown>;
    expect(json.hypothesisNotice).toBe(HYPOTHESIS_NOTICE);
    expect(Array.isArray((json.models as Record<string, unknown>).byModel)).toBe(true);
    expect(json.constructedWindowCount).toBe(3);
  });
});

describe("parseArgs — parse, do not validate", () => {
  test("no arguments default to markdown", () => {
    const parsed = parseArgs([]);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.format).toBe("markdown");
  });
  test("--json selects the json form", () => {
    const parsed = parseArgs(["--json"]);
    expect(parsed.ok && parsed.value.format).toBe("json");
  });
  test("--format csv selects the csv form", () => {
    const parsed = parseArgs(["--format", "csv"]);
    expect(parsed.ok && parsed.value.format).toBe("csv");
  });
  test("an unknown flag is a usage error, not a silently ignored argument", () => {
    const parsed = parseArgs(["--nope"]);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.message).toContain("--nope");
  });
  test("an option missing its value is a usage error", () => {
    expect(parseArgs(["--space"]).ok).toBe(false);
  });
  test("an unsupported --format value is a usage error", () => {
    expect(parseArgs(["--format", "yaml"]).ok).toBe(false);
  });
  test("an unsafe --space value is a usage error", () => {
    expect(parseArgs(["--space", "../etc"]).ok).toBe(false);
  });
  test("--project-dir and --space carry through when valid", () => {
    const parsed = parseArgs(["--project-dir", "/tmp/x", "--space", "team-a"]);
    expect(parsed.ok && parsed.value.projectDir).toBe("/tmp/x");
    expect(parsed.ok && parsed.value.space).toBe("team-a");
  });
});
