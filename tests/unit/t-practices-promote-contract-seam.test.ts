// covers: function:parseRuleLines, function:validateRuleLines, function:parseRuleSectionsOrFail
// size: small
//
// In-process (pure) coverage seam for the practices-promote section-keyword
// contract helpers (Issue #1013, E-PB2 ruling A = atomic fail-closed). These
// three functions are pure (no fs / spawn / timer), so this file stays in the
// unit tier at "small" size. The handler that wires them (handlePracticesPromote)
// needs a project fixture on disk and is driven in-process in the integration
// tier (tests/integration/t-practices-promote-contract.test.ts), alongside the
// spawn-driven exit-code contract.

import { describe, expect, test } from "bun:test";
import {
  parseRuleLines,
  parseRuleSectionsOrFail,
  validateRuleLines,
} from "../../dist/claude/.claude/tools/amadeus-state.ts";

describe("t-practices-promote-contract-seam: parseRuleLines", () => {
  test("keeps rule lines; drops blanks, comments, headings; trims (AC-1c inputs)", () => {
    const body = "\nALWAYS x\n  ALWAYS y  \n<!-- comment -->\n# heading\n\n- NEVER z\n";
    expect(parseRuleLines(body)).toEqual(["ALWAYS x", "ALWAYS y", "- NEVER z"]);
  });

  test("empty / comment-only / heading-only section yields zero rules (AC-1c)", () => {
    expect(parseRuleLines("")).toEqual([]);
    expect(parseRuleLines("<!-- only a comment -->\n")).toEqual([]);
    expect(parseRuleLines("## Mandated\n")).toEqual([]);
  });
});

describe("t-practices-promote-contract-seam: validateRuleLines", () => {
  test("accepts bare and bullet-form section-matching lines (AC-1a)", () => {
    expect(validateRuleLines("Mandated", ["ALWAYS x", "- ALWAYS y"])).toEqual([]);
    expect(validateRuleLines("Forbidden", ["NEVER a", "- NEVER b"])).toEqual([]);
  });

  test("rejects section-mismatched lines (AC-1b) and collects ALL violations (AC-2b)", () => {
    const v = validateRuleLines("Mandated", [
      "ALWAYS ok",
      "NEVER wrong-section",
      "just prose",
    ]);
    expect(v).toHaveLength(2);
    expect(v[0]).toContain("## Mandated");
    expect(v[0]).toContain('start with "ALWAYS "');
    expect(v[0]).toContain("NEVER wrong-section");
    expect(v[1]).toContain("just prose");
  });

  test("an unknown section imposes no contract (no violations)", () => {
    expect(validateRuleLines("Decided", ["anything at all"])).toEqual([]);
  });
});

describe("t-practices-promote-contract-seam: parseRuleSectionsOrFail", () => {
  const draft = (mandated: string, forbidden: string): string =>
    `# Discovered Rules\n\n## Mandated\n\n${mandated}\n\n## Forbidden\n\n${forbidden}\n`;

  test("returns parsed rule lists when both sections satisfy the contract", () => {
    const r = parseRuleSectionsOrFail(draft("ALWAYS a", "- NEVER b"), (m) => {
      throw new Error(`unexpected reject: ${m}`);
    });
    expect(r.mandated).toEqual(["ALWAYS a"]);
    expect(r.forbidden).toEqual(["- NEVER b"]);
  });

  test("hands every collected violation to onViolation before returning (AC-2b)", () => {
    let reason = "";
    const onViolation = ((m: string): never => {
      reason = m;
      throw new Error("rejected");
    }) as (m: string) => never;
    expect(() =>
      parseRuleSectionsOrFail(draft("prose one", "ALSO wrong"), onViolation),
    ).toThrow("rejected");
    // Both sections' violations are enumerated (collect-all, not fail-fast).
    expect(reason).toContain("prose one");
    expect(reason).toContain("ALSO wrong");
    expect(reason).toContain("section-keyword contract");
  });
});
