// coverage-comment-strip.test.ts — pins the #730 fix in tests/lib/
// coverage-normalize.ts: bun --coverage stamps DA:<line>,0 on comment and blank
// lines of a merely-loaded file, and unioning several such all-zero chunks
// yields a DA:<line>,0 that codecov reports as an uncoverable false-red. The fix
// strips DA records for lines that are SYNTACTICALLY comment-only or blank,
// decided from the source text (never inferred from the DA count), while
// preserving DA on executable-but-uncovered lines and on pseudo-comment lines
// that live inside a template literal.
//
// Mechanism: none (pure in-process; the source reader is injected, so no temp
// files, no spawn, zero LLM, zero tokens). Technique: known-answer line
// classification + false-red merge-union reproduction (RED via the no-strip
// reader) + false-negative guard (executable / template lines retained).

import { describe, expect, test } from "bun:test";
import {
  computeStrippableLines,
  normalizeCoverageReport,
} from "../lib/coverage-normalize.ts";
import type { CoverageSourcePathContext } from "../lib/coverage-source-path.ts";

// A source whose lines exercise every classification branch. Line numbers are
// 1-based to match LCOV DA records:
//   1  export function demo(flag: boolean): string {   <- code
//   2    // a real comment                             <- comment-only  (STRIP)
//   3                                                   <- blank         (STRIP)
//   4    if (flag) return "yes";                        <- code
//   5    const t = `                                    <- code (template open)
//   6  // not a comment                                 <- template content (KEEP)
//   7  `;                                               <- code (template close)
//   8    return t;                                      <- code
//   9  }                                                <- code
const FIXTURE_SOURCE = [
  "export function demo(flag: boolean): string {",
  "  // a real comment",
  "",
  '  if (flag) return "yes";',
  "  const t = `",
  "// not a comment",
  "`;",
  "  return t;",
  "}",
].join("\n");

const SOURCE_ID = "packages/framework/core/tools/demo.ts";

const CONTEXT: CoverageSourcePathContext = {
  repoRoot: "/repo",
  tempRoots: [],
};

// Build one LCOV chunk (as bun emits per spawned test file) for SOURCE_ID with
// the given per-line counts. Lines absent from `counts` default to 0.
function chunk(counts: Record<number, number>): string {
  const lines = ["TN:", `SF:${SOURCE_ID}`, "FNF:1", "FNH:0"];
  for (let ln = 1; ln <= 9; ln++) lines.push(`DA:${ln},${counts[ln] ?? 0}`);
  lines.push("LF:9", "LH:0", "end_of_record");
  return lines.join("\n");
}

describe("computeStrippableLines — syntactic classification", () => {
  test("strips exactly the comment-only and blank lines of the fixture", () => {
    const strippable = computeStrippableLines(FIXTURE_SOURCE);
    // Only line 2 (comment) and line 3 (blank) are comment-only/blank.
    expect([...strippable].sort((a, b) => a - b)).toEqual([2, 3]);
    // Executable and template lines are code-bearing, never strippable.
    for (const ln of [1, 4, 5, 6, 7, 8, 9]) expect(strippable.has(ln)).toBe(false);
  });

  test("does not strip a pseudo-comment line inside a template literal", () => {
    const src = ["const x = `", "// looks like a comment but is text", "`;"].join("\n");
    // Line 2 is template string content, not a comment.
    expect(computeStrippableLines(src).has(2)).toBe(false);
  });

  test("does not strip a comment marker that lives inside a string literal", () => {
    const src = 'const s = "// not a comment";';
    expect(computeStrippableLines(src).has(1)).toBe(false);
  });

  test("strips every line of a block comment / JSDoc run", () => {
    const src = ["/**", " * doc line", " */", "export const x = 1;"].join("\n");
    const strippable = computeStrippableLines(src);
    expect(strippable.has(1)).toBe(true);
    expect(strippable.has(2)).toBe(true);
    expect(strippable.has(3)).toBe(true);
    // The real declaration survives.
    expect(strippable.has(4)).toBe(false);
  });

  test("keeps a line that has code before a trailing line comment", () => {
    const src = "foo(); // trailing note";
    expect(computeStrippableLines(src).has(1)).toBe(false);
  });

  test("keeps interpolation code that spans lines inside a template", () => {
    const src = ["const x = `${", "  compute()", "}`;"].join("\n");
    // Line 2 is code inside `${ ... }`, must be preserved.
    expect(computeStrippableLines(src).has(2)).toBe(false);
  });

  test("keeps a line whose string content holds an escaped quote", () => {
    const src = 'const s = "a\\"b";';
    expect(computeStrippableLines(src).has(1)).toBe(false);
  });
});

describe("normalizeCoverageReport — #730 comment/blank DA strip", () => {
  const body = [chunk({}), "", chunk({ 4: 2 })].join("\n").trim();

  test("RED: without the strip (unreadable source), comment/blank DA:0 persist", () => {
    // readSource returning null reproduces the pre-fix behavior: nothing is
    // stripped, so the false-red DA:2,0 / DA:3,0 for the comment and blank
    // lines survive the merge union — exactly the codecov-uncoverable state
    // #730 reports.
    const out = normalizeCoverageReport(body, CONTEXT, "/repo", {
      readSource: () => null,
    });
    expect(out).toContain("DA:2,0");
    expect(out).toContain("DA:3,0");
    expect(out).toContain("LF:9");
  });

  test("GREEN: with the strip, comment/blank DA are removed", () => {
    const out = normalizeCoverageReport(body, CONTEXT, "/repo", {
      readSource: () => FIXTURE_SOURCE,
    });
    // The comment (line 2) and blank (line 3) DA records are gone.
    expect(out).not.toContain("DA:2,");
    expect(out).not.toContain("DA:3,");
    // LF drops from 9 to 7 (two lines removed); no line was hit-preserving.
    expect(out).toContain("LF:7");
  });

  test("GREEN: executable-but-uncovered and template lines are NOT stripped", () => {
    const out = normalizeCoverageReport(body, CONTEXT, "/repo", {
      readSource: () => FIXTURE_SOURCE,
    });
    // Executable uncovered lines keep their DA:0 (a false negative would be a
    // real coverage loss).
    for (const ln of [1, 5, 7, 8, 9]) expect(out).toContain(`DA:${ln},0`);
    // The template pseudo-comment line (6) survives with its DA:0.
    expect(out).toContain("DA:6,0");
  });

  test("GREEN: DA union still adds counts across chunks for a hit line", () => {
    const out = normalizeCoverageReport(body, CONTEXT, "/repo", {
      readSource: () => FIXTURE_SOURCE,
    });
    // Line 4 was hit twice in the second chunk (0 + 2); union preserved and the
    // line counts toward LH.
    expect(out).toContain("DA:4,2");
    expect(out).toContain("LH:1");
  });
});
