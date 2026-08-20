// covers: function:resolveProjectDir, file:tools/amadeus-lib.ts
// size: medium
//
// Placed under tests/integration/ (not tests/unit/) because it builds a real
// on-disk worktree layout and switches cwd — a filesystem touch classifies the
// test as size "medium", which the layer×size purity gate forbids in
// tests/unit/. It stays an in-process, single-function test of
// resolveProjectDir (no subprocess), mirroring the sibling t230 idiom, so the
// new rung's lines are executed in this process's coverage.
//
// Issue #2352. resolveProjectDir() (the CLI ladder) lacked the workspace-marker
// rung that resolveProjectDirFromHook() has carried since #641. With env unset,
// a session running inside a git worktree therefore resolved to the MAIN
// checkout, because script-path derivation lands on the main checkout's harness
// tree — so worktree work was written into the main record.
//
// The fix inserts a marker rung directly BELOW the env rung and above
// script-path derivation, reusing the same canonical
// findWorkspaceMarkerAncestor predicate the hook ladder applies at the same
// position. Ladder: explicit → env → cwd-marker → script-path → cwd-harness.
//
// CLAUDE_PROJECT_DIR deliberately stays above the marker rung (ruling
// E-PWF-CGDEV2): callers that point it at a workspace other than their cwd's
// depend on it winning, so case C+env keeps resolving to the env value. Test 3
// pins that contract; `--project-dir` is the escape hatch, and reworking the
// ladder as a whole belongs to #1287.
//
// NOTE on rung coverage in this file: importing the canonical source means
// script-path derivation (rung "<harness>/tools" strip) never fires here — the
// source ships at packages/framework/core/tools/, whose parent segment "core"
// is not a harness dir name. The full shipped-layout ladder order is pinned by
// t144, which spawns against real dist trees.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProjectDir } from "../../packages/framework/core/tools/amadeus-lib.ts";

const SOURCE_LIB = join(dirname(fileURLToPath(import.meta.url)), "../../packages/framework/core/tools/amadeus-lib.ts");

function evalResolveProjectDirWithDiagnostics(cwd: string, envDir: string): { resolved: string[]; stderr: string } {
  const r = spawnSync(
    "bun",
    [
      "-e",
      `import { resolveProjectDir } from ${JSON.stringify(SOURCE_LIB)}; console.log(JSON.stringify([resolveProjectDir(), resolveProjectDir()]));`,
    ],
    {
      encoding: "utf-8",
      cwd,
      env: { ...process.env, CLAUDE_PROJECT_DIR: envDir } as NodeJS.ProcessEnv,
    },
  );
  expect(r.status).toBe(0);
  return { resolved: JSON.parse((r.stdout ?? "").trim()) as string[], stderr: r.stderr ?? "" };
}

// Build a main-checkout-shaped dir plus a worktree under it, each carrying its
// own workspace marker (an "amadeus/" dir AND a "<harness>/tools/" dir).
// Returns realpath'd dirs — macOS tmpdir is a /var → /private/var symlink and
// process.cwd() reports the resolved path.
function makeWorktreeFixture(root: string): { mainDir: string; worktreeDir: string } {
  const mainDir = join(root, "main");
  mkdirSync(join(mainDir, "amadeus"), { recursive: true });
  mkdirSync(join(mainDir, ".claude", "tools"), { recursive: true });

  const worktreeDir = join(mainDir, ".claude", "worktrees", "agent-fixture");
  mkdirSync(join(worktreeDir, "amadeus"), { recursive: true });
  mkdirSync(join(worktreeDir, ".claude", "tools"), { recursive: true });

  return { mainDir: realpathSync(mainDir), worktreeDir: realpathSync(worktreeDir) };
}

describe("t481 resolveProjectDir — worktree workspace-marker rung (issue #2352)", () => {
  let tmp: string;
  let originalCwd: string;
  let originalProjectDir: string | undefined;

  beforeEach(() => {
    tmp = realpathSync(mkdtempSync(join(tmpdir(), "t481-")));
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

  // AC-1a — case B: worktree cwd, env UNSET.
  test("1: a worktree cwd carrying its own marker resolves to the worktree (env unset)", () => {
    const { worktreeDir } = makeWorktreeFixture(tmp);
    process.chdir(worktreeDir);
    expect(resolveProjectDir()).toBe(worktreeDir);
  });

  // AC-1a — case B, ancestor form: cwd is a marker-less subdirectory of the
  // worktree. Without the marker rung the ladder falls through to the bare cwd
  // fallback and returns the SUBDIRECTORY, not the workspace root.
  test("2: a marker-less child of a worktree resolves to the worktree root (env unset)", () => {
    const { worktreeDir } = makeWorktreeFixture(tmp);
    const child = join(worktreeDir, "packages", "nested");
    mkdirSync(child, { recursive: true });
    process.chdir(child);
    expect(resolveProjectDir()).toBe(worktreeDir);
  });

  // AC-1b — case C+env: CLAUDE_PROJECT_DIR keeps outranking the marker rung
  // even from a marker-carrying worktree cwd. This is the preserved contract,
  // not an oversight: tools and fixtures that set the env var to a workspace
  // other than their cwd's rely on it, so the marker rung must not hijack them.
  test("3: CLAUDE_PROJECT_DIR still outranks the marker rung from a worktree cwd", () => {
    const { mainDir, worktreeDir } = makeWorktreeFixture(tmp);
    process.chdir(worktreeDir);
    process.env.CLAUDE_PROJECT_DIR = mainDir;
    expect(resolveProjectDir()).toBe(mainDir);
  });

  // AC-1c — case A: main checkout cwd (also marker-carrying) is unchanged.
  test("4: a main-checkout cwd still resolves to the main checkout", () => {
    const { mainDir } = makeWorktreeFixture(tmp);
    process.chdir(mainDir);
    expect(resolveProjectDir()).toBe(mainDir);
  });

  // AC-1d — marker-less cwd: env keeps outranking the remaining rungs, and a
  // bare marker-less cwd still falls back to cwd. Order below the new rung is
  // untouched.
  test("5: with no marker on the ancestor chain, CLAUDE_PROJECT_DIR still wins", () => {
    const unmarked = join(tmp, "unmarked");
    mkdirSync(unmarked, { recursive: true });
    process.chdir(unmarked);
    process.env.CLAUDE_PROJECT_DIR = "/from/env";
    expect(resolveProjectDir()).toBe("/from/env");
  });

  test("6: with no marker and no env, a bare cwd still falls back to cwd", () => {
    const unmarked = join(tmp, "unmarked");
    mkdirSync(unmarked, { recursive: true });
    process.chdir(unmarked);
    expect(resolveProjectDir()).toBe(unmarked);
  });

  // AC-1f — the explicit argument stays at the top of the ladder.
  test("7: an explicit --project-dir argument outranks the marker rung", () => {
    const { worktreeDir } = makeWorktreeFixture(tmp);
    process.chdir(worktreeDir);
    expect(resolveProjectDir("/explicit/dir")).toBe("/explicit/dir");
  });

  test("8: a marker-miss env value is retained and diagnosed once per process", () => {
    const unmarked = join(tmp, "unmarked");
    mkdirSync(unmarked, { recursive: true });
    process.chdir(unmarked);

    const result = evalResolveProjectDirWithDiagnostics(unmarked, "/from/env");
    expect(result.resolved).toEqual(["/from/env", "/from/env"]);
    expect(result.stderr.match(/\[amadeus\]/g)).toHaveLength(1);
    expect(result.stderr).toContain('CLAUDE_PROJECT_DIR="/from/env"');
    expect(result.stderr).toContain("workspace marker predicate");
    expect(result.stderr).toContain(JSON.stringify(unmarked));
  });

  test("9: an env value inside a marker-carrying workspace is silent", () => {
    const { mainDir } = makeWorktreeFixture(tmp);
    const unmarked = join(tmp, "unmarked");
    mkdirSync(unmarked, { recursive: true });
    process.chdir(unmarked);

    const result = evalResolveProjectDirWithDiagnostics(unmarked, mainDir);
    expect(result.resolved).toEqual([mainDir, mainDir]);
    expect(result.stderr).toBe("");
  });
});
