// C2 single-writer runtime for the harness-neutral Unit pool (#1919).
// Identity minting, idempotency folding, and one atomic canonical append live
// here. Harness adapters may report native facts, but never own counters or
// scheduling decisions.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import { auditBlockField, findAllEvents, getField, readAllAuditShards, stateFilePath, withAuditLock } from "./amadeus-lib.ts";
import {
  applyUnitPoolEvent,
  finalizeUnitPoolProjection,
  foldUnitPoolEventSets,
  proposeUnitPoolCommand,
  UNIT_POOL_OUTCOMES,
  type UnitPlanEntry,
  type UnitPoolCommand,
  type UnitPoolEvent,
  type UnitPoolEventSet,
  type UnitPoolOutcome,
  type UnitPoolProjection,
  validateAndOrderUnits,
} from "./amadeus-unit-pool.ts";

export interface UnitPoolRepository {
  transaction<T>(body: (sets: readonly UnitPoolEventSet[], append: (set: UnitPoolEventSet) => void) => T): T;
  readEventSets(): readonly UnitPoolEventSet[];
}

export function createMemoryUnitPoolRepository(options: { readonly failAppend?: boolean } = {}): UnitPoolRepository {
  const sets: UnitPoolEventSet[] = [];
  return {
    transaction(body) {
      return body(sets, (set) => {
        if (options.failAppend) throw new Error("injected-unit-pool-append-failure");
        sets.push(set);
      });
    },
    readEventSets() {
      return [...sets];
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOutcome(value: unknown): value is UnitPoolOutcome {
  return typeof value === "string" && UNIT_POOL_OUTCOMES.includes(value as UnitPoolOutcome);
}

function isUnit(value: unknown): boolean {
  return isRecord(value) && typeof value.unitId === "string" &&
    Array.isArray(value.dependsOn) && value.dependsOn.every((item) => typeof item === "string");
}

function isQueueEntry(value: unknown): boolean {
  return isRecord(value) && typeof value.queueEntryId === "string" &&
    typeof value.unitId === "string" && Number.isInteger(value.ordinal);
}

function isAttempt(value: unknown): boolean {
  return isRecord(value) && typeof value.attemptId === "string" && typeof value.slotId === "string" &&
    typeof value.unitId === "string" && Number.isInteger(value.attemptOrdinal) &&
    typeof value.dispatchConfirmed === "boolean" &&
    (value.nativeHandle === undefined || typeof value.nativeHandle === "string");
}

function isTerminal(value: unknown): boolean {
  return isRecord(value) && typeof value.unitId === "string" &&
    (value.attemptId === null || typeof value.attemptId === "string") && isOutcome(value.outcome) &&
    (value.reason === undefined || typeof value.reason === "string");
}

function isReconciliation(value: unknown): boolean {
  return isRecord(value) && typeof value.attemptId === "string" && typeof value.kind === "string" &&
    Number.isInteger(value.ordinal) &&
    ["no-effect-confirmed", "effect-possible", "unknown"].includes(String(value.effect));
}

const EVENT_VALIDATORS: Readonly<Record<UnitPoolEvent["type"], (value: Record<string, unknown>) => boolean>> = {
  "batch-initialized": (value) => typeof value.batchId === "string" && Number.isInteger(value.cap) &&
    Array.isArray(value.units) && value.units.every(isUnit) &&
    Array.isArray(value.queue) && value.queue.every(isQueueEntry),
  "unit-acquired": (value) => typeof value.queueEntryId === "string" && isAttempt(value.attempt),
  "dispatch-confirmed": (value) => typeof value.attemptId === "string" && typeof value.nativeHandle === "string",
  "reconciliation-recorded": (value) => isReconciliation(value.record),
  "unit-settled": (value) => isTerminal(value.terminal),
  "unit-requeued": (value) => isQueueEntry(value.entry),
  "units-cancelled": (value) => Array.isArray(value.units) && value.units.every(isTerminal),
  "batch-draining": (value) => value.queuedOutcome === "batch-unsafe" || value.queuedOutcome === "cancelled",
  "batch-terminated": (value) => ["completed", "partial-failure", "cancelled", "terminated"].includes(String(value.result)),
  "late-result-observed": (value) => typeof value.attemptId === "string" && isOutcome(value.outcome),
};

function hasEventValidator(type: string): type is UnitPoolEvent["type"] {
  return Object.hasOwn(EVENT_VALIDATORS, type);
}

function isUnitPoolEvent(value: unknown): value is UnitPoolEvent {
  if (!isRecord(value) || typeof value.type !== "string" || !hasEventValidator(value.type)) return false;
  return EVENT_VALIDATORS[value.type](value);
}

function isEventSet(value: unknown): value is UnitPoolEventSet {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<UnitPoolEventSet>;
  return typeof candidate.eventSetId === "string" && typeof candidate.batchId === "string" &&
    typeof candidate.idempotencyKey === "string" && typeof candidate.payloadFingerprint === "string" &&
    Array.isArray(candidate.events) && candidate.events.every(isUnitPoolEvent);
}

export function decodeUnitPoolEventSet(encoded: string): UnitPoolEventSet {
  const value: unknown = JSON.parse(encoded);
  if (!isEventSet(value)) throw new Error("invalid-unit-pool-audit-row: invalid event set shape");
  return value;
}

export function readUnitPoolEventSetsFromAudit(projectDir: string): UnitPoolEventSet[] {
  const rows = findAllEvents(readAllAuditShards(projectDir), "UNIT_POOL_EVENT_SET_COMMITTED");
  const sets: UnitPoolEventSet[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    const encoded = auditBlockField(row.block, "Event Set");
    if (encoded === null) throw new Error("invalid-unit-pool-audit-row: missing Event Set");
    try {
      const value = decodeUnitPoolEventSet(encoded);
      if (!ids.has(value.eventSetId)) {
        ids.add(value.eventSetId);
        sets.push(value);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(detail.startsWith("invalid-unit-pool-audit-row:") ? detail : `invalid-unit-pool-audit-row: ${detail}`);
    }
  }
  return sets;
}

export function createAuditUnitPoolRepository(projectDir: string): UnitPoolRepository {
  return {
    transaction(body) {
      ensureOtelBootstrap(projectDir);
      return withAuditLock<unknown>(projectDir, () => body(readUnitPoolEventSetsFromAudit(projectDir), (set) => {
        const statePath = stateFilePath(projectDir);
        const stage = existsSync(statePath)
          ? getField(readFileSync(statePath, "utf8"), "Current Stage")?.trim()
          : undefined;
        emitAuditEventGuarded(
          "UNIT_POOL_EVENT_SET_COMMITTED",
          {
            "Batch Id": set.batchId,
            "Event Set Id": set.eventSetId,
            "Event Set": JSON.stringify(set),
            ...(stage ? { Stage: stage } : {}),
          },
          projectDir,
        );
      })) as ReturnType<typeof body>;
    },
    readEventSets() {
      return readUnitPoolEventSetsFromAudit(projectDir);
    },
  };
}

function stableId(namespace: string, tuple: readonly unknown[]): string {
  return `${namespace}-${createHash("sha256").update(JSON.stringify(tuple)).digest("hex").slice(0, 32)}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return canonicalArrayJson(value);
  if (isRecord(value)) return canonicalObjectJson(value);
  return JSON.stringify(value) ?? "null";
}

function canonicalArrayJson(value: readonly unknown[]): string {
  return `[${value.map(canonicalJson).join(",")}]`;
}

function canonicalObjectJson(value: Record<string, unknown>): string {
  const fields = Object.keys(value).sort(bytewise).map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`
  );
  return `{${fields.join(",")}}`;
}

function bytewise(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export function fingerprintUnitPoolRequest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export type UnitPoolMutationResult =
  | { readonly ok: true; readonly eventSetId: string; readonly projection: UnitPoolProjection }
  | { readonly ok: false; readonly reason: string };

interface BaseRequest {
  readonly idempotencyKey: string;
  readonly batchId: string;
}

interface InitialEnqueueRequest extends BaseRequest {
  readonly cap: number;
  readonly units: readonly UnitPlanEntry[];
}

interface AttemptRequest extends BaseRequest {
  readonly attemptId: string;
}

interface SettleRequest extends AttemptRequest {
  readonly outcome: UnitPoolOutcome;
}

export interface UnitPoolCoordinator {
  initialEnqueue(request: InitialEnqueueRequest): UnitPoolMutationResult;
  acquire(request: BaseRequest): UnitPoolMutationResult;
  confirmDispatch(request: AttemptRequest & { readonly nativeHandle: string }): UnitPoolMutationResult;
  recordReconciliation(request: AttemptRequest & { readonly reconciliationKind: string; readonly effect: "no-effect-confirmed" | "effect-possible" | "unknown" }): UnitPoolMutationResult;
  settleRelease(request: SettleRequest): UnitPoolMutationResult;
  settleReleaseRequeue(request: AttemptRequest & { readonly outcome: "dispatch-not-started" }): UnitPoolMutationResult;
  settleReleaseCancelDependents(request: SettleRequest): UnitPoolMutationResult;
  terminateBatch(request: BaseRequest & { readonly result: "completed" | "partial-failure" | "cancelled" | "terminated"; readonly queuedOutcome: "batch-unsafe" | "cancelled" }): UnitPoolMutationResult;
  lateResultObserved(request: SettleRequest): UnitPoolMutationResult;
  retryFailedUnit(request: BaseRequest & { readonly unitId: string }): UnitPoolMutationResult;
  skipFailedUnit(request: BaseRequest & { readonly unitId: string; readonly reason: string }): UnitPoolMutationResult;
  readProjection(batchId: string): UnitPoolProjection;
}

function replay(sets: readonly UnitPoolEventSet[], batchId: string, idempotencyKey: string, payloadFingerprint: string): UnitPoolMutationResult | null {
  const existing = sets.find((set) => set.idempotencyKey === idempotencyKey);
  if (existing === undefined) return null;
  return existing.batchId === batchId && existing.payloadFingerprint === payloadFingerprint
    ? { ok: true, eventSetId: existing.eventSetId, projection: foldUnitPoolEventSets(sets, existing.batchId) }
    : { ok: false, reason: "idempotency-conflict" };
}

export function createUnitPoolCoordinator(repository: UnitPoolRepository): UnitPoolCoordinator {
  function mutate(
    request: BaseRequest,
    makeCommand: (projection: UnitPoolProjection, mint: (namespace: string, extra?: unknown) => string) => UnitPoolCommand | { readonly error: string },
    fillReleasedSlots = false,
  ): UnitPoolMutationResult {
    const payloadFingerprint = fingerprintUnitPoolRequest(request);
    try {
      return repository.transaction((sets, append) => {
        const existing = replay(sets, request.batchId, request.idempotencyKey, payloadFingerprint);
        if (existing !== null) return existing;
        let projection = foldUnitPoolEventSets(sets, request.batchId);
        const mint = (namespace: string, extra: unknown = "") => stableId(namespace, [request.batchId, request.idempotencyKey, namespace, extra]);
        const command = makeCommand(projection, mint);
        if ("error" in command) return { ok: false, reason: command.error };
        const proposal = proposeUnitPoolCommand(projection, command);
        if (!proposal.ok) return { ok: false, reason: proposal.reason };
        const events: UnitPoolEvent[] = [...proposal.events];
        for (const event of proposal.events) projection = applyUnitPoolEvent(projection, event);

        // A terminal settle releases its slot in this same canonical event set.
        // Fill every newly available slot from FIFO before committing, so there is
        // no crash cut point where capacity is free but ready work is forgotten.
        if (fillReleasedSlots) {
          let index = 0;
          while (projection.phase === "open" && projection.active.length < projection.cap) {
            let acquired = false;
            for (const entry of projection.queue) {
              const acquire = proposeUnitPoolCommand(projection, {
                kind: "acquire",
                batchId: request.batchId,
                queueEntryId: entry.queueEntryId,
                attemptId: mint("attempt", `${entry.unitId}:${index}`),
                slotId: mint("slot", `${entry.unitId}:${index}`),
              });
              if (!acquire.ok) continue;
              events.push(...acquire.events);
              for (const event of acquire.events) projection = applyUnitPoolEvent(projection, event);
              acquired = true;
              index += 1;
              break;
            }
            if (!acquired) break;
          }
        }

        projection = finalizeUnitPoolProjection(projection);
        const eventSetId = mint("unit-pool-event-set");
        append({ eventSetId, batchId: request.batchId, idempotencyKey: request.idempotencyKey, payloadFingerprint, events });
        return { ok: true, eventSetId, projection };
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: `canonical-write-failed: ${detail}` };
    }
  }

  return {
    initialEnqueue(request) {
      const validation = validateAndOrderUnits(request.units);
      if (!validation.ok) return { ok: false, reason: `${validation.reason}:${validation.detail}` };
      return mutate(request, (_projection, mint) => ({
        kind: "initial-enqueue",
        batchId: request.batchId,
        cap: request.cap,
        units: request.units,
        queue: validation.orderedUnitIds.map((unitId, ordinal) => ({ queueEntryId: mint("queue-entry", `${unitId}:${ordinal}`), unitId, ordinal })),
      }));
    },
    acquire(request) {
      return mutate(request, (projection, mint) => {
        if (projection.phase !== "open") return { error: "pool-not-open" };
        for (const entry of projection.queue) {
          const command: UnitPoolCommand = { kind: "acquire", batchId: request.batchId, queueEntryId: entry.queueEntryId, attemptId: mint("attempt", entry.unitId), slotId: mint("slot", entry.unitId) };
          if (proposeUnitPoolCommand(projection, command).ok) return command;
        }
        return { error: projection.active.length >= projection.cap ? "capacity-exhausted" : "no-ready-unit" };
      });
    },
    confirmDispatch(request) {
      return mutate(request, () => ({ kind: "confirm-dispatch", batchId: request.batchId, attemptId: request.attemptId, nativeHandle: request.nativeHandle }));
    },
    recordReconciliation(request) {
      return mutate(request, (_projection, mint) => ({ kind: "record-reconciliation", batchId: request.batchId, attemptId: request.attemptId, reconciliationKind: request.reconciliationKind, effect: request.effect, queueEntryId: mint("queue-entry", request.attemptId) }), request.effect === "no-effect-confirmed");
    },
    settleRelease(request) {
      return mutate(request, () => ({ kind: "settle-release", batchId: request.batchId, attemptId: request.attemptId, outcome: request.outcome }), true);
    },
    settleReleaseRequeue(request) {
      return mutate(request, (_projection, mint) => ({ kind: "settle-release-requeue", batchId: request.batchId, attemptId: request.attemptId, outcome: request.outcome, queueEntryId: mint("queue-entry", request.attemptId) }), true);
    },
    settleReleaseCancelDependents(request) {
      return mutate(request, () => ({ kind: "settle-release-cancel-dependents", batchId: request.batchId, attemptId: request.attemptId, outcome: request.outcome }), true);
    },
    terminateBatch(request) {
      return mutate(request, () => ({ kind: "terminate-batch", batchId: request.batchId, result: request.result, queuedOutcome: request.queuedOutcome }));
    },
    lateResultObserved(request) {
      return mutate(request, () => ({ kind: "late-result-observed", batchId: request.batchId, attemptId: request.attemptId, outcome: request.outcome }));
    },
    retryFailedUnit(request) {
      return mutate(request, (_projection, mint) => ({ kind: "retry-failed-unit", batchId: request.batchId, unitId: request.unitId, queueEntryId: mint("queue-entry", request.unitId) }));
    },
    skipFailedUnit(request) {
      return mutate(request, () => ({ kind: "skip-failed-unit", batchId: request.batchId, unitId: request.unitId, reason: request.reason }));
    },
    readProjection(batchId) {
      return foldUnitPoolEventSets(repository.readEventSets(), batchId);
    },
  };
}
