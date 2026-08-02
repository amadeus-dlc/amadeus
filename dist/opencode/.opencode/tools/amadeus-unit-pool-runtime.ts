// C2 single-writer runtime for the harness-neutral Unit pool (#1919).
// Identity minting, idempotency folding, and one atomic canonical append live
// here. Harness adapters may report native facts, but never own counters or
// scheduling decisions.

import { createHash } from "node:crypto";
import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import { auditBlockField, findAllEvents, readAllAuditShards, withAuditLock } from "./amadeus-lib.ts";
import {
  applyUnitPoolEvent,
  finalizeUnitPoolProjection,
  foldUnitPoolEventSets,
  proposeUnitPoolCommand,
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

export interface MemoryUnitPoolRepository extends UnitPoolRepository {
  readEventSets(): readonly UnitPoolEventSet[];
}

export function createMemoryUnitPoolRepository(options: { readonly failAppend?: boolean } = {}): MemoryUnitPoolRepository {
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

function isEventSet(value: unknown): value is UnitPoolEventSet {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<UnitPoolEventSet>;
  return typeof candidate.eventSetId === "string" && typeof candidate.batchId === "string" &&
    typeof candidate.idempotencyKey === "string" && typeof candidate.payloadFingerprint === "string" &&
    Array.isArray(candidate.events);
}

export function readUnitPoolEventSetsFromAudit(projectDir: string): UnitPoolEventSet[] {
  const rows = findAllEvents(readAllAuditShards(projectDir), "UNIT_POOL_EVENT_SET_COMMITTED");
  const sets: UnitPoolEventSet[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    const encoded = auditBlockField(row.block, "Event Set");
    if (encoded === null) continue;
    try {
      const value: unknown = JSON.parse(encoded);
      if (isEventSet(value) && !ids.has(value.eventSetId)) {
        ids.add(value.eventSetId);
        sets.push(value);
      }
    } catch {
      // A malformed audit row is not canonical pool state.
    }
  }
  return sets;
}

export function createAuditUnitPoolRepository(projectDir: string): UnitPoolRepository {
  return {
    transaction(body) {
      ensureOtelBootstrap(projectDir);
      return withAuditLock<unknown>(projectDir, () => body(readUnitPoolEventSetsFromAudit(projectDir), (set) => {
        emitAuditEventGuarded(
          "UNIT_POOL_EVENT_SET_COMMITTED",
          {
            "Batch Id": set.batchId,
            "Event Set Id": set.eventSetId,
            "Event Set": JSON.stringify(set),
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

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
  readProjection(batchId: string): UnitPoolProjection;
}

function replay(sets: readonly UnitPoolEventSet[], idempotencyKey: string, payloadFingerprint: string): UnitPoolMutationResult | null {
  const existing = sets.find((set) => set.idempotencyKey === idempotencyKey);
  if (existing === undefined) return null;
  return existing.payloadFingerprint === payloadFingerprint
    ? { ok: true, eventSetId: existing.eventSetId, projection: foldUnitPoolEventSets(sets, existing.batchId) }
    : { ok: false, reason: "idempotency-conflict" };
}

export function createUnitPoolCoordinator(repository: UnitPoolRepository): UnitPoolCoordinator {
  function mutate(
    request: BaseRequest,
    makeCommand: (projection: UnitPoolProjection, mint: (namespace: string, extra?: unknown) => string) => UnitPoolCommand | { readonly error: string },
    fillReleasedSlots = false,
  ): UnitPoolMutationResult {
    const payloadFingerprint = fingerprint(request);
    try {
      return repository.transaction((sets, append) => {
        const existing = replay(sets, request.idempotencyKey, payloadFingerprint);
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
    } catch {
      return { ok: false, reason: "canonical-write-failed" };
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
    readProjection(batchId) {
      return foldUnitPoolEventSets(repository.readEventSets(), batchId);
    },
  };
}
