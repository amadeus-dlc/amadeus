// covers: file:tests/harness/fixtures.ts
//
// spawnWorktreeAdd / shouldRetryWorktreeAdd / isWorktreeAddPruneRaceStderr
// (#3088): `git worktree add` removes its incomplete `.git/worktrees/<name>`
// metadata dir on failure, so a concurrent prune/gc that deletes the same
// still-empty dir between mkdir and the `locked` marker write makes the add
// fail with a narrow, low-probability stderr. #3056 first retried this once,
// locally, for tests/integration/t-worktree-gc.test.ts; #3088 catalogued 8
// more fixture-setup call sites with the same exposure and asked for a shared
// helper. The retry branch is driven in-process via an injected `spawn` so it
// is testable without depending on the real (sub-millisecond) race window;
// a final real-git test proves the default wiring is a drop-in replacement
// for the raw spawnSync calls it replaces.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { join } from "node:path";

import {
  cleanupWorktreeFixture,
  isWorktreeAddPruneRaceStderr,
  setupWorktreeFixture,
  shouldRetryWorktreeAdd,
  spawnWorktreeAdd,
  WORKTREE_ADD_PRUNE_RACE_STDERR,
} from "../harness/fixtures.ts";

function fakeResult(status: number, stderr = ""): SpawnSyncReturns<string> {
  return {
    status,
    signal: null,
    output: [null, "", stderr],
    pid: 0,
    stdout: "",
    stderr,
  };
}

describe("isWorktreeAddPruneRaceStderr (#3088)", () => {
  test("matches the exact prune-race fragment", () => {
    expect(
      isWorktreeAddPruneRaceStderr(
        "fatal: could not open '.git/worktrees/wt/locked' for writing: No such file or directory",
      ),
    ).toBe(true);
  });

  test("does not match an unrelated failure", () => {
    expect(isWorktreeAddPruneRaceStderr("fatal: 'wt' already exists")).toBe(false);
  });

  test("does not match the EINVAL sibling of the same race window (deliberately narrow)", () => {
    // Reviewers noted a same-window `... for writing: Invalid argument` variant.
    // Widening the match is a separate, evidence-gated decision (risk: hiding a
    // real failure) — this test pins the current, deliberately narrow scope.
    expect(
      isWorktreeAddPruneRaceStderr(
        "fatal: could not open '.git/worktrees/wt/locked' for writing: Invalid argument",
      ),
    ).toBe(false);
  });
});

describe("shouldRetryWorktreeAdd (#3088)", () => {
  test("true for a bare `worktree add` invocation with the race stderr", () => {
    expect(shouldRetryWorktreeAdd(["worktree", "add", "-q", "/tmp/wt"], WORKTREE_ADD_PRUNE_RACE_STDERR)).toBe(
      true,
    );
  });

  test("true when `worktree add` is prefixed by global flags (-C <dir>)", () => {
    expect(
      shouldRetryWorktreeAdd(["-C", "/repo", "worktree", "add", "-q", "/tmp/wt"], WORKTREE_ADD_PRUNE_RACE_STDERR),
    ).toBe(true);
  });

  test("false for a non-worktree-add command even with matching stderr text", () => {
    expect(shouldRetryWorktreeAdd(["commit", "-qm", "msg"], WORKTREE_ADD_PRUNE_RACE_STDERR)).toBe(false);
  });

  test("false for `worktree remove` (adjacent but different subcommand)", () => {
    expect(
      shouldRetryWorktreeAdd(["worktree", "remove", "--force", "/tmp/wt"], WORKTREE_ADD_PRUNE_RACE_STDERR),
    ).toBe(false);
  });

  test("false for `worktree add` with an unrelated stderr", () => {
    expect(shouldRetryWorktreeAdd(["worktree", "add", "-q", "/tmp/wt"], "fatal: 'wt' already exists")).toBe(
      false,
    );
  });
});

describe("spawnWorktreeAdd (#3088)", () => {
  test("returns the first attempt's result when it succeeds", () => {
    const calls: (readonly string[])[] = [];
    const result = spawnWorktreeAdd("/repo", ["-q", "/tmp/wt"], (args) => {
      calls.push(args);
      return fakeResult(0);
    });
    expect(result.status).toBe(0);
    expect(calls).toEqual([["worktree", "add", "-q", "/tmp/wt"]]);
  });

  test("retries exactly once and returns the second attempt when the first hits the prune race", () => {
    const calls: (readonly string[])[] = [];
    const result = spawnWorktreeAdd("/repo", ["-q", "/tmp/wt"], (args) => {
      calls.push(args);
      return calls.length === 1 ? fakeResult(128, WORKTREE_ADD_PRUNE_RACE_STDERR) : fakeResult(0);
    });
    expect(result.status).toBe(0);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(calls[1]);
  });

  test("does not retry an unrelated failure (never masks a real error)", () => {
    const calls: (readonly string[])[] = [];
    const result = spawnWorktreeAdd("/repo", ["-q", "/tmp/wt"], (args) => {
      calls.push(args);
      return fakeResult(128, "fatal: 'wt' already exists");
    });
    expect(result.status).toBe(128);
    expect(result.stderr).toBe("fatal: 'wt' already exists");
    expect(calls).toHaveLength(1);
  });

  test("retries only once even if the retry also hits the prune race", () => {
    const calls: (readonly string[])[] = [];
    const result = spawnWorktreeAdd("/repo", ["-q", "/tmp/wt"], (args) => {
      calls.push(args);
      return fakeResult(128, WORKTREE_ADD_PRUNE_RACE_STDERR);
    });
    expect(result.status).toBe(128);
    expect(calls).toHaveLength(2);
  });

  const fixtures: string[] = [];
  afterEach(() => {
    for (const f of fixtures.splice(0)) cleanupWorktreeFixture(f);
  });

  test("default wiring: actually adds a real worktree (drop-in for the raw spawnSync call sites it replaces)", () => {
    const fixture = setupWorktreeFixture();
    fixtures.push(fixture);
    const childWt = join(fixture, "wt");
    const result = spawnWorktreeAdd(fixture, ["-q", childWt, "-b", "t3088-branch"]);
    expect(result.status, result.stderr).toBe(0);
    // Sanity: the child worktree is really registered against the fixture repo.
    const list = spawnSync("git", ["-C", fixture, "worktree", "list", "--porcelain"], {
      encoding: "utf-8",
    });
    expect(list.status).toBe(0);
    expect(list.stdout ?? "").toContain(childWt);
  });
});
