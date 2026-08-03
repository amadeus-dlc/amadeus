// covers: file:scripts
// size: medium
//
// t209 — dangling-symlink resilience in scripts/promote-self.ts (issue #739).
// Mechanism: in-process drive of the exported promoteSelfMain(argv, repoRoot)
// seam against a temp fixture root — zero spawn (spawned subprocesses are
// invisible to bun --coverage), zero LLM, zero tokens. --apply calls pass a
// null postApply step: the FR-1 kimi hooks wiring is covered by t299, and this
// test exercises only the distribution mechanics.
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
//   5. Root CLAUDE.md stays aligned with its two canonical source files.
//   6. A missing preserved Claude onboarding file fails closed.

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
import { PROJECT_INSTRUCTIONS } from "../../packages/framework/harness/claude/project-instructions.ts";
import { SELF_INSTALL_HARNESSES } from "../../scripts/plugin-projection.ts";
import {
  packageFreshnessArgs,
  promoteSelfMain,
  runPackageFreshness,
} from "../../scripts/promote-self.ts";

let root: string;

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
};

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "t209-promote-self-"));
  // Minimal dist fixture covering all managed dirs (claude/codex/agents/cursor/opencode/kimi).
  write("dist/claude/.claude/tools/a.txt", "alpha\n");
  write("dist/codex/.codex/b.txt", "beta\n");
  write("dist/codex/.agents/c.txt", "gamma\n");
  write("dist/cursor/.cursor/d.txt", "delta\n");
  write("dist/opencode/.opencode/e.txt", "epsilon\n");
  write("dist/kimi/.kimi-code/f.txt", "zeta\n");
  write("dist/codex/AGENTS.md", "@.agents/rules/amadeus.md\n\n# AI-DLC on Codex CLI\n\ngenerated\n");
  const claudeOnboarding = "@.claude/rules/amadeus.md\n\n# Claude onboarding\n";
  write(".claude/CLAUDE.md", claudeOnboarding);
  write("CLAUDE.md", `${PROJECT_INSTRUCTIONS}${claudeOnboarding}`);
  write(
    "AGENTS.md",
    "@.agents/rules/amadeus.md\n@.agents/rules/amadeus-codex-suffix.md\n\n# Project rules\n",
  );
  // Materialize an in-sync self install (also creates the cursor).
  expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
  expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
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
  test("root CLAUDE matches project instructions plus Claude onboarding", () => {
    const got = readFileSync(join(root, "CLAUDE.md"), "utf-8");
    expect(got).toBe(`${PROJECT_INSTRUCTIONS}@.claude/rules/amadeus.md\n\n# Claude onboarding\n`);
  });

  test("fails when the preserved Claude onboarding file is missing", async () => {
    rmSync(join(root, ".claude", "CLAUDE.md"));
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
  });

  test("--check passes with a dangling symlink under a preserved dir", async () => {
    plantPreservedDangling();
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("--apply succeeds and leaves the preserved dangling symlink alone", async () => {
    const link = plantPreservedDangling();
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
  });

  test("orphan detection still fires for a stray file (non-regression)", async () => {
    plantPreservedDangling();
    const stray = join(root, ".claude", "stray-t209.txt");
    writeFileSync(stray, "orphan\n");
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(existsSync(stray)).toBe(false);
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("usage paths return exit code 2 without touching the tree", async () => {
    expect(await promoteSelfMain(["--help"], root)).toBe(2);
    expect(await promoteSelfMain(["-h"], root)).toBe(2);
    expect(await promoteSelfMain(["--check", "--apply"], root)).toBe(2);
  });

  test("a dangling symlink outside preserved is an ORPHAN, not a crash", async () => {
    const link = join(root, ".codex", "dangling-t209");
    symlinkSync("/nonexistent-target-t209", link);
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(lstatSync(link, { throwIfNoEntry: false })).toBeUndefined();
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  // The freshness args are DERIVED from the canonical self-install face set — no
  // second, equal-valued list lives in promote-self.ts (#1575).
  test("package freshness covers exactly the canonical self-install faces", () => {
    const faces = packageFreshnessArgs("apply").map((args) => args[1]);
    expect(faces).toEqual([...SELF_INSTALL_HARNESSES]);
  });

  test("packageFreshnessArgs covers apply and check for every harness", () => {
    expect(packageFreshnessArgs("apply")).toEqual([
      ["scripts/package.ts", "claude"],
      ["scripts/package.ts", "codex"],
      ["scripts/package.ts", "cursor"],
      ["scripts/package.ts", "opencode"],
      ["scripts/package.ts", "kimi"],
    ]);
    expect(packageFreshnessArgs("check")).toEqual([
      ["scripts/package.ts", "claude"],
      ["scripts/package.ts", "codex"],
      ["scripts/package.ts", "cursor"],
      ["scripts/package.ts", "opencode"],
      ["scripts/package.ts", "kimi"],
    ]);
  });

  test("--apply installs OpenCode and preserves its activated config", async () => {
    const config = "{\n  \"permission\": \"ask\"\n}\n";
    write(".opencode/opencode.json", config);

    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(readFileSync(join(root, ".opencode", "e.txt"), "utf-8")).toBe("epsilon\n");
    expect(readFileSync(join(root, ".opencode", "opencode.json"), "utf-8")).toBe(config);
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("runPackageFreshness drives the runner for each harness argv", () => {
    const calls: string[][] = [];
    runPackageFreshness("apply", (_cmd, args) => {
      calls.push(args);
    });
    expect(calls).toEqual(packageFreshnessArgs("apply"));
  });

  test("promoteSelfMain without --no-build invokes the freshness seam", async () => {
    const seen: string[] = [];
    expect(
      await promoteSelfMain(["--apply"], root, (mode) => {
        seen.push(mode);
      }, null),
    ).toBe(0);
    expect(seen).toEqual(["apply"]);

    seen.length = 0;
    expect(
      await promoteSelfMain([], root, (mode) => {
        seen.push(mode);
      }),
    ).toBe(0);
    expect(seen).toEqual(["check"]);
  });
});
