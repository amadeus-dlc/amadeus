// covers: file:scripts/lefthook-prepare.ts
// size: small
//
// #3419 — pure-ish core of lefthook-prepare.ts: isLinkedWorktree()'s
// git-dir-vs-common-dir detection (against this real repo's own checkout,
// so no scratch git repo is needed here) and main()'s skip-vs-install
// decision, driven with an injectable install callback so the real
// `lefthook install` never runs. The full falling proof — a disposable
// repo with a REAL linked worktree, hijack -> fix -> survives worktree
// deletion — lives in
// tests/integration/t3419-lefthook-prepare-worktree-portability.test.ts
// (needs real git worktree/spawn, so it can't be a small unit test).

import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isLinkedWorktree, main } from "../../scripts/lefthook-prepare.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("isLinkedWorktree", () => {
	test("returns a boolean for this real repo's own checkout (no throw)", () => {
		expect(typeof isLinkedWorktree(REPO_ROOT)).toBe("boolean");
	});

	test("returns null for a directory that isn't a git repo at all", () => {
		expect(isLinkedWorktree("/")).toBeNull();
	});

	test("defaults cwd to process.cwd() when omitted", () => {
		// This repo's own test runner cwd is inside the repo, so this must not
		// throw and must return a boolean, same as the explicit-REPO_ROOT case.
		expect(typeof isLinkedWorktree()).toBe("boolean");
	});
});

describe("main", () => {
	test("runs the install callback iff isLinkedWorktree(cwd) is not true", () => {
		let called = 0;
		const code = main(REPO_ROOT, () => {
			called += 1;
			return 0;
		});
		const expectSkip = isLinkedWorktree(REPO_ROOT) === true;
		expect(called).toBe(expectSkip ? 0 : 1);
		expect(code).toBe(0);
	});

	test("propagates the install callback's status code when not skipped", () => {
		const code = main("/", () => 7);
		// "/" resolves to null (not a git repo) -> fails OPEN, callback runs.
		expect(code).toBe(7);
	});

	test("skips and returns 0 without calling the install callback for a known linked-worktree cwd", () => {
		let called = 0;
		const found = isLinkedWorktree(REPO_ROOT);
		if (found !== true) {
			// This checkout itself isn't a linked worktree in this environment;
			// the skip branch is still covered by the integration falling-proof
			// test's real worktree topology.
			return;
		}
		const code = main(REPO_ROOT, () => {
			called += 1;
			return 1;
		});
		expect(called).toBe(0);
		expect(code).toBe(0);
	});
});
