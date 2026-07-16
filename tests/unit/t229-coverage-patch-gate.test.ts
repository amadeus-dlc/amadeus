// covers: harness-instrument:coverage-patch-gate
//
// t229 — self-hosted patch coverage gate (#1017, E-CV1 Q1=A/Q2=A).
//
// Drives the exported pure functions in-process (no spawn) and proves the
// gate can actually fail: an uncovered added line yields a violation, a
// malformed allowlist entry throws, and a stale allowlist range is detected.
// The process boundary (--check) is driven in-process through the
// AMADEUS_PATCH_* env seams against temp fixtures, mirroring
// coverage-project-gate.test.ts.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluatePatch,
  findStaleAllowlistEntries,
  main,
  parseAllowlist,
  parseDiffAddedLines,
  parseLcovLineHits,
  renderSummary,
  runCheck,
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

describe("t229 process boundary: --check via AMADEUS_PATCH_* seams", () => {
  const SEAMS = ["AMADEUS_PATCH_LCOV", "AMADEUS_PATCH_DIFF", "AMADEUS_PATCH_BASE_REF", "AMADEUS_PATCH_ALLOWLIST"];
  const saved = new Map(SEAMS.map((k) => [k, process.env[k]]));
  const tmps: string[] = [];

  afterEach(() => {
    for (const k of SEAMS) {
      const v = saved.get(k);
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    for (const d of tmps.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  function fixtureDir(): string {
    const d = mkdtempSync(join(tmpdir(), "patch-gate-"));
    tmps.push(d);
    return d;
  }

  test("missing lcov fails closed (exit 1, never a silent pass)", () => {
    const d = fixtureDir();
    process.env.AMADEUS_PATCH_LCOV = join(d, "does-not-exist.lcov");
    expect(runCheck()).toBe(1);
  });

  test("uncovered added line exits 1; covered diff exits 0 (falling proof at the boundary)", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    const diffPath = join(d, "pr.diff");
    writeFileSync(diffPath, DIFF); // contains DA:11,0 violation
    process.env.AMADEUS_PATCH_DIFF = diffPath;
    process.env.AMADEUS_PATCH_ALLOWLIST = join(d, "no-allowlist.json");
    expect(runCheck()).toBe(1);

    writeFileSync(diffPath, ["+++ b/packages/framework/core/tools/example.ts", "@@ -9,0 +10,1 @@", "+const a = 1;"].join("\n"));
    expect(runCheck()).toBe(0);
  });

  test("stale allowlist entry fails the run loudly", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    const diffPath = join(d, "pr.diff");
    writeFileSync(diffPath, "");
    const alPath = join(d, "allowlist.json");
    writeFileSync(alPath, JSON.stringify([{ file: "gone.ts", lines: "1", reason: "stale" }]));
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    process.env.AMADEUS_PATCH_DIFF = diffPath;
    process.env.AMADEUS_PATCH_ALLOWLIST = alPath;
    expect(runCheck()).toBe(1);
  });

  test("missing diff file fails closed", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    process.env.AMADEUS_PATCH_DIFF = join(d, "missing.diff");
    expect(runCheck()).toBe(1);
  });

  test("git branch: HEAD...HEAD yields an empty diff and passes (covers the spawn wiring)", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    delete process.env.AMADEUS_PATCH_DIFF;
    process.env.AMADEUS_PATCH_BASE_REF = "HEAD";
    process.env.AMADEUS_PATCH_ALLOWLIST = join(d, "no-allowlist.json");
    expect(runCheck()).toBe(0);
  });

  test("git branch: unknown base ref fails closed", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    delete process.env.AMADEUS_PATCH_DIFF;
    process.env.AMADEUS_PATCH_BASE_REF = "refs/no-such-ref-for-t229";
    expect(runCheck()).toBe(1);
  });

  test("main: usage error exits 2, --check delegates to runCheck", () => {
    expect(main([])).toBe(2);
    expect(main(["--bogus"])).toBe(2);
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    const diffPath = join(d, "empty.diff");
    writeFileSync(diffPath, "");
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    process.env.AMADEUS_PATCH_DIFF = diffPath;
    process.env.AMADEUS_PATCH_ALLOWLIST = join(d, "no-allowlist.json");
    expect(main(["--check"])).toBe(0);
  });

  test("allowlist that is not an array throws", () => {
    expect(() => parseAllowlist(JSON.stringify({ file: "x" }))).toThrow(/must be a JSON array/);
  });
});
