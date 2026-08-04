// covers: subcommand:amadeus-state:checkbox, subcommand:amadeus-state:advance, subcommand:amadeus-state:finalize, subcommand:amadeus-state:complete-workflow, subcommand:amadeus-state:approve, subcommand:amadeus-jump:execute, function:rebuildDerivedPlanFields

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getField,
  rebuildCompletedFieldFromState,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedAuditFile,
  seedGoalReceiptForFinalStage,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const TOOL = join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "amadeus-state.ts",
);
const MID_IDEATION = join(FIXTURES_DIR, "state-mid-ideation.md");
const FINAL_CONSTRUCTION = join(FIXTURES_DIR, "state-fix-final-construction.md");
const JUMP = join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "amadeus-jump.ts",
);

process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";

let projectDir = "";

afterEach(() => {
  resetAidlcEnv();
  cleanupTestProject(projectDir);
  projectDir = "";
});

function statePath(): string {
  return seededStateFile(projectDir);
}

function rawCompletedCount(content: string): number {
  return (content.match(/^- \[x\]/gm) ?? []).length;
}

function canonicalCompletedCount(content: string): number {
  return (content.match(/^- \[x\] \S+ — EXECUTE(?: .*)?$/gm) ?? []).length;
}

function completedField(content: string): number {
  return Number.parseInt(/^- \*\*Completed\*\*: (\d+)$/m.exec(content)?.[1] ?? "-1", 10);
}

/** Legacy persisted shape: one historical completion is now SKIP-effective,
 * while Completed still equals the raw number of [x] rows. */
function withLegacyRawCompletedSkip(content: string, slug = "workspace-scaffold"): string {
  const row = new RegExp(`^- \\[[ xSR?-]\\] ${slug} — (?:EXECUTE|SKIP)(.*)$`, "m");
  const changed = content.replace(row, `- [x] ${slug} — SKIP$1`);
  if (changed === content) throw new Error(`fixture has no Stage Progress row for ${slug}`);
  return changed.replace(
    /^- \*\*Completed\*\*: \d+$/m,
    `- **Completed**: ${rawCompletedCount(changed)}`,
  );
}

function seedLegacyState(fixture: string): void {
  projectDir = createTestProject();
  seedStateFile(projectDir, fixture);
  writeFileSync(
    statePath(),
    withLegacyRawCompletedSkip(readFileSync(statePath(), "utf-8")),
    "utf-8",
  );
}

function expectCanonicalState(stdout = ""): void {
  const state = readFileSync(statePath(), "utf-8");
  expect(completedField(state)).toBe(canonicalCompletedCount(state));
  expect(completedField(state)).toBeLessThan(rawCompletedCount(state));
  if (stdout !== "") {
    expect(JSON.parse(stdout).completed_count).toBe(canonicalCompletedCount(state));
  }
}

function run(tool: string, args: string[]) {
  return spawnSync(
    process.execPath,
    [tool, ...args, "--project-dir", projectDir],
    { encoding: "utf-8", env: { ...process.env } },
  );
}

const stateTransitionCases: Array<[string, string[]]> = [
  ["advance", ["advance", "feasibility", "scope-definition"]],
  ["finalize", ["finalize", "feasibility"]],
];

describe("Completed canonical counter", () => {
  test("checkbox excludes a completed SKIP-effective row", () => {
    seedLegacyState(MID_IDEATION);
    const path = statePath();
    const result = run(TOOL, ["checkbox", "feasibility=completed"]);

    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expect(readFileSync(path, "utf-8")).toContain("[x] feasibility");
    expectCanonicalState(result.stdout);
  });

  test.each(stateTransitionCases)("%s excludes a completed SKIP-effective row", (_name, args) => {
    seedLegacyState(MID_IDEATION);
    const result = run(TOOL, args);
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expectCanonicalState(result.stdout);
  });

  test("workflow completion excludes a completed SKIP-effective row", () => {
    seedLegacyState(FINAL_CONSTRUCTION);
    seedGoalReceiptForFinalStage(projectDir, "build-and-test");
    const result = run(TOOL, ["complete-workflow", "build-and-test"]);
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expectCanonicalState(result.stdout);
  });

  test("approve excludes a completed SKIP-effective row", () => {
    seedLegacyState(MID_IDEATION);
    seedAuditFile(projectDir);
    expect(run(TOOL, ["gate-start", "feasibility"]).status).toBe(0);
    const result = run(TOOL, ["approve", "feasibility"]);
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expectCanonicalState();
  });

  test("jump excludes a completed SKIP-effective row", () => {
    seedLegacyState(MID_IDEATION);
    seedAuditFile(projectDir);
    const result = run(JUMP, [
      "execute",
      "--target",
      "scope-definition",
      "--direction",
      "forward",
    ]);
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expectCanonicalState(result.stdout);
  });

  test("approval validation rejects a counter that differs from the shared writer", () => {
    const timestamp = "2026-08-04T00:00:00Z";
    const content = withLegacyRawCompletedSkip(
      readFileSync(MID_IDEATION, "utf-8")
        .replace("- [-] feasibility — EXECUTE", "- [x] feasibility — EXECUTE")
        .replace(/^- \*\*Last Completed Stage\*\*: .*$/m, "- **Last Completed Stage**: feasibility")
        .replace(/^- \*\*Last Updated\*\*: .*$/m, `- **Last Updated**: ${timestamp}`),
    );

    // The former raw validator sees an internally consistent raw count and
    // would return null; the canonical validator must reject the same state.
    expect(completedField(content)).toBe(rawCompletedCount(content));
    expect(completedField(content)).not.toBe(canonicalCompletedCount(content));
    expect(content).toMatch(/^- \[x\] feasibility — EXECUTE/m);
    expect(getField(content, "Last Completed Stage")).toBe("feasibility");
    expect(getField(content, "Last Updated")).toBe(timestamp);

    const legacyIssue = getField(content, "Completed") === String(rawCompletedCount(content))
      ? null
      : "completed count";
    const canonical = rebuildCompletedFieldFromState(content).content;
    const canonicalIssue = getField(content, "Completed") === getField(canonical, "Completed")
      ? null
      : "completed count";
    expect(legacyIssue).toBeNull();
    expect(canonicalIssue).toBe("completed count");
  });
});
