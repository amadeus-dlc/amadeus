// t202-hook-project-dir-worktree-marker: resolveProjectDirFromHook() must
// resolve to the WORKTREE, not the main checkout, when a session runs inside
// a Claude Code worktree.
//
// covers: function:resolveProjectDirFromHook, file:tools/amadeus-lib.ts
//
// WHY (issue #641). In a worktree session the hook FILES live in the launch
// dir (the main checkout: <main>/.claude/hooks/*.ts) because worktrees share
// the harness scripts with their originating checkout, while the engine's
// cwd is the worktree dir and the record it writes lives there. The pre-fix
// resolution order was: (1) CLAUDE_PROJECT_DIR env → (2) script-path
// derivation (strip "<harness>/hooks" from the hook file's OWN path) → (3)
// cwd probe → (4) cwd. Rung (2) wins whenever the hook script's path is
// derivable at all, so it converges on <main> even though the engine is
// running against the worktree record — the human-presence gate then reads
// the wrong dir and wrongly refuses.
//
// FIX (FR-641, election Q4=A). A new rung is inserted between (1) and (2):
// search cwd and its ancestors for the amadeus workspace marker (an
// "amadeus/" dir AND a "<harness>/tools/" dir) and adopt the first directory
// where BOTH are found. This rung fires before script-path derivation, so a
// worktree cwd — which carries its own amadeus/ + .claude/tools/ trees even
// though the hook script's OWN path resolves to <main> — wins correctly.
//
// WHY A SUBPROCESS. Mirrors t144's rationale: resolveProjectDirFromHook reads
// import.meta.url of the CALLER and process.cwd() at call time; running
// in-process against the suite's own fixed cwd/import.meta.url would not let
// us vary either independently per case.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLAUDE_TOOLS = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const CLAUDE_LIB = join(CLAUDE_TOOLS, "amadeus-lib.ts");

// Build a fixture shaped like a worktree session:
//   <root>/main/                      — the main checkout
//     amadeus/                        — main's own record tree (marker half 1)
//     .claude/tools/amadeus-lib.ts    — the real lib (byte-copied)
//     .claude/hooks/some-hook.ts      — a hook script (import.meta.url source)
//   <root>/main/.claude/worktrees/<name>/  — the worktree dir (this is CWD)
//     amadeus/                        — worktree's own record tree (marker half 1)
//     .claude/tools/                  — marker half 2 (dir need not carry real lib)
function makeWorktreeFixture(root: string): { mainDir: string; worktreeDir: string; hookPath: string } {
  const mainDir = join(root, "main");
  const hooksDir = join(mainDir, ".claude", "hooks");
  const toolsDir = join(mainDir, ".claude", "tools");
  mkdirSync(join(mainDir, "amadeus"), { recursive: true });
  mkdirSync(hooksDir, { recursive: true });
  mkdirSync(toolsDir, { recursive: true });
  writeFileSync(join(mainDir, ".claude", "tools", ".keep"), "");

  const hookPath = join(hooksDir, "some-hook.ts");
  writeFileSync(hookPath, "// fixture hook script\n");

  const worktreeDir = join(mainDir, ".claude", "worktrees", "agent-fixture");
  mkdirSync(join(worktreeDir, "amadeus"), { recursive: true });
  mkdirSync(join(worktreeDir, ".claude", "tools"), { recursive: true });

  return { mainDir, worktreeDir, hookPath };
}

function evalResolve(
  libPath: string,
  hookPath: string,
  opts: { cwd: string; env?: Record<string, string | undefined> },
): string {
  const r = spawnSync(
    "bun",
    [
      "-e",
      `import { resolveProjectDirFromHook } from ${JSON.stringify(libPath)}; console.log(resolveProjectDirFromHook(${JSON.stringify(`file://${hookPath}`)}));`,
    ],
    {
      encoding: "utf-8",
      cwd: opts.cwd,
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: undefined,
        ...opts.env,
      } as NodeJS.ProcessEnv,
    },
  );
  expect(r.status).toBe(0);
  return (r.stdout ?? "").trim();
}

describe("t202 resolveProjectDirFromHook — worktree marker rung (issue #641)", () => {
  test("1: worktree cwd with its own amadeus/+tools marker resolves to the WORKTREE, not the hook script's main checkout", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t202-")));
    try {
      const { worktreeDir, hookPath } = makeWorktreeFixture(tmp);
      const resolved = evalResolve(CLAUDE_LIB, hookPath, { cwd: worktreeDir });
      expect(resolved).toBe(worktreeDir);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("2: CLAUDE_PROJECT_DIR env still outranks the marker rung", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t202-")));
    try {
      const { worktreeDir, hookPath } = makeWorktreeFixture(tmp);
      const resolved = evalResolve(CLAUDE_LIB, hookPath, {
        cwd: worktreeDir,
        env: { CLAUDE_PROJECT_DIR: "/from/env" },
      });
      expect(resolved).toBe("/from/env");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("3: no marker anywhere on the ancestor chain falls back to script-path derivation (non-worktree, unchanged)", () => {
    // Real shipped layout: cwd = REPO_ROOT which has no amadeus/ marker relative
    // to a synthetic tree, but the hook path IS <repo>/.claude/hooks/x.ts, so
    // script-path derivation should still resolve to the repo root.
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t202-")));
    try {
      const projectDir = join(tmp, "proj");
      const hooksDir = join(projectDir, ".claude", "hooks");
      mkdirSync(hooksDir, { recursive: true });
      const hookPath = join(hooksDir, "some-hook.ts");
      writeFileSync(hookPath, "// fixture hook script\n");
      // cwd elsewhere, with no amadeus/ or tools/ marker at all.
      const elsewhere = join(tmp, "elsewhere");
      mkdirSync(elsewhere, { recursive: true });
      const resolved = evalResolve(CLAUDE_LIB, hookPath, { cwd: elsewhere });
      expect(resolved).toBe(projectDir);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("4: no marker, no derivable script path, cwd has a known harness dir → CWD probe rung (unchanged)", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t202-")));
    try {
      // Lib copied loose (not under <harness>/tools) so script-path derivation
      // for resolveProjectDirFromHook's own stripHarnessLeaf("hooks") check
      // misses regardless; the hook path passed in also fails leaf-strip.
      const looseHookPath = join(tmp, "loose-hook.ts");
      writeFileSync(looseHookPath, "// loose\n");
      mkdirSync(join(tmp, ".claude"), { recursive: true });
      const resolved = evalResolve(CLAUDE_LIB, looseHookPath, { cwd: tmp });
      expect(resolved).toBe(tmp);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("5: no marker anywhere, no known harness dir in cwd → final cwd fallback (unchanged)", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t202-")));
    try {
      const looseHookPath = join(tmp, "loose-hook.ts");
      writeFileSync(looseHookPath, "// loose\n");
      const resolved = evalResolve(CLAUDE_LIB, looseHookPath, { cwd: tmp });
      expect(resolved).toBe(tmp);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  // Review fix (PR #682, codex-engineer-3): hasWorkspaceMarker must require
  // BOTH marker halves to be DIRECTORIES, not merely present by name. A plain
  // FILE named "amadeus" and a plain FILE at ".claude/tools" must NOT satisfy
  // the marker — resolution must fall through to script-path derivation.
  test("6: plain FILES named amadeus / .claude/tools do NOT satisfy the marker (falls through to script-path derivation)", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t202-")));
    try {
      const projectDir = join(tmp, "proj");
      const hooksDir = join(projectDir, ".claude", "hooks");
      mkdirSync(hooksDir, { recursive: true });
      const hookPath = join(hooksDir, "some-hook.ts");
      writeFileSync(hookPath, "// fixture hook script\n");

      // cwd = a directory that has "amadeus" and ".claude/tools" as plain
      // FILES (not dirs) — the pre-fix existsSync-only check treated this as
      // a satisfied marker; the fix must reject it.
      const fakeMarkerDir = join(tmp, "fake-marker");
      mkdirSync(join(fakeMarkerDir, ".claude"), { recursive: true });
      writeFileSync(join(fakeMarkerDir, "amadeus"), "not a directory\n");
      writeFileSync(join(fakeMarkerDir, ".claude", "tools"), "not a directory\n");

      const resolved = evalResolve(CLAUDE_LIB, hookPath, { cwd: fakeMarkerDir });
      expect(resolved).toBe(projectDir);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
