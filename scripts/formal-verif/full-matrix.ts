import { createHash } from "node:crypto";
import { canonicalIdentity } from "./canonical.ts";
import type { ArmId, Result, Verdict } from "./contract.ts";
import type { DCount } from "./fixture-registry-domain.ts";
import type { PromotedFixtureManifest } from "./fixture-registry.ts";
import type { MonotonicClock, SampleKey, SuiteRunResult } from "./execution-evidence.ts";

// U7 owns serial full-matrix measurement and raw cost derivation only. Manifest promotion,
// arm oracle, eligibility, winner selection, and report rendering belong to other units.
// U3/U4/U5 have not passed a third review, so U7 never claims integration/benchmark completion.
export type MatrixIntegrationStatus = "DESIGNED_BLOCKED_ON_U3_U4_U5_GATE";
export const MATRIX_INTEGRATION_STATUS: MatrixIntegrationStatus = "DESIGNED_BLOCKED_ON_U3_U4_U5_GATE";

export const SUITE_TIMEOUT_MS = 120_000;
export const HEALTHY_BASELINE = "HEALTHY_BASELINE";
const SUITE_ORDER_DOMAIN = "suite-order-v1";

export type Position = "first" | "second";

export interface CanonicalInputSet {
  schemaVersion: 1;
  baselineSha: string;
  manifestIdentity: string;
  dCount: DCount;
  orderedSubjects: readonly string[];
  inputSetIdentity: string;
}

export interface ScheduleEntry {
  globalOrdinal: number;
  arm: ArmId;
  sample: SampleKey;
  position: Position;
  entryIdentity: string;
}

export interface MeasurementSchedule {
  scheduleId: string;
  inputSetIdentity: string;
  firstArm: ArmId;
  leadBias: { arm: ArmId; firstPositions: 3; opposite: ArmId; oppositePositions: 2 };
  entries: readonly ScheduleEntry[];
}

export interface SuiteStartReceipt {
  scheduleId: string;
  globalOrdinal: number;
  scheduleEntryIdentity: string;
  arm: ArmId;
  sample: SampleKey;
  position: Position;
  predecessorReceiptIdentity: string | null;
  receiptIdentity: string;
}

export interface MatrixCellKey { arm: ArmId; sampleKind: SampleKey["kind"]; runNo: number; subject: string }
export interface MeasuredSuite { entry: ScheduleEntry; startReceiptIdentity: string; orderedBundleIds: readonly string[]; verdicts: readonly Verdict[]; counterexampleIds: readonly (string | null)[]; durationMs: number }
export interface IncompleteSuite { entry: ScheduleEntry; startReceiptIdentity: string; orderedBundleIds: readonly string[]; missingSubjects: readonly string[]; findingKind: "SUITE_TIMEOUT" | "EVIDENCE_FAILURE"; cause: string; durationMs: number }
export type SuiteOutcome = { kind: "MeasuredSuite"; suite: MeasuredSuite } | { kind: "IncompleteSuite"; suite: IncompleteSuite };

export interface FullMatrixRun { scheduleId: string; receipts: readonly SuiteStartReceipt[]; outcomes: readonly SuiteOutcome[] }

export type MatrixFinding =
  | { kind: "HARNESS_ERROR_CELL"; key: MatrixCellKey }
  | { kind: "SUITE_TIMEOUT"; ordinal: number; cause: string }
  | { kind: "MISSING"; key: MatrixCellKey }
  | { kind: "DUPLICATE"; key: MatrixCellKey }
  | { kind: "IDENTITY_CORRUPTION"; ordinal: number; cause: string }
  | { kind: "CHAIN_DRIFT"; ordinal: number; cause: string }
  | { kind: "INPUT_DRIFT"; cause: string }
  | { kind: "NON_DETERMINISTIC"; arm: ArmId; subject: string };

export type FullMatrixValidation =
  | { kind: "CompleteMatrix"; expectedCellCount: number; matrixIdentity: string }
  | { kind: "IncompleteMatrix"; findings: readonly MatrixFinding[] };

export interface CompleteTimingAggregate { kind: "CompleteTimingAggregate"; arm: ArmId; warmupRawMs: number; measuredRawMs: readonly number[]; sortedMs: readonly number[]; medianMs: number; medianSourceRunNo: number; preparationRawMs: number }
export interface IncompleteTimingAggregate { kind: "IncompleteTimingAggregate"; arm: ArmId; warmupRawMs: number | null; partialRawMs: readonly number[]; cause: string }
export type SuiteTimingAggregate = CompleteTimingAggregate | IncompleteTimingAggregate;

export interface InputSetError { kind: "InputSetError"; message: string }
export interface ScheduleError { kind: "ScheduleError"; message: string }
export interface MatrixEvidenceError { kind: "MatrixEvidenceError"; message: string }

function sha(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function opposite(arm: ArmId): ArmId { return arm === "tla" ? "ts" : "tla"; }
function subjectCount(dCount: DCount): number { return dCount + 1; }

export function compileInputSet(manifest: PromotedFixtureManifest, expectedBaselineSha: string): Result<CanonicalInputSet, InputSetError> {
  if (manifest.schemaVersion !== 1) return { ok: false, error: { kind: "InputSetError", message: "unsupported manifest schema" } };
  if (manifest.baselineSha !== expectedBaselineSha) return { ok: false, error: { kind: "InputSetError", message: "manifest baseline does not match healthy baseline" } };
  if (manifest.orderedEntries.length !== manifest.dCount) return { ok: false, error: { kind: "InputSetError", message: "manifest entry count does not match D-COUNT" } };
  const aliases = manifest.orderedEntries.map((entry) => entry.fixtureAlias);
  if (aliases.some((alias) => alias === HEALTHY_BASELINE) || new Set(aliases).size !== aliases.length) return { ok: false, error: { kind: "InputSetError", message: "aliases must be unique and distinct from the baseline" } };
  const orderedSubjects = [HEALTHY_BASELINE, ...aliases];
  if (orderedSubjects.length !== subjectCount(manifest.dCount)) return { ok: false, error: { kind: "InputSetError", message: "subject count is not D-COUNT + 1" } };
  const inputSetIdentity = canonicalIdentity({ schemaVersion: 1, baselineSha: manifest.baselineSha, manifestIdentity: manifest.manifestIdentity, dCount: manifest.dCount, orderedSubjects }, "amadeus.formal-verif.input-set.v1").sha256;
  return { ok: true, value: { schemaVersion: 1, baselineSha: manifest.baselineSha, manifestIdentity: manifest.manifestIdentity, dCount: manifest.dCount, orderedSubjects, inputSetIdentity } };
}

function entryOf(scheduleId: string, globalOrdinal: number, arm: ArmId, sample: SampleKey, position: Position): ScheduleEntry {
  const entryIdentity = canonicalIdentity({ scheduleId, globalOrdinal, arm, sample, position }, "amadeus.formal-verif.schedule-entry.v1").sha256;
  return { globalOrdinal, arm, sample, position, entryIdentity };
}

export function compileSchedule(inputSetIdentity: string): Result<MeasurementSchedule, ScheduleError> {
  if (!/^[0-9a-f]{64}$/.test(inputSetIdentity)) return { ok: false, error: { kind: "ScheduleError", message: "input set identity must be SHA-256" } };
  const seed = sha(`${inputSetIdentity}\0${SUITE_ORDER_DOMAIN}`);
  const firstArm: ArmId = (Number.parseInt(seed.slice(-1), 16) & 1) === 0 ? "tla" : "ts";
  const other = opposite(firstArm);
  const scheduleId = canonicalIdentity({ inputSetIdentity, firstArm, order: SUITE_ORDER_DOMAIN }, "amadeus.formal-verif.schedule.v1").sha256;
  const entries: ScheduleEntry[] = [
    entryOf(scheduleId, 0, other, { kind: "WARMUP", runNo: 0 }, "first"),
    entryOf(scheduleId, 1, firstArm, { kind: "WARMUP", runNo: 0 }, "second"),
  ];
  for (let run = 1; run <= 5; run++) {
    const lead = run % 2 === 1 ? firstArm : other;
    const sample = { kind: "MEASURED", runNo: run } as SampleKey;
    entries.push(entryOf(scheduleId, entries.length, lead, sample, "first"));
    entries.push(entryOf(scheduleId, entries.length, opposite(lead), sample, "second"));
  }
  return { ok: true, value: { scheduleId, inputSetIdentity, firstArm, leadBias: { arm: firstArm, firstPositions: 3, opposite: other, oppositePositions: 2 }, entries } };
}

export interface SuiteRunnerPort {
  run(entry: ScheduleEntry, orderedSubjects: readonly string[], suiteDeadlineMs: number): Promise<SuiteRunResult>;
}

export async function runFullMatrix(schedule: MeasurementSchedule, inputSet: CanonicalInputSet, deps: { clock: MonotonicClock; runner: SuiteRunnerPort }): Promise<FullMatrixRun> {
  const receipts: SuiteStartReceipt[] = [];
  const outcomes: SuiteOutcome[] = [];
  for (const entry of schedule.entries) {
    const predecessorReceiptIdentity = receipts.at(-1)?.receiptIdentity ?? null;
    const receiptBody = { scheduleId: schedule.scheduleId, globalOrdinal: entry.globalOrdinal, scheduleEntryIdentity: entry.entryIdentity, arm: entry.arm, sample: entry.sample, position: entry.position, predecessorReceiptIdentity };
    const receipt: SuiteStartReceipt = { ...receiptBody, receiptIdentity: canonicalIdentity(receiptBody, "amadeus.formal-verif.suite-start-receipt.v1").sha256 };
    receipts.push(receipt);
    const result = await deps.runner.run(entry, inputSet.orderedSubjects, deps.clock.nowMs() + SUITE_TIMEOUT_MS);
    if (result.kind === "CompleteSuite") {
      outcomes.push({ kind: "MeasuredSuite", suite: { entry, startReceiptIdentity: receipt.receiptIdentity, orderedBundleIds: result.receipts.map((r) => r.bundleId), verdicts: result.results.map((c) => c.verdict), counterexampleIds: result.results.map((c) => c.counterexampleId), durationMs: result.durationMs } });
    } else {
      const finding = result.findings.at(-1);
      outcomes.push({ kind: "IncompleteSuite", suite: { entry, startReceiptIdentity: receipt.receiptIdentity, orderedBundleIds: result.receipts.map((r) => r.bundleId), missingSubjects: result.missingSubjects, findingKind: finding?.kind ?? "SUITE_TIMEOUT", cause: finding?.cause ?? "suite did not complete", durationMs: result.durationMs } });
    }
  }
  return { scheduleId: schedule.scheduleId, receipts, outcomes };
}

function cellKeyId(key: MatrixCellKey): string { return `${key.arm}\0${key.sampleKind}\0${key.runNo}\0${key.subject}`; }

// BR-01/BR-04 identity binding at the validator layer: a schedule compiled
// from a different input set must never validate this matrix as complete,
// even on call paths that skip buildMatrixEvidence.
function inputBindingFindings(inputSet: CanonicalInputSet, schedule: MeasurementSchedule, run: FullMatrixRun): MatrixFinding[] {
  const findings: MatrixFinding[] = [];
  if (schedule.inputSetIdentity !== inputSet.inputSetIdentity) findings.push({ kind: "INPUT_DRIFT", cause: "schedule is not bound to this input set identity" });
  if (run.scheduleId !== schedule.scheduleId) findings.push({ kind: "INPUT_DRIFT", cause: "run is not bound to this schedule" });
  return findings;
}

export function verifyFullMatrix(inputSet: CanonicalInputSet, schedule: MeasurementSchedule, run: FullMatrixRun): FullMatrixValidation {
  const findings: MatrixFinding[] = [...inputBindingFindings(inputSet, schedule, run)];
  if (run.receipts.length !== schedule.entries.length) findings.push({ kind: "CHAIN_DRIFT", ordinal: -1, cause: "receipt count does not match schedule" });
  run.receipts.forEach((receipt, index) => {
    const entry = schedule.entries[index];
    if (!entry || receipt.globalOrdinal !== index || receipt.scheduleEntryIdentity !== entry.entryIdentity) findings.push({ kind: "CHAIN_DRIFT", ordinal: index, cause: "receipt/schedule entry mismatch" });
    const expectedPredecessor = index === 0 ? null : run.receipts[index - 1]?.receiptIdentity ?? null;
    if (receipt.predecessorReceiptIdentity !== expectedPredecessor) findings.push({ kind: "CHAIN_DRIFT", ordinal: index, cause: "predecessor chain broken" });
  });
  const seen = new Set<string>();
  const present = new Set<string>();
  for (const outcome of run.outcomes) {
    if (outcome.kind === "IncompleteSuite") { findings.push({ kind: "SUITE_TIMEOUT", ordinal: outcome.suite.entry.globalOrdinal, cause: outcome.suite.cause }); continue; }
    const { entry, verdicts } = outcome.suite;
    if (outcome.suite.orderedBundleIds.length !== inputSet.orderedSubjects.length) { findings.push({ kind: "IDENTITY_CORRUPTION", ordinal: entry.globalOrdinal, cause: "bundle/subject cardinality mismatch" }); continue; }
    inputSet.orderedSubjects.forEach((subject, i) => {
      const key: MatrixCellKey = { arm: entry.arm, sampleKind: entry.sample.kind, runNo: entry.sample.runNo, subject };
      const id = cellKeyId(key);
      if (seen.has(id)) findings.push({ kind: "DUPLICATE", key });
      seen.add(id);
      present.add(id);
      if (verdicts[i] === "HARNESS_ERROR") findings.push({ kind: "HARNESS_ERROR_CELL", key });
    });
  }
  const expectedCellCount = schedule.entries.length * inputSet.orderedSubjects.length;
  for (const entry of schedule.entries) {
    for (const subject of inputSet.orderedSubjects) {
      const key: MatrixCellKey = { arm: entry.arm, sampleKind: entry.sample.kind, runNo: entry.sample.runNo, subject };
      if (!present.has(cellKeyId(key))) findings.push({ kind: "MISSING", key });
    }
  }
  for (const arm of ["tla", "ts"] as const) {
    for (const subject of inputSet.orderedSubjects) {
      const verdicts: Verdict[] = [];
      for (const outcome of run.outcomes) {
        if (outcome.kind !== "MeasuredSuite" || outcome.suite.entry.arm !== arm || outcome.suite.entry.sample.kind !== "MEASURED") continue;
        const i = inputSet.orderedSubjects.indexOf(subject);
        const v = outcome.suite.verdicts[i];
        if (v) verdicts.push(v);
      }
      if (verdicts.length === 5 && new Set(verdicts).size !== 1) findings.push({ kind: "NON_DETERMINISTIC", arm, subject });
    }
  }
  if (findings.length > 0) return { kind: "IncompleteMatrix", findings };
  const matrixIdentity = canonicalIdentity({ inputSetIdentity: inputSet.inputSetIdentity, scheduleId: schedule.scheduleId, cells: [...present].sort() }, "amadeus.formal-verif.full-matrix.v1").sha256;
  return { kind: "CompleteMatrix", expectedCellCount, matrixIdentity };
}

export function aggregateTiming(arm: ArmId, run: FullMatrixRun, preparationRawMs: number): SuiteTimingAggregate {
  const warmup = run.outcomes.find((o) => o.suite.entry.arm === arm && o.suite.entry.sample.kind === "WARMUP");
  const warmupRawMs = warmup && warmup.kind === "MeasuredSuite" ? warmup.suite.durationMs : null;
  const measured: { runNo: number; durationMs: number }[] = [];
  for (const outcome of run.outcomes) {
    if (outcome.suite.entry.arm !== arm || outcome.suite.entry.sample.kind !== "MEASURED") continue;
    if (outcome.kind !== "MeasuredSuite") return { kind: "IncompleteTimingAggregate", arm, warmupRawMs, partialRawMs: measured.map((m) => m.durationMs), cause: "measured suite is incomplete" };
    measured.push({ runNo: outcome.suite.entry.sample.runNo, durationMs: outcome.suite.durationMs });
  }
  if (warmupRawMs === null || measured.length !== 5) return { kind: "IncompleteTimingAggregate", arm, warmupRawMs, partialRawMs: measured.map((m) => m.durationMs), cause: "expected 1 warmup and 5 complete measured suites" };
  const measuredRawMs = measured.map((m) => m.durationMs);
  const sorted = [...measured].sort((a, b) => a.durationMs - b.durationMs);
  const medianEntry = sorted[2]!;
  return { kind: "CompleteTimingAggregate", arm, warmupRawMs, measuredRawMs, sortedMs: sorted.map((m) => m.durationMs), medianMs: medianEntry.durationMs, medianSourceRunNo: medianEntry.runNo, preparationRawMs };
}

export interface FullMatrixEvidence {
  schemaVersion: 1;
  status: MatrixIntegrationStatus;
  inputSetIdentity: string;
  scheduleId: string;
  matrixIdentity: string;
  suiteReceiptIdentities: readonly string[];
  costRefs: { locIdentities: readonly string[]; elapsedIdentities: readonly string[]; timingIdentities: readonly string[] };
  evidenceIdentity: string;
}

export function buildMatrixEvidence(input: { inputSet: CanonicalInputSet; schedule: MeasurementSchedule; run: FullMatrixRun; matrix: FullMatrixValidation; costRefs: FullMatrixEvidence["costRefs"] }): Result<FullMatrixEvidence, MatrixEvidenceError> {
  if (input.matrix.kind !== "CompleteMatrix") return { ok: false, error: { kind: "MatrixEvidenceError", message: "cannot derive evidence from an incomplete matrix" } };
  if (input.run.scheduleId !== input.schedule.scheduleId || input.schedule.inputSetIdentity !== input.inputSet.inputSetIdentity) return { ok: false, error: { kind: "MatrixEvidenceError", message: "source identities do not agree" } };
  const suiteReceiptIdentities = input.run.receipts.map((r) => r.receiptIdentity);
  const body = { schemaVersion: 1 as const, status: MATRIX_INTEGRATION_STATUS, inputSetIdentity: input.inputSet.inputSetIdentity, scheduleId: input.schedule.scheduleId, matrixIdentity: input.matrix.matrixIdentity, suiteReceiptIdentities, costRefs: input.costRefs };
  const evidenceIdentity = canonicalIdentity(body, "amadeus.formal-verif.full-matrix-evidence.v1").sha256;
  return { ok: true, value: { ...body, evidenceIdentity } };
}
