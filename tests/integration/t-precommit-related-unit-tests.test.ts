// covers: file:scripts/precommit-related-unit-tests.ts
// size: medium
//
// #1984 — pure core of the pre-commit hook's diff-scoped unit-test step
// (relatedUnitTests, stagedFiles, unitDir, buildFilterPattern) plus main()'s
// full body, driven in-process.
//
// node:child_process is mocked once, module-wide, BEFORE the dynamic import
// of the script under test (mirrors tests/integration/t-bolt-failure-transitions.test.ts's
// mock.module convention — a static top-level import would bind the real
// spawnSync before the mock installs). The mock passes any "git ..." argv
// through to the REAL spawnSync unchanged (stagedFiles()'s git-diff call is
// read-only and safe to run for real against this repo — its content is
// never asserted on, only that the code path executes without throwing),
// and intercepts only the "run-tests.ts" argv main() spawns, so main()'s
// full body — including its process.exit — is driven for real without ever
// recursively spawning the actual test runner.

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as childProcess from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const realSpawnSync = childProcess.spawnSync;

let capturedRunTestsArgs: string[] | null = null;
let capturedRunTestsEnv: NodeJS.ProcessEnv | null = null;
let mockRunTestsStatus: number | null = 0;

mock.module("node:child_process", () => ({
	...childProcess,
	spawnSync: ((command: unknown, args?: unknown, options?: unknown) => {
		const argv = Array.isArray(args) ? args.map(String) : [];
		if (argv.some((a) => a.includes("run-tests.ts"))) {
			capturedRunTestsArgs = argv;
			capturedRunTestsEnv = (options as { env?: NodeJS.ProcessEnv } | undefined)?.env ?? null;
			return {
				pid: 1,
				output: [null, "", ""],
				stdout: "",
				stderr: "",
				status: mockRunTestsStatus,
				signal: null,
			};
		}
		// biome-ignore lint/suspicious/noExplicitAny: passthrough to the real spawnSync's own overloaded signature
		return realSpawnSync(command as any, args as any, options as any);
	}) as typeof childProcess.spawnSync,
}));

const {
	REENTRY_MARKER_ENV,
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
	capturedRunTestsEnv = null;
	mockRunTestsStatus = 0;
});

// main() ends in process.exit; trap it into a throwable so a drive returns the
// exit code instead of killing the test runner (mirrors
// tests/unit/t-sensor-fire-seam.test.ts's driveExit convention).
class ExitSignal {
	constructor(readonly code: number) {}
}
function driveExit(fn: () => void): number {
	const origExit = process.exit;
	process.exit = ((code?: number) => {
		throw new ExitSignal(code ?? 0);
	}) as typeof process.exit;
	try {
		fn();
		return 0;
	} catch (e) {
		if (e instanceof ExitSignal) return e.code;
		throw e;
	} finally {
		process.exit = origExit;
	}
}

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

// #3413 — the hook hands the test run an environment with git's ambient
// repository binding removed, and refuses to re-enter itself if a test run ever
// reaches `git commit` on a real repository anyway.
describe("main — #3413 hermetic git environment and re-entry guard", () => {
	const priorStaged = process.env.AMADEUS_PRECOMMIT_STAGED_FILES;
	const priorUnitDir = process.env.AMADEUS_PRECOMMIT_UNIT_DIR;
	const priorMarker = process.env[REENTRY_MARKER_ENV];
	const priorGitDir = process.env.GIT_DIR;
	const origError = console.error;
	let stderr: string[] = [];

	beforeEach(() => {
		write(
			"t-fixture.test.ts",
			'// covers: file:packages/framework/core/tools/amadeus-fixture.ts\nimport { test } from "bun:test";\n',
		);
		process.env.AMADEUS_PRECOMMIT_STAGED_FILES =
			"packages/framework/core/tools/amadeus-fixture.ts";
		process.env.AMADEUS_PRECOMMIT_UNIT_DIR = dir;
		stderr = [];
		console.error = (...parts: unknown[]) => {
			stderr.push(parts.map(String).join(" "));
		};
	});

	afterEach(() => {
		console.error = origError;
		for (const [key, value] of Object.entries({
			AMADEUS_PRECOMMIT_STAGED_FILES: priorStaged,
			AMADEUS_PRECOMMIT_UNIT_DIR: priorUnitDir,
			[REENTRY_MARKER_ENV]: priorMarker,
			GIT_DIR: priorGitDir,
		})) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});

	test("the runner spawn gets no ambient binding, and carries the re-entry marker", () => {
		// The hook's own environment is bound to the repository being committed
		// to — that is exactly what the test run must not inherit.
		process.env.GIT_DIR = "/real/.git/worktrees/enhance-1";
		mockRunTestsStatus = 0;

		expect(driveExit(() => main())).toBe(0);

		const env = capturedRunTestsEnv as NodeJS.ProcessEnv;
		expect(env).not.toBeNull();
		expect(env.GIT_DIR).toBeUndefined();
		expect(env.GIT_CONFIG_GLOBAL).toBeDefined();
		expect(env[REENTRY_MARKER_ENV]).toBe("1");
		// The hook's own process keeps its binding: stagedFiles() legitimately
		// runs inside it, and only the child is scrubbed.
		expect(process.env.GIT_DIR).toBe("/real/.git/worktrees/enhance-1");
	});

	test("an invocation started from inside a test run refuses with exit 2 and runs nothing", () => {
		process.env[REENTRY_MARKER_ENV] = "1";

		expect(driveExit(() => main())).toBe(2);

		expect(capturedRunTestsArgs).toBeNull();
		expect(stderr.join("\n")).toContain("refusing to re-enter");
	});
});
