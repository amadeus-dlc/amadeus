// covers: harness-instrument:coverage-patch-gate
//
// t536 — `selector.class`, the declared-class half of the patch-coverage
// allowlist (#1622).
//
// An exemption says why a range cannot be measured. Until now nothing checked
// that the range still WAS that kind of row: a selector survives line shifts by
// construction, so it can drift onto code the reason never described and keep
// waiving it. The check here is deliberately not a reading of `reason` — prose
// mixes target, rationale, coverage status and reachability, and four attempts
// to extract a subject from it were each measured false-positive-prone. The
// entry declares its class instead, and the declaration is what the AST is held
// to, so a wrong answer is impossible to manufacture from wording.
//
// Everything below is pure: sources are strings, entries are values. The sweep
// over the real ledger and the `--check` boundary live in t537.
import { describe, expect, test } from "bun:test";
import {
  type AllowlistEntry,
  createSemanticSelector,
  classifyRange,
  DECLARABLE_SYNTAX_CLASSES,
  type DeclaredSyntaxClass,
  findSyntaxClassMismatches,
  matchesSyntaxClass,
  parseAllowlist,
  renderSyntaxClassMismatches,
} from "../coverage-patch-gate.ts";

const FILE = "fixture.ts";
const SOURCE = [
  "export function read(path: string): string {",
  "  try {",
  "    return load(path);",
  "  } catch {",
  "    return '';",
  "  }",
  "}",
  "",
  "export function widen(",
  "  opts: {",
  "    snapshot?: string;",
  "  },",
  "): number {",
  "  return opts.snapshot === undefined ? 0 : 1;",
  "}",
  "",
].join("\n");

const SOURCES = new Map([[FILE, SOURCE]]);

function entryFor(lines: string, cls?: DeclaredSyntaxClass): AllowlistEntry {
  const selector = createSemanticSelector(FILE, SOURCE, lines);
  return {
    file: FILE,
    selector: cls === undefined ? selector : { ...selector, class: cls },
    reason: "fixture",
  };
}

/** The ledger is JSON on disk, so an invalid class is just a value — no cast needed. */
function ledgerJson(lines: string, cls: unknown): string {
  return JSON.stringify([
    { file: FILE, selector: { ...createSemanticSelector(FILE, SOURCE, lines), class: cls }, reason: "fixture" },
  ]);
}

describe("t536 selector.class parsing", () => {
  test("each declarable class is accepted", () => {
    for (const cls of DECLARABLE_SYNTAX_CLASSES) {
      expect(parseAllowlist(JSON.stringify([entryFor("5", cls)]))[0].selector.class).toBe(cls);
    }
  });

  test("an entry without a class parses and carries none — the ratchet's opt-out", () => {
    expect(parseAllowlist(JSON.stringify([entryFor("5")]))[0].selector.class).toBeUndefined();
  });

  // The two classes outside the vocabulary are outside it for a reason:
  // spawn-only is a claim about reachability and unmeasurable-other has no
  // predicate at all, so neither can be held to the AST. Accepting them would
  // let an entry declare a class that nothing can check.
  test("a class the AST cannot decide is rejected, not silently skipped", () => {
    for (const cls of ["spawn-only", "unmeasurable-other"]) {
      expect(() => parseAllowlist(ledgerJson("5", cls))).toThrow(/malformed allowlist entry/);
    }
  });

  test("an unknown, empty, or non-string class is rejected", () => {
    for (const cls of ["catch arm", "", "CATCH-ARM", null, 1, ["catch-arm"]]) {
      expect(() => parseAllowlist(ledgerJson("5", cls))).toThrow(/malformed allowlist entry/);
    }
  });

  test("the rejection message names the closed vocabulary", () => {
    expect(() => parseAllowlist(ledgerJson("5", "bogus"))).toThrow(/type-only\/catch-arm\/dispatch-case/);
  });
});

describe("t536 declared class against the AST", () => {
  test("a declaration the code satisfies raises nothing", () => {
    expect(findSyntaxClassMismatches([entryFor("5", "catch-arm")], SOURCES)).toEqual([]);
    expect(findSyntaxClassMismatches([entryFor("11", "type-only")], SOURCES)).toEqual([]);
  });

  test("an undeclared entry is not checked at all", () => {
    expect(findSyntaxClassMismatches([entryFor("3")], SOURCES)).toEqual([]);
  });

  test("a declaration the code contradicts is reported with what it actually is", () => {
    const [mismatch] = findSyntaxClassMismatches([entryFor("3", "catch-arm")], SOURCES);
    expect(mismatch).toEqual({
      file: FILE,
      function: "read",
      declared: "catch-arm",
      actual: "unmeasurable-other",
      start: 3,
      end: 3,
    });
  });

  test("a range that is a different decidable class is reported as that class", () => {
    const [mismatch] = findSyntaxClassMismatches([entryFor("11", "catch-arm")], SOURCES);
    expect(mismatch.actual).toBe("type-only");
  });

  // unmeasurable-other names the absence of a class rather than a class, so
  // asking whether a range satisfies it is always answered no — including for
  // ranges the classifier itself labels unmeasurable-other. Being unable to
  // declare it is the point; it would assert nothing.
  test("unmeasurable-other is satisfied by nothing, not even by itself", () => {
    for (const lines of ["3", "5", "11"]) {
      const range = { start: Number(lines), end: Number(lines) };
      expect(matchesSyntaxClass(FILE, SOURCE, range, "unmeasurable-other")).toBe(false);
    }
    expect(classifyRange(FILE, SOURCE, { start: 3, end: 3 })).toBe("unmeasurable-other");
  });

  // NFR-2: an input the check cannot read is an error, never an implicit match.
  test("a source the check cannot read throws instead of passing", () => {
    expect(() => findSyntaxClassMismatches([entryFor("5", "catch-arm")], new Map())).toThrow(
      /source not found for declared-class allowlist entry/,
    );
  });

  // NFR-1: same input, same answer. Nothing here reads a clock, the network,
  // or a model.
  test("two runs over the same input are byte-identical", () => {
    const entries = [entryFor("3", "catch-arm"), entryFor("11", "dispatch-case")];
    const first = JSON.stringify(findSyntaxClassMismatches(entries, SOURCES));
    const second = JSON.stringify(findSyntaxClassMismatches(entries, SOURCES));
    expect(first).toBe(second);
  });
});

// NFR-4: a field no one reads is a field that cannot be wrong, which is how
// verification theatre starts. Every field of the verdict reaches the operator.
describe("t536 the report consumes every field of the verdict", () => {
  test("the rendered line carries file, range, function, declaration, and finding", () => {
    const mismatches = findSyntaxClassMismatches([entryFor("9-13", "catch-arm")], SOURCES);
    const rendered = renderSyntaxClassMismatches(mismatches);
    const [only] = mismatches;
    expect(rendered).toContain(only.file);
    expect(rendered).toContain(only.function);
    expect(rendered).toContain(only.declared);
    expect(rendered).toContain(only.actual);
    expect(rendered).toContain(`${only.start}-${only.end}`);
  });

  test("a single-line range renders without a redundant span", () => {
    const rendered = renderSyntaxClassMismatches(findSyntaxClassMismatches([entryFor("3", "catch-arm")], SOURCES));
    expect(rendered).toContain(`${FILE}:3 `);
  });

  test("nothing to report renders empty", () => {
    expect(renderSyntaxClassMismatches([])).toBe("");
  });
});
