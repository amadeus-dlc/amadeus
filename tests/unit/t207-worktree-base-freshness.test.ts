// covers: subcommand:amadeus-worktree:create
// size: medium
//
// Issue #760: `amadeus-worktree create --base <local-branch>` must fail closed
// when the local branch and its origin tracking ref resolve to different SHAs.
// The exported seam is exercised in-process so coverage sees every comparison
// branch; the real CLI is also spawned for the rejection and --allow-stale
// wiring. Every case uses an isolated scratch topology:
//
//   bare origin <- publisher -> clone under test
//
// No test changes process.cwd(). A failed git setup throws immediately, so a
// command can never continue in an unintended repository.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertLocalBaseFresh,
  handleCreate,
} from "../../packages/framework/core/tools/amadeus-worktree.ts";
import {
  REPO_ROOT,
  seededStateFile,
  seedWorkspaceShell,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const TOOL = join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-worktree.ts");

interface ScratchRepo {
  root: string;
  origin: string;
  publisher: string;
  clone: string;
  localSha: string;
}

let scratch: ScratchRepo;

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd}: ${result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`}`,
    );
  }
  return (result.stdout ?? "").trim();
}

function makeScratchRepo(): ScratchRepo {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t207-"));
  const origin = join(root, "origin.git");
  const publisher = join(root, "publisher");
  const clone = join(root, "clone");
  try {
    git(root, ["init", "-q", "--bare", "--initial-branch=main", origin]);
    git(root, ["init", "-q", "--initial-branch=main", publisher]);
    git(publisher, ["config", "user.email", "t207@example.com"]);
    git(publisher, ["config", "user.name", "t207"]);
    writeFileSync(join(publisher, "README.md"), "initial\n", "utf-8");
    git(publisher, ["add", "README.md"]);
    git(publisher, ["commit", "-q", "-m", "initial"]);
    git(publisher, ["remote", "add", "origin", origin]);
    git(publisher, ["push", "-q", "-u", "origin", "main"]);
    git(root, ["clone", "-q", origin, clone]);
    const localSha = git(clone, ["rev-parse", "refs/heads/main"]);
    return { root, origin, publisher, clone, localSha };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function advanceOrigin(): string {
  writeFileSync(join(scratch.publisher, "remote.txt"), "remote advance\n", "utf-8");
  git(scratch.publisher, ["add", "remote.txt"]);
  git(scratch.publisher, ["commit", "-q", "-m", "advance origin"]);
  git(scratch.publisher, ["push", "-q", "origin", "main"]);
  git(scratch.clone, ["fetch", "-q", "origin"]);
  return git(scratch.clone, ["rev-parse", "refs/remotes/origin/main"]);
}

function prepareWorkspace(): void {
  seedWorkspaceShell(scratch.clone);
  writeFileSync(seededStateFile(scratch.clone), "- **Current Stage**: code-generation\n", "utf-8");
}

function withoutStdout(fn: () => void): void {
  const log = console.log;
  console.log = () => {};
  try {
    fn();
  } finally {
    console.log = log;
  }
}

function runCreate(slug: string, extraArgs: string[] = [], base = "main"): {
  status: number;
  output: string;
} {
  prepareWorkspace();
  const result = spawnSync(
    BUN,
    [
      TOOL,
      "create",
      "--slug",
      slug,
      "--base",
      base,
      ...extraArgs,
      "--project-dir",
      scratch.clone,
    ],
    { cwd: scratch.clone, encoding: "utf-8" },
  );
  return {
    status: result.status ?? -1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

beforeEach(() => {
  scratch = makeScratchRepo();
});

afterEach(() => {
  rmSync(scratch.root, { recursive: true, force: true });
});

describe("t207 amadeus-worktree local base freshness (#760)", () => {
  test("stale local base is rejected with both SHAs and recovery guidance", () => {
    const remoteSha = advanceOrigin();

    expect(() =>
      assertLocalBaseFresh({ base: "main", gitCwd: scratch.clone, allowStale: false }),
    ).toThrow(scratch.localSha);
    expect(() =>
      assertLocalBaseFresh({ base: "main", gitCwd: scratch.clone, allowStale: false }),
    ).toThrow(remoteSha);

    prepareWorkspace();
    expect(() =>
      handleCreate(["--slug", "stale-in-process", "--base", "main"], scratch.clone),
    ).toThrow("[slug=stale-in-process]");

    const result = runCreate("stale-rejected");
    expect(result.status).not.toBe(0);
    expect(result.output).toContain(`local SHA ${scratch.localSha}`);
    expect(result.output).toContain(`remote SHA ${remoteSha}`);
    expect(result.output).toContain("git fetch origin");
    expect(result.output).toContain("fast-forward");
    expect(result.output).toContain("--allow-stale");
    expect(existsSync(join(scratch.clone, ".amadeus", "worktrees", "bolt-stale-rejected"))).toBe(false);
  });

  test("--allow-stale explicitly permits a worktree from the stale local SHA", () => {
    advanceOrigin();

    expect(() =>
      assertLocalBaseFresh({ base: "main", gitCwd: scratch.clone, allowStale: true }),
    ).not.toThrow();

    prepareWorkspace();
    withoutStdout(() =>
      handleCreate(
        ["--slug", "stale-in-process", "--base", "main", "--allow-stale"],
        scratch.clone,
      ),
    );
    expect(
      git(join(scratch.clone, ".amadeus", "worktrees", "bolt-stale-in-process"), [
        "rev-parse",
        "HEAD",
      ]),
    ).toBe(scratch.localSha);

    const result = runCreate("stale-allowed", ["--allow-stale"]);
    const worktree = join(scratch.clone, ".amadeus", "worktrees", "bolt-stale-allowed");
    expect(result.status).toBe(0);
    expect(existsSync(worktree)).toBe(true);
    expect(git(worktree, ["rev-parse", "HEAD"])).toBe(scratch.localSha);
  });

  test("missing origin remote skips comparison and preserves create behavior", () => {
    const remoteSha = advanceOrigin();
    git(scratch.clone, ["remote", "remove", "origin"]);
    // Keep a divergent origin-shaped ref to prove remote configuration, not
    // merely ref presence, controls whether comparison is eligible.
    git(scratch.clone, ["update-ref", "refs/remotes/origin/main", remoteSha]);

    expect(() =>
      assertLocalBaseFresh({ base: "main", gitCwd: scratch.clone, allowStale: false }),
    ).not.toThrow();
    expect(runCreate("no-origin").status).toBe(0);
  });

  test("matching local and origin SHAs preserve create behavior", () => {
    expect(() =>
      assertLocalBaseFresh({ base: "main", gitCwd: scratch.clone, allowStale: false }),
    ).not.toThrow();
    expect(runCreate("matching").status).toBe(0);
  });

  test("an unresolved origin branch skips comparison", () => {
    advanceOrigin();
    git(scratch.clone, ["update-ref", "-d", "refs/remotes/origin/main"]);

    expect(() =>
      assertLocalBaseFresh({ base: "main", gitCwd: scratch.clone, allowStale: false }),
    ).not.toThrow();
    expect(runCreate("no-origin-ref").status).toBe(0);
  });

  test("SHA and origin-qualified bases are outside local-branch comparison", () => {
    advanceOrigin();

    expect(() =>
      assertLocalBaseFresh({
        base: scratch.localSha,
        gitCwd: scratch.clone,
        allowStale: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertLocalBaseFresh({ base: "origin/main", gitCwd: scratch.clone, allowStale: false }),
    ).not.toThrow();
    expect(runCreate("sha-base", [], scratch.localSha).status).toBe(0);
    expect(runCreate("origin-base", [], "origin/main").status).toBe(0);
  });

  test("a hex-only local branch name is still compared with its origin branch", () => {
    git(scratch.publisher, ["checkout", "-q", "-b", "deadbeef"]);
    writeFileSync(join(scratch.publisher, "hex-branch.txt"), "remote advance\n", "utf-8");
    git(scratch.publisher, ["add", "hex-branch.txt"]);
    git(scratch.publisher, ["commit", "-q", "-m", "advance hex branch"]);
    git(scratch.publisher, ["push", "-q", "-u", "origin", "deadbeef"]);
    git(scratch.clone, ["branch", "deadbeef", scratch.localSha]);
    git(scratch.clone, ["fetch", "-q", "origin", "deadbeef"]);
    const remoteSha = git(scratch.clone, ["rev-parse", "refs/remotes/origin/deadbeef"]);

    expect(() =>
      assertLocalBaseFresh({ base: "deadbeef", gitCwd: scratch.clone, allowStale: false }),
    ).toThrow(`local SHA ${scratch.localSha}`);
    expect(() =>
      assertLocalBaseFresh({ base: "deadbeef", gitCwd: scratch.clone, allowStale: false }),
    ).toThrow(`remote SHA ${remoteSha}`);

    const result = runCreate("hex-branch", [], "deadbeef");
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("origin/deadbeef");
  });
});
