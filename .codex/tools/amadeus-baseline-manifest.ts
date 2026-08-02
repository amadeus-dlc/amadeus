// Audit-derived execution observability baseline manifest (#1602).

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  ExecutionAttempt,
  Fact,
  LogicalOperation,
} from "./amadeus-execution-contract.ts";
import type { ExecutionEnvironmentSnapshot } from "./amadeus-harness-capability.ts";
import type {
  BaselineRun,
  BaselineStatus,
  ExecutionEvent,
  ExecutionEventSet,
  ExecutionRepository,
} from "./amadeus-execution-lifecycle.ts";
import { recordDir, writeFileAtomic } from "./amadeus-lib.ts";

export const BASELINE_MANIFEST_RELATIVE_PATH = join(
  "construction",
  "execution-observability-baseline",
  "evidence",
  "baseline-manifest.json",
);

export interface BaselineExpectation {
  readonly workloadId: string;
  readonly inputDigest: string;
}

export interface BaselineSummary {
  readonly warmupCount: number;
  readonly measuredCount: number;
  readonly medianDurationMs: number | null;
  readonly p95DurationMs: number | null;
}

export interface BaselineManifest {
  readonly schemaVersion: 1;
  readonly rootOperationId: string;
  readonly baselineRun: BaselineRun | null;
  readonly environment: ExecutionEnvironmentSnapshot | null;
  readonly operations: readonly LogicalOperation[];
  readonly attempts: readonly ExecutionAttempt[];
  readonly summary: BaselineSummary;
  readonly status: BaselineStatus;
  readonly validForComparison: boolean;
}

function factAvailable<T>(fact: Fact<T>): boolean {
  return fact.state === "available";
}

function percentile95(sorted: readonly number[]): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? null;
}

function median(sorted: readonly number[]): number | null {
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

interface BaselineAccumulator {
  readonly operations: Map<string, LogicalOperation>;
  readonly attempts: Map<string, ExecutionAttempt>;
  baselineRun: BaselineRun | null;
  environment: ExecutionEnvironmentSnapshot | null;
}

function collectBaselineEvent(
  collected: BaselineAccumulator,
  event: ExecutionEvent,
): void {
  if (event.type === "operation-started") {
    collected.operations.set(event.operation.operationId, event.operation);
    collected.baselineRun ??= event.baseline ?? null;
    collected.environment ??= event.environment ?? null;
  } else if (event.type === "operation-finished") {
    collected.operations.set(event.finished.operation.operationId, event.finished.operation);
  } else if (event.type === "attempt-started") {
    collected.attempts.set(event.start.attempt.attemptId, event.start.attempt);
  } else if (event.type === "attempt-finished") {
    collected.attempts.set(event.finished.attempt.attemptId, event.finished.attempt);
  }
}

function collectBaselineEntities(
  eventSets: readonly ExecutionEventSet[],
  rootOperationId: string,
): BaselineAccumulator {
  const collected: BaselineAccumulator = {
    operations: new Map(),
    attempts: new Map(),
    baselineRun: null,
    environment: null,
  };

  // One audit pass. Child entities are accumulated by id; there is no
  // child-by-child re-scan of the journal.
  for (const set of eventSets) {
    if (set.rootOperationId !== rootOperationId) continue;
    for (const event of set.events) collectBaselineEvent(collected, event);
  }
  return collected;
}

function attemptIsTerminal(attempt: ExecutionAttempt): boolean {
  return (
    attempt.outcome !== null &&
    attempt.finishedAtFact.state === "available" &&
    attempt.measurement !== null
  );
}

function measuredDurations(attempts: readonly ExecutionAttempt[]): number[] {
  return attempts
    .slice(3)
    .flatMap((attempt) => {
      const measurement = attempt.measurement;
      return measurement?.measurementQuality !== "invalid" &&
        measurement?.durationMs !== undefined
        ? [measurement.durationMs]
        : [];
    })
    .sort((left, right) => left - right);
}

function baselineFactsAvailable(baseline: BaselineRun | null): boolean {
  return (
    baseline !== null &&
    baseline.workloadId !== "" &&
    baseline.workloadVersion !== "" &&
    baseline.inputDigest !== "" &&
    factAvailable(baseline.observedGitSha) &&
    factAvailable(baseline.startCriteria) &&
    factAvailable(baseline.expectedEndCriteria) &&
    factAvailable(baseline.actualEndCriteria)
  );
}

function environmentFactsAvailable(environment: ExecutionEnvironmentSnapshot): boolean {
  return [
    environment.harness,
    environment.model,
    environment.harnessVersion,
    environment.capability,
    environment.clockAvailability,
  ].every((fact) => fact.state === "available");
}

function classifyBaselineStatus(input: {
  readonly baselineRun: BaselineRun | null;
  readonly environment: ExecutionEnvironmentSnapshot | null;
  readonly expected: BaselineExpectation;
  readonly attempts: readonly ExecutionAttempt[];
  readonly validDurationCount: number;
}): BaselineStatus {
  const workloadMatches =
    input.baselineRun?.workloadId === input.expected.workloadId &&
    input.baselineRun?.inputDigest === input.expected.inputDigest;
  const workloadShapeValid =
    input.attempts.length === 23 &&
    input.attempts.slice(3).length === 20 &&
    input.validDurationCount === 20;
  const complete =
    baselineFactsAvailable(input.baselineRun) &&
    workloadMatches &&
    input.attempts.every(attemptIsTerminal) &&
    workloadShapeValid &&
    input.environment !== null;
  if (!complete || input.environment === null) return "invalid";
  return environmentFactsAvailable(input.environment) ? "complete" : "complete-with-gaps";
}

export function buildBaselineManifest(
  eventSets: readonly ExecutionEventSet[],
  rootOperationId: string,
  expected: BaselineExpectation,
): BaselineManifest {
  const collected = collectBaselineEntities(eventSets, rootOperationId);
  const attemptValues = [...collected.attempts.values()].sort(
    (left, right) => left.ordinal - right.ordinal,
  );
  const measured = attemptValues.slice(3);
  const validDurations = measuredDurations(attemptValues);
  const status = classifyBaselineStatus({
    baselineRun: collected.baselineRun,
    environment: collected.environment,
    expected,
    attempts: attemptValues,
    validDurationCount: validDurations.length,
  });

  return {
    schemaVersion: 1,
    rootOperationId,
    baselineRun:
      collected.baselineRun === null ? null : { ...collected.baselineRun, status },
    environment: collected.environment,
    operations: [...collected.operations.values()],
    attempts: attemptValues,
    summary: {
      warmupCount: Math.min(3, attemptValues.length),
      measuredCount: measured.length,
      medianDurationMs: status === "invalid" ? null : median(validDurations),
      p95DurationMs: status === "invalid" ? null : percentile95(validDurations),
    },
    status,
    validForComparison: status !== "invalid",
  };
}

export function projectBaselineManifest(
  projectDir: string,
  rootOperationId: string,
  repository: ExecutionRepository,
  expected: BaselineExpectation,
): { readonly path: string; readonly manifest: BaselineManifest } {
  const root = recordDir(projectDir);
  if (root === null) throw new Error("cannot project baseline manifest without an active Intent record");
  const manifest = buildBaselineManifest(
    repository.readEventSets(),
    rootOperationId,
    expected,
  );
  const path = join(root, BASELINE_MANIFEST_RELATIVE_PATH);
  mkdirSync(dirname(path), { recursive: true });
  writeFileAtomic(path, `${JSON.stringify(manifest, null, 2)}\n`);
  return { path, manifest };
}
