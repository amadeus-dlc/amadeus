// covers: function:resolveProjectDirFromHook, file:tools/amadeus-lib.ts
// size: medium
//
// Placed under tests/integration/ (not tests/unit/) because it builds a real
// on-disk worktree layout and switches cwd — a filesystem touch classifies the
// test as size "medium", which the layer×size purity gate forbids in
// tests/unit/ (unit = small only). It stays an in-process, single-function test
// of resolveProjectDirFromHook (no subprocess), mirroring the in-process fs
// convention of the sibling setup-install-flow integration test.
//
// Bolt 1 (#1048). resolveProjectDirFromHook()'s workspace-marker rung keys off
// KNOWN_HARNESS_DIRS (hasWorkspaceMarker: an "amadeus/" dir AND a
// "<harness>/tools/" dir). Once opencode/cursor join that list, a session
// running inside an OpenCode or Cursor worktree — whose only harness tree is
// .opencode/ or .cursor/ — must resolve to the worktree, exactly as .claude/
// .kiro/.codex worktrees already do (issue #641 behaviour, t202).
//
// IN-PROCESS (not subprocess like t202): we exercise the source
// resolveProjectDirFromHook directly and drive the marker rung purely through
// process.cwd(), so the new .opencode/.cursor entries in KNOWN_HARNESS_DIRS are
// executed in this process's coverage. hasWorkspaceMarker stays module-private —
// the return value of resolveProjectDirFromHook is the only observable seam.
// process.cwd() and CLAUDE_PROJECT_DIR are saved and restored around every case.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveProjectDirFromHook } from "../../packages/framework/core/tools/amadeus-lib.ts";

// Build a worktree-shaped dir for `engineDir` (e.g. ".opencode"): an "amadeus/"
// record tree plus a "<engineDir>/tools/" tree — the two halves hasWorkspaceMarker
// requires. Returns the realpath'd dir (macOS tmpdir is a /var → /private/var
// symlink, and process.cwd() reports the resolved path).
function makeMarkerDir(root: string, engineDir: string): string {
  const dir = join(root, "worktree");
  mkdirSync(join(dir, "amadeus"), { recursive: true });
  mkdirSync(join(dir, engineDir, "tools"), { recursive: true });
  return realpathSync(dir);
}

describe("t230 resolveProjectDirFromHook — opencode/cursor worktree marker (#1048)", () => {
  let tmp: string;
  let originalCwd: string;
  let originalProjectDir: string | undefined;

  beforeEach(() => {
    tmp = realpathSync(mkdtempSync(join(tmpdir(), "t230-")));
    originalCwd = process.cwd();
    originalProjectDir = process.env.CLAUDE_PROJECT_DIR;
    delete process.env.CLAUDE_PROJECT_DIR;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = originalProjectDir;
    rmSync(tmp, { recursive: true, force: true });
  });

  test("an opencode worktree cwd (.opencode/tools + amadeus/) resolves to the worktree", () => {
    const worktree = makeMarkerDir(tmp, ".opencode");
    process.chdir(worktree);
    expect(resolveProjectDirFromHook(import.meta.url)).toBe(worktree);
  });

  test("a cursor worktree cwd (.cursor/tools + amadeus/) resolves to the worktree", () => {
    const worktree = makeMarkerDir(tmp, ".cursor");
    process.chdir(worktree);
    expect(resolveProjectDirFromHook(import.meta.url)).toBe(worktree);
  });

  test("edge case: cwd is a marker-less child of an opencode worktree → resolves to the ancestor", () => {
    const worktree = makeMarkerDir(tmp, ".opencode");
    const child = join(worktree, "packages", "nested");
    mkdirSync(child, { recursive: true });
    process.chdir(child);
    expect(resolveProjectDirFromHook(import.meta.url)).toBe(worktree);
  });

  test("edge case: CLAUDE_PROJECT_DIR still outranks the opencode marker rung", () => {
    const worktree = makeMarkerDir(tmp, ".opencode");
    process.chdir(worktree);
    process.env.CLAUDE_PROJECT_DIR = "/from/env";
    expect(resolveProjectDirFromHook(import.meta.url)).toBe("/from/env");
  });
});
