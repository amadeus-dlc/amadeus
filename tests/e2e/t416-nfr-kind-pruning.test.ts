// covers: subcommand:amadeus-orchestrate:next, subcommand:amadeus-state:advance,
//         function:requiredArtifactsForUnit
// size: large

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

function artifactNames(paths: unknown): string[] {
  if (!Array.isArray(paths)) throw new Error("directive paths are not an array");
  return paths.map((path) => String(path).split("/").at(-1)!.replace(/\.md$/, ""));
}

function runTool(
  project: string,
  tool: "amadeus-orchestrate.ts" | "amadeus-state.ts",
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const host = join(project, ".codex");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    AMADEUS_STAGE_GRAPH: join(host, "tools", "data", "stage-graph.json"),
    AMADEUS_SCOPE_GRID: join(host, "tools", "data", "scope-grid.json"),
    AMADEUS_RULES_DIR: join(project, "amadeus", "spaces", "default", "memory"),
    AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
    CLAUDE_PROJECT_DIR: project,
  };
  delete env.AMADEUS_DEFAULT_SCOPE;
  delete env.AMADEUS_SKIP_ARTIFACT_GUARD;
  const result = spawnSync(process.execPath, [join(host, "tools", tool), ...args], {
    cwd: project,
    encoding: "utf-8",
    env,
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function writeArtifacts(
  project: string,
  stage: string,
  artifacts: string[],
): void {
  const dir = join(seededRecordDir(project), "construction", "shared", stage);
  mkdirSync(dir, { recursive: true });
  for (const artifact of artifacts) {
    writeFileSync(join(dir, `${artifact}.md`), `# ${artifact}\n`, "utf-8");
  }
}

// #2529 refuses to complete a stage whose unit produced artifacts with no
// reviewer verdict on them, so a fixture modelling a *reviewed* unit has to
// carry one — writing the artifacts alone models the parked-mid-unit state the
// gate exists to catch, not the reviewed one this slice is about.
function writeReview(project: string, stage: string, artifact: string): void {
  const path = join(seededRecordDir(project), "construction", "shared", stage, `${artifact}.md`);
  writeFileSync(
    path,
    `${readFileSync(path, "utf-8")}\n## Review — Iteration 1\n\n` +
      "- **Verdict:** READY\n" +
      "- **Reviewer:** amadeus-architecture-reviewer-agent\n" +
      "- **Date:** 2026-08-08T00:00:00Z\n" +
      "- **Iteration:** 1\n- **Scope decision:** none\n",
    "utf-8",
  );
}

describe("t416 NFR kind pruning packaged workflow slice (e2e)", () => {
  test("a library advances through both NFR stages with only applicable outputs and inputs", () => {
    const project = createTestProject();
    try {
      cpSync(join(REPO_ROOT, "dist", "codex", ".codex"), join(project, ".codex"), {
        recursive: true,
      });
      // The projection above ships hooks.json.example but no active hooks.json,
      // and `next` refuses on a Codex projection whose hooks are inactive
      // (#2703) — a refusal this fixture only escapes on a machine where the
      // ambient environment makes detectHarnessType() read as some other
      // harness, which is why this file was green locally and red on CI.
      // Equivalent to `amadeus-codex-hooks.ts activate` on a fresh project:
      // activateCodexHooks copies the same canonical example into place.
      copyFileSync(
        join(project, ".codex", "hooks.json.example"),
        join(project, ".codex", "hooks.json"),
      );
      mkdirSync(join(project, "amadeus", "spaces", "default", "memory"), {
        recursive: true,
      });

      writeFileSync(
        seededStateFile(project),
        `# AI-DLC State Tracking

## Project Information
- **Project**: packaged NFR kind pruning
- **Project Type**: Brownfield
- **Scope**: fix
- **State Version**: 7
- **Skeleton Stance**: scope-dependent
- **Construction Autonomy Mode**: autonomous

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Comprehensive

## Stage Progress

### CONSTRUCTION PHASE
- [x] functional-design — EXECUTE
- [-] nfr-requirements — EXECUTE
- [ ] nfr-design — EXECUTE
- [ ] infrastructure-design — EXECUTE
- [ ] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: nfr-requirements
- **Status**: Running
`,
        "utf-8",
      );
      writeFileSync(
        join(seededRecordDir(project), "runtime-graph.json"),
        `${JSON.stringify(
          {
            bolt_dag: {
              units: [{ name: "shared", kind: "library", depends_on: [] }],
              batches: [["shared"]],
            },
          },
          null,
          2,
        )}\n`,
        "utf-8",
      );
      const unitsDir = join(seededRecordDir(project), "inception", "units-generation");
      mkdirSync(unitsDir, { recursive: true });
      writeFileSync(
        join(unitsDir, "unit-of-work-dependency.md"),
        `# Unit dependencies

\`\`\`yaml
units:
  - name: shared
    kind: library
    depends_on: []
\`\`\`
`,
        "utf-8",
      );
      writeArtifacts(project, "functional-design", ["business-logic-model"]);

      const requirements = runTool(project, "amadeus-orchestrate.ts", [
        "next",
        "--project-dir",
        project,
      ]);
      expect(requirements.status, requirements.stderr).toBe(0);
      const requirementsDirective = JSON.parse(requirements.stdout.trim());
      expect(requirementsDirective.unit).toBe("shared");
      expect(artifactNames(requirementsDirective.produces)).toEqual([
        "security-requirements",
        "tech-stack-decisions",
      ]);

      writeArtifacts(project, "nfr-requirements", [
        "security-requirements",
        "tech-stack-decisions",
      ]);
      writeReview(project, "nfr-requirements", "security-requirements");
      const advanceRequirements = runTool(project, "amadeus-state.ts", [
        "advance",
        "nfr-requirements",
      ]);
      expect(
        advanceRequirements.status,
        `${advanceRequirements.stdout}\n${advanceRequirements.stderr}`,
      ).toBe(0);

      const design = runTool(project, "amadeus-orchestrate.ts", [
        "next",
        "--project-dir",
        project,
      ]);
      expect(design.status, design.stderr).toBe(0);
      const designDirective = JSON.parse(design.stdout.trim());
      expect(designDirective.stage).toBe("nfr-design");
      expect(designDirective.unit).toBe("shared");
      expect(artifactNames(designDirective.produces)).toEqual([
        "security-design",
        "logical-components",
      ]);
      expect(artifactNames(designDirective.consumes)).toEqual([
        "security-requirements",
        "tech-stack-decisions",
        "business-logic-model",
      ]);

      writeArtifacts(project, "nfr-design", ["security-design", "logical-components"]);
      writeReview(project, "nfr-design", "security-design");
      const advanceDesign = runTool(project, "amadeus-state.ts", [
        "advance",
        "nfr-design",
      ]);
      expect(
        advanceDesign.status,
        `${advanceDesign.stdout}\n${advanceDesign.stderr}`,
      ).toBe(0);
      expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
        "- [x] nfr-design — EXECUTE",
      );
    } finally {
      cleanupTestProject(project);
    }
  }, scaleTestTime(120_000));
});
