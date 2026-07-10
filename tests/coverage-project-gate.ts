#!/usr/bin/env bun
// coverage-project-gate.ts — the self-hosted PROJECT coverage gate.
//
// WHAT THIS IS. A deterministic replacement for Codecov's project status. It
// compares the whole-suite line coverage of this commit against a committed
// baseline and fails CI if coverage dropped by more than 0.02 percentage
// points. The population is the normalized LCOV total emitted by the runner
// (coverage/coverage-totals.json) — the SAME number the coverage HTML reports,
// which deliberately differs from Codecov's project % (see docs/reference/
// 09-testing.md § "Project Coverage Gate"). What matters here is before/after
// consistency, not absolute parity with any external tool.
//
// WHY SELF-HOSTED. Codecov's project status flaked on us; a self-computed gate
// with exact integer arithmetic is reproducible, offline, and reviewable.
//
// THE VERDICT IS EXACT. Percentages are display-only derivations. The pass/fail
// decision is computed with BigInt so it never rounds: pass iff
//   current% >= baseline% - 0.02pp
// which, cleared of division, is
//   10000·ch·bl - 10000·bh·cl >= -2·cl·bl
// (ch/cl = current hits/lines, bh/bl = baseline hits/lines). Exact equality at
// -0.02pp passes.
//
// Run:
//   bun tests/coverage-project-gate.ts --check    # CI gate (exit 1 on drop/error)
//   bun tests/coverage-project-gate.ts --update    # rewrite baseline from the emit

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Paths. Resolved from this file's location so the tool runs from any cwd.
// tests/ is one level below repo root. The current emit is produced by
// `bun run coverage:ci` at coverage/coverage-totals.json; the committed baseline
// lives beside the other tests/ registries.
//
// ENV-VAR SEAMS (mirror gen-coverage-registry.ts's AMADEUS_COVERAGE_* pattern).
// Tests point these at a temp tree to PROVE the gate without touching real files.
//   AMADEUS_COVERAGE_TOTALS            — the current-commit emit to read
//   AMADEUS_COVERAGE_PROJECT_BASELINE  — the committed baseline to compare against
// ---------------------------------------------------------------------------
const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TESTS_DIR, "..");
const TOTALS_PATH =
  process.env.AMADEUS_COVERAGE_TOTALS ?? join(REPO_ROOT, "coverage", "coverage-totals.json");
const BASELINE_PATH =
  process.env.AMADEUS_COVERAGE_PROJECT_BASELINE ??
  join(TESTS_DIR, ".coverage-project-baseline.json");

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------
export interface Totals {
  hits: number;
  lines: number;
}

export type FailReason =
  | "DROP_EXCEEDED"
  | "MISSING_CURRENT"
  | "MISSING_BASELINE"
  | "MALFORMED"
  | "EMPTY_POPULATION";

export type GateResult =
  | { kind: "pass"; currentPct: number; basePct: number; deltaPp: number }
  | { kind: "fail"; reason: FailReason; detail: string };

// A loaded totals file: either absent (file missing) or the raw text we read.
// evaluateGate does all parsing so the verdict has a single source of truth.
export type LoadedTotals = { present: false } | { present: true; text: string };

// ---------------------------------------------------------------------------
// Parsing. Parse, don't validate: a successful parse yields a Totals whose
// invariants (schemaVersion 1, non-negative integers, hits <= lines) are proven.
// ---------------------------------------------------------------------------
type ParseOutcome = { ok: true; totals: Totals } | { ok: false; detail: string };

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseTotalsText(text: string): ParseOutcome {
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
  if (!isNonNegativeInteger(obj.hits)) {
    return { ok: false, detail: `hits must be a non-negative integer, got ${JSON.stringify(obj.hits)}` };
  }
  if (!isNonNegativeInteger(obj.lines)) {
    return { ok: false, detail: `lines must be a non-negative integer, got ${JSON.stringify(obj.lines)}` };
  }
  if (obj.hits > obj.lines) {
    return { ok: false, detail: `hits (${obj.hits}) must be <= lines (${obj.lines})` };
  }
  return { ok: true, totals: { hits: obj.hits, lines: obj.lines } };
}

// ---------------------------------------------------------------------------
// The exact verdict. Display percentages are derived separately; the pass/fail
// comparison uses BigInt so it never rounds.
// ---------------------------------------------------------------------------
function passesThreshold(current: Totals, base: Totals): boolean {
  const ch = BigInt(current.hits);
  const cl = BigInt(current.lines);
  const bh = BigInt(base.hits);
  const bl = BigInt(base.lines);
  // current% >= base% - 0.02pp, cleared of division (cl, bl > 0 here).
  return 10000n * ch * bl - 10000n * bh * cl >= -2n * cl * bl;
}

function pct(t: Totals): number {
  return t.lines === 0 ? 100 : (t.hits / t.lines) * 100;
}

export function evaluateGate(current: LoadedTotals, base: LoadedTotals): GateResult {
  if (!current.present) {
    return { kind: "fail", reason: "MISSING_CURRENT", detail: "coverage totals emit not found" };
  }
  const cur = parseTotalsText(current.text);
  if (!cur.ok) {
    return { kind: "fail", reason: "MALFORMED", detail: `current: ${cur.detail}` };
  }
  if (!base.present) {
    return { kind: "fail", reason: "MISSING_BASELINE", detail: "coverage project baseline not found" };
  }
  const bs = parseTotalsText(base.text);
  if (!bs.ok) {
    return { kind: "fail", reason: "MALFORMED", detail: `baseline: ${bs.detail}` };
  }
  if (cur.totals.lines === 0) {
    return { kind: "fail", reason: "EMPTY_POPULATION", detail: "current has 0 lines" };
  }
  if (bs.totals.lines === 0) {
    return { kind: "fail", reason: "EMPTY_POPULATION", detail: "baseline has 0 lines" };
  }

  const currentPct = pct(cur.totals);
  const basePct = pct(bs.totals);
  const deltaPp = currentPct - basePct;

  if (!passesThreshold(cur.totals, bs.totals)) {
    return {
      kind: "fail",
      reason: "DROP_EXCEEDED",
      detail:
        `coverage dropped by more than 0.02pp: ` +
        `current ${cur.totals.hits}/${cur.totals.lines} (${currentPct.toFixed(4)}%) vs ` +
        `baseline ${bs.totals.hits}/${bs.totals.lines} (${basePct.toFixed(4)}%), ` +
        `delta ${deltaPp.toFixed(4)}pp`,
    };
  }
  return { kind: "pass", currentPct, basePct, deltaPp };
}

// ---------------------------------------------------------------------------
// CLI plumbing.
// ---------------------------------------------------------------------------
function load(path: string): LoadedTotals {
  if (!existsSync(path)) return { present: false };
  return { present: true, text: readFileSync(path, "utf8") };
}

const USAGE =
  "usage: bun tests/coverage-project-gate.ts <--check | --update>\n" +
  "  --check   compare coverage/coverage-totals.json against the committed baseline (CI gate)\n" +
  "  --update  rewrite tests/.coverage-project-baseline.json from the current emit";

function runCheck(): number {
  const result = evaluateGate(load(TOTALS_PATH), load(BASELINE_PATH));
  if (result.kind === "fail") {
    console.error(`PROJECT COVERAGE GATE FAILED [${result.reason}]: ${result.detail}`);
    console.error(`  current emit:      ${TOTALS_PATH}`);
    console.error(`  committed baseline: ${BASELINE_PATH}`);
    return 1;
  }
  console.log(
    `project coverage gate: OK — current ${result.currentPct.toFixed(4)}%, ` +
      `baseline ${result.basePct.toFixed(4)}%, delta ${result.deltaPp.toFixed(4)}pp`,
  );
  return 0;
}

function runUpdate(): number {
  const current = load(TOTALS_PATH);
  if (!current.present) {
    console.error(
      `Cannot update baseline: coverage emit not found at ${TOTALS_PATH}. ` +
        "Run `bun run coverage:ci` first.",
    );
    return 1;
  }
  const parsed = parseTotalsText(current.text);
  if (!parsed.ok) {
    console.error(`Cannot update baseline: coverage emit is malformed: ${parsed.detail}`);
    return 1;
  }
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({ schemaVersion: 1, hits: parsed.totals.hits, lines: parsed.totals.lines }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Wrote ${BASELINE_PATH}: ${parsed.totals.hits}/${parsed.totals.lines} (${pct(parsed.totals).toFixed(4)}%)`,
  );
  return 0;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--check") {
    process.exit(runCheck());
  }
  if (args.length === 1 && args[0] === "--update") {
    process.exit(runUpdate());
  }
  console.error(USAGE);
  process.exit(2);
}

if (import.meta.main) main();
