// covers: harness-instrument:coverage-patch-gate
//
// t229 — self-hosted patch coverage gate (#1017, E-CV1 Q1=A/Q2=A).
//
// Drives the exported pure functions in-process (no spawn) and proves the
// gate can actually fail: an uncovered added line yields a violation, a
// malformed allowlist entry throws, and a stale allowlist range is detected.
// The process boundary (--check, fs fixtures) lives in
// tests/integration/t229-coverage-patch-gate-check.test.ts — size purity
// keeps this file small (pure functions over string fixtures, no fs).

import { describe, expect, test } from "bun:test";
import {
  evaluatePatch,
  findStaleAllowlistEntries,
  parseAllowlist,
  parseDiffAddedLines,
  parseLcovLineHits,
  renderSummary,
} from "../coverage-patch-gate";

const LCOV = [
  "SF:packages/framework/core/tools/example.ts",
  "DA:10,3",
  "DA:11,0",
  "DA:12,1",
  "end_of_record",
  "SF:packages/framework/core/tools/other.ts",
  "DA:5,0",
  "end_of_record",
].join("\n");

const DIFF = [
  "diff --git a/packages/framework/core/tools/example.ts b/packages/framework/core/tools/example.ts",
  "--- a/packages/framework/core/tools/example.ts",
  "+++ b/packages/framework/core/tools/example.ts",
  "@@ -9,0 +10,3 @@",
  "+const a = 1;",
  "+const b = 2;",
  "+const c = 3;",
  "diff --git a/docs/readme.md b/docs/readme.md",
  "--- a/docs/readme.md",
  "+++ b/docs/readme.md",
  "@@ -1,0 +2,1 @@",
  "+some docs line",
].join("\n");

describe("t229 patch gate parsers", () => {
  test("parseLcovLineHits groups DA records by file and keeps max hits", () => {
    const lcov = parseLcovLineHits(LCOV);
    expect(lcov.get("packages/framework/core/tools/example.ts")?.get(10)).toBe(3);
    expect(lcov.get("packages/framework/core/tools/example.ts")?.get(11)).toBe(0);
    expect(lcov.get("packages/framework/core/tools/other.ts")?.get(5)).toBe(0);
  });

  test("parseLcovLineHits rejects malformed DA records", () => {
    expect(() => parseLcovLineHits("SF:x.ts\nDA:abc,def\n")).toThrow(/malformed DA/);
  });

  test("parseDiffAddedLines collects right-side line numbers per file", () => {
    const added = parseDiffAddedLines(DIFF);
    expect([...(added.get("packages/framework/core/tools/example.ts") ?? [])].sort()).toEqual([10, 11, 12]);
    expect([...(added.get("docs/readme.md") ?? [])]).toEqual([2]);
  });
});

describe("t229 patch gate verdict (falling proof)", () => {
  test("uncovered added line yields a violation (gate goes red)", () => {
    const result = evaluatePatch(parseDiffAddedLines(DIFF), parseLcovLineHits(LCOV));
    // line 11 has DA:11,0 → violation; docs file absent from lcov → excluded (Q2=A)
    expect(result.violations).toEqual([{ file: "packages/framework/core/tools/example.ts", line: 11 }]);
    expect(result.measuredAdded).toBe(3);
    expect(result.covered).toBe(2);
    expect(renderSummary(result)).toContain("FAIL");
    expect(renderSummary(result)).toContain("example.ts:11");
  });

  test("allowlisted line is exempted but counted", () => {
    const allowlist = parseAllowlist(
      JSON.stringify([
        {
          file: "packages/framework/core/tools/example.ts",
          lines: "11",
          reason: "spawn-only dispatch case; seam refactor unnatural (see #881 class)",
          expiry: "remove when the dispatch moves behind an in-process seam",
        },
      ]),
    );
    const result = evaluatePatch(parseDiffAddedLines(DIFF), parseLcovLineHits(LCOV), allowlist);
    expect(result.violations).toEqual([]);
    expect(result.allowlistedCount).toBe(1);
    expect(renderSummary(result)).toContain("PASS");
  });

  test("fully covered diff passes", () => {
    const diff = [
      "+++ b/packages/framework/core/tools/example.ts",
      "@@ -9,0 +10,1 @@",
      "+const a = 1;",
    ].join("\n");
    const result = evaluatePatch(parseDiffAddedLines(diff), parseLcovLineHits(LCOV));
    expect(result.violations).toEqual([]);
    expect(result.covered).toBe(1);
  });
});

describe("t229 allowlist contract (E-CV1 Q1=A reservations)", () => {
  test("reason-less entry throws (fail-closed ledger)", () => {
    expect(() =>
      parseAllowlist(JSON.stringify([{ file: "x.ts", lines: "1", reason: "  " }])),
    ).toThrow(/malformed allowlist entry/);
  });

  test("bad lines pattern throws", () => {
    expect(() =>
      parseAllowlist(JSON.stringify([{ file: "x.ts", lines: "1-2-3", reason: "r" }])),
    ).toThrow(/malformed allowlist entry/);
  });

  test("non-string expiry throws", () => {
    expect(() =>
      parseAllowlist(JSON.stringify([{ file: "x.ts", lines: "1", reason: "r", expiry: 42 }])),
    ).toThrow(/malformed allowlist entry/);
  });

  test("stale range (matches no measurable line) is detected", () => {
    const lcov = parseLcovLineHits(LCOV);
    const entries = parseAllowlist(
      JSON.stringify([
        { file: "packages/framework/core/tools/example.ts", lines: "100-110", reason: "stale range" },
        { file: "gone.ts", lines: "1", reason: "file no longer measured" },
        { file: "packages/framework/core/tools/example.ts", lines: "11", reason: "still live" },
      ]),
    );
    const stale = findStaleAllowlistEntries(entries, lcov);
    expect(stale.map((e) => e.lines)).toEqual(["100-110", "1"]);
  });
});
