// covers: file:scripts/source-only-boundary.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sourceOnlyBoundaryMain } from "../../scripts/source-only-boundary.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const TMP_ROOT = join(REPO_ROOT, "tmp");
const fixtures: string[] = [];

function git(root: string, args: readonly string[]): number | null {
  return spawnSync("git", args, { cwd: root, encoding: "utf-8" }).status;
}

function write(root: string, path: string): void {
  const absolute = join(root, path);
  mkdirSync(absolute.slice(0, absolute.lastIndexOf("/")), { recursive: true });
  writeFileSync(absolute, `${path}\n`);
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe("t418 source-only boundary process integration", () => {
  test("fails on tracked generated files and index-only removal preserves bytes", () => {
    mkdirSync(TMP_ROOT, { recursive: true });
    const root = mkdtempSync(join(TMP_ROOT, "t418-source-only-"));
    fixtures.push(root);
    expect(git(root, ["init", "--quiet"])).toBe(0);
    for (const path of [
      "dist/claude/generated.ts",
      ".claude/tools/generated.ts",
      ".claude/settings.json",
      ".codex/local/preferences.json",
    ]) {
      write(root, path);
    }
    expect(git(root, ["add", "-f", "."])).toBe(0);

    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => errors.push(args.join(" "));
    try {
      expect(sourceOnlyBoundaryMain(root)).toBe(1);
    } finally {
      console.error = originalError;
    }
    expect(errors[0]).toBe(
      "source-only boundary violated — 3 generated file(s) are tracked:",
    );

    expect(git(root, ["rm", "-r", "--cached", "--quiet", "--", "dist", ".claude", ".codex"]))
      .toBe(0);
    expect(git(root, ["add", "-f", "--", ".claude/settings.json"])).toBe(0);
    expect(sourceOnlyBoundaryMain(root)).toBe(0);
    expect(existsSync(join(root, "dist/claude/generated.ts"))).toBe(true);
    expect(existsSync(join(root, ".claude/tools/generated.ts"))).toBe(true);
    expect(existsSync(join(root, ".codex/local/preferences.json"))).toBe(true);
  });
});
