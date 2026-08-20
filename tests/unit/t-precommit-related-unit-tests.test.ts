// covers: file:scripts/precommit-related-unit-tests.ts
// size: medium
//
// #1984 — pure core of the pre-commit hook's diff-scoped unit-test step
// (relatedUnitTests, stagedFiles, unitDir, buildFilterPattern) plus main()'s
// full body, driven in-process.
//
// Lives under tests/unit/ (not tests/integration/) despite measuring
// `medium` (real node:fs use, and node:child_process appears throughout the
// mocking below) — grandfathered in tests/.test-size-purity-allowlist.json,
// same as its sibling driveExit precedent tests/unit/t-sensor-fire-seam.test.ts.
// It has to live here: scripts/precommit-related-unit-tests.ts's own
// unitDir() only scans tests/unit/ for `covers:`-linked tests, so this file
// must be IN that directory for the hook to protect its own selection logic
// on a future change to the script.
//
// node:child_process is mocked once, module-wide, BEFORE the dynamic import
// of the script under test (mirrors tests/integration/t-bolt-failure-transitions.test.ts's
// mock.module convention — a static top-level import would bind the real
// spawnSync before the mock installs). "run-tests.ts" spawns are always
// intercepted; "git" spawns are captured for assertions and, when
// `gitDiffMock` is set, return a controlled result (to drive the fail-safe
// paths below) — otherwise they pass through to the REAL spawnSync (safe,
// read-only) so the default-branch test still exercises a real git call.

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as childProcess from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const realSpawnSync = childProcess.spawnSync;

let capturedRunTestsArgs: string[] | null = null;
let mockRunTestsStatus: number | null = 0;

let capturedGitDiffArgs: string[] | null = null;
let gitDiffMock: { error?: Error; status?: number | null; stdout?: string | undefined } | null =
	null;

mock.module("node:child_process", () => ({
	...childProcess,
	spawnSync: ((command: unknown, args?: unknown, options?: unknown) => {
		const argv = Array.isArray(args) ? args.map(String) : [];
		if (argv.some((a) => a.includes("run-tests.ts"))) {
			capturedRunTestsArgs = argv;
			return {
				pid: 1,
				output: [null, "", ""],
				stdout: "",
				stderr: "",
				status: mockRunTestsStatus,
				signal: null,
			};
		}
		if (command === "git" && argv.includes("diff")) {
			capturedGitDiffArgs = argv;
			if (gitDiffMock !== null) {
				return {
					pid: 1,
					output: [null, gitDiffMock.stdout ?? null, ""],
					stdout: gitDiffMock.stdout,
					stderr: "",
					status: gitDiffMock.status ?? 0,
					error: gitDiffMock.error,
					signal: null,
				};
			}
		}
		// biome-ignore lint/suspicious/noExplicitAny: passthrough to the real spawnSync's own overloaded signature
		return realSpawnSync(command as any, args as any, options as any);
	}) as typeof childProcess.spawnSync,
}));

const {
	buildFilterPattern,
	main,
	relatedUnitTests,
	stagedFiles,
	unitDir,
} = await import("../../scripts/precommit-related-unit-tests.ts");

let dir: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "precommit-related-unit-tests-"));
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
	capturedRunTestsArgs = null;
	mockRunTestsStatus = 0;
	capturedGitDiffArgs = null;
	gitDiffMock = null;
});

function write(name: string, body: string): void {
	writeFileSync(join(dir, name), body, "utf-8");
}

describe("relatedUnitTests", () => {
	test("selects a test file whose covers: file: header names a staged path", () => {
		write(
			"t-a.test.ts",
			'// covers: file:packages/framework/core/tools/amadeus-a.ts\nimport { test } from "bun:test";\n',
		);
		write(
			"t-b.test.ts",
			'// covers: file:packages/framework/core/tools/amadeus-b.ts\nimport { test } from "bun:test";\n',
		);
		const staged = new Set(["packages/framework/core/tools/amadeus-a.ts"]);
		expect(relatedUnitTests(staged, dir)).toEqual(["t-a.test.ts"]);
	});

	test("returns [] when no covers: header names a staged file", () => {
		write(
			"t-a.test.ts",
			'// covers: file:packages/framework/core/tools/amadeus-a.ts\nimport { test } from "bun:test";\n',
		);
		const staged = new Set(["README.md"]);
		expect(relatedUnitTests(staged, dir)).toEqual([]);
	});

	test("matches on any one of multiple covers: file: ids in the header", () => {
		write(
			"t-multi.test.ts",
			[
				"// covers: file:packages/a.ts",
				"//   file:packages/b.ts",
				'import { test } from "bun:test";',
				"",
			].join("\n"),
		);
		const staged = new Set(["packages/b.ts"]);
		expect(relatedUnitTests(staged, dir)).toEqual(["t-multi.test.ts"]);
	});

	test("ignores a non-file: covers id (e.g. a function: claim) for staged-path matching", () => {
		write(
			"t-fn.test.ts",
			'// covers: function:someHelper\nimport { test } from "bun:test";\n',
		);
		const staged = new Set(["function:someHelper"]);
		expect(relatedUnitTests(staged, dir)).toEqual([]);
	});

	test("ignores non-.test.ts files in the directory", () => {
		write(
			"t-a.test.ts",
			'// covers: file:packages/a.ts\nimport { test } from "bun:test";\n',
		);
		write("helper.ts", "// not a test file\n");
		const staged = new Set(["packages/a.ts"]);
		expect(relatedUnitTests(staged, dir)).toEqual(["t-a.test.ts"]);
	});

	test("results are sorted", () => {
		write(
			"t-z.test.ts",
			'// covers: file:packages/shared.ts\nimport { test } from "bun:test";\n',
		);
		write(
			"t-a.test.ts",
			'// covers: file:packages/shared.ts\nimport { test } from "bun:test";\n',
		);
		const staged = new Set(["packages/shared.ts"]);
		expect(relatedUnitTests(staged, dir)).toEqual(["t-a.test.ts", "t-z.test.ts"]);
	});
});

describe("stagedFiles", () => {
	const prior = process.env.AMADEUS_PRECOMMIT_STAGED_FILES;

	afterEach(() => {
		if (prior === undefined) delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		else process.env.AMADEUS_PRECOMMIT_STAGED_FILES = prior;
	});

	test("splits the injected newline-separated list, trimming and dropping blanks", () => {
		process.env.AMADEUS_PRECOMMIT_STAGED_FILES = "a.ts\n\n  b.ts  \n";
		expect(stagedFiles()).toEqual(["a.ts", "b.ts"]);
	});

	test("an empty injected value yields no staged files", () => {
		process.env.AMADEUS_PRECOMMIT_STAGED_FILES = "";
		expect(stagedFiles()).toEqual([]);
	});

	test("without the injection seam, spawns the real `git diff --cached` read-only", () => {
		delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		// Content is whatever this repo's real index happens to have staged
		// right now (irrelevant to this test) — only that the spawnSync code
		// path executes and returns an array without throwing.
		expect(Array.isArray(stagedFiles())).toBe(true);
	});

	test("passes -c core.quotepath=false so non-ASCII paths aren't octal-escaped", () => {
		delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		stagedFiles();
		expect(capturedGitDiffArgs).not.toBeNull();
		const args = capturedGitDiffArgs as string[];
		const cIndex = args.indexOf("-c");
		expect(cIndex).toBeGreaterThanOrEqual(0);
		expect(args[cIndex + 1]).toBe("core.quotepath=false");
	});

	test("round-trips a non-ASCII path exactly as git (with quotepath=false) reports it", () => {
		delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		gitDiffMock = { status: 0, stdout: "packages/日本語ファイル.ts\n" };
		expect(stagedFiles()).toEqual(["packages/日本語ファイル.ts"]);
	});

	test("fail-safe: a spawn error (e.g. git not on PATH) skips rather than throws", () => {
		delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		gitDiffMock = { error: new Error("spawnSync git ENOENT") };
		expect(stagedFiles()).toEqual([]);
	});

	test("fail-safe: a non-zero git exit skips rather than throws", () => {
		delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		gitDiffMock = { status: 1, stdout: "" };
		expect(stagedFiles()).toEqual([]);
	});

	test("fail-safe: missing stdout skips rather than throws", () => {
		delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		gitDiffMock = { status: 0, stdout: undefined };
		expect(stagedFiles()).toEqual([]);
	});
});

describe("unitDir", () => {
	const prior = process.env.AMADEUS_PRECOMMIT_UNIT_DIR;

	afterEach(() => {
		if (prior === undefined) delete process.env.AMADEUS_PRECOMMIT_UNIT_DIR;
		else process.env.AMADEUS_PRECOMMIT_UNIT_DIR = prior;
	});

	test("defaults to <repo root>/tests/unit", () => {
		delete process.env.AMADEUS_PRECOMMIT_UNIT_DIR;
		expect(unitDir().endsWith(join("tests", "unit"))).toBe(true);
	});

	test("honours the AMADEUS_PRECOMMIT_UNIT_DIR override", () => {
		process.env.AMADEUS_PRECOMMIT_UNIT_DIR = dir;
		expect(unitDir()).toBe(dir);
	});
});

describe("buildFilterPattern", () => {
	test("builds an exact alternation anchored at both ends", () => {
		expect(buildFilterPattern(["t-a.test.ts", "t-b.test.ts"])).toBe(
			"^(t-a\\.test\\.ts|t-b\\.test\\.ts)$",
		);
	});

	test("escapes every regex-special character in a basename", () => {
		expect(buildFilterPattern(["t+weird[name].test.ts"])).toBe(
			"^(t\\+weird\\[name\\]\\.test\\.ts)$",
		);
	});

	test("a single basename still gets the alternation wrapper", () => {
		expect(buildFilterPattern(["t-only.test.ts"])).toBe("^(t-only\\.test\\.ts)$");
	});
});

describe("main — early-return branches (no spawn)", () => {
	const priorStaged = process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
	const priorUnitDir = process.env.AMADEUS_PRECOMMIT_UNIT_DIR;

	afterEach(() => {
		if (priorStaged === undefined) delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		else process.env.AMADEUS_PRECOMMIT_STAGED_FILES = priorStaged;
		if (priorUnitDir === undefined) delete process.env.AMADEUS_PRECOMMIT_UNIT_DIR;
		else process.env.AMADEUS_PRECOMMIT_UNIT_DIR = priorUnitDir;
	});

	test("no staged files: returns without spawning run-tests.ts", () => {
		process.env.AMADEUS_PRECOMMIT_STAGED_FILES = "";
		main();
		expect(capturedRunTestsArgs).toBeNull();
	});

	test("staged files with no covering unit test: returns without spawning run-tests.ts", () => {
		process.env.AMADEUS_PRECOMMIT_STAGED_FILES = "README.md";
		process.env.AMADEUS_PRECOMMIT_UNIT_DIR = dir; // empty fixture dir — no covers claims at all
		main();
		expect(capturedRunTestsArgs).toBeNull();
	});

	test("a failed git diff (no injection seam) does not crash main() — skips instead", () => {
		delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		gitDiffMock = { error: new Error("spawnSync git ENOENT") };
		expect(() => main()).not.toThrow();
		expect(capturedRunTestsArgs).toBeNull();
	});
});

describe("main — happy path (mocked run-tests.ts spawn)", () => {
	const priorStaged = process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
	const priorUnitDir = process.env.AMADEUS_PRECOMMIT_UNIT_DIR;
	const origExit = process.exit;

	beforeEach(() => {
		write(
			"t-fixture.test.ts",
			'// covers: file:packages/framework/core/tools/amadeus-fixture.ts\nimport { test } from "bun:test";\n',
		);
		process.env.AMADEUS_PRECOMMIT_STAGED_FILES =
			"packages/framework/core/tools/amadeus-fixture.ts";
		process.env.AMADEUS_PRECOMMIT_UNIT_DIR = dir;
	});

	afterEach(() => {
		if (priorStaged === undefined) delete process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
		else process.env.AMADEUS_PRECOMMIT_STAGED_FILES = priorStaged;
		if (priorUnitDir === undefined) delete process.env.AMADEUS_PRECOMMIT_UNIT_DIR;
		else process.env.AMADEUS_PRECOMMIT_UNIT_DIR = priorUnitDir;
		process.exit = origExit;
	});

	// main() ends in process.exit; trap it into a throwable so the drive
	// returns the exit code instead of killing the test runner (mirrors
	// tests/unit/t-sensor-fire-seam.test.ts's driveExit convention).
	class ExitSignal {
		constructor(readonly code: number) {}
	}
	function driveExit(fn: () => void): number {
		process.exit = ((code?: number) => {
			throw new ExitSignal(code ?? 0);
		}) as typeof process.exit;
		try {
			fn();
			return 0;
		} catch (e) {
			if (e instanceof ExitSignal) return e.code;
			throw e;
		}
	}

	test("spawns run-tests.ts with --unit --filter <pattern> and exits 0 on success", () => {
		mockRunTestsStatus = 0;
		const code = driveExit(() => main());
		expect(code).toBe(0);
		expect(capturedRunTestsArgs).not.toBeNull();
		const args = capturedRunTestsArgs as string[];
		expect(args.some((a) => a.endsWith(join("tests", "run-tests.ts")))).toBe(true);
		expect(args).toContain("--unit");
		expect(args).toContain("--filter");
		expect(args[args.length - 1]).toBe(buildFilterPattern(["t-fixture.test.ts"]));
	});

	test("exits with run-tests.ts's own status on failure", () => {
		mockRunTestsStatus = 1;
		const code = driveExit(() => main());
		expect(code).toBe(1);
	});

	test("a null status exits 1 (defensive default)", () => {
		mockRunTestsStatus = null;
		const code = driveExit(() => main());
		expect(code).toBe(1);
	});
});
