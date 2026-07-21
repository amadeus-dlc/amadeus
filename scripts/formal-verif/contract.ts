export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ArmId = "tla" | "ts";
export type Verdict = "DETECTED" | "NOT_DETECTED" | "HARNESS_ERROR";

export interface ExperimentConfig {
  benchmarkRuns: 5;
  benchmarkWarmups: 1;
  benchmarkTimeoutSeconds: 120;
  tlcWorkers: 1;
  voters: 3;
  choices: 3;
  maxInitialPerVoter: 1;
  maxAmendPerVoter: 1;
  maxHold: 1;
  pbtSeed: 20260720;
  pbtNumRuns: 100;
}

export interface CellResult {
  schemaVersion: 1;
  arm: ArmId;
  fixtureId: string;
  baselineSha: string;
  armSha: string;
  verdict: Verdict;
  exitCode: number | null;
  toolVersions: Record<string, string>;
  seedOrBound: Record<string, string | number>;
  startedAt: string;
  finishedAt: string;
  counterexampleId: string | null;
  evidencePaths: string[];
}

export interface ArmSuiteResult {
  arm: ArmId;
  runNo: number;
  inputSetHash: string;
  orderedSubjects: string[];
  durationMs: number;
  cells: CellResult[];
}

export interface SchemaError {
  kind: "SchemaError" | "CapacityError";
  path: string;
  message: string;
}

export const MAX_COMMAND_BYTES = 1024 * 1024;
export interface ParseCounters { byteScans: number; nodeVisits: number }

const CONFIG: ExperimentConfig = {
  benchmarkRuns: 5,
  benchmarkWarmups: 1,
  benchmarkTimeoutSeconds: 120,
  tlcWorkers: 1,
  voters: 3,
  choices: 3,
  maxInitialPerVoter: 1,
  maxAmendPerVoter: 1,
  maxHold: 1,
  pbtSeed: 20260720,
  pbtNumRuns: 100,
};

function fail(path: string, message: string, kind: SchemaError["kind"] = "SchemaError"): Result<never, SchemaError> {
  return { ok: false, error: { kind, path, message } };
}

function object(value: unknown, path: string): Result<Record<string, unknown>, SchemaError> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return fail(path, "expected plain object prototype");
  return { ok: true, value: value as Record<string, unknown> };
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], path: string): Result<void, SchemaError> {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, i) => key !== wanted[i])) {
    return fail(path, `expected exactly: ${wanted.join(",")}`);
  }
  return { ok: true, value: undefined };
}

function string(value: unknown, path: string): Result<string, SchemaError> {
  return typeof value === "string" && value.length > 0 ? { ok: true, value } : fail(path, "expected non-empty string");
}

function integer(value: unknown, path: string): Result<number, SchemaError> {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? { ok: true, value: value as number } : fail(path, "expected non-negative integer");
}

function sha256(value: unknown, path: string): Result<string, SchemaError> {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? { ok: true, value } : fail(path, "expected lowercase SHA-256");
}

function relativePath(value: unknown, path: string): Result<string, SchemaError> {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || /^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(value) || value.split(/[\\/]/).includes("..")) return fail(path, "expected lexical repository-relative path");
  return { ok: true, value };
}

export function isUtcInstant(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value.slice(0, 19));
}

function countNodes(value: unknown): number {
  if (Array.isArray(value)) return 1 + value.reduce((sum, item) => sum + countNodes(item), 0);
  if (value !== null && typeof value === "object") return 1 + Object.values(value).reduce((sum, item) => sum + countNodes(item), 0);
  return 1;
}

export function parseJsonBytes(bytes: Uint8Array, counters?: ParseCounters): Result<unknown, SchemaError> {
  if (bytes.byteLength > MAX_COMMAND_BYTES) return fail("$", "payload exceeds 1 MiB", "CapacityError");
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (counters) { counters.byteScans += bytes.byteLength; counters.nodeVisits += countNodes(value); }
    return { ok: true, value };
  } catch {
    return fail("$", "invalid JSON");
  }
}

export function parseExperimentConfig(value: unknown): Result<ExperimentConfig, SchemaError> {
  const parsed = object(value, "$config");
  if (!parsed.ok) return parsed;
  const keys = exactKeys(parsed.value, Object.keys(CONFIG), "$config");
  if (!keys.ok) return keys;
  for (const [key, expected] of Object.entries(CONFIG)) {
    if (parsed.value[key] !== expected) return fail(`$config.${key}`, `expected literal ${expected}`);
  }
  return { ok: true, value: CONFIG };
}

const CELL_KEYS = [
  "schemaVersion", "arm", "fixtureId", "baselineSha", "armSha", "verdict", "exitCode", "toolVersions",
  "seedOrBound", "startedAt", "finishedAt", "counterexampleId", "evidencePaths",
] as const;

export function parseCellResult(value: unknown): Result<CellResult, SchemaError> {
  const parsed = object(value, "$cell");
  if (!parsed.ok) return parsed;
  const keys = exactKeys(parsed.value, CELL_KEYS, "$cell");
  if (!keys.ok) return keys;
  const v = parsed.value;
  if (v.schemaVersion !== 1) return fail("$cell.schemaVersion", "expected 1");
  if (v.arm !== "tla" && v.arm !== "ts") return fail("$cell.arm", "unknown arm");
  if (!["DETECTED", "NOT_DETECTED", "HARNESS_ERROR"].includes(String(v.verdict))) return fail("$cell.verdict", "unknown verdict");
  const fixture = string(v.fixtureId, "$cell.fixtureId");
  const baseline = sha256(v.baselineSha, "$cell.baselineSha");
  const armSha = sha256(v.armSha, "$cell.armSha");
  if (!fixture.ok || !baseline.ok || !armSha.ok) return fail("$cell.identity", "invalid fixture or SHA identity");
  if (!isUtcInstant(v.startedAt) || !isUtcInstant(v.finishedAt)) return fail("$cell.time", "expected real UTC instant");
  if (Date.parse(v.finishedAt as string) < Date.parse(v.startedAt as string)) return fail("$cell.time", "finishedAt must not precede startedAt");
  if (v.exitCode !== null && !Number.isSafeInteger(v.exitCode)) return fail("$cell.exitCode", "expected integer or null");
  if (v.counterexampleId !== null && typeof v.counterexampleId !== "string") return fail("$cell.counterexampleId", "expected string or null");
  if (!Array.isArray(v.evidencePaths) || v.evidencePaths.some((path, index) => !relativePath(path, `$cell.evidencePaths[${index}]`).ok)) return fail("$cell.evidencePaths", "expected lexical relative paths");
  const tools = object(v.toolVersions, "$cell.toolVersions");
  const seed = object(v.seedOrBound, "$cell.seedOrBound");
  if (!tools.ok || !seed.ok) return fail("$cell.metadata", "expected objects");
  if (Object.values(tools.value).some((x) => typeof x !== "string") || Object.values(seed.value).some((x) => typeof x !== "string" && (typeof x !== "number" || !Number.isFinite(x)))) return fail("$cell.metadata", "invalid or non-finite metadata value");
  return { ok: true, value: v as unknown as CellResult };
}

export function parseArmSuiteResult(value: unknown): Result<ArmSuiteResult, SchemaError> {
  const parsed = object(value, "$suite");
  if (!parsed.ok) return parsed;
  const keys = exactKeys(parsed.value, ["arm", "runNo", "inputSetHash", "orderedSubjects", "durationMs", "cells"], "$suite");
  if (!keys.ok) return keys;
  const v = parsed.value;
  if (v.arm !== "tla" && v.arm !== "ts") return fail("$suite.arm", "unknown arm");
  const run = integer(v.runNo, "$suite.runNo");
  const duration = integer(v.durationMs, "$suite.durationMs");
  const hash = sha256(v.inputSetHash, "$suite.inputSetHash");
  if (!run.ok || run.value < 1 || run.value > CONFIG.benchmarkRuns || !duration.ok || !hash.ok) return fail("$suite", "invalid scalar");
  if (!Array.isArray(v.orderedSubjects) || v.orderedSubjects.some((subject) => typeof subject !== "string" || subject.length === 0) || v.orderedSubjects[0] !== "HEALTHY_BASELINE" || new Set(v.orderedSubjects).size !== v.orderedSubjects.length) return fail("$suite.orderedSubjects", "baseline must be first and subjects unique");
  const orderedSubjects = v.orderedSubjects as string[];
  if (!Array.isArray(v.cells)) return fail("$suite.cells", "expected array");
  const cells: CellResult[] = [];
  for (const cell of v.cells) {
    const checked = parseCellResult(cell);
    if (!checked.ok) return checked;
    cells.push(checked.value);
  }
  if (cells.length !== orderedSubjects.length) return fail("$suite.cells", "incomplete suite");
  if (cells.some((cell, index) => cell.arm !== v.arm || cell.fixtureId !== orderedSubjects[index])) return fail("$suite.cells", "cell arm/subject correspondence mismatch");
  if (cells.some((cell, index) => index > 0 && Date.parse(cell.startedAt) < Date.parse(cells[index - 1]!.finishedAt))) return fail("$suite.cells", "cell execution times must follow subject order");
  return { ok: true, value: { arm: v.arm, runNo: run.value, inputSetHash: hash.value, orderedSubjects, durationMs: duration.value, cells } };
}
