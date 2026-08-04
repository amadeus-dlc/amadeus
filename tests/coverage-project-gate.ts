#!/usr/bin/env bun
// coverage-project-gate.ts — the self-hosted PROJECT coverage gate.
//
// WHAT THIS IS. A deterministic replacement for Codecov's project status. It
// compares the whole-suite line coverage of this commit against an absolute
// minimum and a committed baseline. Both policy conditions must pass. The
// population is the normalized LCOV total emitted by the runner
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
//   current% >= minimumBasisPoints / 100
//   AND current% >= baseline% - maximumRelativeDropBasisPoints / 100 pp
// which, cleared of division, is
//   10000·ch >= minimumBasisPoints·cl
//   AND 10000·ch·bl - 10000·bh·cl >= -maximumRelativeDropBasisPoints·cl·bl
// (ch/cl = current hits/lines, bh/bl = baseline hits/lines). Exact equality at
// either configured boundary passes.
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
//   AMADEUS_COVERAGE_PROJECT_POLICY    — the versioned absolute/relative policy
// ---------------------------------------------------------------------------
const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TESTS_DIR, "..");
// Resolved at CALL time (not module load) so in-process tests can point a
// single import at different temp trees per case via the env seams.
function totalsPath(): string {
  return process.env.AMADEUS_COVERAGE_TOTALS ?? join(REPO_ROOT, "coverage", "coverage-totals.json");
}
function baselinePath(): string {
  return (
    process.env.AMADEUS_COVERAGE_PROJECT_BASELINE ?? join(TESTS_DIR, ".coverage-project-baseline.json")
  );
}
function policyPath(): string {
  return (
    process.env.AMADEUS_COVERAGE_PROJECT_POLICY ?? join(TESTS_DIR, ".coverage-project-policy.json")
  );
}

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------
export interface Totals {
  hits: number;
  lines: number;
}

export interface CoveragePolicy {
  minimumProjectLineCoverageBasisPoints: number;
  maximumRelativeDropBasisPoints: number;
}

export type FailReason =
  | "ABSOLUTE_MINIMUM_NOT_MET"
  | "RELATIVE_DROP_EXCEEDED"
  | "MULTIPLE_REQUIREMENTS_NOT_MET"
  | "MISSING_CURRENT"
  | "MISSING_BASELINE"
  | "MISSING_POLICY"
  | "MALFORMED"
  | "MALFORMED_POLICY"
  | "EMPTY_POPULATION";

export type GateResult =
  | {
      kind: "pass";
      currentPct: number;
      basePct: number;
      deltaPp: number;
      minimumBasisPoints: number;
      relativeToleranceBasisPoints: number;
    }
  | { kind: "fail"; reason: FailReason; detail: string };

// A loaded totals file: either absent (file missing) or the raw text we read.
// evaluateGate does all parsing so the verdict has a single source of truth.
export type LoadedTotals = { present: false } | { present: true; text: string };
export type LoadedPolicy = LoadedTotals;

// ---------------------------------------------------------------------------
// Parsing. Parse, don't validate: a successful parse yields a Totals whose
// invariants (schemaVersion 1, non-negative integers, hits <= lines) are proven.
// ---------------------------------------------------------------------------
type ParseOutcome = { ok: true; totals: Totals } | { ok: false; detail: string };

// Number.isSafeInteger (not isInteger): JSON.parse silently rounds integers
// beyond 2^53 - 1, so a merely-integer check would accept a value that no
// longer equals the original input and corrupt the BigInt arithmetic below.
function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

// Post-parse checks cannot see the original numeric token: JSON.parse rounds
// a fractional literal like 9007199254740991.1 to a safe integer before any
// validator runs. The reviver's source text is the only place the token
// survives, so capture it there and require a plain digit run.
type SourceReviver = (key: string, value: unknown, context?: { source?: string }) => unknown;

function parseTotalsText(text: string): ParseOutcome {
  const numericTokens = new Map<string, string>();
  let raw: unknown;
  try {
    const reviver: SourceReviver = (key, value, context) => {
      if ((key === "hits" || key === "lines") && typeof context?.source === "string") {
        numericTokens.set(key, context.source);
      }
      return value;
    };
    raw = JSON.parse(text, reviver as Parameters<typeof JSON.parse>[1]);
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
  for (const field of ["hits", "lines"] as const) {
    const token = numericTokens.get(field);
    if (token === undefined || !/^\d+$/.test(token)) {
      return { ok: false, detail: `${field} must be written as a plain integer token, got ${token ?? "none"}` };
    }
  }
  if (obj.hits > obj.lines) {
    return { ok: false, detail: `hits (${obj.hits}) must be <= lines (${obj.lines})` };
  }
  return { ok: true, totals: { hits: obj.hits, lines: obj.lines } };
}

type PolicyParseOutcome =
  | { ok: true; policy: CoveragePolicy }
  | { ok: false; detail: string };

function parsePolicyText(text: string): PolicyParseOutcome {
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
  for (const field of [
    "minimumProjectLineCoverageBasisPoints",
    "maximumRelativeDropBasisPoints",
  ] as const) {
    const value = obj[field];
    if (!isNonNegativeInteger(value) || value > 10000) {
      return {
        ok: false,
        detail: `${field} must be an integer from 0 to 10000, got ${JSON.stringify(value)}`,
      };
    }
  }
  return {
    ok: true,
    policy: {
      minimumProjectLineCoverageBasisPoints: obj.minimumProjectLineCoverageBasisPoints as number,
      maximumRelativeDropBasisPoints: obj.maximumRelativeDropBasisPoints as number,
    },
  };
}

// ---------------------------------------------------------------------------
// The exact verdict. Display percentages are derived separately; the pass/fail
// comparison uses BigInt so it never rounds.
// ---------------------------------------------------------------------------
function passesAbsoluteMinimum(current: Totals, minimumBasisPoints: number): boolean {
  return 10000n * BigInt(current.hits) >= BigInt(minimumBasisPoints) * BigInt(current.lines);
}

function passesRelativeThreshold(
  current: Totals,
  base: Totals,
  maximumRelativeDropBasisPoints: number,
): boolean {
  const ch = BigInt(current.hits);
  const cl = BigInt(current.lines);
  const bh = BigInt(base.hits);
  const bl = BigInt(base.lines);
  return (
    10000n * ch * bl - 10000n * bh * cl >=
    -BigInt(maximumRelativeDropBasisPoints) * cl * bl
  );
}

function pct(t: Totals): number {
  return t.lines === 0 ? 100 : (t.hits / t.lines) * 100;
}

export function evaluateGate(
  current: LoadedTotals,
  base: LoadedTotals,
  policyInput: LoadedPolicy,
): GateResult {
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
  if (!policyInput.present) {
    return { kind: "fail", reason: "MISSING_POLICY", detail: "coverage project policy not found" };
  }
  const policy = parsePolicyText(policyInput.text);
  if (!policy.ok) {
    return { kind: "fail", reason: "MALFORMED_POLICY", detail: `policy: ${policy.detail}` };
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

  const minimumBasisPoints = policy.policy.minimumProjectLineCoverageBasisPoints;
  const relativeToleranceBasisPoints = policy.policy.maximumRelativeDropBasisPoints;
  const absolutePasses = passesAbsoluteMinimum(cur.totals, minimumBasisPoints);
  const relativePasses = passesRelativeThreshold(
    cur.totals,
    bs.totals,
    relativeToleranceBasisPoints,
  );
  if (!absolutePasses || !relativePasses) {
    const failedConditions = [
      ...(!absolutePasses ? ["absolute minimum"] : []),
      ...(!relativePasses ? ["relative tolerance"] : []),
    ];
    const reason: FailReason =
      failedConditions.length === 2
        ? "MULTIPLE_REQUIREMENTS_NOT_MET"
        : absolutePasses
          ? "RELATIVE_DROP_EXCEEDED"
          : "ABSOLUTE_MINIMUM_NOT_MET";
    return {
      kind: "fail",
      reason,
      detail:
        `failed: ${failedConditions.join(", ")}; ` +
        `current ${cur.totals.hits}/${cur.totals.lines} (${currentPct.toFixed(4)}%), ` +
        `absolute minimum ${(minimumBasisPoints / 100).toFixed(2)}%, ` +
        `merge-base ${bs.totals.hits}/${bs.totals.lines} (${basePct.toFixed(4)}%), ` +
        `relative tolerance ${(relativeToleranceBasisPoints / 100).toFixed(2)}pp, ` +
        `delta ${deltaPp.toFixed(4)}pp`,
    };
  }
  return {
    kind: "pass",
    currentPct,
    basePct,
    deltaPp,
    minimumBasisPoints,
    relativeToleranceBasisPoints,
  };
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
  "  --check   enforce the absolute minimum and relative baseline tolerance (CI gate)\n" +
  "  --update  rewrite tests/.coverage-project-baseline.json from the current emit";

export function runCheck(): number {
  const result = evaluateGate(load(totalsPath()), load(baselinePath()), load(policyPath()));
  if (result.kind === "fail") {
    console.error(`PROJECT COVERAGE GATE FAILED [${result.reason}]: ${result.detail}`);
    console.error(`  current emit:      ${totalsPath()}`);
    console.error(`  committed baseline: ${baselinePath()}`);
    console.error(`  coverage policy:    ${policyPath()}`);
    return 1;
  }
  console.log(
    `project coverage gate: OK — current ${result.currentPct.toFixed(4)}%, ` +
      `absolute minimum ${(result.minimumBasisPoints / 100).toFixed(2)}%, ` +
      `merge-base ${result.basePct.toFixed(4)}%, ` +
      `relative tolerance ${(result.relativeToleranceBasisPoints / 100).toFixed(2)}pp, ` +
      `delta ${result.deltaPp.toFixed(4)}pp`,
  );
  return 0;
}

export function runUpdate(): number {
  const current = load(totalsPath());
  if (!current.present) {
    console.error(
      `Cannot update baseline: coverage emit not found at ${totalsPath()}. ` +
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
    baselinePath(),
    `${JSON.stringify({ schemaVersion: 1, hits: parsed.totals.hits, lines: parsed.totals.lines }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Wrote ${baselinePath()}: ${parsed.totals.hits}/${parsed.totals.lines} (${pct(parsed.totals).toFixed(4)}%)`,
  );
  return 0;
}

export function main(args: string[]): number {
  if (args.length === 1 && args[0] === "--check") {
    return runCheck();
  }
  if (args.length === 1 && args[0] === "--update") {
    return runUpdate();
  }
  console.error(USAGE);
  return 2;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
