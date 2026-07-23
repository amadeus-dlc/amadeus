// covers: none (self-contained pure predicates defined in tests/lib/boundary-guard.ts)
//
// t258 (unit) — distribution-boundary guard predicates (intent
// 260722-election-core-promotion, Unit boundary-guard, FR-5a/5b/5c).
//
// Mechanism: none. These are PURE functions with ZERO tokens, ZERO subprocess,
// ZERO FS — the guard logic lives in tests/lib/boundary-guard.ts and is driven
// here by inline input data (domain-entities: test doubles are input data, never
// a production test-branch). The real-FS live scan is the integration twin
// (t258-boundary-guard.integration.test.ts, fs-tests-integration-first / size
// purity).
//
// This file RE-EXPORTS every guard symbol so the design's "exports available
// from the unit test file" surface (nfr-design logical-components) is preserved,
// while the single canonical DEFINITION sits in the shared lib module (BR-7).
// See code-summary.md "Deviation" for why the definition is not inlined here.

import { describe, expect, test } from "bun:test";
import {
  AllowRule,
  type Finding,
  fileMatchesGlob,
  findDuplicatedAssets,
  type RawAllowRule,
  Result,
  SCAN_ROOTS,
  scanDistributionTreeForScriptsRefs,
} from "../lib/boundary-guard.ts";

// Re-export the canonical guard surface (design: exports reachable from the unit twin).
export {
  AllowRule,
  fileMatchesGlob,
  findDuplicatedAssets,
  Result,
  SCAN_ROOTS,
  scanDistributionTreeForScriptsRefs,
};
export type { Finding, RawAllowRule };

// Helper: build an AllowRule, failing the test loudly if parse rejects it.
function rule(id: string, fileGlob: string, pattern: string): AllowRule {
  const r = AllowRule.parse({ id, fileGlob, pattern });
  if (r.type !== "ok") throw new Error(`fixture AllowRule failed to parse: ${r.error.kind}`);
  return r.value;
}

describe("t258 predicate 1 — scanDistributionTreeForScriptsRefs (FR-5a)", () => {
  test("happy path: no scripts/ reference yields zero findings", () => {
    const files = [{ path: "dist/claude/.claude/tools/x.ts", content: "import { a } from './b';\nconst k = 1;\n" }];
    expect(scanDistributionTreeForScriptsRefs(files, [])).toEqual([]);
  });

  test("detects a scripts/ reference with an empty allowlist (line 1-origin, trimmed excerpt)", () => {
    const files = [{ path: "s/SKILL.md", content: "intro line\n    bun scripts/amadeus-election.ts open\ntail\n" }];
    const findings = scanDistributionTreeForScriptsRefs(files, []);
    expect(findings.length).toBe(1);
    expect(findings[0]).toEqual({ file: "s/SKILL.md", line: 2, excerpt: "bun scripts/amadeus-election.ts open" });
  });

  test("BR-1 occurrence-level: an allowed token and a violation token on the SAME line still flags the violation", () => {
    const allow = [rule("build-tooling", "**", "scripts/(package\\.ts|promote-self\\.ts)")];
    const files = [{ path: "docs/x.md", content: "run scripts/package.ts then bun scripts/amadeus-election.ts next\n" }];
    const findings = scanDistributionTreeForScriptsRefs(files, allow);
    // Exactly one finding — for the un-allowlisted election occurrence, NOT the allowed package.ts occurrence.
    expect(findings.length).toBe(1);
    expect(findings[0].line).toBe(1);
    expect(findings[0].file).toBe("docs/x.md");
  });

  test("allowlist fully exempts a legitimate-only line (BR-6 false-red = 0)", () => {
    const allow = [rule("build-tooling", "**", "scripts/(package\\.ts|manifest-types\\.ts)")];
    const files = [{ path: "packages/framework/package.json", content: '"dist": "bun ../../scripts/package.ts"\n' }];
    expect(scanDistributionTreeForScriptsRefs(files, allow)).toEqual([]);
  });

  test("fileGlob scopes the exemption: a rule for docs/** does not exempt a token elsewhere", () => {
    const allow = [rule("docs-only", "docs/**", "scripts/package\\.ts")];
    const files = [{ path: "src/x.ts", content: "scripts/package.ts\n" }];
    const findings = scanDistributionTreeForScriptsRefs(files, allow);
    expect(findings.length).toBe(1);
    expect(findings[0].file).toBe("src/x.ts");
  });

  test("excerpt is capped at 80 characters", () => {
    const long = `scripts/x ${"y".repeat(200)}`;
    const files = [{ path: "f", content: `${long}\n` }];
    const findings = scanDistributionTreeForScriptsRefs(files, []);
    expect(findings[0].excerpt.length).toBe(80);
  });

  test("multiple violation occurrences on one line yield one finding per occurrence", () => {
    const files = [{ path: "f", content: "scripts/a.ts and scripts/b.ts\n" }];
    const findings = scanDistributionTreeForScriptsRefs(files, []);
    expect(findings.length).toBe(2);
    expect(findings.every((f: Finding) => f.line === 1)).toBe(true);
  });
});

describe("t258 predicate 2 — findDuplicatedAssets three-state semantics (BR-3)", () => {
  test("scripts-only (pre-move) is green", () => {
    expect(findDuplicatedAssets(["amadeus-election.ts", "amadeus-mirror.ts"], ["amadeus-lib.ts"])).toEqual([]);
  });

  test("canon-only (post-move) is green", () => {
    expect(findDuplicatedAssets([], ["amadeus-election.ts", "amadeus-lib.ts"])).toEqual([]);
  });

  test("both present (copy residue) is red — the shared basename is reported", () => {
    expect(findDuplicatedAssets(["amadeus-election.ts", "amadeus-mirror.ts"], ["amadeus-election.ts", "amadeus-lib.ts"])).toEqual(["amadeus-election.ts"]);
  });

  test("duplicates are de-duplicated in the output", () => {
    expect(findDuplicatedAssets(["a.ts", "a.ts"], ["a.ts"])).toEqual(["a.ts"]);
  });
});

describe("t258 AllowRule.parse — smart constructor (BR-2)", () => {
  test("ok: a valid raw rule compiles its pattern", () => {
    const r = AllowRule.parse({ id: "build", fileGlob: "**", pattern: "scripts/package\\.ts" });
    expect(r.type).toBe("ok");
    if (r.type === "ok") {
      expect(r.value.id).toBe("build");
      expect(r.value.pattern.test("scripts/package.ts")).toBe(true);
      expect(r.value.pattern.test("scripts/amadeus-election.ts")).toBe(false);
    }
  });

  test("err: empty id is rejected", () => {
    const r = AllowRule.parse({ id: "  ", fileGlob: "**", pattern: "x" });
    expect(r.type).toBe("err");
    if (r.type === "err") expect(r.error.kind).toBe("empty-id");
  });

  test("err: empty fileGlob is rejected", () => {
    const r = AllowRule.parse({ id: "x", fileGlob: "", pattern: "x" });
    expect(r.type).toBe("err");
    if (r.type === "err") expect(r.error.kind).toBe("empty-glob");
  });

  test("err: an uncompilable pattern is rejected", () => {
    const r = AllowRule.parse({ id: "x", fileGlob: "**", pattern: "scripts/(" });
    expect(r.type).toBe("err");
    if (r.type === "err") expect(r.error.kind).toBe("invalid-pattern");
  });
});

describe("t258 fileMatchesGlob", () => {
  test("** matches any path", () => {
    expect(fileMatchesGlob("a/b/c.ts", "**")).toBe(true);
  });
  test("scoped glob matches only within its subtree", () => {
    expect(fileMatchesGlob("dist/claude/x.ts", "dist/**")).toBe(true);
    expect(fileMatchesGlob("src/x.ts", "dist/**")).toBe(false);
  });
  test("single * does not cross a path segment", () => {
    expect(fileMatchesGlob("a/b.ts", "a/*")).toBe(true);
    expect(fileMatchesGlob("a/b/c.ts", "a/*")).toBe(false);
  });
  test("regex metacharacters in a glob are matched literally", () => {
    expect(fileMatchesGlob("docs/a+b[1].md", "docs/a+b[1].md")).toBe(true);
    expect(fileMatchesGlob("docs/ab1.md", "docs/a+b[1].md")).toBe(false);
  });
});

describe("t258 SCAN_ROOTS canonical catalog (BR-7)", () => {
  test("is frozen", () => {
    expect(Object.isFrozen(SCAN_ROOTS)).toBe(true);
  });
  test("carries the framework source, the dist trees, and the self-install trees", () => {
    const dirs = SCAN_ROOTS.map((r) => r.dir);
    expect(dirs).toContain("packages/framework");
    expect(dirs).toContain("dist/claude");
    expect(dirs).toContain(".agents");
    expect(SCAN_ROOTS.every((r) => ["packages", "dist", "self-install"].includes(r.kind))).toBe(true);
    // exactly one framework-source root
    expect(SCAN_ROOTS.filter((r) => r.kind === "packages").length).toBe(1);
  });
});
