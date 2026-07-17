// covers: harness-instrument:metrics-retention
//
// t231 — metrics snapshot retention pruner (Issue #1121).
//
// Drives the exported pure functions in-process (no spawn, no fs): selectPrunable
// splits keep/prune by captured_at (not file name), preserves the full input,
// breaks ties by commit, and rejects a non-positive window; parseArgs rejects
// unknown and surplus arguments. The fs / CLI boundary (main() over fixture
// roots) lives in tests/integration/t231-metrics-retention.integration.test.ts
// — size purity keeps this file small (pure functions over literal fixtures).

import { describe, expect, test } from "bun:test";
import { parseArgs, selectPrunable, type SnapshotMeta } from "../../scripts/metrics-retention";

function meta(file: string, capturedAt: string, commit = "c"): SnapshotMeta {
  return { file, capturedAt, commit };
}

describe("t231 selectPrunable", () => {
  test("keeps the newest keepLast and prunes the rest, split by captured_at not file name (AC-4a)", () => {
    // File names sort opposite to captured_at: "a.json" is oldest, "z.json" is
    // newest. Sorting by file name would keep the wrong one — captured_at wins.
    const metas = [meta("a.json", "2026-01-01T00:00:00Z"), meta("z.json", "2026-12-01T00:00:00Z")];
    const plan = selectPrunable(metas, 1);
    expect(plan.keep.map((m) => m.file)).toEqual(["z.json"]);
    expect(plan.prune.map((m) => m.file)).toEqual(["a.json"]);
  });

  test("n <= keepLast prunes nothing (AC-4b)", () => {
    const metas = [meta("a.json", "2026-01-01T00:00:00Z"), meta("b.json", "2026-02-01T00:00:00Z")];
    const plan = selectPrunable(metas, 5);
    expect(plan.prune).toEqual([]);
    expect(plan.keep).toHaveLength(2);
  });

  test("keep and prune partition the whole input (no snapshot lost or duplicated)", () => {
    const metas = ["a", "b", "c", "d"].map((n, i) => meta(`${n}.json`, `2026-0${i + 1}-01T00:00:00Z`));
    const plan = selectPrunable(metas, 2);
    expect(plan.keep).toHaveLength(2);
    expect(plan.prune).toHaveLength(2);
    const files = [...plan.keep, ...plan.prune].map((m) => m.file).sort();
    expect(files).toEqual(["a.json", "b.json", "c.json", "d.json"]);
  });

  test("ties on captured_at break by commit descending", () => {
    const metas = [
      meta("x.json", "2026-01-01T00:00:00Z", "aaa"),
      meta("y.json", "2026-01-01T00:00:00Z", "zzz"),
    ];
    const plan = selectPrunable(metas, 1);
    expect(plan.keep[0].commit).toBe("zzz");
    expect(plan.prune[0].commit).toBe("aaa");
  });

  test("a non-positive window is a defect (throws)", () => {
    expect(() => selectPrunable([meta("a.json", "2026-01-01T00:00:00Z")], 0)).toThrow("keepLast must be >= 1");
    expect(() => selectPrunable([meta("a.json", "2026-01-01T00:00:00Z")], -3)).toThrow();
  });
});

describe("t231 parseArgs", () => {
  test("no arguments is a dry run (apply=false)", () => {
    expect(parseArgs([])).toEqual({ kind: "ok", apply: false });
  });
  test("--apply enables deletion", () => {
    expect(parseArgs(["--apply"])).toEqual({ kind: "ok", apply: true });
  });
  test("an unknown flag is a usage error", () => {
    expect(parseArgs(["--nope"]).kind).toBe("usage");
  });
  test("surplus arguments are a usage error", () => {
    expect(parseArgs(["--apply", "extra"]).kind).toBe("usage");
  });
});
