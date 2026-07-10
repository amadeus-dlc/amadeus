// covers: subcommand:amadeus-swarm:check
// size: medium
//
// Issue #746: after #670/#727, `amadeus-worktree create` anchors a Bolt worktree
// at the MAIN checkout when run from a sibling dev worktree, but the read-side
// consumers (`amadeus-swarm verdictFor` and every raw `worktreePath(projectDir,
// slug)` caller) still re-derived the path under projectDir — so a sibling swarm
// pipeline lost the worktree that create produced. The fix promotes the anchor
// resolver into `amadeus-lib` and makes `worktreePath` apply it, so read and write
// agree on one location.
//
// Two arms:
//   - PURE SEAM: `resolveWorktreeBaseDir` is exercised in-process so coverage sees
//     both the anchored (sibling single-repo) and the pass-through (main checkout /
//     null probe / multi-repo mismatch) branches without spawning git.
//   - ORIGIN REPRO (verbatim #746): a real clone + sibling dev worktree, `create`
//     spawned from the sibling (anchors at main), then the main reader `swarm check`
//     spawned from the same sibling must resolve the SAME anchored path. Red before
//     the fix ("no worktree for unit"), green after.
//
// No test changes process.cwd(); each spawned tool runs with cwd pinned to the
// fixture, and a failed git setup throws immediately so a command can never
// continue in an unintended repository.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveWorktreeBaseDir } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { REPO_ROOT, seedWorkspaceShell, seededStateFile } from "../harness/fixtures.ts";

describe("t209 worktreeBaseDir anchor rule (#746) — pure seam", () => {
  test("sibling worktree of a legacy single-repo intent anchors at the main checkout", () => {
    const here = {
      cwdTop: "/repo/.claude/worktrees/dev-x",
      mainCheckout: "/repo",
    };
    const pdRepo = {
      cwdTop: "/repo/.claude/worktrees/dev-x",
      mainCheckout: "/repo",
    };
    expect(
      resolveWorktreeBaseDir("/repo/.claude/worktrees/dev-x", here, pdRepo),
    ).toBe("/repo");
  });

  test("main-checkout session keeps projectDir (byte-identical)", () => {
    const here = { cwdTop: "/repo", mainCheckout: "/repo" };
    const pdRepo = { cwdTop: "/repo", mainCheckout: "/repo" };
    expect(resolveWorktreeBaseDir("/repo", here, pdRepo)).toBe("/repo");
  });

  test("outside a git repo (null probe) keeps projectDir", () => {
    expect(resolveWorktreeBaseDir("/some/roof", null, null)).toBe("/some/roof");
  });

  test("multi-repo roof under a foreign worktree does NOT anchor (main-checkout mismatch)", () => {
    // The session sits in a sibling dev worktree of the DEV repo, but the
    // projectDir is a workspace roof whose own repo is a DIFFERENT checkout →
    // legacySingleRepo is false, so the roof anchor is kept (no false anchor).
    const here = { cwdTop: "/dev/.claude/worktrees/agent", mainCheckout: "/dev" };
    const pdRepo = { cwdTop: "/other", mainCheckout: "/other" };
    expect(resolveWorktreeBaseDir("/workspace-roof", here, pdRepo)).toBe(
      "/workspace-roof",
    );
  });
});

const BUN = process.execPath;
const WORKTREE_TOOL = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-worktree.ts",
);
const SWARM_TOOL = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-swarm.ts",
);

interface SiblingScratch {
  root: string;
  clone: string;
  sibling: string;
}

let scratch: SiblingScratch;

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd}: ${result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`}`,
    );
  }
  return (result.stdout ?? "").trim();
}

// origin bare <- publisher -> clone (main checkout) -> sibling dev worktree
function makeSiblingScratch(): SiblingScratch {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t209-"));
  const origin = join(root, "origin.git");
  const publisher = join(root, "publisher");
  const clone = join(root, "clone");
  const sibling = join(clone, ".claude", "worktrees", "dev-x");
  try {
    git(root, ["init", "-q", "--bare", "--initial-branch=main", origin]);
    git(root, ["init", "-q", "--initial-branch=main", publisher]);
    git(publisher, ["config", "user.email", "t209@example.com"]);
    git(publisher, ["config", "user.name", "t209"]);
    writeFileSync(join(publisher, "README.md"), "initial\n", "utf-8");
    git(publisher, ["add", "README.md"]);
    git(publisher, ["commit", "-q", "-m", "initial"]);
    git(publisher, ["remote", "add", "origin", origin]);
    git(publisher, ["push", "-q", "-u", "origin", "main"]);
    git(root, ["clone", "-q", origin, clone]);
    // A sibling dev worktree of the clone — the supported #670 conductor context.
    git(clone, ["worktree", "add", "-q", "-b", "dev-x", sibling, "main"]);
    // Both the projectDir (sibling) and the main checkout carry a workspace shell
    // so `create` reads state on the sibling and lands the worktree under main.
    seedWorkspaceShell(clone);
    writeFileSync(
      seededStateFile(clone),
      "- **Current Stage**: code-generation\n",
      "utf-8",
    );
    seedWorkspaceShell(sibling);
    writeFileSync(
      seededStateFile(sibling),
      "- **Current Stage**: code-generation\n",
      "utf-8",
    );
    return { root, clone, sibling };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

beforeEach(() => {
  scratch = makeSiblingScratch();
});

afterEach(() => {
  rmSync(scratch.root, { recursive: true, force: true });
});

describe("t209 sibling swarm pipeline resolves the anchored worktree (#746)", () => {
  test("create from a sibling anchors at main, and swarm check from the sibling finds it", () => {
    const create = spawnSync(
      BUN,
      [
        WORKTREE_TOOL,
        "create",
        "--slug",
        "u1",
        "--base",
        "main",
        "--project-dir",
        scratch.sibling,
      ],
      { cwd: scratch.sibling, encoding: "utf-8" },
    );
    expect(create.status).toBe(0);

    const mainAnchored = join(
      scratch.clone,
      ".amadeus",
      "worktrees",
      "bolt-u1",
    );
    const siblingLocal = join(
      scratch.sibling,
      ".amadeus",
      "worktrees",
      "bolt-u1",
    );
    // create anchored the Bolt worktree at the MAIN checkout (#727), never under
    // the sibling projectDir.
    expect(existsSync(mainAnchored)).toBe(true);
    expect(existsSync(siblingLocal)).toBe(false);

    // The main reader (swarm verdictFor) runs from the SAME sibling session. Before
    // the fix it re-derived the path under the sibling and reported "no worktree";
    // after the fix it resolves the anchored main path and converges.
    const check = spawnSync(
      BUN,
      [
        SWARM_TOOL,
        "check",
        "u1",
        "--check-cmd",
        "true",
        "--project-dir",
        scratch.sibling,
      ],
      { cwd: scratch.sibling, encoding: "utf-8" },
    );
    const output = `${check.stdout ?? ""}${check.stderr ?? ""}`;
    expect(output).not.toContain("no worktree for unit");
    expect(check.status).toBe(0);
    expect(JSON.parse(check.stdout ?? "{}")).toMatchObject({
      unit: "u1",
      converged: true,
    });
  });
});
