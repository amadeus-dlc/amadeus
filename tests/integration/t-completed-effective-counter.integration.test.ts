// covers: subcommand:amadeus-state:checkbox, function:rebuildDerivedPlanFields

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { approvalNextStateIssue } from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
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

let projectDir = "";

afterEach(() => {
  resetAidlcEnv();
  cleanupTestProject(projectDir);
  projectDir = "";
});

function statePath(): string {
  return seededStateFile(projectDir);
}

describe("Completed canonical counter", () => {
  test("checkbox excludes a completed SKIP-effective row", () => {
    projectDir = createTestProject();
    seedStateFile(projectDir, MID_IDEATION);
    const path = statePath();
    writeFileSync(
      path,
      readFileSync(path, "utf-8").replace(
        "- [-] feasibility — EXECUTE",
        "- [-] feasibility — SKIP",
      ),
      "utf-8",
    );

    const result = spawnSync(
      process.execPath,
      [TOOL, "checkbox", "feasibility=completed", "--project-dir", projectDir],
      { encoding: "utf-8", env: { ...process.env } },
    );

    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    const state = readFileSync(path, "utf-8");
    const completed = /^- \*\*Completed\*\*: (\d+)$/m.exec(state)?.[1];
    const completedExecute = [...state.matchAll(/^- \[x\] \S+ — EXECUTE(?: .*)?$/gm)].length;
    expect(completed).toBe(String(completedExecute));
    expect(JSON.parse(result.stdout).completed_count).toBe(completedExecute);
  });

  test("approval validation rejects a counter that differs from the shared writer", () => {
    const timestamp = "2026-08-04T00:00:00Z";
    const content = readFileSync(MID_IDEATION, "utf-8")
      .replace("- [-] feasibility — EXECUTE", "- [x] feasibility — EXECUTE")
      .replace(/^- \*\*Completed\*\*: \d+$/m, "- **Completed**: 999")
      .replace(/^- \*\*Last Completed Stage\*\*: .*$/m, "- **Last Completed Stage**: feasibility")
      .replace(/^- \*\*Last Updated\*\*: .*$/m, `- **Last Updated**: ${timestamp}`);

    expect(approvalNextStateIssue(content, "feasibility", timestamp, null)).toBe(
      "completed count",
    );
  });
});
