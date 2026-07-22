import { verifyAuthorizedProcessRequest, type AuthorizedProcessRequest } from "./execution-policy.ts";
import { parseCellResult, type ArmId, type CellResult, type Result } from "./contract.ts";

export type SampleKey = { kind: "WARMUP"; runNo: 0 } | { kind: "MEASURED"; runNo: 1 | 2 | 3 | 4 | 5 };

export interface MonotonicClock {
  nowMs(): number;
  utcNow(): string;
}

export interface RawProcessOutcome {
  exitCode: number | null;
  signal: string | null;
  stdout: Uint8Array;
  stderr: Uint8Array;
  timedOut: boolean;
  completedExploration: boolean;
  toolVersions: Readonly<Record<string, string>>;
}

export interface ProcessPort {
  execute(request: AuthorizedProcessRequest, timeoutMs: number): Promise<RawProcessOutcome>;
}

export interface CellNormalizer {
  normalize(outcome: RawProcessOutcome, request: AuthorizedProcessRequest, startedAt: string, finishedAt: string): Result<CellResult, { kind: "NormalizationError"; message: string }>;
}

export interface CellKey {
  arm: ArmId;
  subject: string;
  sample: SampleKey;
}

export interface CellEvidenceInput {
  revisionIdentity: string;
  key: CellKey;
  inputSetHash: string;
  command: { argv: readonly string[]; cwd: string; environmentKeys: readonly string[]; snapshotIdentity: string };
  result: CellResult;
  stdout: Uint8Array;
  stderr: Uint8Array;
  timing: { processDurationMs: number; cellElapsedMs: number; suiteElapsedMs: number };
}

export interface VerifiedExecutionReceipt {
  kind: "VerifiedExecutionReceipt";
  bundleId: string;
  envelopeHash: string;
  runnerHead: string;
  storeHead: string;
  runnerSequence: number;
  storeSequence: number;
}

export interface EvidenceStorePort {
  publishCell(input: CellEvidenceInput, deadlineMs: number): Promise<Result<VerifiedExecutionReceipt, EvidenceError>>;
}

export interface EvidenceError {
  kind: "ExecutionInputError" | "ProcessError" | "EvidencePublishError" | "EvidenceIdentityError" | "EvidenceCorruptionError";
  message: string;
  causeIdentity?: string;
}

export type CellExecutionResult =
  | { ok: true; result: CellResult; receipt: VerifiedExecutionReceipt }
  | { ok: false; error: EvidenceError };

function harnessError(request: AuthorizedProcessRequest, outcome: RawProcessOutcome, startedAt: string, finishedAt: string, reason: string): CellResult {
  return {
    schemaVersion: 1,
    arm: request.arm,
    fixtureId: request.subject,
    baselineSha: request.baselineSha.padEnd(64, "0").slice(0, 64),
    armSha: request.armSha.padEnd(64, "0").slice(0, 64),
    verdict: "HARNESS_ERROR",
    exitCode: outcome.exitCode,
    toolVersions: { ...outcome.toolVersions },
    seedOrBound: { reason },
    startedAt,
    finishedAt,
    counterexampleId: null,
    evidencePaths: [],
  };
}

export async function executeCell(
  request: AuthorizedProcessRequest,
  key: CellKey,
  suiteStartedMs: number,
  deadlineMs: number,
  dependencies: { clock: MonotonicClock; process: ProcessPort; normalizer: CellNormalizer; store: EvidenceStorePort },
  publishReserveMs = 0,
): Promise<CellExecutionResult> {
  if (key.arm !== request.arm || key.subject !== request.subject || deadlineMs <= dependencies.clock.nowMs()) return { ok: false, error: { kind: "ExecutionInputError", message: "cell identity or deadline is invalid" } };
  const startedMono = dependencies.clock.nowMs();
  const startedAt = dependencies.clock.utcNow();
  const sealed = verifyAuthorizedProcessRequest(request);
  if (!sealed.ok) return { ok: false, error: { kind: "ExecutionInputError", message: sealed.error.message } };
  let outcome: RawProcessOutcome;
  try {
    const processTimeoutMs = deadlineMs - startedMono - publishReserveMs;
    if (processTimeoutMs <= 0) return { ok: false, error: { kind: "ExecutionInputError", message: "publish reserve leaves no process budget" } };
    outcome = await dependencies.process.execute(request, processTimeoutMs);
  } catch (cause) {
    outcome = { exitCode: null, signal: null, stdout: new Uint8Array(), stderr: new TextEncoder().encode(cause instanceof Error ? cause.message : String(cause)), timedOut: false, completedExploration: false, toolVersions: {} };
  }
  const finishedMono = dependencies.clock.nowMs();
  const finishedAt = dependencies.clock.utcNow();
  const normalized = outcome.exitCode === 0 && outcome.signal === null && !outcome.timedOut && outcome.completedExploration
    ? dependencies.normalizer.normalize(outcome, request, startedAt, finishedAt)
    : { ok: false as const, error: { kind: "NormalizationError" as const, message: outcome.timedOut ? "timeout" : "incomplete exploration" } };
  const result = normalized.ok ? normalized.value : harnessError(request, outcome, startedAt, finishedAt, normalized.error.message);
  const parsed = parseCellResult(result);
  if (!parsed.ok) return { ok: false, error: { kind: "EvidenceIdentityError", message: parsed.error.message } };
  const published = await dependencies.store.publishCell({
    revisionIdentity: request.revisionIdentity,
    key,
    inputSetHash: request.inputSetHash,
    command: { argv: request.argv, cwd: request.cwd, environmentKeys: request.environmentKeys, snapshotIdentity: request.snapshotIdentity },
    result: parsed.value,
    stdout: outcome.stdout,
    stderr: outcome.stderr,
    timing: { processDurationMs: Math.max(0, finishedMono - startedMono), cellElapsedMs: Math.max(0, dependencies.clock.nowMs() - startedMono), suiteElapsedMs: Math.max(0, dependencies.clock.nowMs() - suiteStartedMs) },
  }, deadlineMs);
  return published.ok ? { ok: true, result: parsed.value, receipt: published.value } : { ok: false, error: published.error };
}

export interface IncompleteFinding {
  kind: "SUITE_TIMEOUT" | "EVIDENCE_FAILURE";
  subject: string;
  cause: string;
}

export type SuiteRunResult =
  | { kind: "CompleteSuite"; receipts: readonly VerifiedExecutionReceipt[]; results: readonly CellResult[]; durationMs: number }
  | { kind: "IncompleteSuite"; receipts: readonly VerifiedExecutionReceipt[]; results: readonly CellResult[]; missingSubjects: readonly string[]; findings: readonly IncompleteFinding[]; durationMs: number };

export async function runArmSuite(input: {
  arm: ArmId;
  subjects: readonly string[];
  sample: SampleKey;
  suiteDeadlineMs: number;
  publishReserveMs: number;
  createRequest(subject: string): AuthorizedProcessRequest;
}, dependencies: { clock: MonotonicClock; process: ProcessPort; normalizer: CellNormalizer; store: EvidenceStorePort }): Promise<SuiteRunResult> {
  const started = dependencies.clock.nowMs();
  const receipts: VerifiedExecutionReceipt[] = [];
  const results: CellResult[] = [];
  const findings: IncompleteFinding[] = [];
  for (let index = 0; index < input.subjects.length; index++) {
    const subject = input.subjects[index]!;
    if (input.suiteDeadlineMs - dependencies.clock.nowMs() <= input.publishReserveMs) {
      return { kind: "IncompleteSuite", receipts, results, missingSubjects: input.subjects.slice(index), findings: [...findings, { kind: "SUITE_TIMEOUT", subject, cause: "publish reserve reached" }], durationMs: dependencies.clock.nowMs() - started };
    }
    const executed = await executeCell(input.createRequest(subject), { arm: input.arm, subject, sample: input.sample }, started, input.suiteDeadlineMs, dependencies, input.publishReserveMs);
    if (!executed.ok) {
      findings.push({ kind: "EVIDENCE_FAILURE", subject, cause: executed.error.message });
      return { kind: "IncompleteSuite", receipts, results, missingSubjects: input.subjects.slice(index), findings, durationMs: dependencies.clock.nowMs() - started };
    }
    receipts.push(executed.receipt);
    results.push(executed.result);
  }
  return { kind: "CompleteSuite", receipts, results, durationMs: dependencies.clock.nowMs() - started };
}
