// t-undefined-term-sensor — dispatcher-level (spawn) contract for the
// undefined-term sensor (#2029). Drives the REAL `amadeus-sensor.ts fire`
// dispatcher (dist/claude/.claude/tools, same convention as
// t-sensor-fire-hardening.test.ts / t95-sensor-fire-hook-feature.test.ts) and
// asserts on the audit trail + detail file it leaves. Complements the
// in-process pure-function coverage in tests/unit/t-sensor-undefined-term.test.ts.
//
// Also verifies, per supervisor ruling on DESIGN-2029.md: the dispatcher-level
// marker exemption added by in-flight PR #3317 (exitForMarkerExemption) is
// id-scoped to required-sections/upstream-coverage and does NOT suppress this
// sensor — a real fire against requirements-analysis-questions.md (a marker
// artifact per isMarkerArtifact) still reaches SENSOR_FIRED/terminal.
// covers: subcommand:amadeus-sensor:fire, sensor:undefined-term

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { cleanupTestProject, createTestProject, seededAuditDir, seededRecordDir, seededStateFile } from "../harness/fixtures.ts";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOLS_DIR = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const SENSOR_TS = join(TOOLS_DIR, "amadeus-sensor.ts");

let projectDir: string;

beforeEach(() => {
	projectDir = createTestProject();
	mkdirSync(seededRecordDir(projectDir), { recursive: true });
	writeFileSync(
		seededStateFile(projectDir),
		"- **Workflow**: fix\n- **Current Stage**: requirements-analysis\n",
		"utf-8",
	);
	mkdirSync(seededAuditDir(projectDir), { recursive: true });
});

afterEach(() => {
	cleanupTestProject(projectDir);
});

function stageDir(): string {
	const dir = join(seededRecordDir(projectDir), "inception", "requirements-analysis");
	mkdirSync(dir, { recursive: true });
	return dir;
}

interface FireResult {
	rc: number;
	out: string;
}

function fire(outputPath: string): FireResult {
	const res = spawnSync(
		BUN,
		[SENSOR_TS, "fire", "undefined-term", "--stage", "requirements-analysis", "--output-path", outputPath],
		{ encoding: "utf-8", env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir } },
	);
	return { rc: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function auditEventCount(ev: string): number {
	return readAllAuditShards(projectDir)
		.split("\n")
		.filter((l) => l.trim().length > 0)
		.map((l) => JSON.parse(l) as Record<string, unknown>)
		.filter((r) =>
			r.schemaVersion === 2
				? (r.attributes as Record<string, string> | undefined)?.Event === ev
				: r.event === ev,
		).length;
}

function detailFiles(): string[] {
	const dir = join(seededRecordDir(projectDir), ".amadeus-sensors", "requirements-analysis");
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter((f) => f.startsWith("undefined-term-"));
}

describe("undefined-term sensor — dispatcher fire (#2029)", () => {
	test("a clean artifact fires SENSOR_FIRED + SENSOR_PASSED, exit 0", () => {
		const outPath = join(stageDir(), "requirements-analysis-questions.md");
		writeFileSync(outPath, "## Q1: 対象範囲\n\nA. すべて\nX. Other (please specify)\n", "utf-8");

		const r = fire(outPath);
		expect(r.rc).toBe(0);
		expect(auditEventCount("SENSOR_FIRED")).toBe(1);
		expect(auditEventCount("SENSOR_PASSED")).toBe(1);
		expect(auditEventCount("SENSOR_FAILED")).toBe(0);
		expect(detailFiles()).toEqual([]);
	});

	test("an undefined coined term fires SENSOR_FIRED + SENSOR_FAILED with a detail file, exit 0 (advisory — never non-zero)", () => {
		const outPath = join(stageDir(), "requirements-analysis-questions.md");
		writeFileSync(
			outPath,
			"## Q3: desired plugin set の粒度は?\n\nA. project-level plugin opt-in declaration\nX. Other (please specify)\n",
			"utf-8",
		);

		const r = fire(outPath);
		expect(r.rc).toBe(0);
		expect(auditEventCount("SENSOR_FIRED")).toBe(1);
		expect(auditEventCount("SENSOR_FAILED")).toBe(1);
		expect(auditEventCount("SENSOR_PASSED")).toBe(0);
		const files = detailFiles();
		expect(files.length).toBe(1);
		const detail = readFileSync(
			join(seededRecordDir(projectDir), ".amadeus-sensors", "requirements-analysis", files[0]),
			"utf-8",
		);
		expect(detail).toContain("desired plugin set");
	});

	test("requirements.md is also in the manifest's matches scope", () => {
		const outPath = join(stageDir(), "requirements.md");
		writeFileSync(outPath, "## 対象範囲\n\n全機能を対象とする。\n", "utf-8");

		const r = fire(outPath);
		expect(r.rc).toBe(0);
		expect(auditEventCount("SENSOR_FIRED")).toBe(1);
	});

	test("memory.md (out of the manifest's matches scope) is rejected by the dispatcher's own matches re-check", () => {
		const outPath = join(stageDir(), "memory.md");
		writeFileSync(outPath, "diary\n", "utf-8");

		const r = fire(outPath);
		expect(r.rc).not.toBe(0);
		expect(r.out).toContain("does not match sensor");
		expect(auditEventCount("SENSOR_FIRED")).toBe(0);
	});

	// #3317 (in-flight, id-scoped to required-sections/upstream-coverage) must
	// not suppress this sensor even though requirements-analysis-questions.md
	// is a marker artifact (isMarkerArtifact: "*-questions" suffix).
	test("a marker artifact (*-questions.md) is NOT exempted by #3317's id-scoped marker exemption", () => {
		const outPath = join(stageDir(), "requirements-analysis-questions.md");
		writeFileSync(outPath, "## Q1: 対象範囲\n\nA. すべて\nX. Other (please specify)\n", "utf-8");

		const r = fire(outPath);
		expect(r.rc).toBe(0);
		// If the marker exemption suppressed this sensor, handleFire would
		// process.exit(0) BEFORE emitting SENSOR_FIRED at all.
		expect(auditEventCount("SENSOR_FIRED")).toBe(1);
		expect(auditEventCount("SENSOR_PASSED")).toBe(1);
	});
});
