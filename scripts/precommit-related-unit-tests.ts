#!/usr/bin/env bun
// precommit-related-unit-tests.ts — #1984: the diff-scoped unit-test step of
// the pre-commit hook.
//
// WHY DIFF-SCOPED. Typecheck and lint already run whole-repo on every commit
// (both fast enough to stay well inside the ~30s pre-commit budget). The
// unit tier is not: running it in full would blow that budget on a large
// repo, so this scopes to only the unit tests that COVER a staged file,
// using the same `covers: file:<path>` header convention
// tests/gen-coverage-registry.ts already parses for the coverage registry
// (parseCoversHeader, re-exported from there rather than re-implemented).
//
// SCOPE = STAGED FILES (git diff --cached), not the working tree or a base
// ref: a pre-commit hook only cares about what THIS commit changes. The
// staged-file list is injectable via AMADEUS_PRECOMMIT_STAGED_FILES
// (newline-separated, repo-relative paths) so tests can drive this
// deterministically without a real git index.
//
// NO MATCH IS NOT A FAILURE. A doc-only or config-only commit, or a staged
// source file with no unit-test claim on it (a genuine coverage gap — that
// is #1982's/#1979's concern, not this hook's), simply runs zero tests and
// exits 0. This hook enforces "existing coverage still passes", not
// "coverage exists".
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCoversHeader } from "../tests/gen-coverage-registry.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function unitDir(): string {
	return process.env.AMADEUS_PRECOMMIT_UNIT_DIR ?? join(REPO_ROOT, "tests", "unit");
}

export function stagedFiles(): string[] {
	const injected = process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
	const lines =
		injected !== undefined
			? injected.split("\n")
			: spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
					cwd: REPO_ROOT,
					encoding: "utf-8",
				}).stdout.split("\n");
	return lines.map((l) => l.trim()).filter((l) => l.length > 0);
}

/** Every `*.test.ts` file directly under `dir` whose `covers: file:<path>`
 *  header names one of the given staged paths. Returns paths relative to
 *  `dir` (just the basename, since tests/unit/ is flat) — the pure core,
 *  parameterized on `dir` so a fixture directory can drive this in-process
 *  without touching the repo's real tests/unit/. */
export function relatedUnitTests(staged: ReadonlySet<string>, dir: string): string[] {
	const related: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (!entry.endsWith(".test.ts")) continue;
		const src = readFileSync(join(dir, entry), "utf-8");
		const ids = parseCoversHeader(src, false);
		const coversStagedFile = ids.some((id) => {
			if (!id.startsWith("file:")) return false;
			return staged.has(id.slice("file:".length));
		});
		if (coversStagedFile) related.push(entry);
	}
	return related.sort();
}

/** Builds the `--filter` extended-regex `run-tests.ts` expects: an exact
 *  alternation of the given basenames, each regex-escaped. */
export function buildFilterPattern(basenames: readonly string[]): string {
	const escaped = basenames.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	return `^(${escaped.join("|")})$`;
}

export function main(): void {
	const staged = new Set(stagedFiles());
	if (staged.size === 0) {
		console.log("precommit-related-unit-tests: no staged files — nothing to run.");
		return;
	}

	const basenames = relatedUnitTests(staged, unitDir());
	if (basenames.length === 0) {
		console.log(
			"precommit-related-unit-tests: no tests/unit/*.test.ts file covers a staged file — skipping.",
		);
		return;
	}

	console.log(`precommit-related-unit-tests: running ${basenames.length} related unit test(s):`);
	for (const b of basenames) console.log(`  - ${b}`);

	const pattern = buildFilterPattern(basenames);
	const result = spawnSync(
		"bun",
		[join(REPO_ROOT, "tests", "run-tests.ts"), "--unit", "--filter", pattern],
		{ cwd: REPO_ROOT, stdio: "inherit" },
	);
	process.exit(result.status ?? 1);
}

if (import.meta.main) main();
