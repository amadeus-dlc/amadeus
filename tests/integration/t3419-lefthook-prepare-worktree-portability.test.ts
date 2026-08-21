// covers: file:scripts/lefthook-prepare.ts
// size: medium
//
// #3419 falling proof, entirely inside disposable os.tmpdir() directories —
// never touches the real shared repo.
//
// TOPOLOGY: a plain `git init` main checkout plus one `git worktree add`
// linked worktree — the minimal shape that reproduces the bug regardless of
// whether the "main" repo is itself bare-hub-based (this repo's own layout)
// or a plain clone (most projects): what matters is only that `--git-dir`
// and `--git-common-dir` diverge for the worktree and agree for the main
// checkout (verified once, structurally, in tests/unit/t-lefthook-prepare.test.ts's
// "returns a boolean for this real repo's own checkout" case, which runs
// against this repo's own real worktree topology).
//
// STAND-IN INSTALLER: the real `lefthook install` bakes the invoking
// checkout's absolute node_modules path into the generated hook via a
// third-party binary's template — not something to re-implement here. The
// FIRST test below stands that mechanism in with a tiny installer that
// writes exactly the shape of the real bug (a hook file naming the
// invoking checkout's own absolute path) into the shared `.git/hooks/`,
// unconditionally, from wherever it's run — i.e. today's actual `prepare`
// script's behavior. It demonstrates the vulnerability class: run from
// main, then run from the worktree, and the shared hook is hijacked to the
// worktree's (later-deleted) path. The SECOND test proves the real
// production `main()`/`isLinkedWorktree()` from scripts/lefthook-prepare.ts
// prevents exactly this: called with the worktree's cwd, it never invokes
// the installer at all, so the shared hook stays whatever main last wrote —
// and keeps working after the worktree is deleted.
//
// Read together, these are the "worktree install -> shared hook broken
// today -> fix -> hook works from main AND worktrees, survives worktree
// deletion" proof #3419 asks for.

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as childProcess from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { spawnSync } = childProcess;
// Captured BEFORE mock.module runs -- mock.module rewrites the live
// "node:child_process" module namespace in place, so a property read of
// `childProcess.spawnSync` made AFTER registration (e.g. from inside the
// mock factory's own body, at call time) resolves to the mock itself and
// self-recurses infinitely. Capturing the function value here, while the
// binding still points at the real implementation, is what lets the
// passthrough branch below actually reach the real spawnSync.
const realSpawnSync = childProcess.spawnSync;

// main()'s default `runInstall` (used whenever it's called with just a
// `cwd`, i.e. the real `import.meta.main` entrypoint path) really spawns
// `lefthook install` -- exercised below by mocking node:child_process so
// that ONE call is intercepted while every "git" call (this test's own
// scratch-repo setup, and main()'s own isLinkedWorktree() resolution)
// still passes through to the real spawnSync. Mirrors the module-wide
// mock.module + dynamic-import-after-mock convention established in
// tests/integration/t-bolt-failure-transitions.test.ts.
let capturedLefthookArgs: string[] | null = null;
let capturedLefthookCwd: string | undefined;
let mockLefthookStatus: number | null = 0;

mock.module("node:child_process", () => ({
	...childProcess,
	spawnSync: ((command: unknown, args?: unknown, options?: unknown) => {
		if (command === "lefthook") {
			capturedLefthookArgs = Array.isArray(args) ? args.map(String) : [];
			capturedLefthookCwd =
				options !== null && typeof options === "object" && "cwd" in options
					? (options as { cwd?: string }).cwd
					: undefined;
			return {
				pid: 1,
				output: [null, "", ""],
				stdout: "",
				stderr: "",
				status: mockLefthookStatus,
				signal: null,
			};
		}
		// biome-ignore lint/suspicious/noExplicitAny: passthrough to the real spawnSync's own overloaded signature
		return realSpawnSync(command as any, args as any, options as any);
	}) as typeof childProcess.spawnSync,
}));

const { isLinkedWorktree, main: prepareMain } = await import("../../scripts/lefthook-prepare.ts");

let root: string;
let worktree: string;
let hookPath: string;

function git(cwd: string, args: readonly string[]): void {
	const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
	if (r.status !== 0) {
		throw new Error(`git ${args.join(" ")} in ${cwd} failed: ${r.stderr?.trim() || r.stdout?.trim()}`);
	}
}

/** Stands in for the real `lefthook install`'s absolute-path-baking
 *  behavior: writes a "hook" naming `installingCwd`'s own path, into the
 *  SHARED `.git/hooks/pre-commit` (resolved via `git rev-parse --git-path
 *  hooks`, so it lands in the common dir regardless of whether
 *  `installingCwd` is main or a worktree — exactly like the real shared
 *  `.git/hooks/`). */
function installOldStyle(installingCwd: string): void {
	const hooksDirResult = spawnSync("git", ["rev-parse", "--git-path", "hooks"], {
		cwd: installingCwd,
		encoding: "utf-8",
	});
	// `--git-path` reports relative-to-cwd from the main checkout but
	// ABSOLUTE from a linked worktree (its git-dir isn't under `cwd` at
	// all) — join only when relative.
	const rawHooksDir = hooksDirResult.stdout.trim();
	const hooksDir = rawHooksDir.startsWith("/") ? rawHooksDir : join(installingCwd, rawHooksDir);
	spawnSync("mkdir", ["-p", hooksDir]);
	const bakedPath = join(installingCwd, "node_modules", "lefthook-fake", "bin", "lefthook");
	writeFileSync(
		join(hooksDir, "pre-commit"),
		`#!/bin/sh\n# baked absolute path (old-style, #3419 bug):\nLEFTHOOK_BIN="${bakedPath}"\n`,
		"utf-8",
	);
}

function readSharedHook(): string {
	return readFileSync(hookPath, "utf-8");
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "t3419-main-"));
	git(root, ["init", "-q"]);
	git(root, ["config", "user.email", "t3419@example.com"]);
	git(root, ["config", "user.name", "t3419"]);
	git(root, ["commit", "-q", "-m", "init", "--allow-empty"]);
	const wtParent = mkdtempSync(join(tmpdir(), "t3419-wt-parent-"));
	worktree = join(wtParent, "wt1");
	git(root, ["worktree", "add", "-q", worktree, "-b", "t3419-feat"]);
	hookPath = join(root, ".git", "hooks", "pre-commit");
});

afterEach(() => {
	// Worktree may already be removed by the test; ignore failure either way.
	spawnSync("git", ["-C", root, "worktree", "remove", "--force", worktree], { encoding: "utf-8" });
	rmSync(root, { recursive: true, force: true });
	rmSync(join(worktree, ".."), { recursive: true, force: true });
	capturedLefthookArgs = null;
	capturedLefthookCwd = undefined;
	mockLefthookStatus = 0;
});

describe("vulnerability class (today's behavior): a worktree install hijacks the shared hook", () => {
	test("main's install, then the worktree's install, overwrites the shared hook with the worktree's own path", () => {
		installOldStyle(root);
		const afterMain = readSharedHook();
		expect(afterMain).toContain(root);

		installOldStyle(worktree);
		const afterWorktree = readSharedHook();
		expect(afterWorktree).toContain(worktree);
		expect(afterWorktree).not.toBe(afterMain);
	});

	test("deleting the worktree leaves the shared hook pointing at a now-nonexistent path", () => {
		installOldStyle(worktree);
		const bakedLine = readSharedHook();
		expect(bakedLine).toContain(worktree);

		rmSync(worktree, { recursive: true, force: true });
		spawnSync("git", ["-C", root, "worktree", "prune"], { encoding: "utf-8" });

		// The hook is unchanged (nothing re-runs install on deletion) and now
		// names a path that no longer exists -- the "全 hook が壊れる" failure.
		const stillBaked = readSharedHook();
		expect(stillBaked).toBe(bakedLine);
		expect(existsSync(join(worktree, "node_modules", "lefthook-fake", "bin", "lefthook"))).toBe(false);
	});
});

describe("fix: scripts/lefthook-prepare.ts's main()/isLinkedWorktree()", () => {
	test("isLinkedWorktree correctly distinguishes main from the linked worktree in this real topology", () => {
		expect(isLinkedWorktree(root)).toBe(false);
		expect(isLinkedWorktree(worktree)).toBe(true);
	});

	test("main() run from the worktree never invokes the installer, leaving the shared hook exactly as main last set it", () => {
		installOldStyle(root); // main "owns" the hook, as intended post-fix
		const ownedByMain = readSharedHook();

		let called = 0;
		const code = prepareMain(worktree, () => {
			called += 1;
			installOldStyle(worktree); // would hijack it, if it ran
			return 0;
		});

		expect(code).toBe(0);
		expect(called).toBe(0);
		expect(readSharedHook()).toBe(ownedByMain);
		expect(readSharedHook()).toContain(root);
	});

	test("the shared hook survives worktree deletion when the fix was used", () => {
		installOldStyle(root);
		const ownedByMain = readSharedHook();
		prepareMain(worktree, () => {
			installOldStyle(worktree);
			return 0;
		});

		rmSync(worktree, { recursive: true, force: true });
		spawnSync("git", ["-C", root, "worktree", "prune"], { encoding: "utf-8" });

		expect(readSharedHook()).toBe(ownedByMain);
		expect(readSharedHook()).toContain(root);
	});

	test("main() run from the main checkout still installs normally (unaffected by the fix)", () => {
		let called = 0;
		const code = prepareMain(root, () => {
			called += 1;
			return 0;
		});
		expect(called).toBe(1);
		expect(code).toBe(0);
	});

	test("main()'s default runInstall really spawns `lefthook install` in cwd when called with just a cwd", () => {
		mockLefthookStatus = 0;
		const code = prepareMain(root);
		expect(code).toBe(0);
		expect(capturedLefthookArgs).toEqual(["install"]);
		expect(capturedLefthookCwd).toBe(root);
	});

	test("main()'s default runInstall propagates lefthook's own exit status", () => {
		mockLefthookStatus = 3;
		const code = prepareMain(root);
		expect(code).toBe(3);
	});

	test("main()'s default runInstall treats a null status as 0 (defensive default)", () => {
		mockLefthookStatus = null;
		const code = prepareMain(root);
		expect(code).toBe(0);
	});
});
