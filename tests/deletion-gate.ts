#!/usr/bin/env bun
// deletion-gate.ts — the legacy-writer deletion gate (U8, FR-MIG-4).
//
// WHAT THIS IS. The machine judgement that decides whether the legacy audit
// writer may be deleted. Six independent conditions (a)-(f) each produce a
// ConditionResult; the evaluator aggregates them into a GateEvaluationReport
// whose `overall` is GREEN only when every one of the six says PASS (BR-1).
//
// FAIL-CLOSED BY CONSTRUCTION. A condition that cannot be judged — a fixture
// that is not there, a dependency Unit whose output has not landed, a
// measurement that threw — is UNKNOWN, and UNKNOWN blocks exactly as FAIL does
// (BR-12). There is no environment variable, no CLI flag and no input channel
// that can force a PASS: the evaluator's whole input is the six results, and
// the checkers derive those from measurements only (BR-2, security-design.md).
//
// WHY A SEPARATE --require-green. `--check` always exits 0 when the evaluation
// itself succeeded, so CI can carry the report as an artifact while the gate is
// legitimately BLOCKED (which it is for the whole migration period).
// `--require-green` is the arm the deletion procedure runs, and it exits 1
// unless the report says GREEN. Splitting them keeps a BLOCKED gate from
// painting all of CI red while still making the deletion precondition
// executable rather than a matter of someone's word.
//
// Run:
//   bun tests/deletion-gate.ts --check [--report <path>]
//   bun tests/deletion-gate.ts --require-green [--report <path>]

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
// The drift checker is read from the SHIPPED tree, the same source the sibling
// registry-drift suite reads, so the gate judges what is distributed rather
// than what happens to be staged in core.
import { collectDriftSets, findRegistryDrift } from "../dist/claude/.claude/otel/event-registry-drift.ts";
import { buildCensus, scanRepository, totalSites } from "./callsite-guard.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// The result vocabulary (domain-entities.md § ConditionResult /
// GateEvaluationReport).
// ---------------------------------------------------------------------------

export const GATE_CONDITIONS = ["a", "b", "c", "d", "e", "f"] as const;

export type GateCondition = (typeof GATE_CONDITIONS)[number];

export type Verdict = "PASS" | "FAIL" | "UNKNOWN";

export type ConditionResult = {
  readonly condition: string;
  readonly verdict: Verdict;
  readonly evidence: string;
  readonly detail: string;
};

export type GateEvaluationReport = {
  readonly results: readonly ConditionResult[];
  readonly overall: "GREEN" | "BLOCKED";
  readonly evaluatedAt: string;
  readonly commitRef: string;
};

// What each condition is, in one line, for the rendered output and for the
// UNKNOWN filler a missing checker leaves behind.
export const CONDITION_TITLES: Readonly<Record<GateCondition, string>> = {
  a: "v1/v2 mixed Journal: doctor/recovery/merge pass",
  b: "every canonical event is registered",
  c: "zero direct legacy call sites",
  d: "migrated sites carry the legacy field set",
  e: "Relay generates no Span from the Journal",
  f: "all harness distribution drift guards pass",
};

function unknownResult(condition: GateCondition, detail: string): ConditionResult {
  return { condition, verdict: "UNKNOWN", evidence: "", detail };
}

// Exactly one result per condition, or the condition is UNKNOWN. A duplicate is
// treated the same as an absence: two checkers disagreeing about one condition
// is not evidence of anything, and picking one of them would be a guess.
function normalizeResults(results: readonly ConditionResult[]): ConditionResult[] {
  return GATE_CONDITIONS.map((condition) => {
    const matching = results.filter((r) => r.condition === condition);
    if (matching.length === 1) return matching[0] as ConditionResult;
    if (matching.length === 0) {
      return unknownResult(condition, `no checker reported condition (${CONDITION_TITLES[condition]})`);
    }
    return unknownResult(condition, `${matching.length} conflicting results reported for this condition`);
  });
}

// ---------------------------------------------------------------------------
// The six checkers. Each takes MEASURED evidence and returns a ConditionResult;
// each is pure, so the FAIL arm and the PASS arm are both reachable from a test
// by swapping the evidence rather than the tree (BR-15). `null` evidence means
// the measurement did not happen, which is UNKNOWN and never PASS (BR-12).
// ---------------------------------------------------------------------------

// A suite or guard that was asked to run. `ran: false` is the harness-failure
// signal — distinct from `ran: true, passed: false`, which is a real red.
export type RunOutcome = {
  readonly ran: boolean;
  readonly passed: boolean;
  readonly detail: string;
  readonly sources: readonly string[];
};

export type RelayProof = {
  readonly moduleExists: boolean;
  readonly proofTests: readonly string[];
  readonly outcome: RunOutcome | null;
};

function fromRunOutcome(condition: GateCondition, outcome: RunOutcome | null, unmeasured: string): ConditionResult {
  if (outcome === null) return unknownResult(condition, unmeasured);
  const evidence = outcome.sources.join(", ");
  if (!outcome.ran) return { condition, verdict: "UNKNOWN", evidence, detail: outcome.detail };
  const verdict = outcome.passed ? "PASS" : "FAIL";
  return { condition, verdict, evidence, detail: outcome.detail };
}

export function checkMixedJournal(outcome: RunOutcome | null): ConditionResult {
  return fromRunOutcome("a", outcome, "mixed-journal suite was not run");
}

export function checkDistributionGuards(outcome: RunOutcome | null): ConditionResult {
  return fromRunOutcome("f", outcome, "distribution drift guards were not run");
}

export function checkRegistryComplete(drift: readonly string[] | null): ConditionResult {
  if (drift === null) return unknownResult("b", "registry drift was not measured");
  if (drift.length === 0) {
    return { condition: "b", verdict: "PASS", evidence: "event-registry-drift", detail: "" };
  }
  return {
    condition: "b",
    verdict: "FAIL",
    evidence: "event-registry-drift",
    detail: `${drift.length} unregistered canonical event(s): ${drift.join("; ")}`,
  };
}

export function checkCallsitesZero(total: number | null): ConditionResult {
  if (total === null) return unknownResult("c", "call-site census was not measured");
  if (total === 0) {
    return { condition: "c", verdict: "PASS", evidence: "callsite-guard", detail: "" };
  }
  return {
    condition: "c",
    verdict: "FAIL",
    evidence: "callsite-guard",
    detail: `${total} legacy call site(s) still call the writer directly`,
  };
}

// Condition (d): migration equivalence.
//
// The claim a call-site migration makes is that a MIGRATED site lands the same
// audit content the legacy writer landed — same event type, same field set,
// same values, same ledger. The suites that prove it carry the
// `[migration-equivalence]` marker in their case titles, so the evidence is
// DISCOVERED by marker rather than named in a list this file would have to keep
// in step with the suite (the same shape condition (e) uses for the Relay
// proof).
//
// Two things beyond "the suites are green" are checked, because a green run
// over a shrunken evidence base looks identical to a green run over the whole
// of it:
//
//   - a FLOOR on how many suites carry the marker, so deleting one blocks
//     instead of quietly thinning the proof;
//   - the REGISTRY SWEEP by name, because it is the only case that walks the
//     whole registered taxonomy rather than a hand-picked event, and losing it
//     would leave the count intact while removing the breadth.
export type MigrationEquivalenceEvidence = {
  readonly markerFiles: readonly string[];
  readonly outcome: RunOutcome | null;
};

// Matched against a case TITLE, not anywhere in the file: prose that merely
// mentions the marker (this comment, for one) is not evidence of anything.
const MIGRATION_EQUIVALENCE_TITLE_RE = /^\s*(?:test|describe)\(\s*[`"']\[migration-equivalence\]/m;

// The count measured when condition (d) was re-drawn onto the marker
// (2026-07-31 ruling on FR-MIG-4(d)): t379, t381, t382, t383, t390. Shrink-only
// in the same sense as the call-site allowlist — the base may grow, and a drop
// below this is a regression in the proof, not a smaller job.
export const MIGRATION_EQUIVALENCE_MIN_FILES = 5;

export const REGISTRY_SWEEP_TEST = "tests/integration/t381-registry-emitter-parity.test.ts";

export function checkMigrationEquivalence(evidence: MigrationEquivalenceEvidence | null): ConditionResult {
  if (evidence === null) return unknownResult("d", "migration-equivalence evidence was not gathered");
  const found = evidence.markerFiles.length;
  const evidenceRef = `migration-equivalence:${found} suite(s)`;
  if (found < MIGRATION_EQUIVALENCE_MIN_FILES) {
    return {
      condition: "d",
      verdict: "FAIL",
      evidence: evidenceRef,
      detail: `${found} suite(s) carry the marker, below the floor of ${MIGRATION_EQUIVALENCE_MIN_FILES}`,
    };
  }
  if (!evidence.markerFiles.includes(REGISTRY_SWEEP_TEST)) {
    return {
      condition: "d",
      verdict: "FAIL",
      evidence: evidenceRef,
      detail: `the registry sweep (${REGISTRY_SWEEP_TEST}) is not among the marked suites`,
    };
  }
  return fromRunOutcome("d", evidence.outcome, "the marked suites were found but not run");
}

export function checkRelayProof(proof: RelayProof | null): ConditionResult {
  if (proof === null) return unknownResult("e", "Relay proof was not measured");
  // The Relay is U11's deliverable. Before it lands there is nothing to prove
  // anything about, which is a dependency gap (UNKNOWN, logical-components.md)
  // rather than a failed proof. Once the module exists, a missing or red proof
  // is a real FAIL (BR-10).
  if (!proof.moduleExists) {
    return unknownResult("e", "Relay module has not landed yet — condition not yet judgeable");
  }
  if (proof.proofTests.length === 0) {
    return {
      condition: "e",
      verdict: "FAIL",
      evidence: "relay-proof",
      detail: "Relay module exists but no test proves it generates no Span from the Journal",
    };
  }
  return fromRunOutcome("e", proof.outcome, "Relay proof tests were found but not run");
}

export function evaluateGate(
  results: readonly ConditionResult[],
  evaluatedAt: string,
  commitRef: string
): GateEvaluationReport {
  const normalized = normalizeResults(results);
  const overall = normalized.every((r) => r.verdict === "PASS") ? "GREEN" : "BLOCKED";
  return { results: normalized, overall, evaluatedAt, commitRef };
}

// ---------------------------------------------------------------------------
// Report schema validation (security-design.md). The report is the only
// admissible evidence that deletion may begin, so a consumer can check that
// what it is holding is a report THIS evaluator shapes: known keys only, known
// verdict vocabulary, and evidence that carries identifiers rather than
// secrets.
// ---------------------------------------------------------------------------

const REPORT_KEYS = ["results", "overall", "evaluatedAt", "commitRef"] as const;
const RESULT_KEYS = ["condition", "verdict", "evidence", "detail"] as const;
const VERDICTS: readonly string[] = ["PASS", "FAIL", "UNKNOWN"];
const OVERALLS: readonly string[] = ["GREEN", "BLOCKED"];

// Credential shapes, not content words: matching on "secret" or "token" alone
// would reject the legitimate identifier `AUDIT_TOKEN_MINTED`, and a gate that
// cries wolf gets switched off.
const SENSITIVE_RES: readonly { readonly label: string; readonly re: RegExp }[] = [
  { label: "bearer token", re: /\bBearer\s+\S+/i },
  { label: "api key", re: /\b(?:sk|pk)-[A-Za-z0-9_-]{8,}/ },
  { label: "assigned secret", re: /\b(?:password|passwd|secret|api[_-]?key|token)\s*[=:]\s*\S+/i },
  { label: "private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function checkStringField(path: string, value: unknown, violations: string[]): void {
  if (typeof value !== "string") {
    violations.push(`${path} must be a string`);
    return;
  }
  for (const { label, re } of SENSITIVE_RES) {
    if (re.test(value)) violations.push(`${path} carries sensitive content (${label})`);
  }
}

function validateResult(index: number, value: unknown, violations: string[]): void {
  const path = `results[${index}]`;
  if (value === null || typeof value !== "object") {
    violations.push(`${path} must be an object`);
    return;
  }
  const result = value as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (!RESULT_KEYS.includes(key as (typeof RESULT_KEYS)[number])) {
      violations.push(`${path} has unknown key ${key}`);
    }
  }
  for (const key of RESULT_KEYS) {
    if (!(key in result)) violations.push(`${path} is missing ${key}`);
  }
  if (!GATE_CONDITIONS.includes(result.condition as GateCondition)) {
    violations.push(`${path}.condition ${String(result.condition)} is not a gate condition`);
  }
  if (!VERDICTS.includes(result.verdict as string)) {
    violations.push(`${path}.verdict ${String(result.verdict)} is not PASS/FAIL/UNKNOWN`);
  }
  checkStringField(`${path}.evidence`, result.evidence, violations);
  checkStringField(`${path}.detail`, result.detail, violations);
}

export function validateReportShape(value: unknown): string[] {
  const violations: string[] = [];
  if (value === null || typeof value !== "object") {
    return ["report must be a JSON object"];
  }
  const report = value as Record<string, unknown>;
  for (const key of Object.keys(report)) {
    if (!REPORT_KEYS.includes(key as (typeof REPORT_KEYS)[number])) {
      violations.push(`report has unknown key ${key}`);
    }
  }
  for (const key of REPORT_KEYS) {
    if (!(key in report)) violations.push(`report is missing ${key}`);
  }
  if (!OVERALLS.includes(report.overall as string)) {
    violations.push(`report.overall ${String(report.overall)} is not GREEN/BLOCKED`);
  }
  checkStringField("report.evaluatedAt", report.evaluatedAt, violations);
  checkStringField("report.commitRef", report.commitRef, violations);
  if (!Array.isArray(report.results)) {
    violations.push("report.results must be an array");
    return violations;
  }
  if (report.results.length !== GATE_CONDITIONS.length) {
    violations.push(`report.results must hold ${GATE_CONDITIONS.length} results, found ${report.results.length}`);
  }
  report.results.forEach((entry, index) => {
    validateResult(index, entry, violations);
  });
  return violations;
}

// ---------------------------------------------------------------------------
// Evidence gathering. Impure, and kept apart from the rules above so the rules
// stay testable without a tree. Every measurement is written to fail into
// `null` (UNKNOWN) rather than to throw: a checker that cannot measure must
// still let the other five report (scalability-design.md — checker
// independence).
// ---------------------------------------------------------------------------

export type Evidence = {
  readonly mixedJournal: RunOutcome | null;
  readonly registryDrift: readonly string[] | null;
  readonly callsites: number | null;
  readonly migrationEquivalence: MigrationEquivalenceEvidence | null;
  readonly relay: RelayProof | null;
  readonly distribution: RunOutcome | null;
};

// Condition (a): the mixed v1/v2 journal behaviour-equivalence suite (U6).
//
// U11 removed the projector, and with it t366 — the suite that checked the
// projector built an identical span graph from v1-only, v2-only and mixed
// journals. Nothing consumes the journal that way any more (the Relay reads
// the Signal Stores, FR-RLY-2), so the condition rests on t365, which covers
// the readers this condition is actually named for: doctor, recovery,
// presence, grant, shard merge, the runtime-graph compile input and learnings.
export const MIXED_JOURNAL_TESTS = ["tests/unit/t365-journal-reader-swap.test.ts"] as const;

// Exported for the path-existence test: the gate's own constants are the thing
// most likely to rot, and a test that resolved paths its own way would not be
// checking the constants the gate actually runs.
export const REPO_ROOT_FOR_TEST = REPO_ROOT;

// Condition (f): the distribution drift guards (FR-DST-2, VER-6).
const DISTRIBUTION_GUARDS: readonly (readonly string[])[] = [
  ["scripts/package.ts", "--check"],
  ["scripts/promote-self.ts", "--check"],
];

const RELAY_MODULE = "packages/framework/core/otel/relay.ts";

// The Relay proof is U11's to write, so it is located by the REQUIREMENT it
// discharges rather than by a file name this Unit would be guessing at.
const RELAY_PROOF_MARKER = "FR-RLY-2";

export function measureCallsites(): number | null {
  try {
    return totalSites(buildCensus(scanRepository()));
  } catch {
    return null;
  }
}

export function measureRegistryDrift(): readonly string[] | null {
  try {
    return findRegistryDrift(collectDriftSets(join(REPO_ROOT, "dist", "claude", ".claude")));
  } catch {
    return null;
  }
}

function listTestSources(dir: string, found: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") listTestSources(path, found);
      continue;
    }
    if (entry.name.endsWith(".test.ts")) found.push(path);
  }
}

export function measureRelayProof(): RelayProof | null {
  try {
    const moduleExists = existsSync(join(REPO_ROOT, RELAY_MODULE));
    const sources: string[] = [];
    listTestSources(join(REPO_ROOT, "tests"), sources);
    // Repo-relative, because runBunTests resolves against REPO_ROOT: an
    // absolute path would join into a second repo root and read as a missing
    // proof (Refs: #1783).
    const proofTests = sources
      .filter((path) => readFileSync(path, "utf-8").includes(RELAY_PROOF_MARKER))
      .map((path) => relative(REPO_ROOT, path))
      .sort();
    if (!moduleExists || proofTests.length === 0) return { moduleExists, proofTests, outcome: null };
    return { moduleExists, proofTests, outcome: runBunTests(proofTests) };
  } catch {
    return null;
  }
}

// The marked suites, repo-relative, because runBunTests resolves against
// REPO_ROOT. A walk that threw means the evidence was not gathered at all
// (null -> UNKNOWN), which is not the same as "no suite carries the marker"
// (an empty list -> FAIL under the floor).
export function discoverMigrationEquivalenceTests(): readonly string[] | null {
  try {
    const sources: string[] = [];
    listTestSources(join(REPO_ROOT, "tests"), sources);
    return sources
      .filter((path) => MIGRATION_EQUIVALENCE_TITLE_RE.test(readFileSync(path, "utf-8")))
      .map((path) => relative(REPO_ROOT, path))
      .sort();
  } catch {
    return null;
  }
}

// A base that is already short of the floor, or missing the registry sweep, is
// not run: the checker blocks on that alone, and a green over the thinned set
// would only add a number nobody should read as agreement.
export function measureMigrationEquivalence(
  runTests: (paths: readonly string[]) => RunOutcome
): MigrationEquivalenceEvidence | null {
  const markerFiles = discoverMigrationEquivalenceTests();
  if (markerFiles === null) return null;
  const judgeable =
    markerFiles.length >= MIGRATION_EQUIVALENCE_MIN_FILES && markerFiles.includes(REGISTRY_SWEEP_TEST);
  return { markerFiles, outcome: judgeable ? runTests(markerFiles) : null };
}

function spawn(command: readonly string[]): { readonly ok: boolean; readonly detail: string } {
  // env is passed explicitly: bun does not fold runtime process.env changes
  // into a child on its own (cid:code-generation:bun-spawn-env-snapshot).
  const run = spawnSync(command[0] as string, command.slice(1), {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf-8",
  });
  const tail = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split("\n").slice(-3).join(" | ");
  return { ok: run.status === 0, detail: tail };
}

// bun silently skips a test path that does not exist and still exits 0, so a
// stale constant would report PASS on a suite that never ran. The path set is
// therefore verified BEFORE the run, and a missing path is a harness failure
// (ran: false -> UNKNOWN), never a pass over a partial set
// (cid:build-and-test:test-path-set-completeness).
export function runBunTests(paths: readonly string[]): RunOutcome {
  const missing = paths.filter((path) => !existsSync(join(REPO_ROOT, path)));
  if (missing.length > 0) {
    return { ran: false, passed: false, detail: `declared test path(s) not found: ${missing.join(", ")}`, sources: paths };
  }
  const result = spawn(["bun", "test", ...paths]);
  return { ran: true, passed: result.ok, detail: result.detail, sources: paths };
}

function runDistributionGuards(): RunOutcome {
  const failures: string[] = [];
  for (const guard of DISTRIBUTION_GUARDS) {
    const result = spawn(["bun", ...guard]);
    if (!result.ok) failures.push(`${guard.join(" ")}: ${result.detail}`);
  }
  const sources = DISTRIBUTION_GUARDS.map((guard) => guard.join(" "));
  return { ran: true, passed: failures.length === 0, detail: failures.join(" ;; "), sources };
}

export type GateOptions = {
  readonly reportPath?: string;
  readonly now?: string;
  readonly commitRef?: string;
  // The injection seam that lets a test drive BOTH gate states. It is reachable
  // from a caller, never from argv: `main` only ever builds evidence by
  // measuring, so no flag can hand the evaluator a manufactured PASS
  // (BR-2, security-design.md § 人手バイパスの排除設計).
  readonly evidence?: Evidence;
};

// The two subprocess-driven measurements are injectable so the wiring — which
// condition draws on which source — is checkable without nesting a full test
// run and two distribution guards inside the suite. Nested spawns under the
// suite's own parallelism are a known source of load-induced false reds
// (cid:code-generation:fanout-load-settle-before-integration), and this file is
// run by every CI build. The real runners still execute on every gate run.
export type EvidenceRunners = {
  readonly runTests: (paths: readonly string[]) => RunOutcome;
  readonly runGuards: () => RunOutcome;
};

export const DEFAULT_RUNNERS: EvidenceRunners = { runTests: runBunTests, runGuards: runDistributionGuards };

export function gatherEvidence(options: GateOptions = {}, runners: EvidenceRunners = DEFAULT_RUNNERS): Evidence {
  return {
    mixedJournal: runners.runTests(MIXED_JOURNAL_TESTS),
    registryDrift: measureRegistryDrift(),
    callsites: measureCallsites(),
    migrationEquivalence: measureMigrationEquivalence(runners.runTests),
    relay: measureRelayProof(),
    distribution: runners.runGuards(),
  };
}

export function resultsFromEvidence(evidence: Evidence): ConditionResult[] {
  return [
    checkMixedJournal(evidence.mixedJournal),
    checkRegistryComplete(evidence.registryDrift),
    checkCallsitesZero(evidence.callsites),
    checkMigrationEquivalence(evidence.migrationEquivalence),
    checkRelayProof(evidence.relay),
    checkDistributionGuards(evidence.distribution),
  ];
}

function currentCommitRef(): string {
  const run = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, env: process.env, encoding: "utf-8" });
  return run.status === 0 ? (run.stdout as string).trim() : "unknown";
}

// ---------------------------------------------------------------------------
// CLI.
// ---------------------------------------------------------------------------

function renderReport(report: GateEvaluationReport): void {
  console.log(`deletion gate: ${report.overall} (evaluated ${report.evaluatedAt} at ${report.commitRef})`);
  for (const result of report.results) {
    const title = CONDITION_TITLES[result.condition as GateCondition] ?? "";
    const suffix = result.detail === "" ? "" : ` — ${result.detail}`;
    console.log(`  (${result.condition}) ${result.verdict.padEnd(7)} ${title}${suffix}`);
  }
}

function buildReport(options: GateOptions): GateEvaluationReport {
  const evidence = options.evidence ?? gatherEvidence(options);
  const now = options.now ?? new Date().toISOString();
  return evaluateGate(resultsFromEvidence(evidence), now, options.commitRef ?? currentCommitRef());
}

function persist(report: GateEvaluationReport, reportPath: string | undefined): number {
  if (reportPath === undefined) return 0;
  const violations = validateReportShape(report);
  if (violations.length > 0) {
    console.error("DELETION GATE FAILED [REPORT_SCHEMA]:");
    for (const violation of violations) console.error(`  ${violation}`);
    return 1;
  }
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  return 0;
}

// --check reports and exits 0 whenever the EVALUATION succeeded. A BLOCKED gate
// is the expected state for the whole migration period, so it must not paint CI
// red; what CI carries away is the artifact (BR-16).
export function runCheck(options: GateOptions = {}): number {
  const report = buildReport(options);
  renderReport(report);
  return persist(report, options.reportPath);
}

// --require-green is the deletion precondition itself: it is the arm that says
// "you may now delete" and nothing else in this file grants that (BR-1).
export function runRequireGreen(options: GateOptions = {}): number {
  const report = buildReport(options);
  renderReport(report);
  const persisted = persist(report, options.reportPath);
  if (persisted !== 0) return persisted;
  if (report.overall === "GREEN") return 0;
  const short = report.results.filter((r) => r.verdict !== "PASS").map((r) => `(${r.condition}) ${r.verdict}`);
  console.error(`DELETION GATE BLOCKED: ${short.join(", ")} — the legacy writer must not be deleted (BR-1).`);
  return 1;
}

const USAGE =
  "usage: bun tests/deletion-gate.ts <--check | --require-green> [--report <path>]\n" +
  "  --check          evaluate and write the report; exit 0 whenever the evaluation itself succeeded\n" +
  "  --require-green  the deletion precondition: exit 1 unless every condition PASSes";

type ParsedArgs = { readonly mode: "check" | "require-green"; readonly options: GateOptions } | null;

function parseArgs(args: readonly string[]): ParsedArgs {
  const mode = args[0] === "--check" ? "check" : args[0] === "--require-green" ? "require-green" : null;
  if (mode === null) return null;
  let reportPath: string | undefined;
  for (let i = 1; i < args.length; i += 2) {
    const value = args[i + 1];
    if (value === undefined) return null;
    if (args[i] === "--report") reportPath = value;
    else return null;
  }
  return { mode, options: { reportPath } };
}

export function main(args: string[]): number {
  const parsed = parseArgs(args);
  if (parsed === null) {
    console.error(USAGE);
    return 2;
  }
  try {
    return parsed.mode === "check" ? runCheck(parsed.options) : runRequireGreen(parsed.options);
  } catch (err) {
    console.error(`DELETION GATE FAILED [UNEXPECTED]: ${(err as Error).message}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
