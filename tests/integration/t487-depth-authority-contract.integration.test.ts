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
//   2. THE CONTRACTS SCALE BY IT. requirements-analysis / code-generation /
//      build-and-test each read `directive.depth` and state what changes at
//      each level. Before this, code-generation.md and build-and-test.md did
//      not contain the word "depth" at all.
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
const DOCS_INCEPTION = join(REPO_ROOT, "docs", "reference", "04-stages", "inception.md");
const DOCS_INCEPTION_JA = join(REPO_ROOT, "docs", "reference", "04-stages", "inception.ja.md");

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
    // The per-level numbers must agree with §8's Depth-Level Examples rather
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

  test("build-and-test scales its instruction and summary artifacts", () => {
    const text = read(BUILD_AND_TEST);
    expect(text).toContain("`directive.depth`");
    // Both artifact-writing steps scale, not just one.
    const occurrences = text.split("Scale to `directive.depth`").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
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
