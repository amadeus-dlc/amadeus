// covers: protocol:interaction-budget-contract, protocol:review-finding-severity
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VALID_DEPTH_VALUES } from "../../packages/framework/core/tools/amadeus-directive.ts";
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

/** The text from a heading to the next heading of the same or shallower level.
 *  Section-scoped rather than whole-file, so a pin that names one enumeration
 *  cannot be satisfied by the same token sitting in a different one. */
function section(content: string, heading: string): string {
  const start = content.indexOf(heading);
  if (start === -1) return "";
  const depth = heading.startsWith("#") ? (heading.match(/^#+/) as RegExpMatchArray)[0].length : 0;
  const rest = content.slice(start + heading.length);
  const next = depth === 0 ? rest.search(/\n\*\*Step |\n#{1,6} /) : rest.search(new RegExp(`\\n#{1,${depth}} `));
  return next === -1 ? rest : rest.slice(0, next);
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

  test("depth is grilling's pruning threshold, and the breaker is its only ceiling", () => {
    // The half of #2785 that the budget pins above cannot state: grilling reads
    // the same depth value as every other mode but spends it on WHICH nodes
    // enter the tree, not on how many questions may be asked. Without these,
    // the file could drift back to a counted mode and the pins above would
    // still pass.
    const grilling = read("amadeus-common/protocols/grilling-protocol.md");
    expect(grilling).toContain("### 2.2 Depth is a materiality threshold");
    expect(grilling).toContain("| Level | Nodes that enter the tree | Circuit breaker (§2.4) |");
    expect(grilling).toContain("| Free *(standalone only)* | No pruning — every branch of the tree | none |");
    expect(compact(grilling)).toContain(
      "Depth decides **which nodes enter the tree**, not how many questions may be asked",
    );
    expect(compact(grilling)).toContain(
      "`Free` never appears on the wire, in state, or on a directive",
    );

    // The breaker is an abort that must announce itself. A silent truncation
    // presented as a finished traversal is the failure this clause exists for.
    expect(compact(grilling)).toContain("disclose that the tree was not fully traversed");
    expect(grilling).toContain("Silent truncation is forbidden");

    // stage-protocol carries the same split, so a stage author reading only
    // §8 does not apply the ceiling to a grilling session.
    expect(compact(PROTOCOL)).toContain(
      "Grill me mode consumes depth as a pruning threshold, not as a question budget",
    );
    expect(compact(PROTOCOL)).toContain("Grill me does not consume `[N]` as a budget");
    expect(compact(PROTOCOL)).toContain("The ceilings above are unchanged");

    // Grilling waits on a person every round, so it is not offered when the
    // Intent is running unattended.
    expect(compact(PROTOCOL)).toContain(
      "While `semi` or `full` Intent autonomy is in force, do NOT include Grill me among the offered options",
    );

    // Free is a grilling level, not a depth. The engine's depth vocabulary is
    // unchanged, and none of the files grilling touches passes Free where a
    // depth value is expected — a fourth value reaching the wire would fail the
    // directive validator at a distance from where it was introduced.
    expect([...VALID_DEPTH_VALUES]).toEqual(["Minimal", "Standard", "Comprehensive"]);
    const depthWireUse = /(?:depth[=:]\s*|--depth\s+)"?Free/i;
    for (const relativePath of [
      "amadeus-common/protocols/grilling-protocol.md",
      "amadeus-common/protocols/stage-protocol.md",
      "skills/amadeus-grilling/SKILL.md",
      "tools/amadeus-sensor-question-budget.ts",
    ]) {
      expect(read(relativePath), relativePath).not.toMatch(depthWireUse);
    }
  });

  test("the three machine-matched grilling tokens are language-neutral markers", () => {
    // The question-budget sensor reads a questions file and matches these three
    // verbatim. All three are HTML comments rather than prose headings because
    // the sensor ships to every project: a heading in one team's record language
    // would be structurally unmatchable in another's, and a shipped check that
    // can never match is worse than no check. The human-visible headings around
    // them stay in whatever language the record is written in.
    const grilling = read("amadeus-common/protocols/grilling-protocol.md");
    expect(grilling).toContain("<!-- amadeus-grilling:v1 mode=grilling -->");
    expect(grilling).toContain(
      "<!-- amadeus-grilling:justification depth=<Depth> questions=<N> frontier-driven -->",
    );
    expect(grilling).toContain("<!-- amadeus-grilling:deferred -->");

    // The deferred section is a QUESTIONS-FILE obligation, not only a terminal
    // one. The sensor reads that file and nothing else, so a section that lives
    // only in the spoken summary is unreachable to it — the write side has to
    // land where the check side looks (symmetric-pair-review).
    expect(compact(grilling)).toContain(
      "append the same section to the questions file",
    );
    // Pruning nothing still writes the section. Without this, every Free or
    // nothing-pruned session would be a false `missing-deferred-list`.
    expect(compact(grilling)).toContain(
      "the marker and the section are written even when nothing was pruned",
    );

    // Both enumerations of what a grilling session writes to the questions file
    // carry it. Amending one and not the other reproduces the same write/check
    // asymmetry in the other list (enumeration-completeness-review).
    const recordingObligations = section(grilling, "### 2.5 Recording obligations");
    expect(recordingObligations).toContain("<!-- amadeus-grilling:deferred -->");
    const questionsFileRow = grilling
      .split("\n")
      .find((line) => line.startsWith("| Questions file |"));
    expect(questionsFileRow).toContain("deferred-node section");

    // stage-protocol names the questions-file obligations twice as well.
    expect(compact(PROTOCOL)).toContain(
      "the deferred-node section carrying the `<!-- amadeus-grilling:deferred -->` marker",
    );
    const step3d = section(PROTOCOL, "**Step 3d: If \"Grill me\" (grilling mode):**");
    expect(step3d).toContain("<!-- amadeus-grilling:deferred -->");
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
