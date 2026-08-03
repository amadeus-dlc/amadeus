// covers: file:scripts/source-only-boundary.ts
// covers: file:packages/framework/core/tools/data/self-install-allowlist.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  isSourceOnlyGeneratedPath,
  SELF_INSTALL_ALLOWLIST,
} from "../../packages/framework/core/tools/data/self-install-allowlist.ts";
import { evaluateTrackedBoundary } from "../../scripts/source-only-boundary.ts";

describe("t418 source-only generated path policy", () => {
  test("classifies distribution and generated self-install files", () => {
    expect(isSourceOnlyGeneratedPath("dist/claude/.claude/tools/x.ts", SELF_INSTALL_ALLOWLIST))
      .toBe(true);
    expect(isSourceOnlyGeneratedPath(".claude/tools/x.ts", SELF_INSTALL_ALLOWLIST)).toBe(true);
    expect(isSourceOnlyGeneratedPath("packages/framework/core/tools/x.ts", SELF_INSTALL_ALLOWLIST))
      .toBe(false);
  });

  test("excludes exact tracked allowlist entries and classifies preserved runtime as untracked", () => {
    for (const path of [
      ".agents/rules/amadeus-codex-suffix.md",
      ".agents/rules/amadeus.md",
      ".claude/settings.json",
      ".claude/hooks/amadeus-dispatch.ts",
      ".codex/config.toml",
    ]) {
      expect(isSourceOnlyGeneratedPath(path, SELF_INSTALL_ALLOWLIST), path).toBe(false);
    }
    for (const generatedRuntimePath of [
      ".claude/worktrees/live/file",
      ".codex/hooks.json",
      ".codex/local/preferences.json",
      ".codex/scopes/amadeus-personal.md",
      ".codex/tools/data/scope-grid.json",
      ".claude/.amadeus-plugin-composition.json",
    ]) {
      expect(
        isSourceOnlyGeneratedPath(generatedRuntimePath, SELF_INSTALL_ALLOWLIST),
        generatedRuntimePath,
      ).toBe(true);
    }
  });

  test("reports every tracked generated path in stable order", () => {
    expect(
      evaluateTrackedBoundary([
        ".codex/tools/z.ts",
        "dist/codex/AGENTS.md",
        ".claude/settings.json",
        "packages/framework/core/tools/x.ts",
      ]),
    ).toEqual({
      kind: "violation",
      trackedGenerated: [".codex/tools/z.ts", "dist/codex/AGENTS.md"],
    });
    expect(evaluateTrackedBoundary([".codex/config.toml"])).toEqual({ kind: "clean" });
  });

  test("evaluates each tracked path once as inventory doubles", () => {
    const run = (count: number): number => {
      let scans = 0;
      const paths = Array.from({ length: count }, (_, index) => `src/file-${index}.ts`);
      evaluateTrackedBoundary(paths, () => {
        scans += 1;
        return false;
      });
      return scans;
    };
    expect(run(2_000)).toBe(2_000);
    expect(run(4_000)).toBe(4_000);
  });
});
