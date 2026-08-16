// covers: file:packages/framework/core/tools/data/self-install-allowlist.ts
// size: medium

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  gitattributesExpectation,
  gitignoreExpectation,
  SELF_INSTALL_ALLOWLIST,
} from "../../packages/framework/core/tools/data/self-install-allowlist.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

function reviewExceptions(contents: string): readonly string[] {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(" -linguist-generated"))
    .sort();
}

describe("t416 self-install gitattributes consistency", () => {
  test("the review-visible exception set matches the canonical allowlist", () => {
    const expected = gitattributesExpectation(SELF_INSTALL_ALLOWLIST);
    const actual = reviewExceptions(readFileSync(join(REPO_ROOT, ".gitattributes"), "utf-8"));
    expect({
      canonicalOnly: expected.filter((line) => !actual.includes(line)),
      fileOnly: actual.filter((line) => !expected.includes(line)),
    }).toEqual({ canonicalOnly: [], fileOnly: [] });
  });
});

describe("t416 generated gitignore semantics", () => {
  test("the repository source-only patterns match the canonical allowlist", () => {
    const expected = ["/dist/**", ...gitignoreExpectation(SELF_INSTALL_ALLOWLIST)];
    const generatedSurfacePattern =
      /^!?\/(?:dist|\.agents|\.claude|\.codex|\.cursor|\.kimi-code|\.opencode|\.pi)(?:\/|$)/;
    const actual = readFileSync(join(REPO_ROOT, ".gitignore"), "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => generatedSurfacePattern.test(line));
    expect(actual).toEqual(expected);
  });

  test("re-includes the dispatcher hierarchy without exposing adjacent generated hooks", () => {
    mkdirSync(join(REPO_ROOT, "tmp"), { recursive: true });
    const fixture = mkdtempSync(join(REPO_ROOT, "tmp", "t416-gitignore-"));
    try {
      expect(spawnSync("git", ["init", "--quiet", fixture]).status).toBe(0);
      writeFileSync(
        join(fixture, ".gitignore"),
        `${gitignoreExpectation(SELF_INSTALL_ALLOWLIST).join("\n")}\n`,
      );
      for (const path of [
        ".agents/rules/amadeus-codex-suffix.md",
        ".agents/rules/amadeus.md",
        ".agents/rules/generated.md",
        ".claude/hooks/amadeus-dispatch.ts",
        ".claude/hooks/generated.ts",
        ".codex/config.toml",
      ]) {
        mkdirSync(join(fixture, path.slice(0, path.lastIndexOf("/"))), { recursive: true });
        writeFileSync(join(fixture, path), "fixture\n");
      }

      const check = (path: string): number | null =>
        spawnSync("git", ["-C", fixture, "check-ignore", "--no-index", path]).status;
      expect(check(".claude/hooks/amadeus-dispatch.ts")).toBe(1);
      expect(check(".claude/hooks/generated.ts")).toBe(0);
      expect(check(".codex/config.toml")).toBe(1);
      expect(check(".agents/rules/amadeus-codex-suffix.md")).toBe(1);
      expect(check(".agents/rules/amadeus.md")).toBe(1);
      expect(check(".agents/rules/generated.md")).toBe(0);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
