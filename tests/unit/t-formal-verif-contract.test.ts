import { describe, expect, test } from "bun:test";
import { MAX_COMMAND_BYTES, parseArmSuiteResult, parseCellResult, parseExperimentConfig, parseJsonBytes } from "../../scripts/formal-verif/contract.ts";

const config = { benchmarkRuns: 5, benchmarkWarmups: 1, benchmarkTimeoutSeconds: 120, tlcWorkers: 1, voters: 3, choices: 3, maxInitialPerVoter: 1, maxAmendPerVoter: 1, maxHold: 1, pbtSeed: 20260720, pbtNumRuns: 100 };
const cell = { schemaVersion: 1, arm: "tla", fixtureId: "HEALTHY_BASELINE", baselineSha: "b".repeat(64), armSha: "a".repeat(64), verdict: "NOT_DETECTED", exitCode: 0, toolVersions: { bun: "1" }, seedOrBound: { seed: 1 }, startedAt: "2026-07-20T00:00:00Z", finishedAt: "2026-07-20T00:00:01Z", counterexampleId: null, evidencePaths: ["evidence/x.json"] };

describe("formal verification closed contract", () => {
  test("accepts the exact ruled config", () => expect(parseExperimentConfig(config).ok).toBe(true));
  test.each(["benchmarkRuns", "benchmarkWarmups", "benchmarkTimeoutSeconds", "tlcWorkers", "voters", "choices", "pbtSeed", "pbtNumRuns"])("rejects drift in %s", (key) => expect(parseExperimentConfig({ ...config, [key]: 999 }).ok).toBe(false));
  test("rejects unknown config fields", () => expect(parseExperimentConfig({ ...config, extra: 1 }).ok).toBe(false));
  test("accepts a complete cell", () => expect(parseCellResult(cell).ok).toBe(true));
  test.each(["schemaVersion", "arm", "fixtureId", "verdict", "startedAt", "evidencePaths"])("rejects invalid cell field %s", (key) => expect(parseCellResult({ ...cell, [key]: undefined }).ok).toBe(false));
  test("accepts a complete suite with baseline first", () => expect(parseArmSuiteResult({ arm: "tla", runNo: 1, inputSetHash: "a".repeat(64), orderedSubjects: ["HEALTHY_BASELINE"], durationMs: 1, cells: [cell] }).ok).toBe(true));
  test("rejects incomplete suite", () => expect(parseArmSuiteResult({ arm: "tla", runNo: 1, inputSetHash: "a".repeat(64), orderedSubjects: ["HEALTHY_BASELINE"], durationMs: 1, cells: [] }).ok).toBe(false));
  test("rejects class and null-prototype objects", () => { class Cell { schemaVersion = 1; } expect(parseCellResult(new Cell()).ok).toBe(false); expect(parseCellResult(Object.create(null)).ok).toBe(false); });
  test.each(["A".repeat(64), "a".repeat(63), "g".repeat(64)])("rejects non-canonical SHA %s", (baselineSha) => expect(parseCellResult({ ...cell, baselineSha }).ok).toBe(false));
  test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("rejects non-finite metadata %s", (seed) => expect(parseCellResult({ ...cell, seedOrBound: { seed } }).ok).toBe(false));
  test.each(["/tmp/evidence", "../evidence", "C:\\private\\evidence", "~/evidence"]) ("rejects non-relative evidence path %s", (path) => expect(parseCellResult({ ...cell, evidencePaths: [path] }).ok).toBe(false));
  test("rejects suite cell arm and subject mismatches", () => { const suite = { arm: "tla", runNo: 1, inputSetHash: "a".repeat(64), orderedSubjects: ["HEALTHY_BASELINE"], durationMs: 1 }; expect(parseArmSuiteResult({ ...suite, cells: [{ ...cell, arm: "ts" }] }).ok).toBe(false); expect(parseArmSuiteResult({ ...suite, cells: [{ ...cell, fixtureId: "OTHER" }] }).ok).toBe(false); });
  test.each(["h", "A".repeat(64), "g".repeat(64)])("rejects invalid suite input hash %s", (inputSetHash) => expect(parseArmSuiteResult({ arm: "tla", runNo: 1, inputSetHash, orderedSubjects: ["HEALTHY_BASELINE"], durationMs: 1, cells: [cell] }).ok).toBe(false));
  test.each([0, 6])("rejects out-of-range benchmark run %i", (runNo) => expect(parseArmSuiteResult({ arm: "tla", runNo, inputSetHash: "a".repeat(64), orderedSubjects: ["HEALTHY_BASELINE"], durationMs: 1, cells: [cell] }).ok).toBe(false));
  test("rejects duplicate suite subjects", () => expect(parseArmSuiteResult({ arm: "tla", runNo: 1, inputSetHash: "a".repeat(64), orderedSubjects: ["HEALTHY_BASELINE", "HEALTHY_BASELINE"], durationMs: 1, cells: [cell, cell] }).ok).toBe(false));
  test("rejects a cell whose finish precedes its start", () => expect(parseCellResult({ ...cell, startedAt: "2026-07-20T00:00:02Z", finishedAt: "2026-07-20T00:00:01Z" }).ok).toBe(false));
  test("rejects suite cells whose times reverse subject order", () => { const second = { ...cell, fixtureId: "DEFECT", startedAt: "2026-07-19T23:59:59Z" }; expect(parseArmSuiteResult({ arm: "tla", runNo: 1, inputSetHash: "a".repeat(64), orderedSubjects: ["HEALTHY_BASELINE", "DEFECT"], durationMs: 1, cells: [cell, second] }).ok).toBe(false); });
  test("parses bytes at the cap", () => expect(parseJsonBytes(new TextEncoder().encode(`"${"x".repeat(MAX_COMMAND_BYTES - 2)}"`)).ok).toBe(true));
  test("rejects one byte above cap", () => expect(parseJsonBytes(new Uint8Array(MAX_COMMAND_BYTES + 1)).ok).toBe(false));
  test("counts one byte scan and bounded schema visits", () => { const bytes = new TextEncoder().encode('{"a":[1,2]}'); const counters = { byteScans: 0, nodeVisits: 0 }; expect(parseJsonBytes(bytes, counters).ok).toBe(true); expect(counters).toEqual({ byteScans: bytes.byteLength, nodeVisits: 4 }); });
  test.each([1024, 64 * 1024, MAX_COMMAND_BYTES])("scans a %i-byte payload once", (size) => { const bytes = new TextEncoder().encode(`"${"x".repeat(size - 2)}"`); const counters = { byteScans: 0, nodeVisits: 0 }; expect(parseJsonBytes(bytes, counters).ok).toBe(true); expect(counters).toEqual({ byteScans: size, nodeVisits: 1 }); });
  test("does not retain or re-read mutable input bytes", () => { const bytes = new TextEncoder().encode('{"value":"safe"}'); const parsed = parseJsonBytes(bytes); bytes.fill(0); expect(parsed.ok && parsed.value).toEqual({ value: "safe" }); });
  test("is deterministic across 100 parses", () => expect(new Set(Array.from({ length: 100 }, () => JSON.stringify(parseCellResult(cell)))).size).toBe(1));
});
