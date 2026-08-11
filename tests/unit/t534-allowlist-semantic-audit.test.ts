// covers: file:tests/allowlist-semantic-audit.ts
//
// t534 — the semantic audit of tests/.coverage-patch-allowlist.json (#1622).
//
// Two pure halves meet here. `matchesSyntaxClass`/`classifyRange` read the
// TypeScript AST and answer "what kind of unmeasurable row is this line
// range?"; `extractReasonClaim` reads the ledger's prose and answers "what kind
// does the reason CLAIM it is?". The three-valued verdict is their agreement.
//
// Everything in this file takes a source string and a range and returns a
// value. The 623-entry sweep over the real ledger — real files, real
// selectors — lives in the integration sibling t535.
import { describe, expect, test } from "bun:test";
import { auditEntry, classifyRange, extractReasonClaim, matchesSyntaxClass } from "../allowlist-semantic-audit.ts";
import { createSemanticSelector } from "../coverage-patch-gate.ts";

const FILE = "fixture.ts";

describe("t534 type-only predicate", () => {
  test("a runtime-erased multi-line parameter type is type-only", () => {
    const source = [
      "export function validateGrid(",
      "  opts: {",
      "    snapshot?: string;",
      "  },",
      "): void {}",
      "",
    ].join("\n");
    // Line 3 holds nothing but a type member: bun stamps it DA:0.
    expect(matchesSyntaxClass(FILE, source, { start: 3, end: 3 }, "type-only")).toBe(true);
  });

  test("an executable statement line is not type-only", () => {
    const source = ["export function run(): void {", "  console.log('x');", "}", ""].join("\n");
    expect(matchesSyntaxClass(FILE, source, { start: 2, end: 2 }, "type-only")).toBe(false);
  });
});

describe("t534 catch-arm predicate", () => {
  const source = [
    "export function read(path: string): string {",
    "  try {",
    "    return readFileSync(path, 'utf8');",
    "  } catch {",
    "    return '';",
    "  }",
    "}",
    "",
  ].join("\n");

  test("a line inside the catch clause is a catch arm", () => {
    expect(matchesSyntaxClass(FILE, source, { start: 5, end: 5 }, "catch-arm")).toBe(true);
  });

  test("the try body is not a catch arm", () => {
    expect(matchesSyntaxClass(FILE, source, { start: 3, end: 3 }, "catch-arm")).toBe(false);
  });
});

describe("t534 dispatch-case predicate", () => {
  const source = [
    "export function dispatch(verb: string): number {",
    "  switch (verb) {",
    "    case 'next':",
    "      return 1;",
    "    default:",
    "      return 0;",
    "  }",
    "}",
    "",
  ].join("\n");

  test("a case arm is a dispatch case", () => {
    expect(matchesSyntaxClass(FILE, source, { start: 3, end: 4 }, "dispatch-case")).toBe(true);
  });

  test("the default arm is a dispatch case", () => {
    expect(matchesSyntaxClass(FILE, source, { start: 6, end: 6 }, "dispatch-case")).toBe(true);
  });

  test("the switch subject line is not a dispatch case", () => {
    expect(matchesSyntaxClass(FILE, source, { start: 2, end: 2 }, "dispatch-case")).toBe(false);
  });
});

describe("t534 spawn-only predicate", () => {
  const source = [
    "export function main(argv: string[]): number {",
    "  return argv.length;",
    "}",
    "",
    "function helper(): number {",
    "  return 2;",
    "}",
    "",
    "if (import.meta.main) {",
    "  process.exit(main(process.argv.slice(2)));",
    "}",
    "",
  ].join("\n");

  test("the import.meta.main branch is spawn-only", () => {
    expect(matchesSyntaxClass(FILE, source, { start: 10, end: 10 }, "spawn-only")).toBe(true);
  });

  test("the body of main is spawn-only", () => {
    expect(matchesSyntaxClass(FILE, source, { start: 2, end: 2 }, "spawn-only")).toBe(true);
  });

  test("an ordinary function body is not spawn-only", () => {
    expect(matchesSyntaxClass(FILE, source, { start: 6, end: 6 }, "spawn-only")).toBe(false);
  });
});

describe("t534 classifyRange", () => {
  const source = [
    "function main(): number {",
    "  try {",
    "    return 1;",
    "  } catch {",
    "    return 2;",
    "  }",
    "}",
    "",
    "function plain(): number {",
    "  const n = 1;",
    "  return n;",
    "}",
    "",
  ].join("\n");

  test("the innermost syntactic form wins over the enclosing spawn-only context", () => {
    // Line 5 is both inside `main` and inside a catch clause; the catch arm is
    // the more specific claim, so it is the one reported.
    expect(matchesSyntaxClass(FILE, source, { start: 5, end: 5 }, "spawn-only")).toBe(true);
    expect(classifyRange(FILE, source, { start: 5, end: 5 })).toBe("catch-arm");
  });

  test("a plain statement falls through to unmeasurable-other", () => {
    expect(classifyRange(FILE, source, { start: 10, end: 10 })).toBe("unmeasurable-other");
  });
});

describe("t534 reason claim extraction", () => {
  test("a single class term is the claim", () => {
    const claim = extractReasonClaim("these residual rows are runtime-erased port types stamped DA:0 by Bun.");
    expect(claim.kind).toBe("class");
    expect(claim.kind === "class" && claim.class).toBe("type-only");
  });

  // Vacuity guard: the ledger's house style ("focused suites exercise …",
  // "residual rows … stamped DA:0 by Bun") says nothing about WHICH class the
  // range belongs to. If boilerplate alone yielded a class, every entry would
  // be graded against a claim its author never made.
  test("boilerplate alone claims no class", () => {
    const claim = extractReasonClaim(
      "Focused regression suites exercise the surrounding behavior; these residual rows are stamped DA:0 by Bun.",
    );
    expect(claim.kind).toBe("none");
  });

  test("two classes joined by a disjunction are undecidable", () => {
    const claim = extractReasonClaim(
      "this selector is limited to the exact added lines that remain zero-hit (defensive, type-only, or spawned-boundary path).",
    );
    expect(claim.kind).toBe("disjunctive");
  });

  test("one class offered as one possibility among others is undecidable", () => {
    const claim = extractReasonClaim(
      "this residual range is spawn-only dispatch or defensive CLI parsing that Bun does not attribute.",
    );
    expect(claim.kind).toBe("disjunctive");
  });

  test("a named function is reported alongside the claim", () => {
    const claim = extractReasonClaim(
      "Optional graph snapshot property in validateGrid's multi-line opts type; runtime-erased.",
    );
    expect(claim.functions).toContain("validateGrid");
  });
});

describe("t534 three-valued entry audit", () => {
  const source = [
    "export function validateGrid(",
    "  opts: {",
    "    snapshot?: string;",
    "  },",
    "): number {",
    "  return 1;",
    "}",
    "",
    "export function otherHelper(): number {",
    "  return 2;",
    "}",
    "",
  ].join("\n");

  const entryFor = (lines: string, reason: string) => ({
    file: FILE,
    selector: createSemanticSelector(FILE, source, lines),
    reason,
  });

  test("a type-only claim landing on a type-only line agrees", () => {
    const audit = auditEntry(entryFor("3", "Runtime-erased optional property type in validateGrid."), source);
    expect(audit.verdict).toBe("一致");
    expect(audit.actualClass).toBe("type-only");
  });

  test("a type-only claim landing on an executable line has drifted", () => {
    const audit = auditEntry(entryFor("6", "Runtime-erased optional property type."), source);
    expect(audit.verdict).toBe("転位");
  });

  // Only camelCase identifiers are read as function names: matching every
  // lowercase English word against the file's scopes would invent drift out of
  // ordinary prose.
  test("a claim naming a different function of the same file has drifted", () => {
    const audit = auditEntry(entryFor("3", "Runtime-erased optional property type in otherHelper."), source);
    expect(audit.verdict).toBe("転位");
  });

  test("a reason claiming no decidable class is undecidable", () => {
    const audit = auditEntry(entryFor("3", "Focused suites cover this; residual row stamped DA:0 by Bun."), source);
    expect(audit.verdict).toBe("判定不能");
  });
});
