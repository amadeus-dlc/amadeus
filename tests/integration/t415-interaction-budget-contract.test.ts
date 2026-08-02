// covers: protocol:interaction-budget-contract, protocol:review-finding-severity
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CORE = join(REPO_ROOT, "packages/framework/core");
const PROTOCOL = read("amadeus-common/protocols/stage-protocol.md");

function read(relativePath: string): string {
  return readFileSync(join(CORE, relativePath), "utf8");
}

function compact(content: string): string {
  return content.replace(/\s+/g, " ");
}

describe("#1999 bounded interaction and completion contracts", () => {
  test("defines finite primary and follow-up question budgets", () => {
    expect(PROTOCOL).toContain("Minimal | at most 4 per stage");
    expect(PROTOCOL).toContain("Standard | at most 8 per stage");
    expect(PROTOCOL).toContain("Comprehensive | at most 12 per stage");
    expect(compact(PROTOCOL)).toContain("one consolidated follow-up round for the stage");
    expect(PROTOCOL).toContain("Primary and follow-up questions share this single total budget");
    expect(PROTOCOL).toContain("only the slots remaining");
    expect(PROTOCOL).not.toContain("8-12+");
    expect(PROTOCOL).not.toContain("These are guidelines, not hard caps");

    const grilling = read("amadeus-common/protocols/grilling-protocol.md");
    expect(grilling).toContain("Do not offer continuation beyond the total ceiling");
    expect(grilling).toContain("proceed directly to C-4");
    expect(grilling).toContain("including estimate confirmations");
    expect(grilling).not.toContain('label: "Continue"');
  });

  test("limits follow-ups to material ambiguity and records reversible defaults", () => {
    expect(PROTOCOL).toContain("An ambiguity is **material** only when");
    expect(PROTOCOL).toContain("an external contract, or data safety");
    expect(PROTOCOL).toContain("irreversible or high risk");
    expect(PROTOCOL).toContain("adopt the recommended value and record the assumption");
    expect(PROTOCOL).toContain("carry it to the existing approval boundary");
    expect(PROTOCOL).toContain("Treat the contradiction as material ambiguity");
  });

  test("centralizes ambiguity handling instead of stage-local unbounded loops", () => {
    const stages = [
      "amadeus-common/stages/inception/requirements-analysis.md",
      "amadeus-common/stages/inception/units-generation.md",
      "amadeus-common/stages/inception/user-stories.md",
      "amadeus-common/stages/inception/application-design.md",
      "amadeus-common/stages/construction/functional-design.md",
      "amadeus-common/stages/construction/nfr-requirements.md",
      "amadeus-common/stages/construction/nfr-design.md",
      "amadeus-common/stages/construction/infrastructure-design.md",
    ];

    for (const stage of stages) {
      const content = read(stage);
      expect(content, stage).toContain("stage-protocol.md §3");
      expect(content, stage).not.toContain("If ANY ambiguity");
      expect(content, stage).not.toContain("Resolve all ambiguities before proceeding");
    }
  });

  test("uses one closed finding vocabulary for every reviewer and worker", () => {
    expect(PROTOCOL).toContain("Closed finding severity and verdict contract");
    expect(PROTOCOL).toContain("`READY` means zero unresolved `BLOCKER`");
    expect(PROTOCOL).toContain("unresolved `BLOCKER` findings only");
    expect(PROTOCOL).toContain("aggregate `FOLLOW-UP` entries");
    expect(PROTOCOL).toContain("omit `NIT` entries from user-facing status");

    for (const reviewer of [
      "knowledge/amadeus-architecture-reviewer-agent/reviewing.md",
      "knowledge/amadeus-product-lead-agent/reviewing.md",
    ]) {
      const content = read(reviewer);
      expect(content, reviewer).toContain("| `BLOCKER` |");
      expect(content, reviewer).toContain("| `FOLLOW-UP` |");
      expect(content, reviewer).toContain("| `NIT` |");
      expect(content, reviewer).toContain("zero unresolved `BLOCKER`");
    }
  });

  test("makes evidence optionality normal and improvement-only review non-blocking", () => {
    const persona = read("agents/amadeus-architecture-reviewer-agent.md");
    const thermo = read(
      "knowledge/amadeus-architecture-reviewer-agent/thermo-nuclear-code-quality-review.md",
    );

    expect(persona).toContain("Finding none is a valid result");
    expect(persona).not.toContain("They always exist. Find them");
    expect(compact(thermo)).toContain(
      "The possibility of a cleaner design is never a `BLOCKER`",
    );
    expect(thermo).toContain("Treat these as `FOLLOW-UP`");
    expect(thermo).not.toContain("presumptive blockers");
  });

  test("uses requirement and risk based test selection without fixed lower counts", () => {
    const guidance = [
      PROTOCOL,
      read("amadeus-common/stages/construction/code-generation.md"),
      read("amadeus-common/stages/construction/build-and-test.md"),
      read("knowledge/amadeus-quality-agent/testing-guide.md"),
    ].join("\n");
    const construction = read("memory/phases/construction.md");

    expect(guidance).toContain("planning ceiling, not a quota");
    expect(guidance).not.toContain("5-8 tests per component");
    expect(guidance).not.toContain("10-15 tests per component");
    expect(guidance).not.toContain("~5-15 tests total");
    expect(guidance).toContain("performance and security tests when required");
    expect(construction).toContain("active test strategy as the sole volume");
    expect(construction).toContain("applicable NFR evidence");
    expect(construction).not.toContain("at least two error/edge cases");
  });

  test("projects the same closed completion checklist to every harness", () => {
    const harnessFiles = [
      "packages/framework/harness/claude/skills/amadeus/SKILL.md",
      "packages/framework/harness/codex/skills/amadeus/SKILL.md",
      "packages/framework/harness/kimi/skills/amadeus/SKILL.md",
      "packages/framework/harness/kiro/skills/amadeus/SKILL.md",
      "packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md",
      "packages/framework/harness/cursor/commands/amadeus.md",
      "packages/framework/harness/opencode/commands/amadeus.md",
    ];

    expect(PROTOCOL).toContain("Closed stage-completion verification");
    expect(PROTOCOL).toContain("do not start another exploratory review");
    for (const relativePath of harnessFiles) {
      const content = readFileSync(join(REPO_ROOT, relativePath), "utf8");
      expect(content, relativePath).toContain("closed");
      expect(content, relativePath).toContain("completion verification");
      expect(content, relativePath).toContain("stage incomplete");
    }

    for (const relativePath of harnessFiles.slice(0, 5)) {
      const content = readFileSync(join(REPO_ROOT, relativePath), "utf8");
      expect(content, relativePath).toContain(
        "artifact + unresolved `BLOCKER` findings only",
      );
      expect(content, relativePath).not.toContain("send artifact + findings back");
      expect(content, relativePath).toContain("Only validated READY may proceed");
    }
  });
});
