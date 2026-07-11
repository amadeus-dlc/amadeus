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
  test("strips the comment-only, blank, and lone-closing-brace lines of the fixture", () => {
    const strippable = computeStrippableLines(FIXTURE_SOURCE);
    // Line 2 (comment), line 3 (blank), and line 9 (lone `}` in code mode, the
    // function's closing brace — #876 closing-only strip).
    expect([...strippable].sort((a, b) => a - b)).toEqual([2, 3, 9]);
    // Real code and template-text lines are code-bearing, never strippable.
    for (const ln of [1, 4, 5, 6, 7, 8]) expect(strippable.has(ln)).toBe(false);
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

  test("does not strip a comment marker inside a single-quoted string literal", () => {
    // Drives the single-quoted (sq) lexer branch: the `// ...` is string content,
    // not a comment, so the line stays code-bearing.
    const src = "const s = '// not a comment';";
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

  test("GREEN: with the strip, comment/blank and lone-closing-brace DA are removed", () => {
    const out = normalizeCoverageReport(body, CONTEXT, "/repo", {
      readSource: () => FIXTURE_SOURCE,
    });
    // The comment (line 2), blank (line 3) and lone `}` (line 9) DA records are
    // gone.
    expect(out).not.toContain("DA:2,");
    expect(out).not.toContain("DA:3,");
    expect(out).not.toContain("DA:9,");
    // LF drops from 9 to 6 (three lines removed); no line was hit-preserving.
    expect(out).toContain("LF:6");
  });

  test("GREEN: executable-but-uncovered and template lines are NOT stripped", () => {
    const out = normalizeCoverageReport(body, CONTEXT, "/repo", {
      readSource: () => FIXTURE_SOURCE,
    });
    // Executable uncovered lines keep their DA:0 (a false negative would be a
    // real coverage loss). Line 9 is excluded — it is the function's lone `}`,
    // now correctly recognized as non-executable (#876).
    for (const ln of [1, 5, 7, 8]) expect(out).toContain(`DA:${ln},0`);
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

// #876 (ruling E-B8a = unconditional closing-only strip). bun --coverage leaves
// a residual DA:<line>,0 on lone closing-delimiter lines after the loaded-only
// merge union — the real-world shape being #870's catch-block `}` at
// DA:1931,0 while the surrounding executable lines all carried hits>0. The strip
// is a source-text classification (never inferred from the DA count), so it
// fires regardless of the DA value, and template-text braces stay preserved.
describe("computeStrippableLines — #876 closing-only strip", () => {
  // The #870 shape: a function with a try/catch whose real code lines execute
  // but whose lone `}` closing lines (catch close line 6, function close line 7)
  // never receive a positive DA.
  const CATCH_FIXTURE = [
    "export function risky(): void {", // 1  code
    "  try {", //                         2  code
    "    doWork();", //                   3  code
    "  } catch (e) {", //                 4  code
    "    handle(e);", //                  5  code (executable)
    "  }", //                             6  lone `}` — catch close (STRIP)
    "}", //                               7  lone `}` — function close (STRIP)
  ].join("\n");

  test("classifies the lone catch/function closing braces as strippable", () => {
    const strippable = computeStrippableLines(CATCH_FIXTURE);
    expect([...strippable].sort((a, b) => a - b)).toEqual([6, 7]);
    // Real code, including the executable body line 5, is never strippable.
    for (const ln of [1, 2, 3, 4, 5]) expect(strippable.has(ln)).toBe(false);
  });

  // Build a 7-line LCOV chunk for the catch fixture with the given per-line
  // counts (absent lines default to 0).
  function catchChunk(counts: Record<number, number>): string {
    const lines = ["TN:", `SF:${SOURCE_ID}`, "FNF:1", "FNH:1"];
    for (let ln = 1; ln <= 7; ln++) lines.push(`DA:${ln},${counts[ln] ?? 0}`);
    lines.push("LF:7", "LH:0", "end_of_record");
    return lines.join("\n");
  }

  // Loaded-only union: one executing chunk (real code hit, brace lines 0) merged
  // with an all-zero loaded-only chunk. The braces union to DA:0 — the false-red.
  const catchBody = [
    catchChunk({ 1: 14, 2: 14, 3: 14, 4: 14, 5: 14 }),
    "",
    catchChunk({}),
  ]
    .join("\n")
    .trim();

  test("RED then GREEN: the residual brace DA:0 persists without the strip and is removed with it", () => {
    // RED: the pre-fix behavior (unreadable source → nothing stripped) leaves the
    // catch/function closing braces as DA:6,0 / DA:7,0 — the codecov-uncoverable
    // false-red #870 reports.
    const red = normalizeCoverageReport(catchBody, CONTEXT, "/repo", {
      readSource: () => null,
    });
    expect(red).toContain("DA:6,0");
    expect(red).toContain("DA:7,0");

    // GREEN: with the source readable, the closing-only strip removes both.
    const green = normalizeCoverageReport(catchBody, CONTEXT, "/repo", {
      readSource: () => CATCH_FIXTURE,
    });
    expect(green).not.toContain("DA:6,");
    expect(green).not.toContain("DA:7,");
    // The executed real-code lines survive with their unioned counts.
    for (const ln of [1, 2, 3, 4, 5]) expect(green).toContain(`DA:${ln},14`);
  });

  test("false-negative guard: an executable but UNCOVERED line is never stripped", () => {
    // Same fixture, but the executable body line 5 (`handle(e);`) is uncovered
    // (DA:0). It must survive — dropping it would be a real coverage loss.
    const body5 = [catchChunk({ 1: 3, 2: 3, 3: 3, 4: 3 }), "", catchChunk({})]
      .join("\n")
      .trim();
    const out = normalizeCoverageReport(body5, CONTEXT, "/repo", {
      readSource: () => CATCH_FIXTURE,
    });
    // Executable-but-uncovered code keeps its DA:0.
    expect(out).toContain("DA:5,0");
    // The lone braces are still stripped.
    expect(out).not.toContain("DA:6,");
    expect(out).not.toContain("DA:7,");
  });

  test("template-literal brace-only line is preserved (false-negative guard)", () => {
    // A `}` that is template TEXT, not code, must NOT be stripped.
    const src = ["const t = `", "}", "`;"].join("\n");
    // Line 2 is template content; line 1/3 carry the backtick delimiters.
    expect(computeStrippableLines(src).has(2)).toBe(false);
    expect([...computeStrippableLines(src)]).toEqual([]);

    // And end-to-end: its DA record survives the normalize.
    const tmplChunk = [
      "TN:",
      `SF:${SOURCE_ID}`,
      "DA:1,0",
      "DA:2,0",
      "DA:3,0",
      "LF:3",
      "LH:0",
      "end_of_record",
    ].join("\n");
    const out = normalizeCoverageReport(tmplChunk, CONTEXT, "/repo", {
      readSource: () => src,
    });
    expect(out).toContain("DA:2,0");
  });

  test("closed-set enumeration: every closing-delimiter form is strippable", () => {
    // The full closed set (base forms + each with a trailing comma). This is the
    // CONTRACT fixture: CLOSING_ONLY_LINES in coverage-normalize.ts must match
    // this list exactly, and adding a symbol string requires extending it here.
    const CLOSED_SET = [
      "}",
      "};",
      "})",
      "});",
      "]",
      "];",
      ")",
      ");",
      "},",
      "};,",
      "}),",
      "});,",
      "],",
      "];,",
      "),",
      ");,",
    ];
    expect(CLOSED_SET.length).toBe(16);

    // Each form, indented, on its own line — proving the classification trims
    // leading whitespace. Line 1 is a code anchor so the closers are in code
    // mode (not the start-of-file), lines 2..17 are the 16 forms.
    const src = ["const xs = [", ...CLOSED_SET.map((s) => `  ${s}`)].join("\n");
    const strippable = computeStrippableLines(src);
    // Lines 2..17 (every closed-set form) are strippable; line 1 (code) is not.
    expect([...strippable].sort((a, b) => a - b)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    expect(strippable.has(1)).toBe(false);
    // And each form individually, in isolation, is strippable.
    for (const form of CLOSED_SET) {
      expect(computeStrippableLines(form).has(1)).toBe(true);
    }
  });
});
