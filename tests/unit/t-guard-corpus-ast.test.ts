// covers: file:lib/guard-corpus-ast.ts
// size: small
//
// The call-expression classifier shared by the two halves of t259 after the
// perf split (#1830 FR-1). The integration half drives it over the real corpus,
// which by construction contains no unclassified call shape — so the loud
// throw, the branch that keeps a new dynamic-dispatch form from being silently
// uncounted, needs its own in-process case.
import { describe, expect, test } from "bun:test";
import { callNames, GUARD_CORPUS_FILES } from "../lib/guard-corpus-ast.ts";

describe("callNames", () => {
  test("names identifier and property-access callees in source order", () => {
    expect(callNames("alpha(); obj.beta(); gamma(obj.delta());")).toEqual([
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
  });

  test("labels a parenthesised arrow or function IIFE", () => {
    expect(callNames("(() => 1)(); (function () { return 2; })();")).toEqual([
      "<static-iife>",
      "<static-iife>",
    ]);
  });

  test("names a super call", () => {
    expect(callNames("class A extends B { constructor() { super(); } }")).toEqual(["super"]);
  });

  test("returns nothing for a corpus with no calls", () => {
    expect(callNames("const value = 1;")).toEqual([]);
  });

  test("throws on an unclassified dynamic call shape", () => {
    expect(() => callNames("factory()();")).toThrow(
      "Unclassified dynamic call expression in guard corpus",
    );
  });
});

describe("GUARD_CORPUS_FILES", () => {
  test("enumerates the four owned sink tools", () => {
    expect([...GUARD_CORPUS_FILES]).toEqual([
      "amadeus-utility.ts",
      "amadeus-orchestrate.ts",
      "amadeus-state.ts",
      "amadeus-lib.ts",
    ]);
  });
});
