#!/usr/bin/env bun
// complexity-gate.ts — the self-hosted CCN (cyclomatic complexity) gate.
//
// WHAT THIS IS. A deterministic ratchet over function complexity, shaped after
// tests/coverage-project-gate.ts (the canonical gate template). It measures
// every function in the product source with lizard, compares against a
// committed baseline of grandfathered offenders, and fails CI when a NEW
// function exceeds the threshold or a baselined function gets MORE complex.
// The baseline only ratchets down (--update prunes improvements); it never
// admits a regression silently.
//
// THE RULES (functional-design business-rules BR-C01..09):
//   - a function absent from the baseline with CCN > 15 -> NEW_VIOLATION
//   - a baselined function measured above its recorded CCN -> RATCHET_REGRESSION
//   - CCN 11..15 is an informational warn band (never affects the exit code)
//   - missing/malformed baseline or a failed measurement -> fail-closed exit 1
//     with a formatted diagnosis (never an unhandled stack trace)
//   - functions that vanished from the source are ignored by --check and
//     pruned by --update (renames stay a one-step operation)
//
// Run:
//   bun tests/complexity-gate.ts --check    # CI gate (exit 1 on violation)
//   bun tests/complexity-gate.ts --update   # rewrite the baseline from a fresh measurement

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Constants. The block threshold is the single source the verdict, the
// baseline self-description, and the rendered messages all derive from
// (E-CX1 Q1=C: start at 15; the staged descent to 10 is a future ruling).
// ---------------------------------------------------------------------------
export const CCN_BLOCK_THRESHOLD = 15;
export const CCN_WARN_FLOOR = 11;

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TESTS_DIR, "..");

// The measured product surface (FR-4). tests/ is deliberately out of scope for
// the initial rollout (intent 260710-complexity-gate scope boundary).
export const MEASUREMENT_ROOTS = [
  "packages/framework/core",
  "packages/setup/src",
  "scripts",
] as const;

// ENV-VAR SEAMS (mirror coverage-project-gate's AMADEUS_COVERAGE_* pattern).
// Resolved at CALL time so in-process tests can retarget a single import.
//   AMADEUS_COMPLEXITY_ROOTS      — comma-separated measurement roots override
//   AMADEUS_COMPLEXITY_BASELINE   — baseline path override
//   AMADEUS_COMPLEXITY_LIZARD_CMD — lizard launcher override (measurement-failure tests)
function measurementRoots(): string[] {
  const env = process.env.AMADEUS_COMPLEXITY_ROOTS;
  if (env) return env.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  return MEASUREMENT_ROOTS.map((r) => join(REPO_ROOT, r));
}
function baselinePath(): string {
  return process.env.AMADEUS_COMPLEXITY_BASELINE ?? join(TESTS_DIR, ".complexity-baseline.json");
}
function lizardCommand(): string[] {
  const env = process.env.AMADEUS_COMPLEXITY_LIZARD_CMD;
  if (env) return env.split(" ").filter((s) => s.length > 0);
  return ["python3", "-m", "lizard"];
}

// ---------------------------------------------------------------------------
// Types (functional-design domain-entities).
// ---------------------------------------------------------------------------
export interface FunctionRecord {
  path: string;
  name: string;
  ccn: number;
}

export interface KeyedFunctionRecord extends FunctionRecord {
  ordinal: number;
}

export interface BaselineEntry {
  path: string;
  name: string;
  ordinal: number;
  ccn: number;
}

export interface BaselineDoc {
  schemaVersion: 1;
  threshold: number;
  entries: BaselineEntry[];
}

export type BaselineParse = { ok: true; doc: BaselineDoc } | { ok: false; detail: string };
export type LoadedBaseline = { present: false } | { present: true; text: string };

export type MeasurementOutcome =
  | { kind: "ok"; records: KeyedFunctionRecord[] }
  | { kind: "failed"; detail: string };

export interface Regression {
  record: KeyedFunctionRecord;
  baselineCcn: number;
}

export type ComplexityVerdict =
  | { kind: "pass"; warnBand: KeyedFunctionRecord[] }
  | {
      kind: "fail";
      newViolations: KeyedFunctionRecord[];
      regressions: Regression[];
      warnBand: KeyedFunctionRecord[];
    };

export function functionKey(rec: { path: string; name: string; ordinal: number }): string {
  return `${rec.path}::${rec.name}::${rec.ordinal}`;
}

// ---------------------------------------------------------------------------
// C-1 Measurement. lizard's CSV rows look like:
//   NLOC,CCN,token,param,length,"name@lines@file","file","name","long_name",start,end
// The quoted long_name may contain commas, so parse with an anchored regex on
// the stable prefix instead of naive splitting. Paths are normalised to be
// repo-relative with forward slashes so keys are portable across checkouts.
// ---------------------------------------------------------------------------
const CSV_ROW = /^(\d+),(\d+),\d+,\d+,\d+,"[^"]*","([^"]*)","([^"]*)",/;

export function parseLizardCsv(csv: string, repoRoot: string): FunctionRecord[] {
  const records: FunctionRecord[] = [];
  const rootPrefix = `${repoRoot.replace(/\\/g, "/").replace(/\/+$/, "")}/`;
  for (const line of csv.split(/\r?\n/)) {
    const m = CSV_ROW.exec(line);
    if (!m) continue;
    const rawPath = m[3].replace(/\\/g, "/");
    const path = rawPath.startsWith(rootPrefix) ? rawPath.slice(rootPrefix.length) : rawPath;
    records.push({ path, name: m[4], ccn: Number(m[2]) });
  }
  return records;
}

export function assignOrdinals(records: readonly FunctionRecord[]): KeyedFunctionRecord[] {
  const seen = new Map<string, number>();
  return records.map((rec) => {
    const nameKey = `${rec.path}::${rec.name}`;
    const ordinal = seen.get(nameKey) ?? 0;
    seen.set(nameKey, ordinal + 1);
    return { ...rec, ordinal };
  });
}

export function runLizard(): MeasurementOutcome {
  const cmd = lizardCommand();
  const roots = measurementRoots();
  const result = spawnSync(cmd[0], [...cmd.slice(1), ...roots, "-l", "typescript", "--csv"], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    return { kind: "failed", detail: `lizard could not be spawned: ${result.error.message}` };
  }
  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").trim().slice(0, 300);
    return { kind: "failed", detail: `lizard exited ${result.status}: ${stderr}` };
  }
  return { kind: "ok", records: assignOrdinals(parseLizardCsv(result.stdout ?? "", REPO_ROOT)) };
}

// ---------------------------------------------------------------------------
// C-2 Baseline. Parse, don't validate: a successful parse proves schemaVersion,
// a positive-integer threshold, positive-integer CCNs, and key uniqueness.
// ---------------------------------------------------------------------------
function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function parseBaselineText(text: string): BaselineParse {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, detail: `invalid JSON: ${(err as Error).message}` };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, detail: `expected a JSON object, got ${typeof raw}` };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    return { ok: false, detail: `schemaVersion must be 1, got ${JSON.stringify(obj.schemaVersion)}` };
  }
  if (!isPositiveInteger(obj.threshold)) {
    return { ok: false, detail: `threshold must be a positive integer, got ${JSON.stringify(obj.threshold)}` };
  }
  if (!Array.isArray(obj.entries)) {
    return { ok: false, detail: `entries must be an array, got ${typeof obj.entries}` };
  }
  const entries: BaselineEntry[] = [];
  const keys = new Set<string>();
  for (const [i, e] of obj.entries.entries()) {
    if (typeof e !== "object" || e === null) {
      return { ok: false, detail: `entries[${i}] must be an object` };
    }
    const ent = e as Record<string, unknown>;
    if (typeof ent.path !== "string" || typeof ent.name !== "string") {
      return { ok: false, detail: `entries[${i}] must have string path and name` };
    }
    if (!isNonNegativeInteger(ent.ordinal) || !isPositiveInteger(ent.ccn)) {
      return { ok: false, detail: `entries[${i}] must have integer ordinal >= 0 and ccn > 0` };
    }
    const entry: BaselineEntry = { path: ent.path, name: ent.name, ordinal: ent.ordinal, ccn: ent.ccn };
    const key = functionKey(entry);
    if (keys.has(key)) {
      return { ok: false, detail: `duplicate entry key: ${key}` };
    }
    keys.add(key);
    entries.push(entry);
  }
  return { ok: true, doc: { schemaVersion: 1, threshold: obj.threshold, entries } };
}

export function renderBaseline(records: readonly KeyedFunctionRecord[]): string {
  const entries = records
    .filter((r) => r.ccn > CCN_BLOCK_THRESHOLD)
    .map((r) => ({ path: r.path, name: r.name, ordinal: r.ordinal, ccn: r.ccn }))
    .sort((a, b) =>
      a.path === b.path
        ? a.name === b.name
          ? a.ordinal - b.ordinal
          : a.name.localeCompare(b.name)
        : a.path.localeCompare(b.path),
    );
  const doc: BaselineDoc = { schemaVersion: 1, threshold: CCN_BLOCK_THRESHOLD, entries };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// C-3 Verdict (pure).
// ---------------------------------------------------------------------------
export function evaluateComplexity(
  measured: readonly KeyedFunctionRecord[],
  baseline: ReadonlyMap<string, number>,
): ComplexityVerdict {
  const newViolations: KeyedFunctionRecord[] = [];
  const regressions: Regression[] = [];
  const warnBand: KeyedFunctionRecord[] = [];
  for (const rec of measured) {
    if (rec.ccn >= CCN_WARN_FLOOR && rec.ccn <= CCN_BLOCK_THRESHOLD) warnBand.push(rec);
    const recorded = baseline.get(functionKey(rec));
    if (recorded === undefined) {
      if (rec.ccn > CCN_BLOCK_THRESHOLD) newViolations.push(rec);
    } else if (rec.ccn > recorded) {
      regressions.push({ record: rec, baselineCcn: recorded });
    }
  }
  const sortRec = (a: KeyedFunctionRecord, b: KeyedFunctionRecord) =>
    a.path === b.path ? a.name.localeCompare(b.name) : a.path.localeCompare(b.path);
  newViolations.sort(sortRec);
  regressions.sort((a, b) => sortRec(a.record, b.record));
  warnBand.sort(sortRec);
  if (newViolations.length > 0 || regressions.length > 0) {
    return { kind: "fail", newViolations, regressions, warnBand };
  }
  return { kind: "pass", warnBand };
}

export function baselineMapOf(doc: BaselineDoc): Map<string, number> {
  return new Map(doc.entries.map((e) => [functionKey(e), e.ccn]));
}

// ---------------------------------------------------------------------------
// C-4 CLI. Output contracts M1..M7 (refined-mockups) verbatim; stdout carries
// the healthy/info lines, stderr the failure diagnoses.
// ---------------------------------------------------------------------------
function load(path: string): LoadedBaseline {
  if (!existsSync(path)) return { present: false };
  return { present: true, text: readFileSync(path, "utf8") };
}

function renderWarnBand(warnBand: readonly KeyedFunctionRecord[]): void {
  if (warnBand.length === 0) return;
  console.log(
    `  note: ${warnBand.length} function(s) in the ${CCN_WARN_FLOOR}-${CCN_BLOCK_THRESHOLD} warn band (informational, not blocking):`,
  );
  for (const rec of warnBand) {
    console.log(`    CCN ${rec.ccn}  ${rec.name}  ${rec.path}`);
  }
}

function fail(reason: string, lines: string[]): number {
  console.error(`COMPLEXITY GATE FAILED [${reason}]: ${lines[0]}`);
  for (const line of lines.slice(1)) console.error(line);
  return 1;
}

export function runCheck(): number {
  const measurement = runLizard();
  if (measurement.kind === "failed") {
    return fail("MEASUREMENT_FAILED", [
      measurement.detail,
      "Install it with: pip install lizard==1.23.0",
    ]);
  }
  const loaded = load(baselinePath());
  if (!loaded.present) {
    return fail("MISSING_BASELINE", [
      `${baselinePath()} not found.`,
      "Generate it with: bun tests/complexity-gate.ts --update",
    ]);
  }
  const parsed = parseBaselineText(loaded.text);
  if (!parsed.ok) {
    return fail("MALFORMED", [`baseline: ${parsed.detail}`]);
  }
  const verdict = evaluateComplexity(measurement.records, baselineMapOf(parsed.doc));
  if (verdict.kind === "fail") {
    if (verdict.newViolations.length > 0) {
      console.error(
        `COMPLEXITY GATE FAILED [NEW_VIOLATION]: ${verdict.newViolations.length} function(s) over CCN ${CCN_BLOCK_THRESHOLD} and not in the baseline:`,
      );
      for (const rec of verdict.newViolations) {
        console.error(`  CCN ${rec.ccn}  ${rec.name}  ${rec.path}`);
      }
      console.error("Refactor below the threshold, or (for a reviewed exception) add it to the baseline:");
      console.error("  bun tests/complexity-gate.ts --update");
      console.error(`  committed baseline:  ${baselinePath()}`);
    }
    if (verdict.regressions.length > 0) {
      console.error(
        `COMPLEXITY GATE FAILED [RATCHET_REGRESSION]: ${verdict.regressions.length} baselined function(s) got MORE complex:`,
      );
      for (const reg of verdict.regressions) {
        console.error(`  CCN ${reg.baselineCcn} -> ${reg.record.ccn}  ${reg.record.name}  ${reg.record.path}`);
      }
      console.error("The baseline only ratchets down. Refactor back to <= the recorded CCN, or split the function.");
    }
    return 1;
  }
  const parsedEntries = parsed.doc.entries;
  const worst = parsedEntries.reduce((max, e) => Math.max(max, e.ccn), 0);
  console.log(
    `complexity gate: OK — 0 new violations, 0 regressions, baseline ${parsedEntries.length} entries (worst CCN ${worst}), threshold ${CCN_BLOCK_THRESHOLD}`,
  );
  renderWarnBand(verdict.warnBand);
  return 0;
}

export function runUpdate(): number {
  const measurement = runLizard();
  if (measurement.kind === "failed") {
    return fail("MEASUREMENT_FAILED", [
      measurement.detail,
      "Install it with: pip install lizard==1.23.0",
    ]);
  }
  const body = renderBaseline(measurement.records);
  writeFileSync(baselinePath(), body, "utf8");
  const doc = JSON.parse(body) as BaselineDoc;
  const worst = doc.entries.reduce((max, e) => Math.max(max, e.ccn), 0);
  console.log(
    `Wrote ${baselinePath()}: ${doc.entries.length} entries (worst CCN ${worst}), threshold ${CCN_BLOCK_THRESHOLD}`,
  );
  return 0;
}

const USAGE =
  "usage: bun tests/complexity-gate.ts <--check | --update>\n" +
  "  --check   compare measured CCN against the committed baseline (CI gate)\n" +
  "  --update  rewrite tests/.complexity-baseline.json from the current measurement";

export function main(args: string[]): number {
  try {
    if (args.length === 1 && args[0] === "--check") return runCheck();
    if (args.length === 1 && args[0] === "--update") return runUpdate();
    console.error(USAGE);
    return 2;
  } catch (err) {
    console.error(`COMPLEXITY GATE FAILED [UNEXPECTED]: ${(err as Error).message}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
