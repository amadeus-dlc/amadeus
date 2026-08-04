// Durable per-clone Replay Index for Loop Monitor partitions (#2095).
//
// Canonical audit event sets remain the source of truth. The index is a
// machine-local secondary projection used by normal cold resume so unrelated
// audit noise is never scanned. Missing/corrupt/in-flight state is loud and can
// only be rebuilt by the explicit repair seam.

import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
import {
  loopMonitorPartitionKey,
  loopMonitorReceiptId,
  type LoopMonitorCommitReceipt,
  type LoopMonitorEvent,
  type LoopMonitorEventSet,
  type LoopMonitorRepository,
} from "./amadeus-loop-monitor-runtime.ts";
import type { LoopDelivery, LoopMonitorPartition } from "./amadeus-loop-monitor.ts";
import {
  auditBlockField,
  docsRoot,
  findAllEvents,
  readAllAuditShards,
  withAuditLock,
} from "./amadeus-lib.ts";

export const LOOP_MONITOR_REPLAY_INDEX_FILE = ".amadeus-loop-monitor-replay-index.json";
export const LOOP_MONITOR_REPLAY_WAL_FILE = ".amadeus-loop-monitor-replay-wal.json";

interface ReplayPartition {
  readonly partition: LoopMonitorPartition;
  readonly eventSets: readonly LoopMonitorEventSet[];
}

interface ReplayIndex {
  readonly schemaVersion: 1;
  readonly partitions: Readonly<Record<string, ReplayPartition>>;
}

interface ReplayWal {
  readonly schemaVersion: 1;
  readonly partitionKey: string;
  readonly eventSet: LoopMonitorEventSet;
  readonly eventSetDigest: string;
}

export class LoopMonitorReplayIncompleteError extends Error {
  readonly code: "INDEX_MISSING" | "INDEX_CORRUPT" | "WAL_PENDING";

  constructor(code: LoopMonitorReplayIncompleteError["code"], detail: string) {
    super(`loop-monitor-replay-incomplete:${code}:${detail}`);
    this.name = "LoopMonitorReplayIncompleteError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytewise(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort(bytewise).map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function indexPath(indexDir: string): string {
  return join(indexDir, LOOP_MONITOR_REPLAY_INDEX_FILE);
}

function walPath(indexDir: string): string {
  return join(indexDir, LOOP_MONITOR_REPLAY_WAL_FILE);
}

function writeJsonAtomic(path: string, value: unknown): void {
  const temporary = `${path}.tmp-${randomUUID()}`;
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, path);
  } catch (cause) {
    try {
      rmSync(temporary, { force: true });
    } catch {
      // Preserve the original write or rename failure.
    }
    throw cause;
  }
}

function emptyIndex(): ReplayIndex {
  return { schemaVersion: 1, partitions: {} };
}

export function initializeLoopMonitorReplayIndex(indexDir: string): void {
  mkdirSync(indexDir, { recursive: true, mode: 0o700 });
  if (!existsSync(indexPath(indexDir))) writeJsonAtomic(indexPath(indexDir), emptyIndex());
}

function validPartition(value: unknown): value is LoopMonitorPartition {
  return isRecord(value) && typeof value.intentUuid === "string" &&
    typeof value.monitorId === "string" && typeof value.stageInstanceId === "string" &&
    typeof value.graphRevision === "string";
}

const EVENT_TYPES = new Set<LoopMonitorEvent["type"]>([
  "LOOP_DELIVERY_OBSERVED",
  "LOOP_MONITOR_TRIGGERED",
  "LOOP_JUDGE_STARTED",
  "LOOP_JUDGE_ATTEMPT_STARTED",
  "LOOP_JUDGE_RESULT_OBSERVED",
  "LOOP_JUDGE_COMPLETED",
  "LOOP_ROUTE_APPLIED",
  "LOOP_LATCH_SET",
  "LOOP_LATCH_CLEARED",
  "WORKFLOW_UNPARKED",
  "LOOP_JUDGE_AWAITING_HUMAN",
  "LIVE_SMOKE_AUTHORIZED",
]);

function validTrace(value: unknown): boolean {
  return isRecord(value) && typeof value.traceId === "string" && typeof value.spanId === "string";
}

function validRouteConstraint(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.routeIds) &&
    value.routeIds.every((routeId) => typeof routeId === "string") &&
    typeof value.fingerprint === "string";
}

function validReservation(value: unknown): boolean {
  return isRecord(value) && typeof value.invocationId === "string" &&
    typeof value.monitorId === "string" && Number.isInteger(value.epoch) &&
    typeof value.triggerDeliveryId === "string" && typeof value.graphRevision === "string" &&
    typeof value.evidenceFingerprint === "string" && typeof value.constraintFingerprint === "string" &&
    validRouteConstraint(value.routeConstraint) && validTrace(value.trace);
}

function validLatch(value: unknown): boolean {
  return isRecord(value) && typeof value.monitorId === "string" && Number.isInteger(value.epoch) &&
    typeof value.evidenceFingerprint === "string" && typeof value.invocationId === "string" &&
    typeof value.routeId === "string" && typeof value.reasonCode === "string" &&
    typeof value.resumeCondition === "string";
}

function validDelivery(value: unknown): value is LoopDelivery {
  if (!isRecord(value) || typeof value.deliveryId !== "string" || !validPartition(value.partition) ||
    typeof value.eventId !== "string" ||
    (value.predecessorDeliveryId !== null && typeof value.predecessorDeliveryId !== "string") ||
    typeof value.upstreamEventIdentity !== "string" || typeof value.payloadFingerprint !== "string" ||
    !isRecord(value.payload) || typeof value.payload.stageId !== "string" ||
    !Array.isArray(value.payload.references) || !isRecord(value.evidence) ||
    typeof value.evidence.fingerprint !== "string" || !Array.isArray(value.evidence.obligationIds) ||
    !validRouteConstraint(value.routeConstraint) || !validTrace(value.trace)) return false;
  return value.payload.references.every((reference) =>
    isRecord(reference) && typeof reference.kind === "string" &&
    typeof reference.id === "string" && typeof reference.digest === "string"
  ) && value.evidence.obligationIds.every((id) => typeof id === "string");
}

function validEvent(value: unknown): value is LoopMonitorEvent {
  if (!isRecord(value) || typeof value.type !== "string" ||
    !EVENT_TYPES.has(value.type as LoopMonitorEvent["type"])) return false;
  switch (value.type as LoopMonitorEvent["type"]) {
    case "LOOP_DELIVERY_OBSERVED":
      return validDelivery(value.delivery);
    case "LOOP_MONITOR_TRIGGERED":
    case "LOOP_JUDGE_STARTED":
      return validReservation(value.reservation);
    case "LOOP_JUDGE_ATTEMPT_STARTED":
      return typeof value.invocationId === "string" && value.attempt === 1 &&
        typeof value.attestationId === "string" && validTrace(value.trace);
    case "LOOP_JUDGE_RESULT_OBSERVED":
      return isRecord(value.result) && typeof value.result.invocationId === "string" &&
        typeof value.result.routeId === "string" && typeof value.result.evidenceFingerprint === "string" &&
        typeof value.result.constraintFingerprint === "string" && validTrace(value.result.trace);
    case "LOOP_JUDGE_COMPLETED":
      return typeof value.invocationId === "string" && typeof value.routeId === "string";
    case "LOOP_ROUTE_APPLIED":
      return typeof value.invocationId === "string" && typeof value.routeId === "string" &&
        (value.targetEvent === null || typeof value.targetEvent === "string");
    case "LOOP_LATCH_SET":
      return validLatch(value.latch);
    case "LOOP_LATCH_CLEARED":
      return typeof value.monitorId === "string" && typeof value.priorEvidenceFingerprint === "string" &&
        (value.basis === "evidence-change" || value.basis === "human-retry") &&
        (value.humanTurnId === null || typeof value.humanTurnId === "string");
    case "WORKFLOW_UNPARKED":
      return typeof value.monitorId === "string" && typeof value.reasonCode === "string";
    case "LOOP_JUDGE_AWAITING_HUMAN":
      return typeof value.invocationId === "string" && typeof value.reason === "string";
    case "LIVE_SMOKE_AUTHORIZED":
      return typeof value.authorizationId === "string" && typeof value.actorId === "string" &&
        typeof value.scopeDigest === "string";
  }
}

function validEventSet(value: unknown): value is LoopMonitorEventSet {
  return isRecord(value) && typeof value.eventSetId === "string" &&
    validPartition(value.partition) && typeof value.partitionKey === "string" &&
    value.partitionKey === loopMonitorPartitionKey(value.partition) &&
    typeof value.idempotencyKey === "string" && typeof value.payloadFingerprint === "string" &&
    Array.isArray(value.events) && value.events.every(validEvent);
}

export function decodeLoopMonitorEventSet(encoded: string): LoopMonitorEventSet {
  const value: unknown = JSON.parse(encoded);
  if (!validEventSet(value)) throw new Error("invalid-loop-monitor-event-set");
  return value;
}

export function readLoopMonitorEventSetsFromAudit(
  projectDir: string,
  intent?: string,
  space?: string,
): LoopMonitorEventSet[] {
  const rows = findAllEvents(
    readAllAuditShards(projectDir, intent, space),
    "LOOP_MONITOR_EVENT_SET_COMMITTED",
  );
  const sets: LoopMonitorEventSet[] = [];
  for (const row of rows) {
    const encoded = auditBlockField(row.block, "Event Set");
    if (encoded === null) throw new Error("invalid-loop-monitor-audit-row:missing-event-set");
    sets.push(decodeLoopMonitorEventSet(encoded));
  }
  const merged = mergeLoopMonitorEventSets(sets);
  if (!merged.ok) throw new Error(`invalid-loop-monitor-audit-row:${merged.status}:${merged.reason}`);
  return [...merged.eventSets];
}

function parseIndex(value: unknown): ReplayIndex | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.partitions)) return null;
  const partitions: Record<string, ReplayPartition> = {};
  for (const [key, entry] of Object.entries(value.partitions)) {
    if (!isRecord(entry) || !validPartition(entry.partition) ||
      loopMonitorPartitionKey(entry.partition) !== key || !Array.isArray(entry.eventSets) ||
      !entry.eventSets.every(validEventSet)) return null;
    partitions[key] = { partition: entry.partition, eventSets: entry.eventSets };
  }
  return { schemaVersion: 1, partitions };
}

function readIndex(indexDir: string): ReplayIndex {
  if (existsSync(walPath(indexDir))) {
    throw new LoopMonitorReplayIncompleteError("WAL_PENDING", "explicit repair is required");
  }
  const path = indexPath(indexDir);
  if (!existsSync(path)) {
    throw new LoopMonitorReplayIncompleteError("INDEX_MISSING", "initialize or repair the per-clone index");
  }
  try {
    const parsed = parseIndex(JSON.parse(readFileSync(path, "utf8")));
    if (parsed === null) throw new Error("schema mismatch");
    return parsed;
  } catch (cause) {
    throw new LoopMonitorReplayIncompleteError(
      "INDEX_CORRUPT",
      cause instanceof Error ? cause.message : String(cause),
    );
  }
}

function receiptFor(set: LoopMonitorEventSet): LoopMonitorCommitReceipt {
  const eventSetDigest = digest(set);
  return {
    receiptId: loopMonitorReceiptId(set.eventSetId, eventSetDigest),
    eventSetId: set.eventSetId,
    eventSetDigest,
    partitionKey: set.partitionKey,
  };
}

function deliveryFromSet(set: LoopMonitorEventSet): LoopDelivery | null {
  for (const event of set.events) {
    if (event.type === "LOOP_DELIVERY_OBSERVED") return event.delivery;
  }
  return null;
}

function invocationIds(set: LoopMonitorEventSet): readonly string[] {
  const ids = new Set<string>();
  for (const event of set.events) {
    switch (event.type) {
      case "LOOP_MONITOR_TRIGGERED":
      case "LOOP_JUDGE_STARTED":
        ids.add(event.reservation.invocationId);
        break;
      case "LOOP_JUDGE_ATTEMPT_STARTED":
      case "LOOP_JUDGE_COMPLETED":
      case "LOOP_ROUTE_APPLIED":
      case "LOOP_JUDGE_AWAITING_HUMAN":
        ids.add(event.invocationId);
        break;
      case "LOOP_JUDGE_RESULT_OBSERVED":
        ids.add(event.result.invocationId);
        break;
      case "LOOP_LATCH_SET":
        ids.add(event.latch.invocationId);
        break;
      default:
        break;
    }
  }
  return [...ids];
}

export type LoopMonitorMergeResult =
  | { readonly ok: true; readonly eventSets: readonly LoopMonitorEventSet[] }
  | { readonly ok: false; readonly status: "CONFLICT" | "INCOMPLETE"; readonly reason: string };

function mergePartitionEventSets(sets: readonly LoopMonitorEventSet[]): LoopMonitorMergeResult {
  const bySetId = new Map<string, LoopMonitorEventSet>();
  const setDigests = new Map<string, string>();
  for (const set of sets) {
    const setDigest = digest(set);
    const priorDigest = setDigests.get(set.eventSetId);
    if (priorDigest !== undefined) {
      if (priorDigest !== setDigest) return { ok: false, status: "CONFLICT", reason: "event-set-id-conflict" };
      continue;
    }
    setDigests.set(set.eventSetId, setDigest);
    bySetId.set(set.eventSetId, set);
  }

  const deliverySetById = new Map<string, string>();
  const successorByPredecessor = new Map<string, string>();
  for (const set of bySetId.values()) {
    const delivery = deliveryFromSet(set);
    if (delivery === null) continue;
    const priorSet = deliverySetById.get(delivery.deliveryId);
    if (priorSet !== undefined && priorSet !== set.eventSetId) {
      return { ok: false, status: "CONFLICT", reason: "delivery-id-conflict" };
    }
    deliverySetById.set(delivery.deliveryId, set.eventSetId);
    const predecessor = delivery.predecessorDeliveryId ?? "<root>";
    const priorSuccessor = successorByPredecessor.get(predecessor);
    if (priorSuccessor !== undefined && priorSuccessor !== delivery.deliveryId) {
      return { ok: false, status: "CONFLICT", reason: "causal-fork" };
    }
    successorByPredecessor.set(predecessor, delivery.deliveryId);
  }

  const dependencies = new Map<string, Set<string>>();
  const judgeStartByInvocation = new Map<string, string>();
  for (const set of bySetId.values()) {
    dependencies.set(set.eventSetId, new Set());
    for (const event of set.events) {
      if (event.type === "LOOP_JUDGE_STARTED") {
        const existing = judgeStartByInvocation.get(event.reservation.invocationId);
        if (existing !== undefined && existing !== set.eventSetId) {
          return { ok: false, status: "CONFLICT", reason: "judge-start-conflict" };
        }
        judgeStartByInvocation.set(event.reservation.invocationId, set.eventSetId);
      }
    }
  }
  for (const set of bySetId.values()) {
    const delivery = deliveryFromSet(set);
    if (delivery?.predecessorDeliveryId !== null && delivery?.predecessorDeliveryId !== undefined) {
      const predecessorSet = deliverySetById.get(delivery.predecessorDeliveryId);
      if (predecessorSet === undefined) {
        return { ok: false, status: "INCOMPLETE", reason: "missing-causal-predecessor" };
      }
      if (predecessorSet !== set.eventSetId) dependencies.get(set.eventSetId)!.add(predecessorSet);
    }
    for (const invocationId of invocationIds(set)) {
      const startSet = judgeStartByInvocation.get(invocationId);
      if (startSet !== undefined && startSet !== set.eventSetId) dependencies.get(set.eventSetId)!.add(startSet);
    }
  }

  const remaining = new Set(bySetId.keys());
  const ordered: LoopMonitorEventSet[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((setId) =>
      [...(dependencies.get(setId) ?? [])].every((dependency) => !remaining.has(dependency))
    ).sort(bytewise);
    if (ready.length === 0) return { ok: false, status: "CONFLICT", reason: "causal-cycle" };
    for (const setId of ready) {
      remaining.delete(setId);
      ordered.push(bySetId.get(setId)!);
    }
  }
  return { ok: true, eventSets: ordered };
}

export function mergeLoopMonitorEventSets(
  sets: readonly LoopMonitorEventSet[],
): LoopMonitorMergeResult {
  const groups = new Map<string, LoopMonitorEventSet[]>();
  for (const set of sets) {
    if (!validEventSet(set)) return { ok: false, status: "CONFLICT", reason: "invalid-event-set" };
    const group = groups.get(set.partitionKey) ?? [];
    group.push(set);
    groups.set(set.partitionKey, group);
  }
  const merged: LoopMonitorEventSet[] = [];
  for (const key of [...groups.keys()].sort(bytewise)) {
    const result = mergePartitionEventSets(groups.get(key)!);
    if (!result.ok) return result;
    merged.push(...result.eventSets);
  }
  return { ok: true, eventSets: merged };
}

export function repairLoopMonitorReplayIndex(
  indexDir: string,
  canonicalEventSets: readonly LoopMonitorEventSet[],
): void {
  const merged = mergeLoopMonitorEventSets(canonicalEventSets);
  if (!merged.ok) throw new Error(`loop-monitor-repair-${merged.status}:${merged.reason}`);
  const partitions: Record<string, ReplayPartition> = {};
  for (const set of merged.eventSets) {
    const current = partitions[set.partitionKey];
    partitions[set.partitionKey] = {
      partition: set.partition,
      eventSets: [...(current?.eventSets ?? []), set],
    };
  }
  mkdirSync(indexDir, { recursive: true, mode: 0o700 });
  writeJsonAtomic(indexPath(indexDir), { schemaVersion: 1, partitions } satisfies ReplayIndex);
  rmSync(walPath(indexDir), { force: true });
}

export interface DurableLoopMonitorRepository extends LoopMonitorRepository {
  readCanonicalForRepair(): readonly LoopMonitorEventSet[];
}

export function createDurableLoopMonitorRepository(options: {
  readonly indexDir: string;
  readonly appendCanonical: (set: LoopMonitorEventSet) => void;
  readonly readCanonicalForRepair: () => readonly LoopMonitorEventSet[];
  readonly transactionLock?: (body: () => unknown) => unknown;
}): DurableLoopMonitorRepository {
  const lock = options.transactionLock ?? ((body: () => unknown): unknown => body());
  return {
    transaction(partition, body) {
      return lock(() => {
        let transactionIndex = readIndex(options.indexDir);
        const key = loopMonitorPartitionKey(partition);
        const existing = transactionIndex.partitions[key]?.eventSets ?? [];
        return body(existing, (set) => {
          if (set.partitionKey !== key) throw new Error("loop-monitor-replay-partition-mismatch");
          const eventSetDigest = digest(set);
          const wal: ReplayWal = { schemaVersion: 1, partitionKey: key, eventSet: set, eventSetDigest };
          writeJsonAtomic(walPath(options.indexDir), wal);
          options.appendCanonical(set);
          const currentPartition = transactionIndex.partitions[key];
          const duplicate = currentPartition?.eventSets.find((candidate) => candidate.eventSetId === set.eventSetId);
          if (duplicate !== undefined && digest(duplicate) !== eventSetDigest) {
            throw new Error("loop-monitor-replay-event-set-conflict");
          }
          const nextSets = duplicate === undefined
            ? [...(currentPartition?.eventSets ?? []), set]
            : [...(currentPartition?.eventSets ?? [])];
          const next: ReplayIndex = {
            schemaVersion: 1,
            partitions: {
              ...transactionIndex.partitions,
              [key]: { partition: set.partition, eventSets: nextSets },
            },
          };
          writeJsonAtomic(indexPath(options.indexDir), next);
          transactionIndex = next;
          rmSync(walPath(options.indexDir), { force: true });
          return receiptFor(set);
        });
      }) as ReturnType<typeof body>;
    },
    readEventSets(partition) {
      const index = readIndex(options.indexDir);
      return [...(index.partitions[loopMonitorPartitionKey(partition)]?.eventSets ?? [])];
    },
    isCommitted(receipt) {
      try {
        const index = readIndex(options.indexDir);
        const partition = index.partitions[receipt.partitionKey];
        const set = partition?.eventSets.find((candidate) => candidate.eventSetId === receipt.eventSetId);
        if (set === undefined) return false;
        const expected = receiptFor(set);
        return expected.receiptId === receipt.receiptId && expected.eventSetDigest === receipt.eventSetDigest;
      } catch {
        return false;
      }
    },
    readCanonicalForRepair: options.readCanonicalForRepair,
  };
}

export function createAuditLoopMonitorRepository(options: {
  readonly projectDir: string;
  readonly intent?: string;
  readonly space?: string;
  readonly indexDir?: string;
}): DurableLoopMonitorRepository {
  const indexDir = options.indexDir ?? docsRoot(options.projectDir, options.intent, options.space);
  return createDurableLoopMonitorRepository({
    indexDir,
    appendCanonical(set) {
      emitAuditEventGuarded(
        "LOOP_MONITOR_EVENT_SET_COMMITTED",
        {
          "Partition Key": set.partitionKey,
          "Event Set Id": set.eventSetId,
          "Event Set": JSON.stringify(set),
        },
        options.projectDir,
        options.intent,
        options.space,
      );
    },
    readCanonicalForRepair: () =>
      readLoopMonitorEventSetsFromAudit(options.projectDir, options.intent, options.space),
    transactionLock: (body) =>
      withAuditLock<unknown>(options.projectDir, body, options.intent, options.space),
  });
}
