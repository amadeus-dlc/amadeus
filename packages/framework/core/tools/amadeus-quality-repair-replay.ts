// Canonical audit adapter and replay entry point for Quality Repair (#2096).

import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
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

function validQualityEvent(value: unknown): value is QualityRuntimeEvent {
  return isRecord(value) && typeof value.type === "string" &&
    QUALITY_EVENT_TYPES.has(value.type as QualityRuntimeEvent["type"]) && isRecord(value.projection);
}

function validTransaction(value: unknown): value is QualityRepairTransaction {
  return isRecord(value) && value.schemaVersion === 1 && typeof value.transactionId === "string" &&
    typeof value.qualityScopeId === "string" && Array.isArray(value.qualityEvents) &&
    value.qualityEvents.every(validQualityEvent) && Array.isArray(value.loopEventSets) &&
    value.loopEventSets.every((set) => isRecord(set) && typeof set.eventSetId === "string" &&
      Array.isArray(set.events));
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
    const encoded = JSON.stringify(transaction);
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
