// covers: file:scripts/precommit-related-unit-tests.ts
// size: medium
//
// #1984 — pure core of the pre-commit hook's diff-scoped unit-test step:
// relatedUnitTests (covers:-header matching against a fixture dir, so this
// never touches the repo's real tests/unit/) and stagedFiles (the
// AMADEUS_PRECOMMIT_STAGED_FILES injection seam).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	relatedUnitTests,
	stagedFiles,
} from "../../scripts/precommit-related-unit-tests.ts";

let dir: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "precommit-related-unit-tests-"));
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
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
});
