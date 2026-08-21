// covers: packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md
// size: medium
//
// t2415 — the contract half of #2415: the reverse-engineering stage declares
// what leaves its diff input, and that declaration cannot drift from the one
// definition in code.
//
// WHY A DRIFT CHECK IS THE WHOLE MECHANISM. Nothing in the engine computes this
// diff — the scan is performed by a subagent reading the stage contract, so the
// PROSE is the executable. `RE_SCAN_EXCLUDED_PATHSPECS` exists to give that
// prose a machine-checkable twin: two copies of a pathspec list drift the first
// time somebody edits one of them, and a wrong pathspec fails silently (it
// excludes nothing and reports success). This file is the join.
//
// WHY BOTH SOURCE AND THE DELIVERED TREES. The contract travels
// packages/framework/core/ -> dist/<harness>/. A source-only predicate would go
// green while every harness shipped a stale contract, so the block is asserted
// on the canonical source AND on every delivered copy discovered on disk.
// `bun run build` is what makes them agree.

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { RE_SCAN_EXCLUDED_PATHSPECS } from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const CONTRACT_RELATIVE = join(
  "amadeus-common",
  "stages",
  "inception",
  "reverse-engineering.md",
);
const SOURCE_CONTRACT = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  CONTRACT_RELATIVE,
);

const SECTION_HEADING = "#### Scan input exclusions";

function source(): string {
  return readFileSync(SOURCE_CONTRACT, "utf-8");
}

/** The section the exclusion lives in, so a grep cannot pass on a stray mention elsewhere. */
function exclusionSection(markdown: string): string {
  const at = markdown.indexOf(SECTION_HEADING);
  if (at < 0) throw new Error(`no "${SECTION_HEADING}" section in the contract`);
  const rest = markdown.slice(at + SECTION_HEADING.length);
  const nextHeading = rest.search(/\n#{1,4} /);
  return nextHeading < 0 ? rest : rest.slice(0, nextHeading);
}

/**
 * The verbatim pathspec lines of the section's first fenced block. Every
 * non-blank line is returned — no filtering to lines that "look like" a
 * pathspec, which would let a corrupted line disappear instead of failing.
 */
function declaredPathspecs(markdown: string): string[] {
  const section = exclusionSection(markdown);
  const open = section.indexOf("```");
  if (open < 0) throw new Error("no fenced pathspec block in the exclusion section");
  const bodyStart = section.indexOf("\n", open) + 1;
  const close = section.indexOf("```", bodyStart);
  if (close < 0) throw new Error("unterminated fenced pathspec block");
  return section
    .slice(bodyStart, close)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * Every delivered copy of the contract, discovered from the dist tree rather
 * than listed — a harness added later is covered without editing this file.
 */
function deliveredContracts(): string[] {
  const dist = join(REPO_ROOT, "dist");
  if (!existsSync(dist)) return [];
  const found: string[] = [];
  for (const harness of readdirSync(dist)) {
    const harnessRoot = join(dist, harness);
    if (!statSync(harnessRoot).isDirectory()) continue;
    for (const entry of readdirSync(harnessRoot)) {
      const candidate = join(harnessRoot, entry, CONTRACT_RELATIVE);
      if (existsSync(candidate)) found.push(candidate);
    }
  }
  return found.sort();
}

describe("t2415 the contract declares the exclusion classes (FR-EXC-1)", () => {
  test("names every declared class verbatim, in one fenced block", () => {
    expect(declaredPathspecs(source())).toEqual([...RE_SCAN_EXCLUDED_PATHSPECS]);
  });

  test("says what the exclusion is for and where it applies", () => {
    const section = exclusionSection(source());
    expect(section).toContain("differential");
    expect(section).toContain("diff input");
  });

  // A reader who copies the bare form gets an exclusion that reports success
  // and removes nothing, so the warning has to travel with the pathspecs.
  test("warns that the bare pathspec form is a silent no-op (FR-EXC-5)", () => {
    const section = exclusionSection(source());
    expect(section).toContain("`amadeus/spaces/*/intents/`");
    expect(section).toContain("matches nothing, excludes nothing");
  });
});

describe("t2415 the contract keeps specifications in scope (FR-EXC-2)", () => {
  test("names specs/ as explicitly NOT excluded", () => {
    const section = exclusionSection(source());
    expect(section).toContain("amadeus/spaces/*/specs/");
    expect(section).toContain("specs/rfc/");
    expect(section).toContain("code knowledge");
    expect(section).toContain("amadeus/spaces/**");
  });

  // Excluding codekb from the DIFF INPUT must not be read as "do not read
  // codekb": the base point is still resolved by reading re-scans/.
  test("separates base-point resolution from the diff input", () => {
    const section = exclusionSection(source());
    expect(section).toContain("re-scans/");
    expect(section).toContain("not diff input");
  });
});

describe("t2415 the contract closes the citation channel (FR-EXC-3, ADR-3)", () => {
  test("forbids NEW citations of workflow process records, keeping existing ones as history", () => {
    const section = exclusionSection(source());
    expect(section).toContain("Never cite a workflow process record");
    expect(section).toContain("does not already cite");
    expect(section).toContain("stay as history");
    expect(section).toContain("issue-evidence.md");
  });
});

describe("t2415 the contract carries the reduction measurement (FR-MEAS-2)", () => {
  test("gives the command, the first measurement and its ref", () => {
    const section = exclusionSection(source());
    expect(section).toContain("git diff --numstat");
    expect(section).toContain("89053172e");
    expect(section).toContain("23d4ae767");
    expect(section).toContain("8023");
    expect(section).toContain("3066");
  });
});

describe("t2415 the delivered contracts do not drift", () => {
  test("at least one harness tree ships the contract", () => {
    expect(deliveredContracts().length).toBeGreaterThan(0);
  });

  test("every delivered copy declares the same pathspecs as the source", () => {
    const expected = [...RE_SCAN_EXCLUDED_PATHSPECS];
    for (const contract of deliveredContracts()) {
      expect({
        contract,
        pathspecs: declaredPathspecs(readFileSync(contract, "utf-8")),
      }).toEqual({ contract, pathspecs: expected });
    }
  });
});
