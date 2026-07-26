// t297 — currentGitSha helper contract (tests/harness/git-sha.ts).
//
// The helper is the ONE definition test suites use to stamp provenance SHAs
// (#1481 / #1455 replaced three hand-copied git-layout walkers with it). Two
// contracts matter and both must hold on plain clones AND git worktrees:
//   1. happy path — HEAD resolves to a full SHA via `git rev-parse` plumbing;
//   2. loud throw — a directory that is not a git repository must throw, never
//      return a placeholder (a test that cannot stamp provenance must fail).
// The throw path is exercised in-process here so the patch coverage gate sees
// it on CI runners where live-CLI suites are skipped.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentGitSha } from "../harness/git-sha.ts";

describe("t297 currentGitSha helper contract", () => {
  test("resolves HEAD of this checkout to a full 40-hex SHA", () => {
    const sha = currentGitSha();
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  test("throws loudly for a directory that is not a git repository", () => {
    const scratch = mkdtempSync(join(tmpdir(), "t297-non-repo-"));
    try {
      expect(() => currentGitSha(scratch)).toThrow(/cannot resolve Git ref HEAD/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
