// Canonical audit codec and replay for Intent-scoped autonomy (#2067).

import {
  assertLegalAutonomyProjection,
  autonomyCanonicalJson,
  autonomyDigest,
  autonomyIsRecord,
  type AutonomyProjection,
} from "./amadeus-intent-autonomy.ts";
import {
  createMemoryIntentAutonomyRepository,
  type IntentAutonomyRepository,
  type IntentAutonomyTransaction,
} from "./amadeus-intent-autonomy-runtime.ts";
import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
import {
  auditBlockField,
  findAllEvents,
  readAllAuditShards,
  splitAuditRecords,
  withAuditLock,
} from "./amadeus-lib.ts";

export const INTENT_AUTONOMY_AUDIT_EVENT = "INTENT_AUTONOMY_TRANSACTION_COMMITTED";

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function transactionShape(value: unknown): value is IntentAutonomyTransaction {
  if (!autonomyIsRecord(value) || value.schemaVersion !== 1 ||
    typeof value.transactionId !== "string" || typeof value.intentUuid !== "string" ||
    typeof value.expectedRevision !== "number" || typeof value.beforeProjectionDigest !== "string" ||
    typeof value.afterProjectionDigest !== "string" || !Array.isArray(value.events) ||
    !autonomyIsRecord(value.projection)) return false;
  try {
    assertLegalAutonomyProjection(value.projection as unknown as AutonomyProjection);
    return value.afterProjectionDigest === autonomyDigest(value.projection) && value.events.length > 0;
  } catch {
    return false;
  }
}

export function encodeIntentAutonomyTransaction(transaction: IntentAutonomyTransaction): string {
  if (!transactionShape(transaction)) throw new Error("invalid-intent-autonomy-transaction");
  return encodeBase64Url(autonomyCanonicalJson(transaction));
}

export function decodeIntentAutonomyTransaction(encoded: string): IntentAutonomyTransaction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(encoded));
  } catch {
    throw new Error("invalid-intent-autonomy-transaction-encoding");
  }
  if (!transactionShape(parsed)) throw new Error("invalid-intent-autonomy-transaction");
  return parsed;
}

export function intentAutonomyAuditFields(transaction: IntentAutonomyTransaction): Readonly<Record<string, string>> {
  const fields: Record<string, string> = {
    "Intent Uuid": transaction.intentUuid,
    "Transaction Id": transaction.transactionId,
    "Transaction Digest": autonomyDigest(transaction),
    Transaction: encodeIntentAutonomyTransaction(transaction),
  };
  const decision = transaction.events.find((event) => event.type === "AUTO_DECIDED");
  if (decision?.type === "AUTO_DECIDED") {
    fields.Principal = decision.decision.principalId;
    fields.Decider = decision.decision.decider;
    fields.Actor = decision.decision.actorId;
    fields.Basis = decision.decision.basisKind;
  } else {
    const mode = transaction.events.find((event) => event.type === "AUTONOMY_MODE_CHANGED");
    if (mode?.type === "AUTONOMY_MODE_CHANGED") fields.Principal = mode.principalId;
  }
  return fields;
}

function field(block: string, name: string): string | null {
  if (block.startsWith("{")) return auditBlockField(block, name);
  const match = block.match(new RegExp(`^${name}:\\s*(.*)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function eventBlocks(audit: string): string[] {
  if (audit.trimStart().startsWith("{")) return splitAuditRecords(audit);
  return audit.split(/\n(?=Event:\s*)/).map((block) => block.trim()).filter(Boolean);
}

export function readIntentAutonomyTransactions(audit: string): readonly IntentAutonomyTransaction[] {
  const byId = new Map<string, IntentAutonomyTransaction>();
  for (const block of eventBlocks(audit)) {
    if (field(block, "Event") !== INTENT_AUTONOMY_AUDIT_EVENT) continue;
    const encoded = field(block, "Transaction");
    const expectedId = field(block, "Transaction Id");
    const expectedIntent = field(block, "Intent Uuid");
    const expectedDigest = field(block, "Transaction Digest");
    if (!encoded || !expectedId || !expectedIntent || !expectedDigest) {
      throw new Error("invalid-intent-autonomy-audit-row:missing-field");
    }
    const transaction = decodeIntentAutonomyTransaction(encoded);
    if (transaction.transactionId !== expectedId || transaction.intentUuid !== expectedIntent ||
      autonomyDigest(transaction) !== expectedDigest) {
      throw new Error("invalid-intent-autonomy-audit-row:identity-mismatch");
    }
    const previous = byId.get(transaction.transactionId);
    if (previous !== undefined && autonomyDigest(previous) !== autonomyDigest(transaction)) {
      throw new Error("intent-autonomy-transaction-conflict");
    }
    byId.set(transaction.transactionId, transaction);
  }
  return [...byId.values()].sort((left, right) => {
    const revision = left.expectedRevision - right.expectedRevision;
    return revision !== 0 ? revision : Buffer.compare(Buffer.from(left.transactionId), Buffer.from(right.transactionId));
  });
}

export function replayIntentAutonomyAudit(audit: string): IntentAutonomyRepository {
  return createMemoryIntentAutonomyRepository({
    initialTransactions: readIntentAutonomyTransactions(audit),
  });
}

export function readIntentAutonomyTransactionsFromAudit(
  projectDir: string,
  intent?: string,
  space?: string,
): readonly IntentAutonomyTransaction[] {
  const rows = findAllEvents(readAllAuditShards(projectDir, intent, space), INTENT_AUTONOMY_AUDIT_EVENT);
  return readIntentAutonomyTransactions(rows.map((row) => row.block).join("\n"));
}

export function createAuditIntentAutonomyRepository(options: {
  readonly projectDir: string;
  readonly intent?: string;
  readonly space?: string;
  readonly audit?: string;
}): IntentAutonomyRepository {
  const initialTransactions = options.audit === undefined
    ? readIntentAutonomyTransactionsFromAudit(options.projectDir, options.intent, options.space)
    : readIntentAutonomyTransactions(
      findAllEvents(options.audit, INTENT_AUTONOMY_AUDIT_EVENT).map((row) => row.block).join("\n"),
    );
  return createMemoryIntentAutonomyRepository({
    initialTransactions,
    onCommit(transaction) {
      emitAuditEventGuarded(
        "INTENT_AUTONOMY_TRANSACTION_COMMITTED",
        { ...intentAutonomyAuditFields(transaction) },
        options.projectDir,
        options.intent,
        options.space,
      );
    },
    transactionLock: ((body: () => unknown) => withAuditLock(
      options.projectDir,
      body as () => never,
      options.intent,
      options.space,
    )) as <T>(body: () => T) => T,
  });
}

export function renderIntentAutonomyAuditBlock(transaction: IntentAutonomyTransaction): string {
  const fields = intentAutonomyAuditFields(transaction);
  return [
    `Event: ${INTENT_AUTONOMY_AUDIT_EVENT}`,
    ...Object.entries(fields).map(([name, value]) => `${name}: ${value}`),
  ].join("\n");
}
