#!/usr/bin/env bun
// lefthook-prepare.ts — #3419: only the MAIN checkout should own/regenerate
// the shared .git/hooks/pre-commit.
//
// THE BUG. `lefthook install`'s generated hook bakes the INVOKING checkout's
// absolute node_modules path into a primary resolution branch (an
// `elif /abs/path/.../lefthook -h then /abs/path/.../lefthook "$@"` clause).
// Every worktree's `bun install` (the `prepare` lifecycle script) re-runs
// `lefthook install`, and because `.git/hooks/` lives in the repo's shared
// common dir (visible to every worktree via `commondir`), a worktree's
// install HIJACKS the one shared hook file with its own (worktree-local,
// eventually deleted) absolute path — breaking every worktree's commit
// hook, and, while the stale worktree still exists, running ITS binary
// instead of whichever worktree is actually committing (a supply-chain
// concern, not just breakage). Observed verbatim in this repo's own shared
// `.git/hooks/pre-commit` (#3419).
//
// THE FIX. A linked worktree's `git rev-parse --git-dir` differs from its
// `--git-common-dir` (it resolves to `<common>/worktrees/<name>`, a
// SUBDIRECTORY of the common dir); the main checkout's are identical. This
// is git's own structural signal for "am I a linked worktree" — robust to
// any worktree location/naming convention (unlike guessing a path prefix
// such as `.claude/worktrees/` or `worktrees/j5ik2o.github.com/...`). A
// linked worktree's `bun install` skips `lefthook install` entirely: the
// shared hook stays owned by the main checkout, and every worktree still
// benefits from it — it is SHARED via commondir, not per-worktree, so
// there is nothing to install from a worktree in the first place.
import { spawnSync } from "node:child_process";

// Ambient GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE (set by git for hook
// subprocesses, inherited by any child that doesn't override them) win over
// `cwd` entirely -- git resolves the repo from them regardless of what
// directory the caller actually asked about. `prepare` itself is not
// invoked from inside a git hook in normal use, but stripping them here
// keeps `gitRevParse`'s `cwd` argument authoritative under ANY invocation
// context (verified: this repo's own test suite runs through the pre-commit
// hook, and without this, `gitRevParse(arg, cwd)` silently ignores `cwd`
// and answers for whichever worktree's commit triggered the test run).
const AMBIENT_GIT_ENV_KEYS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"] as const;

function gitRevParse(arg: string, cwd: string): string | null {
	const env = { ...process.env };
	for (const key of AMBIENT_GIT_ENV_KEYS) delete env[key];
	const r = spawnSync("git", ["rev-parse", arg], { cwd, encoding: "utf-8", env });
	if (r.status !== 0) return null;
	return r.stdout.trim();
}

/** `true` = a linked worktree (its git-dir is a subdirectory of the common
 *  dir); `false` = the main checkout (they resolve identically); `null` =
 *  not resolvable (not a git repo, or `git` unavailable) — callers should
 *  fail OPEN (attempt the install anyway) in that case, matching a
 *  pre-commit hook's "DX convenience, never the enforcement boundary"
 *  posture: this check must never be the reason `bun install` breaks. */
export function isLinkedWorktree(cwd: string = process.cwd()): boolean | null {
	const gitDir = gitRevParse("--git-dir", cwd);
	const commonDir = gitRevParse("--git-common-dir", cwd);
	if (gitDir === null || commonDir === null) return null;
	return gitDir !== commonDir;
}

export function main(
	cwd: string = process.cwd(),
	runInstall: () => number = () =>
		spawnSync("lefthook", ["install"], { cwd, stdio: "inherit" }).status ?? 0,
): number {
	if (isLinkedWorktree(cwd) === true) {
		console.log(
			"lefthook-prepare: linked worktree detected (git-dir != git-common-dir) -- " +
				"skipping `lefthook install`. The shared pre-commit hook is owned by the " +
				"main checkout and already visible here via the shared .git/hooks/ (#3419).",
		);
		return 0;
	}
	return runInstall();
}

if (import.meta.main) process.exit(main());
