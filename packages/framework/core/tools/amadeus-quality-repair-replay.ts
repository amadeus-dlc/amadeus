// Canonical audit adapter and replay entry point for Quality Repair (#2096).

import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
import { validEventSet } from "./amadeus-loop-monitor-replay.ts";
import { qualityDigest } from "./amadeus-quality-repair.ts";
import {
  createMemoryQualityRepairRepository,
  projectQualityRepairStatus,
  type QualityRepairRepository,
  type QualityRepairStatusEnvelope,
  type QualityRepairTransaction,
  type QualityRuntimeEvent,
  type QualityRuntimeProjection,
} from "./amadeus-quality-repair-runtime.ts";
import {
  auditBlockField,
  findAllEvents,
  readAllAuditShards,
  withAuditLock,
} from "./amadeus-lib.ts";

const QUALITY_EVENT_TYPES = new Set<QualityRuntimeEvent["type"]>([
  "QUALITY_SNAPSHOT_OBSERVED",
  "QUALITY_REPLAN_RESERVED",
  "QUALITY_REPLAN_RECORDED",
  "REPAIR_STALLED",
  "QUALITY_EPOCH_STARTED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validPartition(value: unknown): boolean {
  return isRecord(value) && typeof value.intentUuid === "string" &&
    typeof value.monitorId === "string" && typeof value.stageInstanceId === "string" &&
    typeof value.graphRevision === "string";
}

function validEpoch(value: unknown, qualityScopeId: string): boolean {
  return isRecord(value) && value.qualityScopeId === qualityScopeId &&
    typeof value.qualityEpochId === "string" && typeof value.epochStartEventIdentity === "string" &&
    Number.isInteger(value.threshold) && (value.threshold as number) > 0 && Array.isArray(value.window) &&
    Number.isInteger(value.consecutiveNonProgress) &&
    typeof value.replanSinceLastProgress === "boolean";
}

function validProjectionIdentity(value: Record<string, unknown>): boolean {
  return typeof value.qualityScopeId === "string" && validPartition(value.partition) &&
    validEpoch(value.epoch, value.qualityScopeId);
}

function validProjectionProgress(value: Record<string, unknown>): boolean {
  return Number.isInteger(value.observationSequence) && (value.observationSequence as number) >= 0 &&
    (value.workflowExecutionState === "running" || value.workflowExecutionState === "suspended");
}

function validProjectionOptionals(value: Record<string, unknown>): boolean {
  return (value.latestSnapshot === null ||
      (isRecord(value.latestSnapshot) && Array.isArray(value.latestSnapshot.unresolved) &&
        Array.isArray(value.latestSnapshot.verifierSuccessReceipts))) &&
    (value.lastProgress === null || isRecord(value.lastProgress)) &&
    (value.stalledLatch === null ||
      (isRecord(value.stalledLatch) && Array.isArray(value.stalledLatch.unresolvedObligationIds))) &&
    (value.lastReplanReceipt === null || isRecord(value.lastReplanReceipt)) &&
    (value.pendingReplan === null ||
      (isRecord(value.pendingReplan) && typeof value.pendingReplan.attemptIdentity === "string"));
}

function validProjection(value: unknown): value is QualityRuntimeProjection {
  return isRecord(value) && validProjectionIdentity(value) &&
    validProjectionProgress(value) && validProjectionOptionals(value);
}

function validQualityEventPayload(value: Record<string, unknown>): boolean {
  switch (value.type as QualityRuntimeEvent["type"]) {
    case "QUALITY_SNAPSHOT_OBSERVED":
      return typeof value.snapshotFingerprint === "string" && isRecord(value.progress);
    case "QUALITY_REPLAN_RESERVED":
      return typeof value.replanId === "string" && typeof value.judgeInvocationId === "string" &&
        (value.attemptNo === 0 || value.attemptNo === 1);
    case "QUALITY_REPLAN_RECORDED":
      return typeof value.replanId === "string" && isRecord(value.receipt);
    case "REPAIR_STALLED":
      return isRecord(value.latch);
    case "QUALITY_EPOCH_STARTED":
      return typeof value.priorQualityEpochId === "string" &&
        typeof value.satisfiedAlternativeIdentity === "string" &&
        typeof value.resumeEvidenceReceipt === "string";
  }
}

function validQualityEvent(value: unknown): value is QualityRuntimeEvent {
  return isRecord(value) && typeof value.type === "string" &&
    QUALITY_EVENT_TYPES.has(value.type as QualityRuntimeEvent["type"]) &&
    validProjection(value.projection) && validQualityEventPayload(value);
}

function validTransaction(value: unknown): value is QualityRepairTransaction {
  return isRecord(value) && value.schemaVersion === 1 && typeof value.transactionId === "string" &&
    typeof value.qualityScopeId === "string" && Array.isArray(value.qualityEvents) &&
    value.qualityEvents.every(validQualityEvent) && Array.isArray(value.loopEventSets) &&
    value.loopEventSets.every(validEventSet);
}

export function decodeQualityRepairTransaction(encoded: string): QualityRepairTransaction {
  const parsed: unknown = JSON.parse(encoded);
  if (!validTransaction(parsed)) throw new Error("invalid-quality-repair-transaction");
  return parsed;
}

export function readQualityRepairTransactionsFromAudit(
  projectDir: string,
  intent?: string,
  space?: string,
): QualityRepairTransaction[] {
  const rows = findAllEvents(
    readAllAuditShards(projectDir, intent, space),
    "QUALITY_REPAIR_TRANSACTION_COMMITTED",
  );
  const transactions = rows.map((row) => {
    const encoded = auditBlockField(row.block, "Transaction");
    if (encoded === null) throw new Error("invalid-quality-repair-audit-row:missing-transaction");
    return decodeQualityRepairTransaction(encoded);
  });
  const identities = new Map<string, string>();
  for (const transaction of transactions) {
    const encoded = qualityDigest(transaction);
    const prior = identities.get(transaction.transactionId);
    if (prior !== undefined && prior !== encoded) {
      throw new Error("invalid-quality-repair-audit-row:transaction-conflict");
    }
    identities.set(transaction.transactionId, encoded);
  }
  return [...new Map(transactions.map((item) => [item.transactionId, item])).values()];
}

export function createAuditQualityRepairRepository(options: {
  readonly projectDir: string;
  readonly intent?: string;
  readonly space?: string;
}): QualityRepairRepository {
  const initialTransactions = readQualityRepairTransactionsFromAudit(
    options.projectDir,
    options.intent,
    options.space,
  );
  return createMemoryQualityRepairRepository({
    initialTransactions,
    onCommit(transaction) {
      emitAuditEventGuarded(
        "QUALITY_REPAIR_TRANSACTION_COMMITTED",
        {
          "Quality Scope Id": transaction.qualityScopeId,
          "Transaction Id": transaction.transactionId,
          Transaction: JSON.stringify(transaction),
        },
        options.projectDir,
        options.intent,
        options.space,
      );
    },
    transactionLock: ((body: () => unknown) =>
      withAuditLock<unknown>(
        options.projectDir,
        body as () => never,
        options.intent,
        options.space,
      )) as <T>(body: () => T) => T,
  });
}

export function replayQualityRepairScope(
  repository: QualityRepairRepository,
  qualityScopeId: string,
): {
  readonly projection: QualityRuntimeProjection;
  readonly status: QualityRepairStatusEnvelope;
  readonly transactionCount: number;
} {
  const projection = repository.readProjection(qualityScopeId);
  if (projection === null) throw new Error("quality-repair-replay-scope-not-found");
  return {
    projection,
    status: projectQualityRepairStatus(projection),
    transactionCount: repository.readTransactions().filter(
      (transaction) => transaction.qualityScopeId === qualityScopeId,
    ).length,
  };
}
