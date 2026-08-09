// covers: protocol:depth-authority-contract
// size: medium
//
// #2425 depth authority + depth-scaled contracts — the PROSE half of depth
// delivery. t486 pins that the engine emits `directive.depth`; a delivered
// field nobody is told to read is not a channel, and a depth nobody scales
// artifacts by is not a mechanism. This file pins three things:
//
//   1. AUTHORITY IS SINGULAR. stage-protocol.md §8 said "The orchestrator
//      determines appropriate depth based on scope selection" while
//      requirements-analysis.md Step 4 independently re-derived depth from a
//      complexity assessment with no write-back path — two decision systems,
//      one of them floating. The re-derivation is gone; §8 names the engine
//      and the directive field as the single authority.
//   2. THE CONTRACTS SCALE BY IT. The five stages §8 names — requirements-
//      analysis / application-design / functional-design / code-generation /
//      build-and-test — each read `directive.depth` and state what changes at
//      each level. Before this, code-generation.md and build-and-test.md did
//      not contain the word "depth" at all; application-design.md and
//      functional-design.md were added by #2671 (ruling a2 + b2), which also
//      split §8 into a numeric CONTRACT subsection and a qualitative GUIDANCE
//      subsection so the two never mix in one list.
//   3. EVERY CONDUCTOR SURFACE RELAYS IT. Each harness's authored conductor
//      surface (SKILL.md, or commands/amadeus.md for the command-shaped
//      harnesses) tells the conductor to pass the field through rather than
//      re-derive depth. Derived FROM DISK (t181's idiom) so a new harness
//      tree is covered automatically.

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CORE = join(REPO_ROOT, "packages", "framework", "core");
const HARNESS_DIR = join(REPO_ROOT, "packages", "framework", "harness");

const PROTOCOL = join(CORE, "amadeus-common", "protocols", "stage-protocol.md");
const REQUIREMENTS_ANALYSIS = join(CORE, "amadeus-common", "stages", "inception", "requirements-analysis.md");
const CODE_GENERATION = join(CORE, "amadeus-common", "stages", "construction", "code-generation.md");
const BUILD_AND_TEST = join(CORE, "amadeus-common", "stages", "construction", "build-and-test.md");
const APPLICATION_DESIGN = join(CORE, "amadeus-common", "stages", "inception", "application-design.md");
const FUNCTIONAL_DESIGN = join(CORE, "amadeus-common", "stages", "construction", "functional-design.md");
const NFR_REQUIREMENTS = join(CORE, "amadeus-common", "stages", "construction", "nfr-requirements.md");
const NFR_DESIGN = join(CORE, "amadeus-common", "stages", "construction", "nfr-design.md");
const DOCS_INCEPTION = join(REPO_ROOT, "docs", "reference", "04-stages", "inception.md");
const DOCS_INCEPTION_JA = join(REPO_ROOT, "docs", "reference", "04-stages", "inception.ja.md");
const DOCS_STAGE_PROTOCOL = join(REPO_ROOT, "docs", "reference", "04-stage-protocol.md");
const DOCS_STAGE_PROTOCOL_JA = join(REPO_ROOT, "docs", "reference", "04-stage-protocol.ja.md");

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

// ===========================================================================
// 1. The authority is singular: the engine resolves, the directive delivers
// ===========================================================================

describe("t487 depth authority is singular", () => {
  test("stage-protocol §8 names the engine + directive field, not a vague orchestrator", () => {
    const text = read(PROTOCOL);
    // The old wording left "determines" unowned and never mentioned delivery,
    // so a stage could read it as licence to determine depth itself.
    expect(text).not.toContain("The orchestrator determines appropriate depth based on scope selection");
    expect(text).toContain("Depth is resolved by the engine");
    expect(text).toContain("run-stage directive's `depth` field");
    expect(text).toContain("never re-derive depth from complexity");
  });

  test("stage-protocol keeps its pinned §8 / §3 landmarks (t34 / t415 co-tenants)", () => {
    // The §717 edit sits between structures other gates pin by literal. Assert
    // them here too, so a careless rewrite trips in the file that changed them
    // rather than only in a distant contract test.
    const text = read(PROTOCOL);
    expect(text).toContain("## 8. Depth Guidance");
    expect(text).toContain("Depth-aware question generation");
    expect(text).toContain("Minimal | at most 4 per stage");
    expect(text).toContain("Standard | at most 8 per stage");
    expect(text).toContain("Comprehensive | at most 12 per stage");
    expect(text).toContain("`amadeus-state.md` → `**Depth**`");
  });

  test("requirements-analysis confirms the resolved depth instead of re-deriving it", () => {
    const text = read(REQUIREMENTS_ANALYSIS);
    expect(text).not.toContain("Based on complexity assessment");
    expect(text).toContain("### Step 4: Confirm Depth");
    expect(text).toContain("`directive.depth`");
    // The escape hatch must be an ADVISORY, never a self-service override.
    expect(text).toContain("never change depth yourself");
  });

  test("the docs mirror of Step 4 tracks the stage file (both languages)", () => {
    for (const path of [DOCS_INCEPTION, DOCS_INCEPTION_JA]) {
      const text = read(path);
      expect(text).not.toContain("Based on complexity assessment");
      expect(text).toContain("directive.depth");
    }
  });
});

// ===========================================================================
// 2. The contracts scale by it (the participating stages)
// ===========================================================================

describe("t487 stage contracts scale artifact volume by depth", () => {
  test("requirements-analysis states per-depth requirement volume and FR numbering", () => {
    const text = read(REQUIREMENTS_ANALYSIS);
    expect(text).toContain("Depth-scaled volume");
    // Stable FR-n ids are the addressable unit downstream stages and the
    // depth-budget sensor reference.
    expect(text).toContain("`FR-n`");
    // The per-level numbers must agree with §8's Depth-Level Contract rather
    // than starting a second, drifting system.
    expect(text).toContain("5-10 FRs");
    expect(text).toContain("15-30 FRs");
  });

  test("code-generation scales plan + summary volume and keeps depth off test scope", () => {
    const text = read(CODE_GENERATION);
    expect(text).toContain("`directive.depth`");
    expect(text).toContain("Depth-scaled plan volume");
    // Depth and test strategy are separate dials; conflating them would let a
    // Minimal depth silently shrink the test plan the strategy mandates.
    expect(text).toContain("Depth governs artifact PROSE volume only");
  });

  test("§8 separates the numeric contract from the qualitative guidance (#2671 a2)", () => {
    const text = read(PROTOCOL);
    // Two distinct subsections: a MUST-bearing table of counted ceilings, and
    // the shape guidance no sensor measures. The old single "Depth-Level
    // Examples" list mixed both, which is what made the numbers unenforceable.
    expect(text).toContain("### Depth-Level Contract");
    expect(text).toContain("### Depth-Level Guidance");
    expect(text).not.toContain("### Depth-Level Examples");
    const contract = text.split("### Depth-Level Contract")[1]?.split("### Depth-Level Guidance")[0] ?? "";
    expect(contract).toContain("MUST");
    // The counted rows live in the contract half...
    for (const row of ["| Minimal | at most 4 | 5-10 |", "| Standard | at most 8 | 15-30 |", "| Comprehensive | at most 12 | 30+ |"]) {
      expect(contract).toContain(row);
    }
    // ...and the unmeasurable shapes stay out of it.
    for (const qualitative of ["no ADRs needed", "Single component diagram", "Decision trees, state machines"]) {
      expect({ qualitative, inContract: contract.includes(qualitative) }).toEqual({ qualitative, inContract: false });
    }
  });

  test("application-design and functional-design scale their artifacts by depth (#2671 b2)", () => {
    for (const path of [APPLICATION_DESIGN, FUNCTIONAL_DESIGN]) {
      const text = read(path);
      expect({ path, has: text.includes("`directive.depth`") }).toEqual({ path, has: true });
      expect({ path, has: text.includes("Depth-scaled artifact volume") }).toEqual({ path, has: true });
      // All three levels named, so no level silently inherits another's shape.
      for (const level of ["**Minimal**", "**Standard**", "**Comprehensive**"]) {
        expect({ path, level, has: text.includes(level) }).toEqual({ path, level, has: true });
      }
    }
  });

  test("build-and-test scales its instruction and summary artifacts", () => {
    const text = read(BUILD_AND_TEST);
    expect(text).toContain("`directive.depth`");
    // Both artifact-writing steps scale, not just one.
    const occurrences = text.split("Scale to `directive.depth`").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// 2b. #2684 段④ — NFR Requirements / NFR Design join the depth-scaling roster
// ===========================================================================

describe("t487 nfr-requirements and nfr-design scale their artifacts by depth (#2684 段④)", () => {
  test("nfr-requirements and nfr-design read directive.depth and name all three levels", () => {
    for (const path of [NFR_REQUIREMENTS, NFR_DESIGN]) {
      const text = read(path);
      expect({ path, has: text.includes("`directive.depth`") }).toEqual({ path, has: true });
      expect({ path, has: text.includes("Depth-scaled artifact volume") }).toEqual({ path, has: true });
      for (const level of ["**Minimal**", "**Standard**", "**Comprehensive**"]) {
        expect({ path, level, has: text.includes(level) }).toEqual({ path, level, has: true });
      }
      // The volume decision defers to the advisory nfr-budget sensor rather than
      // inventing a second numeric contract outside §8's MUST table.
      expect({ path, has: text.includes("nfr-budget") }).toEqual({ path, has: true });
    }
  });

  test("§8 names seven depth-scaling stages, including NFR Requirements and NFR Design", () => {
    const text = read(PROTOCOL);
    expect(text).toContain(
      "Requirements Analysis, Application Design, Functional Design, NFR Requirements, NFR Design, Code Generation, Build and Test",
    );
    // The old five-stage roster is gone from prose, not just superseded.
    expect(text).not.toContain(
      "Requirements Analysis, Application Design, Functional Design, Code Generation, Build and Test",
    );
  });

  test("§8 Contract table stays numeric-only — no new NFR row (#2684 段④ item 3)", () => {
    const text = read(PROTOCOL);
    const contract = text.split("### Depth-Level Contract")[1]?.split("### Depth-Level Guidance")[0] ?? "";
    // The MUST table itself gets no NFR row: only its three existing rows and
    // header/separator lines start with "|".
    const tableLines = contract.split("\n").filter((line) => line.trim().startsWith("|"));
    expect(tableLines).toHaveLength(5); // header + separator + Minimal/Standard/Comprehensive
    for (const line of tableLines) {
      expect({ line, hasNfr: line.includes("NFR") }).toEqual({ line, hasNfr: false });
    }
  });

  test("docs/reference/04-stage-protocol mirrors the seven-stage roster in both languages", () => {
    const en = read(DOCS_STAGE_PROTOCOL);
    expect(en).toContain(
      "Requirements Analysis, Application Design, Functional Design, NFR Requirements, NFR Design, Code Generation, Build and Test",
    );
    expect(en).not.toContain("Five stages read `directive.depth`");

    const ja = read(DOCS_STAGE_PROTOCOL_JA);
    expect(ja).toContain("Requirements Analysis、Application Design、Functional Design、NFR Requirements、NFR Design、Code Generation、Build and Test");
    expect(ja).not.toContain("ステージは5つです");
  });
});

// ===========================================================================
// 3. Every conductor surface relays the field
// ===========================================================================

/** Each harness's AUTHORED conductor surface, derived from disk: skills/amadeus/
 *  SKILL.md for the skill-shaped harnesses, commands/amadeus.md for the
 *  command-shaped ones (cursor, opencode). Disk-derivation means a new harness
 *  tree is covered automatically instead of escaping a hardcoded list. */
function conductorSurfaces(): string[] {
  const out: string[] = [];
  for (const harness of readdirSync(HARNESS_DIR).sort()) {
    for (const rel of [join("skills", "amadeus", "SKILL.md"), join("commands", "amadeus.md")]) {
      const p = join(HARNESS_DIR, harness, rel);
      if (existsSync(p)) out.push(p);
    }
  }
  return out;
}

describe("t487 conductor surfaces relay directive.depth", () => {
  test("the disk-derived surface set is non-vacuous", () => {
    // Floor guard (t181 idiom): a detection that silently matched zero trees
    // would make the scan below pass without reading anything.
    expect(conductorSurfaces().length).toBeGreaterThanOrEqual(8);
  });

  test("every surface tells the conductor to pass depth through, not re-derive it", () => {
    for (const path of conductorSurfaces()) {
      const text = read(path);
      expect({ path, has: text.includes("`directive.depth`") }).toEqual({ path, has: true });
      expect({ path, has: text.includes("instead of re-deriving depth") }).toEqual({ path, has: true });
    }
  });
});
