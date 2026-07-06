// covers: file:skills, contract:grilling-distribution
//
// t199 — distribution + contract guard for Amadeus Grilling (the "Grill me"
// interaction mode + the /amadeus-grilling read-only session skill), added in
// v1.1.0. Mechanism: none — pure readFileSync/existsSync over the committed
// dist trees; zero spawn, zero LLM, zero tokens.
//
// WHAT IS UNDER TEST (BR-P2/P3, FR-1.1, FR-2.1, FR-4.1 of the grilling intent):
//   1. The amadeus-grilling skill ships in all FOUR harness dists. The codex
//      path differs by design: claude/kiro/kiro-ide receive the skill via their
//      manifest coreDirs rows (dist/<h>/<dir>/skills/amadeus-grilling/), while
//      codex receives it via harness/codex/emit.ts's session-skill array
//      (dist/codex/.agents/skills/amadeus-grilling/ — a manifest row would NOT
//      be discovered by codex's emit()-synthesised skills tree).
//   2. grilling-protocol.md — the single source of the grilling discipline —
//      ships in every dist's amadeus-common/protocols/.
//   3. stage-protocol.md's Step 2 mode-selection block carries the fourth
//      "Grill me" option (workflow entry, FR-1.1).
//   4. The skill's frontmatter declares `classification: read-only` (FR-2.1 —
//      never advances the stage pointer, never emits audit events).
//   5. MIT attribution: the protocol file's header names the original repo URL
//      and the MIT license (FR-4.1 acceptance criterion), and the skill links
//      back to it.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

// Harness dist → engine-dir. Codex's skills live under .agents/skills (emit.ts),
// not under the engine dir like the manifest-driven harnesses.
const SKILL_MD_PATHS: Array<[string, string]> = [
  ["claude", join("dist", "claude", ".claude", "skills", "amadeus-grilling", "SKILL.md")],
  ["kiro", join("dist", "kiro", ".kiro", "skills", "amadeus-grilling", "SKILL.md")],
  ["kiro-ide", join("dist", "kiro-ide", ".kiro", "skills", "amadeus-grilling", "SKILL.md")],
  ["codex", join("dist", "codex", ".agents", "skills", "amadeus-grilling", "SKILL.md")],
];

const PROTOCOL_PATHS: Array<[string, string]> = [
  ["claude", join("dist", "claude", ".claude", "amadeus-common", "protocols", "grilling-protocol.md")],
  ["kiro", join("dist", "kiro", ".kiro", "amadeus-common", "protocols", "grilling-protocol.md")],
  ["kiro-ide", join("dist", "kiro-ide", ".kiro", "amadeus-common", "protocols", "grilling-protocol.md")],
  ["codex", join("dist", "codex", ".codex", "amadeus-common", "protocols", "grilling-protocol.md")],
];

const STAGE_PROTOCOL = join(
  REPO_ROOT,
  "dist",
  "claude",
  ".claude",
  "amadeus-common",
  "protocols",
  "stage-protocol.md",
);

describe("t199 amadeus-grilling distribution + contract", () => {
  // --- happy path: the skill ships in all four dists (codex via emit.ts) -----
  test.each(SKILL_MD_PATHS)(
    "skill SKILL.md ships in the %s dist",
    (_harness, rel) => {
      expect(existsSync(join(REPO_ROOT, rel))).toBe(true);
    },
  );

  // --- the single-source protocol ships in every dist's amadeus-common ------
  test.each(PROTOCOL_PATHS)(
    "grilling-protocol.md ships in the %s dist",
    (_harness, rel) => {
      expect(existsSync(join(REPO_ROOT, rel))).toBe(true);
    },
  );

  // --- workflow entry: the fourth mode option in stage-protocol Step 2 ------
  test("stage-protocol.md mode-selection block offers 'Grill me'", () => {
    const text = readFileSync(STAGE_PROTOCOL, "utf-8");
    expect(text).toContain("label: Grill me");
    // The workflow wiring (Step 3d) references the single-source protocol
    // instead of re-defining the discipline (BR-P1).
    expect(text).toContain("grilling-protocol.md");
  });

  // --- edge: read-only classification must survive packaging in EVERY dist --
  // (a wrong classification would let the skill advance the stage pointer)
  test.each(SKILL_MD_PATHS)(
    "%s SKILL.md frontmatter declares classification: read-only",
    (_harness, rel) => {
      const text = readFileSync(join(REPO_ROOT, rel), "utf-8");
      const fm = text.split("---")[1] ?? "";
      expect(fm).toContain("classification: read-only");
      expect(fm).toContain("user-invocable: true");
      expect(fm).toContain("name: amadeus-grilling");
    },
  );

  // --- edge: MIT attribution present with URL + license name (FR-4.1) -------
  test.each(PROTOCOL_PATHS)(
    "%s grilling-protocol.md carries the MIT attribution header",
    (_harness, rel) => {
      const text = readFileSync(join(REPO_ROOT, rel), "utf-8");
      expect(text).toContain("MIT License");
      expect(text).toContain("https://github.com/mattpocock/skills");
    },
  );

  test("skill SKILL.md links back to the attributed protocol", () => {
    const [, claudeRel] = SKILL_MD_PATHS[0] as [string, string];
    const text = readFileSync(join(REPO_ROOT, claudeRel), "utf-8");
    expect(text).toContain("grilling-protocol.md");
    expect(text).toContain("MIT");
  });
});
