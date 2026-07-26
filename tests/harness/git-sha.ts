// git-sha.ts — the ONE definition of "which commit is this checkout on?" for tests.
//
// Performance/provenance tests stamp their samples with the HEAD SHA. The three
// call sites (t257 / t258 / t259) each carried a byte-copied helper that walked
// git's internal layout by hand: .git file -> gitdir -> HEAD -> loose ref ->
// commondir -> packed-refs. That walk is wrong inside a `git worktree`: a
// worktree's branch ref lives as a loose ref under the COMMON dir
// (<main>/.git/refs/heads/<branch>), never in the worktree's own gitdir and not
// necessarily in packed-refs, so the helper threw "cannot resolve Git ref" and
// the three suites were permanently red on any worktree checkout (#1481, #1455).
//
// Fix: delegate to git plumbing instead of reading git's on-disk layout, the
// same way amadeus-lib.ts's resolveMainCheckout() delegates to
// `git rev-parse --git-common-dir`. Plumbing knows about worktrees; we do not.

import { spawnSync } from "node:child_process";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// Resolve the given ref (default HEAD) to a full SHA via `git rev-parse`.
// Throws loudly when git cannot resolve it — a test that cannot stamp its
// provenance must fail, not silently record a placeholder.
export function currentGitSha(repositoryRoot: string = REPO_ROOT, ref = "HEAD"): string {
  const result = spawnSync("git", ["rev-parse", ref], {
    cwd: repositoryRoot,
    encoding: "utf-8",
    env: process.env,
  });
  const sha = (result.stdout ?? "").toString().trim();
  if (result.status !== 0 || sha.length === 0) {
    const detail = (result.stderr ?? "").toString().trim() || `status ${result.status}`;
    throw new Error(`cannot resolve Git ref ${ref} in ${repositoryRoot}: ${detail}`);
  }
  return sha;
}
