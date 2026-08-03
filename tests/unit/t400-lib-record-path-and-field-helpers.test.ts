// Pure record-path, refs-list, and field-editing helpers exported by
// amadeus-lib. Each one is a total function over its arguments — no filesystem
// access — so the whole surface is exercised in-process here.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  appendSlug,
  emitRefsList,
  errorStack,
  isValidRepoName,
  parseCheckboxes,
  parseFieldArgs,
  parseRefsList,
  planFilePath,
  recoveryFilePath,
  removeField,
  removeSlug,
  repoDir,
  requireChanged,
  setStageSuffix,
  stageDir,
  stopHookDir,
  worktreeDocsDir,
  worktreeRuntimeGraphPath,
  validateStageState,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const PROJECT = join("/tmp", "amadeus-t400");

describe("t400 repo name and record path helpers", () => {
  test("accepts a single-segment repo name and rejects traversal shapes", () => {
    expect(isValidRepoName("sibling-repo")).toBe(true);
    expect(isValidRepoName("..")).toBe(false);
    expect(isValidRepoName(".")).toBe(false);
    expect(isValidRepoName("nested/repo")).toBe(false);
  });

  test("resolves a sibling repo as an immediate child of the workspace", () => {
    expect(repoDir(PROJECT, "sibling")).toBe(join(PROJECT, "sibling"));
  });

  test("names the recovery, plan, stop-hook, and stage leaves under one record root", () => {
    const recovery = recoveryFilePath(PROJECT);
    const plan = planFilePath(PROJECT);
    const stopHook = stopHookDir(PROJECT);
    const stage = stageDir(PROJECT, "construction", "code-generation");
    expect(recovery.endsWith(join(".amadeus-recovery.md"))).toBe(true);
    expect(plan.endsWith(join(".amadeus-plan.json"))).toBe(true);
    expect(stopHook.endsWith(join(".amadeus-stop-hook"))).toBe(true);
    expect(stage.endsWith(join("construction", "code-generation"))).toBe(true);
    for (const path of [plan, stopHook, stage]) {
      expect(path.startsWith(PROJECT)).toBe(true);
    }
  });

  test("derives worktree record paths from an explicit record prefix", () => {
    const wt = join("/tmp", "amadeus-t400-wt");
    const prefix = "amadeus/spaces/default/intents/demo-0000000a";
    expect(worktreeDocsDir(wt, prefix)).toBe(join(wt, ...prefix.split("/")));
    expect(worktreeRuntimeGraphPath(wt, prefix)).toBe(
      join(wt, ...prefix.split("/"), "runtime-graph.json"),
    );
  });
});

describe("t400 error stack extraction", () => {
  test("returns the stack of a real Error", () => {
    expect(errorStack(new Error("boom"))?.includes("boom")).toBe(true);
  });

  test("reads a string stack off a non-Error carrier and rejects other shapes", () => {
    expect(errorStack({ stack: "synthetic stack" })).toBe("synthetic stack");
    expect(errorStack({ stack: 42 })).toBeUndefined();
    expect(errorStack("plain string")).toBeUndefined();
    expect(errorStack(null)).toBeUndefined();
  });
});

describe("t400 refs-list field operations", () => {
  test("emits the literal empty placeholder and a sorted populated list", () => {
    expect(emitRefsList([])).toBe("[empty list]");
    expect(emitRefsList(["b-slug", "a-slug"])).toBe("[a-slug, b-slug]");
  });

  test("appends a slug and refuses a duplicate", () => {
    expect(appendSlug("[empty list]", "first")).toBe("[first]");
    expect(appendSlug("[first]", "second")).toBe("[first, second]");
    expect(() => appendSlug("[first]", "first")).toThrow(/already present/);
  });

  test("removes a slug and refuses an absent one", () => {
    expect(removeSlug("[first, second]", "first")).toBe("[second]");
    expect(removeSlug("[only]", "only")).toBe("[empty list]");
    expect(() => removeSlug("[first]", "missing")).toThrow(/not present/);
  });

  test("round-trips a parsed list through the emitter", () => {
    expect(emitRefsList(parseRefsList("[b, a]"))).toBe("[a, b]");
  });
});

describe("t400 state-file field and stage-line editing", () => {
  test("drops a bullet field line with its trailing newline and leaves others intact", () => {
    const content = "- **Parked**: yes\n- **Scope**: fix\n";
    expect(removeField(content, "Parked")).toBe("- **Scope**: fix\n");
    expect(removeField(content, "Absent")).toBe(content);
  });

  test("rewrites the suffix of a stage line without touching its checkbox marker", () => {
    const content = [
      "## Stage Progress",
      "<!-- Checkbox states: canonical -->",
      "- [ ] code-generation — EXECUTE",
      "- [x] build-and-test — EXECUTE",
      "",
      "## Current Status",
      "- **Status**: Running",
      "",
    ].join("\n");
    expect(
      requireChanged(
        setStageSuffix(validateStageState(content), "code-generation", "SKIP"),
        "test:set-suffix",
      ),
    ).toContain(
      "- [ ] code-generation — SKIP\n- [x] build-and-test — EXECUTE\n",
    );
    expect(setStageSuffix(validateStageState(content), "absent-stage", "SKIP")).toEqual({
      kind: "not-found",
      target: "absent-stage",
    });
    expect(setStageSuffix(validateStageState(content), "code-generation", "EXECUTE")).toEqual({
      kind: "changed",
      content,
    });
  });

  test("maps an unmarked checkbox to the pending state", () => {
    expect(parseCheckboxes("- [ ] code-generation — EXECUTE\n")).toEqual([
      { slug: "code-generation", state: "pending", suffix: "EXECUTE" },
    ]);
  });
});

describe("t400 repeated --field argument collection", () => {
  test("collects every key=value pair and ignores malformed or trailing flags", () => {
    expect(parseFieldArgs(["--field", "a=1", "--field", "b=2"])).toEqual({ a: "1", b: "2" });
    expect(parseFieldArgs(["--field", "novalue"])).toEqual({});
    expect(parseFieldArgs(["--field", "=leading"])).toEqual({});
    expect(parseFieldArgs(["--field"])).toEqual({});
    expect(parseFieldArgs(["--field", "url=https://x/?a=1"])).toEqual({ url: "https://x/?a=1" });
  });
});
