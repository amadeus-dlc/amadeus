// covers: file:scripts
// size: medium
//
// t209 — dangling-symlink resilience in scripts/promote-self.ts (issue #739).
// Mechanism: in-process drive of the exported promoteSelfMain(argv, repoRoot)
// seam against a temp fixture root — zero spawn (spawned subprocesses are
// invisible to bun --coverage), zero LLM, zero tokens.
//
// WHY THIS EXISTS: walk() used to stat() every entry (following symlinks), so
// a single dangling symlink inside a PRESERVED subtree (.claude/worktrees/ is
// first-class EnterWorktree territory where node_modules/.bin symlinks go
// stale routinely) crashed both --check and --apply with an unhandled ENOENT
// before the preserved filter ever ran — the drift guard died with zero
// diagnostics. walk() now reads lstat-level dirent types and never follows
// symlinks.
//
// WHAT IS UNDER TEST:
//   1. --check exits 0 with a dangling symlink under a preserved dir (FR-4).
//   2. --apply exits 0 there too and leaves the preserved symlink in place.
//   3. Orphan detection non-regression: a stray file outside preserved is
//      still reported (check exit 1) and removed by --apply.
//   4. A dangling symlink OUTSIDE preserved is diagnosed as an ORPHAN (no
//      crash) and removed by --apply.
//   5. Root CLAUDE.md inlines the preserved Claude onboarding file without
//      importing AGENTS.md.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { composeRootAgents, promoteSelfMain } from "../../scripts/promote-self.ts";

let root: string;

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "t209-promote-self-"));
  // Minimal dist fixture covering all three managed dirs.
  write("dist/claude/.claude/tools/a.txt", "alpha\n");
  write("dist/codex/.codex/b.txt", "beta\n");
  write("dist/codex/.agents/c.txt", "gamma\n");
  write("dist/codex/AGENTS.md", "@.agents/rules/amadeus.md\n\n# AI-DLC on Codex CLI\n\ngenerated\n");
  write(".claude/CLAUDE.md", "@.claude/rules/amadeus.md\n\n# Claude onboarding\n");
  write("AGENTS.md", "@.agents/rules/amadeus.md\n\n# Project rules\n");
  // Materialize an in-sync self install (also creates CLAUDE.md + cursor).
  expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
  expect(promoteSelfMain(["--no-build"], root)).toBe(0);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const plantPreservedDangling = (): string => {
  const dir = join(root, ".claude", "worktrees", "zz-t209");
  mkdirSync(dir, { recursive: true });
  const link = join(dir, "dangling");
  symlinkSync("/nonexistent-target-t209", link);
  return link;
};

describe("t209 promote-self dangling-symlink resilience", () => {
  test("root AGENTS keeps project guidance and replaces the generated suffix", () => {
    const got = composeRootAgents(
      Buffer.from("@.agents/rules/amadeus.md\n\n# Project rules\n\n# AI-DLC on Codex CLI\n\nstale\n"),
      Buffer.from("@.agents/rules/amadeus.md\n\n# AI-DLC on Codex CLI\n\nfresh\n"),
    ).toString("utf-8");
    expect(got).toBe("@.agents/rules/amadeus.md\n\n# Project rules\n\n# AI-DLC on Codex CLI\n\nfresh\n");
    expect(got.match(/@\.agents\/rules\/amadeus\.md/g)).toHaveLength(1);
  });

  test("root AGENTS keeps the dist import when no project guidance exists", () => {
    const dist = Buffer.from("@.agents/rules/amadeus.md\n\n# AI-DLC on Codex CLI\n\nfresh\n");
    expect(composeRootAgents(Buffer.alloc(0), dist)).toEqual(dist);
  });

  test("root CLAUDE inlines Claude onboarding without importing AGENTS", () => {
    const got = readFileSync(join(root, "CLAUDE.md"), "utf-8");
    expect(got).toStartWith("## Project Instructions\n");
    expect(got).toContain("@.claude/rules/amadeus.md\n\n# Claude onboarding\n");
    expect(got).not.toContain("@AGENTS.md");
  });

  test("--check passes with a dangling symlink under a preserved dir", () => {
    plantPreservedDangling();
    expect(promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("--apply succeeds and leaves the preserved dangling symlink alone", () => {
    const link = plantPreservedDangling();
    expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
  });

  test("orphan detection still fires for a stray file (non-regression)", () => {
    plantPreservedDangling();
    const stray = join(root, ".claude", "stray-t209.txt");
    writeFileSync(stray, "orphan\n");
    expect(promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    expect(existsSync(stray)).toBe(false);
    expect(promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("usage paths return exit code 2 without touching the tree", () => {
    expect(promoteSelfMain(["--help"], root)).toBe(2);
    expect(promoteSelfMain(["-h"], root)).toBe(2);
    expect(promoteSelfMain(["--check", "--apply"], root)).toBe(2);
  });

  test("a dangling symlink outside preserved is an ORPHAN, not a crash", () => {
    const link = join(root, ".codex", "dangling-t209");
    symlinkSync("/nonexistent-target-t209", link);
    expect(promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    expect(lstatSync(link, { throwIfNoEntry: false })).toBeUndefined();
    expect(promoteSelfMain(["--no-build"], root)).toBe(0);
  });
});
