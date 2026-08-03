// covers: function:skipStageContent, function:handleSkip, function:mergeScopedCheckboxProgress
// size: medium
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  handleCheckbox,
  handleSkip,
  mergeScopedCheckboxProgress,
  skipStageContent,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededRecordDir,
  seedStateFile,
} from "../harness/fixtures.ts";
import { useRealScopeData } from "../harness/real-scope-data.ts";

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureExit(action: () => void): { code: number | null; stderr: string } {
  const originalExit = process.exit;
  const originalError = console.error;
  let code: number | null = null;
  let stderr = "";
  process.exit = ((value?: number) => {
    throw new ExitSignal(value ?? 0);
  }) as typeof process.exit;
  console.error = (...args: unknown[]) => {
    stderr += args.map(String).join(" ");
  };
  try {
    action();
  } catch (error) {
    if (error instanceof ExitSignal) code = error.code;
    else throw error;
  } finally {
    process.exit = originalExit;
    console.error = originalError;
  }
  return { code, stderr };
}

describe("state text mutation in-process seams", () => {
  let project: string;
  let content: string;

  beforeAll(() => {
    project = createTestProject();
    seedStateFile(project, "state-construction-bolt1.md");
    content = readFileSync(join(seededRecordDir(project), "amadeus-state.md"), "utf8");
  });

  afterAll(() => cleanupTestProject(project));

  test("skip mutates only the validated target", () => {
    expect(skipStageContent(content, "functional-design"))
      .toContain("- [S] functional-design — EXECUTE");
  });

  test("skip handler drives the validated mutation call site", () => {
    const restoreScopeData = useRealScopeData();
    const originalLog = console.log;
    console.log = () => {};
    try {
      handleSkip(["functional-design", "--reason", "not needed"], project);
    } finally {
      console.log = originalLog;
      restoreScopeData();
    }
    expect(readFileSync(join(seededRecordDir(project), "amadeus-state.md"), "utf8"))
      .toContain("- [S] functional-design — EXECUTE");
  });

  test("checkbox handler rejects an unknown stage before mutation", () => {
    const statePath = join(seededRecordDir(project), "amadeus-state.md");
    const before = readFileSync(statePath, "utf8");
    const previousProjectDir = process.env.CLAUDE_PROJECT_DIR;
    const restoreScopeData = useRealScopeData();
    process.env.CLAUDE_PROJECT_DIR = project;
    let result: ReturnType<typeof captureExit>;
    try {
      result = captureExit(() => handleCheckbox(["missing-stage=completed"]));
    } finally {
      restoreScopeData();
      if (previousProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = previousProjectDir;
    }
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("reason=target-not-found");
    expect(readFileSync(statePath, "utf8")).toBe(before);
  });

  test("scoped merge applies the winner and records a loser deferral", () => {
    const advanced = content.replace(
      "- [ ] functional-design — EXECUTE",
      "- [x] functional-design — EXECUTE",
    );
    expect(advanced).not.toBe(content);
    const winner = mergeScopedCheckboxProgress(
      content,
      advanced,
      ["functional-design", "z-bolt"],
      "functional-design",
    );
    expect(winner.merged).toContain("- [x] functional-design — EXECUTE");
    expect(winner.conflictResolution).toContain(
      "functional-design:slug-precedence:functional-design",
    );

    const loser = mergeScopedCheckboxProgress(
      content,
      advanced,
      ["a-bolt", "functional-design"],
      "functional-design",
    );
    expect(loser.merged).toBe(content);
    expect(loser.conflictResolution).toContain("functional-design:deferred-to:a-bolt");

    const missingUnit = advanced.replace("Per unit: widget-cart", "Per unit: missing-unit");
    expect(missingUnit).not.toBe(advanced);
    expect(mergeScopedCheckboxProgress(
      content,
      missingUnit,
      ["functional-design"],
      "functional-design",
    ).merged).toBe(content);
  });
});
