// covers: harness-instrument:metrics-timeseries
//
// t230 — metrics snapshot timeseries viewer (Issue #921).
//
// Drives the exported pure functions in-process (no spawn) and proves the
// CLI can actually fail: malformed JSON, an unsupported schema_version, a
// structurally broken collector entry, an empty snapshot directory, and a
// non-numeric --last all reach their loud exit paths (AC-1a/1b, AC-3d,
// AC-4b falling proofs). File discovery is driven through main() with the
// AMADEUS_METRICS_ROOT seam pointing at fixture roots.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertNonEmpty,
  buildSeries,
  discoverCollectors,
  main,
  parseArgs,
  parseSnapshot,
  renderCollectorTable,
  renderDigest,
  resolveCollector,
  unionValueKeys,
  type Snapshot,
} from "../../scripts/metrics-timeseries";

function snap(capturedAt: string, commit: string, collectors: Snapshot["collectors"]): Snapshot {
  return { schema_version: 1, captured_at: capturedAt, commit, collectors };
}

const COVERAGE = { tool: "bun", tool_version: "1.0", values: { hits: 10, lines: 20, percent: 50 } };

describe("t230 parseSnapshot (falling proofs, AC-1a)", () => {
  test("valid snapshot parses", () => {
    const text = JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE }));
    const out = parseSnapshot(text, "a.json");
    expect(out.kind).toBe("ok");
  });

  test("malformed JSON is a loud error naming the file", () => {
    const out = parseSnapshot("{not json", "broken.json");
    expect(out).toMatchObject({ kind: "error", file: "broken.json" });
  });

  test("unsupported schema_version is rejected", () => {
    const text = JSON.stringify({ ...snap("t", "c", {}), schema_version: 2 });
    const out = parseSnapshot(text, "v2.json");
    expect(out.kind).toBe("error");
    if (out.kind === "error") expect(out.reason).toContain("schema_version 2");
  });

  test("missing top-level key is rejected", () => {
    const out = parseSnapshot(JSON.stringify({ schema_version: 1, commit: "c", collectors: {} }), "x.json");
    expect(out).toMatchObject({ kind: "error", reason: "captured_at is not a string" });
  });

  test("collector entry without values object is rejected naming the collector", () => {
    const text = JSON.stringify(snap("t", "c", { ccn: { tool: "lizard", tool_version: "1", values: 3 } as never }));
    const out = parseSnapshot(text, "bad-entry.json");
    expect(out.kind).toBe("error");
    if (out.kind === "error") expect(out.reason).toContain("collector ccn");
  });
});

describe("t230 series aggregation", () => {
  const a = snap("2026-07-16T02:00:00Z", "bbb", { coverage: COVERAGE });
  const b = snap("2026-07-16T01:00:00Z", "aaa", {
    coverage: COVERAGE,
    test_pyramid: { tool: "amadeus-test-size", tool_version: "1", values: { unit_small: 1 } },
  });

  test("buildSeries sorts by captured_at, not input order (AC-2a)", () => {
    expect(buildSeries([a, b]).map((s) => s.commit)).toEqual(["aaa", "bbb"]);
  });

  test("discoverCollectors unions ids from the data (FR-3)", () => {
    expect(discoverCollectors([a, b])).toEqual(["coverage", "test_pyramid"]);
  });

  test("unionValueKeys spans all snapshots; absent collector contributes nothing (AC-3c)", () => {
    expect(unionValueKeys([a, b], "test_pyramid")).toEqual(["unit_small"]);
  });

  test("resolveCollector rejects unknown ids with the known list (AC-3d)", () => {
    expect(resolveCollector("cnn", ["ccn", "coverage"])).toEqual({ kind: "unknown", known: ["ccn", "coverage"] });
    expect(resolveCollector("ccn", ["ccn"])).toEqual({ kind: "ok", id: "ccn" });
  });

  test("assertNonEmpty flags the empty set (AC-1b)", () => {
    expect(assertNonEmpty([])).toEqual({ kind: "empty" });
    expect(assertNonEmpty(["a.json"])).toEqual({ kind: "ok" });
  });
});

describe("t230 rendering", () => {
  const series = buildSeries([
    snap("2026-07-16T01:00:00Z", "aaa000000000", { coverage: COVERAGE }),
    snap("2026-07-16T02:00:00Z", "bbb000000000", {
      coverage: { tool: "bun", tool_version: "1.0", values: { hits: 11, lines: 20, percent: "oops" } },
    }),
  ]);

  test("digest lists each collector with series length and latest values (AC-3a)", () => {
    const out = renderDigest(series);
    expect(out).toContain("2 snapshots");
    expect(out).toContain("coverage");
    expect(out).toContain("hits=11");
  });

  test("collector table renders union keys, blanks for absent, ? for non-number (AC-3b/3c)", () => {
    const out = renderCollectorTable(series, "coverage");
    expect(out).toContain("captured_at");
    expect(out).toContain("aaa000000000");
    expect(out).toContain("?"); // percent: "oops" renders loud but non-fatal
  });
});

describe("t230 CLI boundary via env seam", () => {
  let root: string | null = null;
  afterEach(() => {
    if (root !== null) rmSync(root, { recursive: true, force: true });
    delete process.env.AMADEUS_METRICS_ROOT;
    root = null;
  });

  function fixtureRoot(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "t230-"));
    mkdirSync(join(dir, "metrics"), { recursive: true });
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, "metrics", name), text);
    process.env.AMADEUS_METRICS_ROOT = dir;
    return dir;
  }

  test("digest over a fixture root exits 0", () => {
    root = fixtureRoot({ "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })) });
    expect(main([])).toBe(0);
  });

  test("empty metrics dir exits 1 (AC-1b falling proof)", () => {
    root = fixtureRoot({});
    expect(main([])).toBe(1);
  });

  test("one broken file fails the whole run (AC-1a falling proof)", () => {
    root = fixtureRoot({
      "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })),
      "b.json": "{broken",
    });
    expect(main([])).toBe(1);
  });

  test("unknown collector exits 2 (AC-3d falling proof)", () => {
    root = fixtureRoot({ "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })) });
    expect(main(["--collector", "cnn"])).toBe(2);
  });

  test("--collector renders the per-collector table and exits 0", () => {
    root = fixtureRoot({ "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })) });
    expect(main(["--collector", "coverage"])).toBe(0);
  });

  test("--last limits the series and exits 0", () => {
    root = fixtureRoot({
      "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })),
      "b.json": JSON.stringify(snap("2026-07-16T01:00:00Z", "def", { coverage: COVERAGE })),
    });
    expect(main(["--last", "1"])).toBe(0);
  });

  test("missing metrics dir exits 1", () => {
    root = mkdtempSync(join(tmpdir(), "t230-nometrics-"));
    process.env.AMADEUS_METRICS_ROOT = root;
    expect(main([])).toBe(1);
  });
});

describe("t230 parseArgs (falling proofs, AC-4b)", () => {
  test("non-numeric --last is a usage error, not a silent pass", () => {
    expect(parseArgs(["--last", "five"]).kind).toBe("usage");
  });
  test("zero and negative --last are rejected", () => {
    expect(parseArgs(["--last", "0"]).kind).toBe("usage");
    expect(parseArgs(["--last", "-3"]).kind).toBe("usage");
  });
  test("unknown flag is a usage error", () => {
    expect(parseArgs(["--nope"]).kind).toBe("usage");
  });
  test("valid combination parses", () => {
    expect(parseArgs(["--collector", "ccn", "--last", "5"])).toEqual({
      kind: "ok",
      args: { collector: "ccn", last: 5 },
    });
  });
});
