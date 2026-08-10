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

function readRepo(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
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

    // Grilling terminates on frontier coverage (#2785), so its bound is the
    // disclosed circuit breaker rather than a total question ceiling. The
    // ceilings above stay in force for every other interaction mode.
    expect(PROTOCOL).not.toContain("hybrid termination");

    const grilling = read("amadeus-common/protocols/grilling-protocol.md");
    expect(compact(grilling)).toContain("The session is done when the frontier is empty");
    expect(grilling).toContain("Termination is coverage, not counting");
    expect(compact(grilling)).toContain("Minimal 12, Standard 24, Comprehensive 36");
    expect(compact(grilling)).toContain("Proceed directly to C-4");
    expect(compact(grilling)).toContain("including estimate confirmations");
    expect(compact(grilling)).toContain("defaults to Free when none is requested");
    expect(compact(grilling)).toContain("standalone terminal agreement summary");
    expect(grilling).not.toContain('label: "Continue"');
    expect(grilling).not.toContain("Do not offer continuation beyond the total ceiling");

    const standalone = read("skills/amadeus-grilling/SKILL.md");
    expect(compact(standalone)).toContain("Default to Free when the user names no level");
    expect(compact(standalone)).toContain("unresolved material points");
    expect(standalone).not.toContain("default to Standard (8)");
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
    expect(compact(thermo)).toContain(
      "reproducible failure, explicit requirement or contract violation, security/data-safety defect, or demonstrated regression",
    );
    expect(compact(thermo)).toContain(
      "deferred risks without evidence of present failure or requirement violation",
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
    expect(construction).toContain("active test strategy as the default volume");
    expect(construction).toContain("applicable NFR evidence");
    expect(guidance).toContain("other test types when applicable NFRs require them");
    expect(guidance).toContain("safety-critical context or applicable NFRs");
    expect(construction).not.toContain("at least two error/edge cases");
  });

  test("enforces the reviewer read-only boundary on every affected harness", () => {
    for (const persona of [
      "agents/amadeus-architecture-reviewer-agent.md",
      "agents/amadeus-product-lead-agent.md",
    ]) {
      const content = read(persona);
      expect(content, persona).toContain("explicit read-only tool allowlist");
      expect(compact(content), persona).toContain("shell, network, Git, or GitHub");
    }

    for (const harness of ["claude", "cursor", "kimi"]) {
      const manifest = readRepo(`packages/framework/harness/${harness}/manifest.ts`);
      expect(manifest, harness).toContain("tools: [Read, Grep, Glob]");
      for (const reviewer of ["amadeus-architecture-reviewer-agent", "amadeus-product-lead-agent"]) {
        const profile = readRepo(`dist/${harness}/.${harness === "kimi" ? "kimi-code" : harness}/agents/${reviewer}.md`);
        expect(profile, `${harness}/${reviewer}`).toContain("tools: [Read, Grep, Glob]");
      }
    }

    const codexEmitter = readRepo("packages/framework/harness/codex/emit.ts");
    expect(codexEmitter).toContain("amadeus-product-lead-agent");
    expect(codexEmitter).toContain('sandbox_mode = "read-only"');
    for (const reviewer of ["amadeus-architecture-reviewer-agent", "amadeus-product-lead-agent"]) {
      const profile = readRepo(`dist/codex/.codex/agents/${reviewer}.toml`);
      expect(profile, `codex/${reviewer}`).toContain('sandbox_mode = "read-only"');
    }

    for (const harness of ["kiro", "kiro-ide"]) {
      for (const reviewer of ["amadeus-architecture-reviewer-agent", "amadeus-product-lead-agent"]) {
        const profile = JSON.parse(
          readRepo(`packages/framework/harness/${harness}/agents/${reviewer}.json`),
        ) as { tools: string[]; allowedTools: string[] };
        expect(profile.tools, `${harness}/${reviewer}`).toEqual(["fs_read", "thinking"]);
        expect(profile.allowedTools, `${harness}/${reviewer}`).toEqual(["fs_read", "thinking"]);
        const generated = JSON.parse(
          readRepo(`dist/${harness}/.kiro/agents/${reviewer}.json`),
        ) as { tools: string[]; allowedTools: string[] };
        expect(generated.tools, `dist/${harness}/${reviewer}`).toEqual(["fs_read", "thinking"]);
        expect(generated.allowedTools, `dist/${harness}/${reviewer}`).toEqual(["fs_read", "thinking"]);
      }
    }

    const kiroIdeManifest = readRepo("packages/framework/harness/kiro-ide/manifest.ts");
    expect(kiroIdeManifest).toContain('tools: ["read"]');
    expect(kiroIdeManifest).not.toContain(
      'amadeus-product-lead-agent.md", lines: [`tools: ["read", "write", "shell"]`]',
    );

    const affectedHarnessInstructions = [
      "packages/framework/harness/claude/skills/amadeus/SKILL.md",
      "packages/framework/harness/codex/skills/amadeus/SKILL.md",
      "packages/framework/harness/cursor/commands/amadeus.md",
      "packages/framework/harness/kimi/skills/amadeus/SKILL.md",
      "packages/framework/harness/kiro/skills/amadeus/SKILL.md",
      "packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md",
    ];
    for (const path of affectedHarnessInstructions) {
      const content = compact(readRepo(path));
      expect(content, path).toContain("explicit read-only allowlist");
      expect(content, path).toContain("file-write, shell, network, Git, or GitHub");
    }
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
      expect(compact(content), relativePath).toContain("no trustworthy verdict or findings");
      expect(compact(content), relativePath).toContain("validated `NOT-READY`");
    }

    expect(PROTOCOL).toContain("establishes no trustworthy verdict or");
    expect(PROTOCOL).toContain("never present the unvalidated reviewer output");

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
