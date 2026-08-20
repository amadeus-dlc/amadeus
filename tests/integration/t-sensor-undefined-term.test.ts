// t-sensor-undefined-term — undefined-term sensor's pure core
// (evaluateUndefinedTerm), driven in-process (no spawn — Bun coverage does
// not instrument spawned CLI processes). Covers extraction, the
// frequency/length gate, and D1/D2/D3 definition-source resolution.
// covers: packages/framework/core/tools/amadeus-sensor-undefined-term.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateUndefinedTerm } from "../../packages/framework/core/tools/amadeus-sensor-undefined-term.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

// A minimal, self-contained fixture glossary — isolates these tests from
// this repo's real, evolving canonical glossary via the AMADEUS_GLOSSARY_PATH
// test seam (mirrors AMADEUS_SENSORS_DIR/AMADEUS_TEMPLATES_DIR).
const FIXTURE_GLOSSARY = [
	"# Glossary",
	"",
	"| Term | Definition |",
	"|------|-----------|",
	"| **Agent** | One of the 11 domain-expert personas. |",
	"| **Autonomy mode** | Intent-scoped autonomy setting. |",
].join("\n");

let projectDir: string;
let glossaryPath: string;
let priorGlossaryEnv: string | undefined;

beforeEach(() => {
	projectDir = createTestProject();
	glossaryPath = join(projectDir, "fixture-glossary.md");
	writeFileSync(glossaryPath, FIXTURE_GLOSSARY, "utf-8");
	priorGlossaryEnv = process.env.AMADEUS_GLOSSARY_PATH;
	process.env.AMADEUS_GLOSSARY_PATH = glossaryPath;
});

afterEach(() => {
	if (priorGlossaryEnv === undefined) delete process.env.AMADEUS_GLOSSARY_PATH;
	else process.env.AMADEUS_GLOSSARY_PATH = priorGlossaryEnv;
	cleanupTestProject(projectDir);
});

function writeArtifact(name: string, body: string): string {
	const dir = join(projectDir, "inception", "requirements-analysis");
	mkdirSync(dir, { recursive: true });
	const path = join(dir, name);
	writeFileSync(path, body, "utf-8");
	return path;
}

describe("evaluateUndefinedTerm — a missing output path is a clean pass", () => {
	test("a not-yet-written artifact never fails", () => {
		const path = join(projectDir, "inception", "requirements-analysis", "requirements-analysis-questions.md");
		expect(evaluateUndefinedTerm(path, projectDir)).toEqual({
			pass: true,
			findings_count: 0,
			terms: [],
		});
	});
});

describe("evaluateUndefinedTerm — real repo regression fixtures (#2029 survey)", () => {
	test("a 3-word coined term used once is flagged (Issue #2018's actual case)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q3: desired plugin set の粒度は?\n\nA. project-level plugin opt-in declaration\nB. existing staging/compose boundary\nX. Other (please specify)\n",
		);
		const r = evaluateUndefinedTerm(path, projectDir);
		expect(r.pass).toBe(false);
		expect(r.terms).toContain("desired plugin set");
	});

	test("a 2-word coined term used once is NOT flagged — the documented false negative (intent 260706-amadeus-grilling)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q4. Grill me モードの適用範囲は?\n\nA. ゲート付き全ステージで選択可能\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir)).toEqual({
			pass: true,
			findings_count: 0,
			terms: [],
		});
	});

	test("ordinary 2-word descriptive English used once is NOT flagged (intent 260812-tla-proof-receipt)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: production toolchain を通す author-new 統合テストの CI 接続方式\n\nA. 実TLC を要する統合テストは formal-model-check 専用実行面に置く\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir)).toEqual({
			pass: true,
			findings_count: 0,
			terms: [],
		});
	});

	test("a single English word gloss in parens is never extracted (intent 260709-dynamic-test-size)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1. duration 永続化の合流点(sink)\n\nA. 新規レポートファイルへ書き出す\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir)).toEqual({
			pass: true,
			findings_count: 0,
			terms: [],
		});
	});

	test("a SCREAMING_SNAKE_CASE token is never extracted as a phrase (intent 260709-integrity-batch)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1. #708(HUMAN_TURN 偽陽性)の緩和方式\n\nA. 判定条件を絞る\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir)).toEqual({
			pass: true,
			findings_count: 0,
			terms: [],
		});
	});

	test("the universal 'X. Other (please specify)' boilerplate never fires (every real questions.md carries this line)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1. 何か\n\nA. 選択肢\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir)).toEqual({
			pass: true,
			findings_count: 0,
			terms: [],
		});
	});
});

describe("evaluateUndefinedTerm — frequency gate", () => {
	test("a 2-word phrase used ONCE is not flagged (below both gate branches)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: rogue budget の扱い\n\nA. 無視する\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir)).toEqual({
			pass: true,
			findings_count: 0,
			terms: [],
		});
	});

	test("the SAME 2-word phrase repeated across heading and option IS flagged (count >= 2 branch)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: rogue budget の扱い\n\nA. rogue budget を無視する\nX. Other (please specify)\n",
		);
		const r = evaluateUndefinedTerm(path, projectDir);
		expect(r.pass).toBe(false);
		expect(r.terms).toContain("rogue budget");
	});
});

describe("evaluateUndefinedTerm — D1 canonical glossary resolves a term", () => {
	test("a 2-word candidate that exactly matches a glossary entry is not flagged", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: Autonomy mode の扱い\n\nA. Autonomy mode を none のままにする\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir).pass).toBe(true);
	});

	test("known limitation: extending a defined term with a trailing word still flags (extraction takes the maximal run, not sub-phrases)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: Autonomy mode declaration の扱い\n\nA. none のまま\nX. Other (please specify)\n",
		);
		const r = evaluateUndefinedTerm(path, projectDir);
		expect(r.pass).toBe(false);
		expect(r.terms).toContain("autonomy mode declaration");
	});
});

describe("evaluateUndefinedTerm — D2 project glossary (missing-file safety)", () => {
	test("an absent amadeus-shared knowledge dir does not crash — it evaluates as an empty D2, not a passing wildcard (#2029 constraint: missing must not FAIL the sensor, i.e. must not throw/error — it must still evaluate D1/D3 normally)", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: whatever unresolved phrase appears\n\nA. option\nX. Other (please specify)\n",
		);
		// No amadeus/spaces/.../knowledge/amadeus-shared dir exists in this fixture.
		// A missing D2 must not throw, and must not silently pass everything —
		// it contributes zero terms, so a genuinely undefined candidate still
		// surfaces as a finding via D1/D3 as normal.
		const r = evaluateUndefinedTerm(path, projectDir);
		expect(r.pass).toBe(false);
		expect(r.terms).toContain("whatever unresolved phrase appears");
	});

	test("a project working glossary (top-level *.md, any filename) resolves a term", () => {
		const knowledgeDir = join(
			projectDir,
			"amadeus",
			"spaces",
			"default",
			"knowledge",
			"amadeus-shared",
		);
		mkdirSync(knowledgeDir, { recursive: true });
		writeFileSync(
			join(knowledgeDir, "glossary.md"),
			"| 用語 | 定義 |\n|---|---|\n| **Rogue budget line** | working definition |\n",
			"utf-8",
		);
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: rogue budget line の扱い\n\nA. rogue budget line を無視する\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir).pass).toBe(true);
	});
});

describe("evaluateUndefinedTerm — D3 artifact-local and sibling-artifact definitions", () => {
	test("a term defined in the same file's ## Terminology section is not flagged", () => {
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Terminology\n\n**Rogue budget line**: a working definition.\n\n## Q1: rogue budget line の扱い\n\nA. rogue budget line を無視する\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir).pass).toBe(true);
	});

	test("a term defined in the sibling requirements.md is not flagged in requirements-analysis-questions.md", () => {
		writeArtifact(
			"requirements.md",
			"## 用語\n\n| 用語 | 定義 |\n|---|---|\n| **Rogue budget line** | working definition |\n",
		);
		const questions = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: rogue budget line の扱い\n\nA. rogue budget line を無視する\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(questions, projectDir).pass).toBe(true);
	});
});

describe("evaluateUndefinedTerm — plural fold", () => {
	test("a glossary singular resolves a candidate's plural form", () => {
		const knowledgeDir = join(
			projectDir,
			"amadeus",
			"spaces",
			"default",
			"knowledge",
			"amadeus-shared",
		);
		mkdirSync(knowledgeDir, { recursive: true });
		writeFileSync(
			join(knowledgeDir, "glossary.md"),
			"| 用語 | 定義 |\n|---|---|\n| **Rogue budget line** | working definition |\n",
			"utf-8",
		);
		const path = writeArtifact(
			"requirements-analysis-questions.md",
			"## Q1: rogue budget lines の扱い\n\nA. rogue budget lines を無視する\nX. Other (please specify)\n",
		);
		expect(evaluateUndefinedTerm(path, projectDir).pass).toBe(true);
	});
});
