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
  createSemanticSelector,
  evaluatePatch,
  findStaleAllowlistEntries,
  parseAllowlist,
  parseDiffAddedLines,
  parseLcovLineHits,
  renderSummary,
  resolveAllowlistEntries,
  resolveSemanticSelector,
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

const VALID_SELECTOR = {
  function: "target",
  fingerprint: `sha256:${"0".repeat(64)}`,
  anchorLines: 1,
  targetLines: "1",
};

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

  // #2574 — an added line whose CONTENT starts with "++ " renders as "+++ ..."
  // in the diff. Inside a hunk it is content, never a file header: mistaking it
  // for one retargets currentFile at a bogus path and drops the real file's
  // added lines from the gate population (silent false PASS).
  test("parseDiffAddedLines keeps '++ '-prefixed added content inside the hunk", () => {
    const diff = [
      "diff --git a/packages/framework/core/tools/example.ts b/packages/framework/core/tools/example.ts",
      "--- a/packages/framework/core/tools/example.ts",
      "+++ b/packages/framework/core/tools/example.ts",
      "@@ -9,0 +10,3 @@",
      "+++ b/decoy.ts",
      "+const uncovered = 1;",
      "+++ marker in prose",
    ].join("\n");
    const added = parseDiffAddedLines(diff);
    expect([...(added.get("packages/framework/core/tools/example.ts") ?? [])].sort()).toEqual([10, 11, 12]);
    expect(added.has("decoy.ts")).toBe(false);
  });

  // #2574 — the hunk's declared line counts are what close the hunk, so removal
  // and context lines have to spend their share of the budget. With unified>0
  // both arms run; the budgets must hit zero exactly at the hunk's end so the
  // NEXT "+++ " is read as the file header it genuinely is.
  test("parseDiffAddedLines spends the hunk budget on removal and context lines", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,3 +1,3 @@",
      " const keep = 0;",
      "-const removed = 1;",
      "+const added = 1;",
      " const tail = 2;",
      "diff --git a/src/b.ts b/src/b.ts",
      "--- a/src/b.ts",
      "+++ b/src/b.ts",
      "@@ -5,0 +6,1 @@",
      "+const second = 3;",
    ].join("\n");
    const added = parseDiffAddedLines(diff);
    expect([...(added.get("src/a.ts") ?? [])]).toEqual([2]);
    expect([...(added.get("src/b.ts") ?? [])]).toEqual([6]);
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
    const allowlist = [{
      file: "packages/framework/core/tools/example.ts",
      start: 11,
      end: 11,
      reason: "spawn-only dispatch case; seam refactor unnatural (see #881 class)",
      expiry: "remove when the dispatch moves behind an in-process seam",
    }];
    const result = evaluatePatch(parseDiffAddedLines(DIFF), parseLcovLineHits(LCOV), allowlist);
    expect(result.violations).toEqual([]);
    expect(result.allowlistedCount).toBe(1);
    expect(renderSummary(result)).toContain("PASS");
  });

  test("a semantic allowlist resolves to LCOV lines before the patch verdict", () => {
    const source = [
      "export function target() {",
      "  return 1;",
      "}",
    ].join("\n");
    const selector = createSemanticSelector("example.ts", source, "2");
    const allowlist = parseAllowlist(
      JSON.stringify([{ file: "example.ts", selector, reason: "spawn-only boundary" }]),
    );
    const resolved = resolveAllowlistEntries(allowlist, new Map([["example.ts", source]]));
    const lcov = parseLcovLineHits("SF:example.ts\nDA:2,0\nend_of_record");
    const diff = parseDiffAddedLines("+++ b/example.ts\n@@ -1,0 +2,1 @@\n+  return 1;");

    expect(evaluatePatch(diff, lcov, resolved).violations).toEqual([]);
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
  test("legacy absolute line pins are rejected", () => {
    expect(() =>
      parseAllowlist(JSON.stringify([{ file: "x.ts", lines: "1", reason: "legacy pin" }])),
    ).toThrow(/semantic selector required/);
  });

  test("a function-scoped source fingerprint survives unrelated lines inserted before the function", () => {
    const original = [
      "export function target() {",
      "  const value = 1;",
      "  return value;",
      "}",
    ].join("\n");
    const selector = createSemanticSelector("example.ts", original, "2-3");

    const shifted = ["// unrelated header", "// another header", original].join("\n");

    expect(selector.function).toBe("target");
    expect(resolveSemanticSelector("example.ts", shifted, selector)).toEqual({ start: 4, end: 5 });
  });

  test("the fingerprint widens to surrounding function context when the target source is repeated", () => {
    const original = [
      "export function target(input: boolean) {",
      "  if (input) {",
      "    return 1;",
      "  }",
      "  if (!input) {",
      "    return 2;",
      "  }",
      "}",
    ].join("\n");

    const selector = createSemanticSelector("example.ts", original, "4");
    const shifted = ["// unrelated header", original].join("\n");

    expect(selector.anchorLines).toBeGreaterThan(1);
    expect(resolveSemanticSelector("example.ts", shifted, selector)).toEqual({ start: 5, end: 5 });
  });

  test("arrow functions and module-level source both have stable semantic scopes", () => {
    const source = [
      "const moduleValue = 1;",
      "export const target = () => {",
      "  return moduleValue;",
      "};",
    ].join("\n");

    const moduleSelector = createSemanticSelector("example.ts", source, "1");
    const functionSelector = createSemanticSelector("example.ts", source, "3");

    expect(moduleSelector.function).toBe("<module>");
    expect(functionSelector.function).toBe("target");
    expect(resolveSemanticSelector("example.ts", source, moduleSelector)).toEqual({ start: 1, end: 1 });
    expect(resolveSemanticSelector("example.ts", source, functionSelector)).toEqual({ start: 3, end: 3 });
  });

  test("object-property arrows and named callback expressions have stable semantic scopes", () => {
    const source = [
      "const handlers = {",
      "  run: () => {",
      "    return 1;",
      "  },",
      "};",
      "register(function namedWorker() {",
      "  return 2;",
      "});",
    ].join("\n");

    expect(createSemanticSelector("example.ts", source, "3").function).toBe("run");
    expect(createSemanticSelector("example.ts", source, "7").function).toBe("namedWorker");
  });

  test("class members carry the class name prefix", () => {
    const source = [
      "export class Runtime {",
      "  private value = 0;",
      "  constructor() {",
      "    this.value = 1;",
      "  }",
      "  #execute() {",
      "    return 2;",
      "  }",
      "  get ready() {",
      "    return 3;",
      "  }",
      "}",
    ].join("\n");

    expect(createSemanticSelector("example.ts", source, "4").function).toBe("Runtime.constructor");
    expect(createSemanticSelector("example.ts", source, "7").function).toBe("Runtime.#execute");
    expect(createSemanticSelector("example.ts", source, "10").function).toBe("Runtime.ready");
  });

  test("duplicate function names fall back to module scope", () => {
    const source = [
      "function duplicate() {",
      "  return 1;",
      "}",
      "function duplicate() {",
      "  return 2;",
      "}",
    ].join("\n");

    expect(createSemanticSelector("example.ts", source, "2").function).toBe("<module>");
  });

  test("selector resolution fails closed for missing, duplicate, and ambiguous matches", () => {
    const original = ["function target() {", "    return 1;", "}"].join("\n");
    const selector = createSemanticSelector("example.ts", original, "2");
    const duplicateSource = [
      "function target(input: boolean) {",
      "  if (input)",
      "    return 1;",
      "  else",
      "    return 1;",
      "}",
    ].join("\n");
    const duplicateFunctions = [
      "function duplicate() { return 1; }",
      "function duplicate() { return 2; }",
    ].join("\n");

    expect(() => resolveSemanticSelector("example.ts", original, { ...selector, function: "missing" }))
      .toThrow(/resolved 0 times/);
    expect(() => resolveSemanticSelector("example.ts", duplicateFunctions, { ...selector, function: "duplicate" }))
      .toThrow(/resolved 2 times/);
    expect(() => resolveSemanticSelector("example.ts", duplicateSource, selector)).toThrow(/resolved 2 times/);
    expect(() => resolveSemanticSelector("example.ts", original.replace("return 1", "return 2"), selector))
      .toThrow(/resolved 0 times/);
  });

  test("allowlist resolution fails closed when its source is missing", () => {
    const entries = parseAllowlist(
      JSON.stringify([{ file: "missing.ts", selector: VALID_SELECTOR, reason: "missing source" }]),
    );
    expect(() => resolveAllowlistEntries(entries, new Map())).toThrow(/source not found/);
  });

  test("reason-less entry throws (fail-closed ledger)", () => {
    expect(() =>
      parseAllowlist(JSON.stringify([{ file: "x.ts", selector: VALID_SELECTOR, reason: "  " }])),
    ).toThrow(/malformed allowlist entry/);
  });

  test("bad target-lines pattern throws", () => {
    expect(() =>
      parseAllowlist(
        JSON.stringify([{ file: "x.ts", selector: { ...VALID_SELECTOR, targetLines: "1-2-3" }, reason: "r" }]),
      ),
    ).toThrow(/malformed allowlist entry/);
  });

  test("selector fields outside the semantic contract throw", () => {
    expect(() =>
      parseAllowlist(
        JSON.stringify([{ file: "x.ts", selector: { ...VALID_SELECTOR, anchorLines: 0 }, reason: "r" }]),
      ),
    ).toThrow(/malformed allowlist entry/);
  });

  test("non-string expiry throws", () => {
    expect(() =>
      parseAllowlist(JSON.stringify([{ file: "x.ts", selector: VALID_SELECTOR, reason: "r", expiry: 42 }])),
    ).toThrow(/malformed allowlist entry/);
  });

  test("stale range (matches no measurable line) is detected", () => {
    const lcov = parseLcovLineHits(LCOV);
    const entries = [
      { file: "packages/framework/core/tools/example.ts", start: 100, end: 110, reason: "stale range" },
      { file: "gone.ts", start: 1, end: 1, reason: "file no longer measured" },
      { file: "packages/framework/core/tools/example.ts", start: 11, end: 11, reason: "still live" },
    ];
    const stale = findStaleAllowlistEntries(entries, lcov);
    expect(stale.map(({ start, end }) => ({ start, end }))).toEqual([
      { start: 100, end: 110 },
      { start: 1, end: 1 },
    ]);
  });
});
