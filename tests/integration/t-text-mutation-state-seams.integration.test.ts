// size: medium
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
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

  test("scoped merge applies the winner and records a loser deferral", () => {
    const advanced = content.replace(
      "- [ ] functional-design — EXECUTE",
      "- [x] functional-design — EXECUTE",
    );
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
    expect(mergeScopedCheckboxProgress(
      content,
      missingUnit,
      ["functional-design"],
      "functional-design",
    ).merged).toBe(content);
  });
});
