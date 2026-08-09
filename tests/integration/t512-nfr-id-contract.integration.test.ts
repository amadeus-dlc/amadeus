// covers: protocol:nfr-id-contract
// size: medium
//
// #2684 stage ① — the NFR id contract. FR requirements have carried a stable
// id contract since #2458 (requirements-analysis.md: "Number every functional
// requirement with a stable `FR-` identifier…"); the two NFR stages carried
// none, so the corpus fractured into ~200 id families and half its artifacts
// declare no id at all. Nothing downstream — nfr-design's traceability,
// build-and-test's proportional selection, reviewers checking that an absence
// claim is falsifiable — could address an NFR by name.
//
// Ruling 6 on the issue settled the shape: keep CATEGORY-LOCAL prefixes
// (`SEC-1`, `REL-3`, `NFR-PERF-1` are all valid — an `NFR-` monopoly would
// retro-invalidate 98% of the corpus) and contract only the FORM: where an id
// may be declared, and what an id looks like. The declaration positions are
// the same closed set #2673 established for FR ids, so a later sensor can
// reuse that predicate rather than inventing a second one.
//
// This file pins the contract prose in both stages. It does NOT enforce ids on
// existing artifacts — enforcement is a later stage of #2684 and applies going
// forward only.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const STAGES = join(REPO_ROOT, "packages", "framework", "core", "amadeus-common", "stages", "construction");
const NFR_REQUIREMENTS = join(STAGES, "nfr-requirements.md");
const NFR_DESIGN = join(STAGES, "nfr-design.md");

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

describe("t512 nfr-requirements declares the id contract", () => {
  test("requires a stable identifier and says what it is for", () => {
    const text = read(NFR_REQUIREMENTS);
    expect(text).toContain("Number every non-functional requirement with a stable identifier");
    // The purpose clause is what stops the contract reading as decoration:
    // ids exist so the downstream stages can address a requirement.
    expect(text).toContain("address requirements by these ids");
  });

  test("names the closed set of declaration positions", () => {
    const text = read(NFR_REQUIREMENTS);
    // Same five anchors #2673 fixed for FR ids, so one predicate serves both.
    expect(text).toContain("a heading — `### SEC-1: <title>`");
    expect(text).toContain("a bold list entry — `- **SEC-1**: <title>`");
    expect(text).toContain("a bare bold line — `**SEC-1**: <title>`");
    expect(text).toContain("a plain list entry that reaches a colon — `- SEC-1: <title>`");
    expect(text).toContain("the first cell of a table row — `| SEC-1 | <title> | … |`");
    // A mention outside those positions is a reference, not a declaration —
    // without this the same id counted twice from its cross-references.
    expect(text).toContain("does not declare a new one");
  });

  test("fixes the id shape without mandating an `NFR-` prefix", () => {
    const text = read(NFR_REQUIREMENTS);
    expect(text).toContain("one or more uppercase-letter-led segments joined by `-`");
    expect(text).toContain("ending on a segment that finishes in digits");
    // Ruling 6: category-local prefixes stay valid.
    expect(text).toContain("Category-local prefixes");
    expect(text).toContain("there is no requirement to prefix ids with `NFR-`");
    // The corpus families this must keep accepting, quoted as examples.
    for (const example of ["`SEC-1`", "`REL-3`", "`NFR-PERF-1`", "`U2-SCALE-4`", "`SCL-CP-2`"]) {
      expect(text).toContain(example);
    }
    // A prefix that never reaches digits is a category, not an id.
    expect(text).toContain("is a category name, not a requirement id");
  });
});

describe("t512 nfr-design references upstream ids", () => {
  test("cites the requirement ids verbatim and forbids minting new ones", () => {
    const text = read(NFR_DESIGN);
    expect(text).toContain("Cite the requirement ids verbatim");
    expect(text).toContain("do not renumber, re-prefix, or invent ids");
  });
});
