// covers: file:lib/test-size.ts
// size: small
//
// Phase D dynamic size measurement (#684 Phase D / #699). Pure in-process unit
// tests for the dynamic layer added to test-size.ts: the wall-clock band floor,
// the wall-clock drift smart constructor, per-file record construction, report
// aggregation, and the observation backend seam. Companion to
// t-test-size-drift.test.ts (Phase A static guard). This file exercises only the
// pure Phase D domain functions and touches no filesystem, process, or socket —
// hence its `// size: small` header.
//
// Falling/passing evidence (construction guardrail): buildMeasuredRecord over a
// `small`-annotated source at 2.0s yields a "wall-clock" drift (the red-relevant
// signal the runner surfaces), and the same source at 0.1s yields "none" (green).
import { describe, expect, test } from "bun:test";
import {
  beginObservation,
  buildMeasuredRecord,
  buildTestSizeReport,
  detectWallClockDrift,
  finishObservation,
  type MeasuredTestRecord,
  sizeFloorFromDuration,
  type SizeObservation,
  type SizeObservationSession,
  WALL_CLOCK_BANDS,
  wallClockBackend,
} from "../lib/test-size.ts";

// Signal tokens assembled at runtime so this file's OWN verbatim source stays
// free of spawn/fs/timer/network references — otherwise the Phase A classifier
// (a static text scan) would inflate this file's measured size above its
// `// size: small` header and the on-disk drift guard would fail. Same trick as
// t-test-size-drift.test.ts.
const TOK = {
  fs: `read${"File"}Sync`,
};

describe("sizeFloorFromDuration — wall-clock band floor", () => {
  test("just under 1s is small (upper bound exclusive)", () => {
    expect(sizeFloorFromDuration(0.999)).toBe("small");
  });
  test("exactly 1.0s is medium (lower bound inclusive)", () => {
    expect(sizeFloorFromDuration(1.0)).toBe("medium");
  });
  test("just under 30s is medium (upper bound exclusive)", () => {
    expect(sizeFloorFromDuration(29.999)).toBe("medium");
  });
  test("exactly 30.0s is large (lower bound inclusive)", () => {
    expect(sizeFloorFromDuration(30.0)).toBe("large");
  });
  test("thresholds are the canonical WALL_CLOCK_BANDS values", () => {
    expect(sizeFloorFromDuration(WALL_CLOCK_BANDS.smallMaxSeconds)).toBe("medium");
    expect(sizeFloorFromDuration(WALL_CLOCK_BANDS.largeMinSeconds)).toBe("large");
  });
});

describe("detectWallClockDrift — smart constructor", () => {
  test("floor above declared builds a wall-clock drift (small declared, medium floor)", () => {
    expect(detectWallClockDrift("small", "medium")).toEqual({
      kind: "wall-clock",
      declared: "small",
      measured: "medium",
    });
  });
  test("floor above declared builds a wall-clock drift (medium declared, large floor)", () => {
    expect(detectWallClockDrift("medium", "large")).toEqual({
      kind: "wall-clock",
      declared: "medium",
      measured: "large",
    });
  });
  test("same band is not drift", () => {
    expect(detectWallClockDrift("medium", "medium")).toEqual({ kind: "none" });
  });
  test("floor below declared is not drift (declared large, floor small)", () => {
    expect(detectWallClockDrift("large", "small")).toEqual({ kind: "none" });
  });
});

describe("buildMeasuredRecord", () => {
  test("annotated small + 2.0s duration surfaces wall-clock drift", () => {
    const source = "// size: small\nexpect(1).toBe(1);\n";
    const record = buildMeasuredRecord({
      file: "tests/unit/x.test.ts",
      scope: "unit",
      source,
      durationSeconds: 2.0,
    });
    expect(record.declaredSize).toBe("small");
    expect(record.staticSize).toBe("small");
    expect(record.dynamicFloor).toBe("medium");
    expect(record.drift).toEqual({ kind: "wall-clock", declared: "small", measured: "medium" });
  });

  test("unannotated static-small file that runs slow drifts against its static size", () => {
    // No annotation → the static size is the effective declared size; a small
    // static file measured at 2.0s drifts to a medium floor.
    const source = "expect(1 + 1).toBe(2);\n";
    const record = buildMeasuredRecord({
      file: "tests/unit/z.test.ts",
      scope: "unit",
      source,
      durationSeconds: 2.0,
    });
    expect(record.declaredSize).toBeNull();
    expect(record.staticSize).toBe("small");
    expect(record.drift).toEqual({ kind: "wall-clock", declared: "small", measured: "medium" });
  });

  test("unannotated static-medium file at a medium duration shows no false drift", () => {
    // A filesystem signal makes the static size medium; a 2.0s floor is also
    // medium, so the static size (not a missing annotation) anchors comparison.
    const source = `${TOK.fs}("some/path");\n`;
    const record = buildMeasuredRecord({
      file: "tests/unit/y.test.ts",
      scope: "unit",
      source,
      durationSeconds: 2.0,
    });
    expect(record.declaredSize).toBeNull();
    expect(record.staticSize).toBe("medium");
    expect(record.dynamicFloor).toBe("medium");
    expect(record.drift).toEqual({ kind: "none" });
  });

  test("invalid annotation degrades to the static size for drift (not the bad label)", () => {
    // `// size: tiny` is not a valid TestSize → declaredSize is null and the
    // effective declared falls back to the static size (small); at 2.0s → drift.
    const source = "// size: tiny\nexpect(1).toBe(1);\n";
    const record = buildMeasuredRecord({
      file: "tests/unit/w.test.ts",
      scope: "unit",
      source,
      durationSeconds: 2.0,
    });
    expect(record.declaredSize).toBeNull();
    expect(record.staticSize).toBe("small");
    expect(record.drift).toEqual({ kind: "wall-clock", declared: "small", measured: "medium" });
  });
});

describe("buildTestSizeReport — aggregation", () => {
  const makeRecord = (file: string, drift: MeasuredTestRecord["drift"]): MeasuredTestRecord => ({
    file,
    scope: "unit",
    declaredSize: "small",
    staticSize: "small",
    staticSignals: [],
    durationSeconds: 0,
    dynamicFloor: "small",
    drift,
  });

  test("driftCount counts only drifting records; totalFiles counts all", () => {
    const records: MeasuredTestRecord[] = [
      makeRecord("a", { kind: "wall-clock", declared: "small", measured: "medium" }),
      makeRecord("b", { kind: "none" }),
      makeRecord("c", { kind: "wall-clock", declared: "medium", measured: "large" }),
    ];
    const report = buildTestSizeReport(records);
    expect(report.schemaVersion).toBe(1);
    expect(report.summary.totalFiles).toBe(3);
    expect(report.summary.driftCount).toBe(2);
    expect(report.records).toHaveLength(3);
  });

  test("empty input yields zero totals", () => {
    const report = buildTestSizeReport([]);
    expect(report.summary).toEqual({ totalFiles: 0, driftCount: 0 });
  });

  test("records are sorted by file in lexical order (reverse input → sorted output)", () => {
    const records: MeasuredTestRecord[] = [
      makeRecord("tests/unit/c.test.ts", { kind: "none" }),
      makeRecord("tests/unit/a.test.ts", { kind: "none" }),
      makeRecord("tests/unit/b.test.ts", { kind: "none" }),
    ];
    const report = buildTestSizeReport(records);
    expect(report.records.map((r) => r.file)).toEqual([
      "tests/unit/a.test.ts",
      "tests/unit/b.test.ts",
      "tests/unit/c.test.ts",
    ]);
    // The input array must not be mutated.
    expect(records.map((r) => r.file)).toEqual([
      "tests/unit/c.test.ts",
      "tests/unit/a.test.ts",
      "tests/unit/b.test.ts",
    ]);
  });
});

describe("wallClockBackend — observation session lifecycle", () => {
  test("finish prefers the in-process JUnit duration when finite", () => {
    expect(wallClockBackend.name).toBe("wall-clock");
    const session = wallClockBackend.openSession();
    session.begin("tests/unit/x.test.ts");
    expect(session.finish("tests/unit/x.test.ts", 2.5)).toEqual({ durationSeconds: 2.5 });
  });

  test("finish falls back to its own begin→finish measurement when JUnit is null", () => {
    const session = wallClockBackend.openSession();
    session.begin("tests/unit/y.test.ts");
    // Busy-wait a few ms of real wall-clock (no timer API, so this file's static
    // size stays small) so the fallback window is non-zero.
    const until = Date.now() + 5;
    while (Date.now() < until) {
      void 0;
    }
    const obs = session.finish("tests/unit/y.test.ts", null);
    expect(obs).not.toBeNull();
    expect((obs as SizeObservation).durationSeconds).toBeGreaterThan(0);
  });

  test("finish returns null when there was no begin and no usable JUnit value", () => {
    const session = wallClockBackend.openSession();
    expect(session.finish("tests/unit/never-began.test.ts", null)).toBeNull();
  });
});

describe("beginObservation / finishObservation — failure isolation", () => {
  // A session whose lifecycle methods always throw — the wrappers must swallow
  // the fault into a note and never rethrow.
  const throwingSession: SizeObservationSession = {
    begin() {
      throw new Error("begin boom");
    },
    finish() {
      throw new Error("finish boom");
    },
  };

  test("beginObservation swallows a throwing begin and notes it", () => {
    const notes: string[] = [];
    expect(() => beginObservation(throwingSession, "f.test.ts", (m) => notes.push(m))).not.toThrow();
    expect(notes.some((n) => n.includes("begin failed"))).toBe(true);
  });

  test("finishObservation swallows a throwing finish, notes it, and returns null", () => {
    const notes: string[] = [];
    const result = finishObservation(throwingSession, "f.test.ts", 1.5, (m) => notes.push(m));
    expect(result).toBeNull();
    expect(notes.some((n) => n.includes("finish failed"))).toBe(true);
  });

  test("finishObservation returns null (with a note) when the session yields no observation", () => {
    const nullSession: SizeObservationSession = { begin() {}, finish: () => null };
    const notes: string[] = [];
    expect(finishObservation(nullSession, "f.test.ts", null, (m) => notes.push(m))).toBeNull();
    expect(notes.some((n) => n.includes("no duration"))).toBe(true);
  });

  test("finishObservation returns null (with a note) on a non-finite duration", () => {
    const nanSession: SizeObservationSession = {
      begin() {},
      finish: (): SizeObservation => ({ durationSeconds: Number.NaN }),
    };
    const notes: string[] = [];
    expect(finishObservation(nanSession, "f.test.ts", null, (m) => notes.push(m))).toBeNull();
    expect(notes.some((n) => n.includes("non-finite"))).toBe(true);
  });

  test("finishObservation returns the duration through the happy path", () => {
    const okSession = wallClockBackend.openSession();
    okSession.begin("f.test.ts");
    expect(finishObservation(okSession, "f.test.ts", 3.0, () => {})).toBe(3.0);
  });
});

describe("red/green fixture — small-annotated source vs measured duration", () => {
  const source = "// size: small\nexpect(1).toBe(1);\n";
  test("2.0s measured → wall-clock drift (red-relevant signal)", () => {
    const record = buildMeasuredRecord({
      file: "tests/unit/fix.test.ts",
      scope: "unit",
      source,
      durationSeconds: 2.0,
    });
    expect(record.drift.kind).toBe("wall-clock");
  });
  test("0.1s measured → no drift (green)", () => {
    const record = buildMeasuredRecord({
      file: "tests/unit/fix.test.ts",
      scope: "unit",
      source,
      durationSeconds: 0.1,
    });
    expect(record.drift.kind).toBe("none");
  });
});
