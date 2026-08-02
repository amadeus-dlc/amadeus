// Canonical audit-first execution lifecycle coordinator (#1602).
//
// The coordinator is the only owner of identity minting and lifecycle
// mutation. Repositories provide the lock + append boundary; harness adapters
// are deliberately absent from this module.

import { createHash } from "node:crypto";
import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import {
  createExecutionContract,
  executionStableId,
  type AttemptFinished,
  type AttemptOutcome,
  type AttemptStart,
  type BeginChildInput,
  type BeginRootInput,
  type Clock,
  type DispatchConfirmation,
  type ExecutionAttempt,
  type ExecutionContract,
  type ExecutionIdentity,
  type ExecutionStart,
  type Fact,
  type LogicalOperation,
  type OperationProposal,
  type OperationFinished,
  type OperationOutcome,
} from "./amadeus-execution-contract.ts";
import type { ExecutionEnvironmentSnapshot } from "./amadeus-harness-capability.ts";
import {
  auditBlockField,
  findAllEvents,
  readAllAuditShards,
  withAuditLock,
} from "./amadeus-lib.ts";

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export type ExecutionRefusal =
  | { readonly kind: "idempotency-conflict"; readonly persisted: false }
  | { readonly kind: "canonical-write-failed"; readonly persisted: false }
  | { readonly kind: "projection-pending-rebuild"; readonly persisted: true }
  | { readonly kind: "not-found"; readonly persisted: false }
  | { readonly kind: "invalid-transition"; readonly persisted: false }
  | { readonly kind: "digest-mismatch"; readonly persisted: true };

export type DispatchState = "reserved" | "claimed" | "dispatch-confirmed" | "terminal";

export interface ExecutionReservation {
  readonly reservationId: string;
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly payloadFingerprint: string;
  readonly dispatchState: DispatchState;
  readonly consumedAt: string | null;
  readonly attemptId?: string;
  readonly slotId?: string;
  readonly nativeHandle?: Fact<string>;
  readonly claimAcquiredAt?: string;
  readonly nativeAcceptedAt?: string;
  readonly startedAt: Fact<string>;
}

export interface CanonicalCommitReceipt {
  readonly canonicalCommitReceiptId: string;
  readonly eventSetDigest: string;
}

export interface ExecutionStarted extends CanonicalCommitReceipt {
  readonly operation: LogicalOperation;
  readonly start: ExecutionStart;
}

export type BaselineStatus =
  | "running"
  | "complete"
  | "complete-with-gaps"
  | "invalid";

export interface BaselineRun {
  readonly baselineRunId: string;
  readonly rootOperationId: string;
  readonly workloadId: string;
  readonly workloadVersion: string;
  readonly inputDigest: string;
  readonly observedGitSha: Fact<string>;
  readonly startCriteria: Fact<string>;
  readonly expectedEndCriteria: Fact<string>;
  readonly actualEndCriteria: Fact<string>;
  readonly status: BaselineStatus;
}

export interface BeginRootRequest {
  readonly idempotencyKey: string;
  readonly input: BeginRootInput;
  readonly parent?: never;
  readonly childInput?: never;
  readonly baseline?: Omit<BaselineRun, "rootOperationId">;
  readonly environment?: ExecutionEnvironmentSnapshot;
}

export interface BeginChildRequest {
  readonly idempotencyKey: string;
  readonly parent: ExecutionIdentity;
  readonly childInput: BeginChildInput;
  readonly input?: never;
  readonly baseline?: never;
  readonly environment?: never;
}

export type StartOperationRequest = BeginRootRequest | BeginChildRequest;

export interface AtomicReserveRequest {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly budgetKind: string;
  readonly subjectId: string;
  readonly semanticAttemptOrdinal: number;
  readonly slotId?: string;
}

export type DispatchClaimResult =
  | (CanonicalCommitReceipt & {
      readonly kind: "claimed";
      readonly reservation: ExecutionReservation;
    })
  | (CanonicalCommitReceipt & {
      readonly kind: "idempotent";
      readonly reservation: ExecutionReservation;
    })
  | { readonly kind: "conflict" | "not-found" | "invalid-transition" | "canonical-write-failed" };

export interface ConfirmDispatchRequest {
  readonly reservationId: string;
  readonly idempotencyKey: string;
  readonly attemptOrdinal: number;
  readonly nativeHandle: Fact<string>;
  readonly dispatchEvidence: Fact<string>;
}

export interface ConfirmedDispatch extends DispatchConfirmation, CanonicalCommitReceipt {
  readonly attemptStart: AttemptStart;
}

export interface ReconcileDispatchRequest {
  readonly reservationId: string;
  readonly idempotencyKey: string;
  readonly attemptOrdinal: number;
  readonly effect: "no-effect-confirmed" | "effect-possible" | "unknown";
}

export interface StartPermitRequest {
  readonly reservationId: string;
  readonly canonicalCommitReceiptId: string;
}

export interface StartPermit {
  readonly reservationId: string;
  readonly canonicalCommitReceiptId: string;
  readonly stateProjectionReceiptId: string;
  readonly runtimeProjectionReceiptId: string;
}

export interface FinishAttemptRequest {
  readonly idempotencyKey: string;
  readonly start: AttemptStart;
  readonly outcome: AttemptOutcome;
}

export interface FinishOperationRequest {
  readonly idempotencyKey: string;
  readonly start: ExecutionStart;
  readonly outcome: OperationOutcome;
}

export interface ExecutionQuery {
  readonly rootOperationId?: string;
  readonly operationId?: string;
}

export interface ExecutionProjection {
  readonly operations: readonly LogicalOperation[];
  readonly reservations: readonly ExecutionReservation[];
  readonly attempts: readonly ExecutionAttempt[];
  readonly eventSets: readonly ExecutionEventSet[];
}

export type ExecutionEvent =
  | {
      readonly type: "operation-started";
      readonly operation: LogicalOperation;
      readonly start: ExecutionStart;
      readonly baseline?: BaselineRun;
      readonly environment?: ExecutionEnvironmentSnapshot;
    }
  | { readonly type: "reservation-updated"; readonly reservation: ExecutionReservation }
  | { readonly type: "attempt-started"; readonly start: AttemptStart }
  | { readonly type: "attempt-finished"; readonly finished: AttemptFinished }
  | { readonly type: "operation-finished"; readonly finished: OperationFinished };

export interface ExecutionEventSet {
  readonly eventSetId: string;
  readonly rootOperationId: string;
  readonly idempotencyKey: string;
  readonly payloadFingerprint: string;
  readonly digest: string;
  readonly events: readonly ExecutionEvent[];
}

export interface RequiredProjectionReceipt {
  readonly digest: string;
  readonly stateProjectionReceiptId: string;
  readonly runtimeProjectionReceiptId: string;
}

export interface TelemetryProjectionReceipt {
  readonly projected: boolean;
}

export interface ExecutionProjectionSink {
  projectRequired(eventSet: ExecutionEventSet): RequiredProjectionReceipt;
  rebuildRequired(rootOperationId: string): RequiredProjectionReceipt;
  projectTelemetry(event: ExecutionEvent): TelemetryProjectionReceipt;
}

export interface ExecutionRepository {
  transaction<T>(
    body: (
      eventSets: readonly ExecutionEventSet[],
      append: (eventSet: ExecutionEventSet) => void,
    ) => T,
  ): T;
  readEventSets(): readonly ExecutionEventSet[];
}

export interface ExecutionLifecycleCoordinator {
  startOperation(request: StartOperationRequest): Result<ExecutionStarted, ExecutionRefusal>;
  reserveExecution(request: AtomicReserveRequest): Result<ExecutionReservation, ExecutionRefusal>;
  claimDispatch(reservationId: string, idempotencyKey: string): DispatchClaimResult;
  confirmDispatch(request: ConfirmDispatchRequest): Result<ConfirmedDispatch, ExecutionRefusal>;
  reconcileDispatch(request: ReconcileDispatchRequest): Result<AttemptFinished, ExecutionRefusal>;
  issueStartPermit(request: StartPermitRequest): Result<StartPermit, ExecutionRefusal>;
  finishAttempt(request: FinishAttemptRequest): Result<AttemptFinished, ExecutionRefusal>;
  finishOperation(request: FinishOperationRequest): Result<OperationFinished, ExecutionRefusal>;
  readProjection(query: ExecutionQuery): ExecutionProjection;
}

interface MemoryRepositoryOptions {
  readonly failAppend?: boolean;
}

export interface MemoryExecutionRepository extends ExecutionRepository {
  readEventSets(): readonly ExecutionEventSet[];
}

export function createMemoryExecutionRepository(
  options: MemoryRepositoryOptions = {},
): MemoryExecutionRepository {
  const eventSets: ExecutionEventSet[] = [];
  return {
    transaction<T>(
      body: (
        eventSets: readonly ExecutionEventSet[],
        append: (eventSet: ExecutionEventSet) => void,
      ) => T,
    ): T {
      return body(eventSets, (eventSet) => {
        if (options.failAppend) throw new Error("injected canonical append failure");
        eventSets.push(eventSet);
      });
    },
    readEventSets() {
      return [...eventSets];
    },
  };
}

function isExecutionEventSet(value: unknown): value is ExecutionEventSet {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ExecutionEventSet>;
  return (
    typeof candidate.eventSetId === "string" &&
    typeof candidate.rootOperationId === "string" &&
    typeof candidate.idempotencyKey === "string" &&
    typeof candidate.payloadFingerprint === "string" &&
    typeof candidate.digest === "string" &&
    Array.isArray(candidate.events)
  );
}

export function readExecutionEventSetsFromAudit(
  projectDir: string,
): ExecutionEventSet[] {
  const audit = readAllAuditShards(projectDir);
  const rows = findAllEvents(audit, "EXECUTION_EVENT_SET_COMMITTED");
  const sets: ExecutionEventSet[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    const encoded = auditBlockField(row.block, "Event Set");
    const recordedDigest = auditBlockField(row.block, "Event Set Digest");
    if (encoded === null || recordedDigest === null) continue;
    let value: unknown;
    try {
      value = JSON.parse(encoded);
    } catch {
      continue;
    }
    if (!isExecutionEventSet(value) || value.digest !== recordedDigest) continue;
    if (ids.has(value.eventSetId)) continue;
    ids.add(value.eventSetId);
    sets.push(value);
  }
  return sets;
}

export function createAuditExecutionRepository(
  projectDir: string,
): ExecutionRepository {
  return {
    transaction<T>(
      body: (
        eventSets: readonly ExecutionEventSet[],
        append: (eventSet: ExecutionEventSet) => void,
      ) => T,
    ): T {
      // Bootstrap probes journal health before the mutation lock is held.
      ensureOtelBootstrap(projectDir);
      return withAuditLock<unknown>(projectDir, () =>
        body(readExecutionEventSetsFromAudit(projectDir), (set) => {
          const outcome = emitAuditEventGuarded(
            "EXECUTION_EVENT_SET_COMMITTED",
            {
              "Root Operation Id": set.rootOperationId,
              "Event Set Digest": set.digest,
              "Event Set": JSON.stringify(set),
            },
            projectDir,
          );
          void outcome;
        }),
      ) as T;
    },
    readEventSets() {
      return readExecutionEventSetsFromAudit(projectDir);
    },
  };
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function eventSet(
  rootOperationId: string,
  idempotencyKey: string,
  payloadFingerprint: string,
  events: readonly ExecutionEvent[],
): ExecutionEventSet {
  const eventSetId = executionStableId("event-set", [
    rootOperationId,
    idempotencyKey,
    payloadFingerprint,
  ]);
  return {
    eventSetId,
    rootOperationId,
    idempotencyKey,
    payloadFingerprint,
    digest: digest({ eventSetId, events }),
    events,
  };
}

function existingForKey(
  sets: readonly ExecutionEventSet[],
  idempotencyKey: string,
): ExecutionEventSet | undefined {
  return sets.find((set) => set.idempotencyKey === idempotencyKey);
}

export function foldExecutionEventSets(
  sets: readonly ExecutionEventSet[],
  query: ExecutionQuery = {},
): ExecutionProjection {
  const operations = new Map<string, LogicalOperation>();
  const reservations = new Map<string, ExecutionReservation>();
  const attempts = new Map<string, ExecutionAttempt>();
  const selectedSets: ExecutionEventSet[] = [];

  for (const set of sets) {
    if (query.rootOperationId !== undefined && set.rootOperationId !== query.rootOperationId) continue;
    selectedSets.push(set);
    for (const event of set.events) {
      if (event.type === "operation-started") operations.set(event.operation.operationId, event.operation);
      else if (event.type === "reservation-updated") {
        reservations.set(event.reservation.reservationId, event.reservation);
      } else if (event.type === "attempt-started") {
        attempts.set(event.start.attempt.attemptId, event.start.attempt);
      } else if (event.type === "attempt-finished") {
        attempts.set(event.finished.attempt.attemptId, event.finished.attempt);
      } else {
        operations.set(event.finished.operation.operationId, event.finished.operation);
      }
    }
  }

  const operationValues = [...operations.values()].filter(
    (operation) => query.operationId === undefined || operation.operationId === query.operationId,
  );
  return {
    operations: operationValues,
    reservations: [...reservations.values()].filter(
      (reservation) =>
        query.operationId === undefined || reservation.operationId === query.operationId,
    ),
    attempts: [...attempts.values()].filter(
      (attempt) => query.operationId === undefined || attempt.operationId === query.operationId,
    ),
    eventSets: selectedSets,
  };
}

interface CoordinatorOptions {
  readonly clock: Clock;
  readonly repository: ExecutionRepository;
  readonly projectionSink: ExecutionProjectionSink;
  readonly contract?: ExecutionContract;
}

function commitReceipt(set: ExecutionEventSet): CanonicalCommitReceipt {
  return {
    canonicalCommitReceiptId: set.eventSetId,
    eventSetDigest: set.digest,
  };
}

function appendFailure(): Result<never, ExecutionRefusal> {
  return {
    ok: false,
    error: { kind: "canonical-write-failed", persisted: false },
  };
}

type StartOperationResult = Result<ExecutionStarted, ExecutionRefusal>;
type OperationStartedEvent = Extract<ExecutionEvent, { type: "operation-started" }>;
type ReservationUpdatedEvent = Extract<ExecutionEvent, { type: "reservation-updated" }>;

function startRefusal<T = ExecutionStarted>(
  kind: "idempotency-conflict" | "invalid-transition" | "not-found",
): Result<T, ExecutionRefusal> {
  return { ok: false, error: { kind, persisted: false } };
}

function operationStartedEvent(set: ExecutionEventSet): OperationStartedEvent | undefined {
  return set.events.find(
    (candidate): candidate is OperationStartedEvent => candidate.type === "operation-started",
  );
}

function reservationUpdatedEvent(
  set: ExecutionEventSet,
): ReservationUpdatedEvent | undefined {
  return set.events.find(
    (candidate): candidate is ReservationUpdatedEvent =>
      candidate.type === "reservation-updated",
  );
}

function startedResult(
  set: ExecutionEventSet,
  operation: LogicalOperation,
  start: ExecutionStart,
): StartOperationResult {
  return {
    ok: true,
    value: { operation, start, ...commitReceipt(set) },
  };
}

function replayExistingStart(
  existing: ExecutionEventSet,
  payloadFingerprint: string,
): StartOperationResult {
  if (existing.payloadFingerprint !== payloadFingerprint) {
    return startRefusal("idempotency-conflict");
  }
  const event = operationStartedEvent(existing);
  return event === undefined
    ? startRefusal("invalid-transition")
    : startedResult(existing, event.operation, event.start);
}

function resumeSemanticStart(
  sets: readonly ExecutionEventSet[],
  payloadFingerprint: string,
): StartOperationResult | undefined {
  const matchingSet = sets.find(
    (set) =>
      set.payloadFingerprint === payloadFingerprint && operationStartedEvent(set) !== undefined,
  );
  if (matchingSet === undefined) return undefined;

  const event = operationStartedEvent(matchingSet);
  if (event === undefined) return startRefusal("invalid-transition");
  const current = foldExecutionEventSets(sets).operations.find(
    (candidate) => candidate.operationId === event.operation.operationId,
  );
  if (current?.status !== "started") return startRefusal("invalid-transition");
  return startedResult(matchingSet, current, { ...event.start, operation: current });
}

function operationProposalFor(
  sets: readonly ExecutionEventSet[],
  request: StartOperationRequest,
  contract: ExecutionContract,
  clock: Clock,
): Result<OperationProposal, ExecutionRefusal> {
  if (request.parent !== undefined && request.childInput !== undefined) {
    const parent = foldExecutionEventSets(sets).operations.find(
      (candidate) => candidate.operationId === request.parent.operationId,
    );
    if (parent === undefined) return startRefusal("not-found");
    if (
      parent.status !== "started" ||
      parent.rootOperationId !== request.parent.rootOperationId
    ) {
      return startRefusal("invalid-transition");
    }
    return {
      ok: true,
      value: contract.beginChildProposal(request.parent, request.childInput, clock),
    };
  }
  return request.input === undefined
    ? startRefusal("invalid-transition")
    : { ok: true, value: contract.beginRootProposal(request.input, clock) };
}

function proposalIsValid(
  proposal: OperationProposal,
  projection: ExecutionProjection,
): boolean {
  if (
    projection.operations.some(
      (candidate) => candidate.operationId === proposal.operation.operationId,
    )
  ) {
    return false;
  }
  const supersededId = proposal.operation.supersedesOperationId;
  return (
    supersededId === undefined ||
    projection.operations.some(
      (candidate) => candidate.operationId === supersededId && candidate.status !== "started",
    )
  );
}

function appendOperationStart(
  request: StartOperationRequest,
  proposal: OperationProposal,
  payloadFingerprint: string,
  append: (eventSet: ExecutionEventSet) => void,
): StartOperationResult {
  const operation: LogicalOperation = { ...proposal.operation, status: "started" };
  const start: ExecutionStart = { operation, observedStart: proposal.observedStart };
  const set = eventSet(operation.rootOperationId, request.idempotencyKey, payloadFingerprint, [
    {
      type: "operation-started",
      operation,
      start,
      ...(request.baseline
        ? {
            baseline: {
              ...request.baseline,
              rootOperationId: operation.rootOperationId,
            },
          }
        : {}),
      ...(request.environment ? { environment: request.environment } : {}),
    },
  ]);
  append(set);
  return startedResult(set, operation, start);
}

function transactStartOperation(
  sets: readonly ExecutionEventSet[],
  append: (eventSet: ExecutionEventSet) => void,
  request: StartOperationRequest,
  payloadFingerprint: string,
  contract: ExecutionContract,
  clock: Clock,
): StartOperationResult {
  const existing = existingForKey(sets, request.idempotencyKey);
  if (existing !== undefined) return replayExistingStart(existing, payloadFingerprint);

  // A resume/compact/process restart may allocate a fresh transport key.
  // Semantic identity still belongs to the existing nonterminal operation.
  const resumed = resumeSemanticStart(sets, payloadFingerprint);
  if (resumed !== undefined) return resumed;

  const proposed = operationProposalFor(sets, request, contract, clock);
  if (!proposed.ok) return proposed;
  if (!proposalIsValid(proposed.value, foldExecutionEventSets(sets))) {
    return startRefusal("invalid-transition");
  }
  return appendOperationStart(request, proposed.value, payloadFingerprint, append);
}

export function createExecutionLifecycleCoordinator(
  options: CoordinatorOptions,
): ExecutionLifecycleCoordinator {
  const contract = options.contract ?? createExecutionContract();

  return {
    startOperation(request) {
      const payloadFingerprint = digest({
        input: request.input,
        parent: request.parent,
        childInput: request.childInput,
        baseline: request.baseline,
        environment: request.environment,
      });
      try {
        return options.repository.transaction((sets, append) =>
          transactStartOperation(
            sets,
            append,
            request,
            payloadFingerprint,
            contract,
            options.clock,
          ),
        );
      } catch {
        return appendFailure();
      }
    },

    reserveExecution(request) {
      const payloadFingerprint = digest({
        operationId: request.operationId,
        budgetKind: request.budgetKind,
        subjectId: request.subjectId,
        semanticAttemptOrdinal: request.semanticAttemptOrdinal,
        slotId: request.slotId,
      });
      try {
        return options.repository.transaction((sets, append) => {
          const existing = existingForKey(sets, request.idempotencyKey);
          if (existing !== undefined) {
            if (existing.payloadFingerprint !== payloadFingerprint) {
              return {
                ok: false,
                error: { kind: "idempotency-conflict", persisted: false },
              } as const;
            }
            const reservation = reservationUpdatedEvent(existing)?.reservation;
            return reservation === undefined
              ? ({
                  ok: false,
                  error: { kind: "invalid-transition", persisted: false },
                } as const)
              : ({ ok: true, value: reservation } as const);
          }

          const projection = foldExecutionEventSets(sets, { operationId: request.operationId });
          const operation = projection.operations[0];
          if (operation === undefined) {
            return {
              ok: false,
              error: { kind: "not-found", persisted: false },
            } as const;
          }
          if (operation.status !== "started") {
            return {
              ok: false,
              error: { kind: "invalid-transition", persisted: false },
            } as const;
          }
          const reservation: ExecutionReservation = {
            reservationId: executionStableId("reservation", [
              request.operationId,
              request.budgetKind,
              request.subjectId,
              request.semanticAttemptOrdinal,
            ]),
            operationId: request.operationId,
            idempotencyKey: request.idempotencyKey,
            payloadFingerprint,
            dispatchState: "reserved",
            consumedAt: null,
            ...(request.slotId ? { slotId: request.slotId } : {}),
            startedAt: { state: "incomplete", missingFields: ["nativeStartedAt"] },
          };
          const set = eventSet(
            operation.rootOperationId,
            request.idempotencyKey,
            payloadFingerprint,
            [{ type: "reservation-updated", reservation }],
          );
          append(set);
          return { ok: true, value: reservation } as const;
        });
      } catch {
        return appendFailure();
      }
    },

    claimDispatch(reservationId, idempotencyKey) {
      const payloadFingerprint = digest({ reservationId, transition: "claim" });
      try {
        return options.repository.transaction((sets, append) => {
          const existing = existingForKey(sets, idempotencyKey);
          if (existing !== undefined) {
            if (existing.payloadFingerprint !== payloadFingerprint) {
              return { kind: "conflict" } as const;
            }
            const replayed = reservationUpdatedEvent(existing)?.reservation;
            if (replayed?.reservationId !== reservationId) {
              return { kind: "invalid-transition" } as const;
            }
            return {
              kind: "idempotent",
              reservation: replayed,
              ...commitReceipt(existing),
            } as const;
          }
          const projection = foldExecutionEventSets(sets);
          const reservation = projection.reservations.find(
            (candidate) => candidate.reservationId === reservationId,
          );
          if (reservation === undefined) return { kind: "not-found" } as const;
          if (reservation.dispatchState !== "reserved") {
            return { kind: "invalid-transition" } as const;
          }
          const claimed: ExecutionReservation = {
            ...reservation,
            dispatchState: "claimed",
            claimAcquiredAt: options.clock.wallNow(),
          };
          const operation = projection.operations.find(
            (candidate) => candidate.operationId === reservation.operationId,
          );
          if (operation === undefined) return { kind: "not-found" } as const;
          const set = eventSet(operation.rootOperationId, idempotencyKey, payloadFingerprint, [
            { type: "reservation-updated", reservation: claimed },
          ]);
          append(set);
          return {
            kind: "claimed",
            reservation: claimed,
            ...commitReceipt(set),
          } as const;
        });
      } catch {
        return { kind: "canonical-write-failed" };
      }
    },

    confirmDispatch(request) {
      const payloadFingerprint = digest(request);
      try {
        return options.repository.transaction((sets, append) => {
          const existing = existingForKey(sets, request.idempotencyKey);
          if (existing !== undefined && existing.payloadFingerprint !== payloadFingerprint) {
            return {
              ok: false,
              error: { kind: "idempotency-conflict", persisted: false },
            } as const;
          }
          const projection = foldExecutionEventSets(sets);
          const reservation = projection.reservations.find(
            (candidate) => candidate.reservationId === request.reservationId,
          );
          if (reservation === undefined) {
            return { ok: false, error: { kind: "not-found", persisted: false } } as const;
          }
          if (existing !== undefined) {
            const attemptEvent = existing.events.find(
              (candidate): candidate is Extract<ExecutionEvent, { type: "attempt-started" }> =>
                candidate.type === "attempt-started",
            );
            if (attemptEvent === undefined) {
              return {
                ok: false,
                error: { kind: "invalid-transition", persisted: false },
              } as const;
            }
            return {
              ok: true,
              value: {
                reservationId: request.reservationId,
                operationId: reservation.operationId,
                rootOperationId: existing.rootOperationId,
                attemptOrdinal: request.attemptOrdinal,
                nativeHandle: request.nativeHandle,
                dispatchEvidence: request.dispatchEvidence,
                attemptStart: attemptEvent.start,
                ...commitReceipt(existing),
              },
            } as const;
          }
          if (reservation.dispatchState !== "claimed") {
            return {
              ok: false,
              error: { kind: "invalid-transition", persisted: false },
            } as const;
          }
          const operation = projection.operations.find(
            (candidate) => candidate.operationId === reservation.operationId,
          );
          if (operation === undefined) {
            return { ok: false, error: { kind: "not-found", persisted: false } } as const;
          }
          const confirmation: DispatchConfirmation = {
            reservationId: request.reservationId,
            operationId: reservation.operationId,
            rootOperationId: operation.rootOperationId,
            attemptOrdinal: request.attemptOrdinal,
            nativeHandle: request.nativeHandle,
            dispatchEvidence: request.dispatchEvidence,
          };
          const attemptStart = contract.attemptFromConfirmation(confirmation, options.clock);
          const confirmed: ExecutionReservation = {
            ...reservation,
            dispatchState: "dispatch-confirmed",
            attemptId: attemptStart.attempt.attemptId,
            nativeHandle: request.nativeHandle,
            nativeAcceptedAt: options.clock.wallNow(),
            startedAt: attemptStart.attempt.startedAtFact,
          };
          const set = eventSet(operation.rootOperationId, request.idempotencyKey, payloadFingerprint, [
            { type: "reservation-updated", reservation: confirmed },
            { type: "attempt-started", start: attemptStart },
          ]);
          append(set);
          return {
            ok: true,
            value: { ...confirmation, attemptStart, ...commitReceipt(set) },
          } as const;
        });
      } catch {
        return appendFailure();
      }
    },

    reconcileDispatch(request) {
      const payloadFingerprint = digest({
        reservationId: request.reservationId,
        attemptOrdinal: request.attemptOrdinal,
        effect: request.effect,
      });
      try {
        return options.repository.transaction((sets, append) => {
          const existing = existingForKey(sets, request.idempotencyKey);
          if (existing !== undefined) {
            if (existing.payloadFingerprint !== payloadFingerprint) {
              return {
                ok: false,
                error: { kind: "idempotency-conflict", persisted: false },
              } as const;
            }
            const event = existing.events.find(
              (candidate): candidate is Extract<ExecutionEvent, { type: "attempt-finished" }> =>
                candidate.type === "attempt-finished",
            );
            return event === undefined
              ? ({
                  ok: false,
                  error: { kind: "invalid-transition", persisted: false },
                } as const)
              : ({ ok: true, value: event.finished } as const);
          }
          const projection = foldExecutionEventSets(sets);
          const reservation = projection.reservations.find(
            (candidate) => candidate.reservationId === request.reservationId,
          );
          if (reservation === undefined) {
            return { ok: false, error: { kind: "not-found", persisted: false } } as const;
          }
          if (reservation.dispatchState !== "claimed") {
            return {
              ok: false,
              error: { kind: "invalid-transition", persisted: false },
            } as const;
          }
          const operation = projection.operations.find(
            (candidate) => candidate.operationId === reservation.operationId,
          );
          if (operation === undefined) {
            return { ok: false, error: { kind: "not-found", persisted: false } } as const;
          }
          const start = contract.attemptFromConfirmation(
            {
              reservationId: reservation.reservationId,
              operationId: operation.operationId,
              rootOperationId: operation.rootOperationId,
              attemptOrdinal: request.attemptOrdinal,
              nativeHandle: {
                state: "unavailable",
                reason: "dispatch-confirmation-not-observed",
              },
              dispatchEvidence: { state: "available", value: request.effect },
            },
            options.clock,
          );
          const outcome: AttemptOutcome = {
            outcome:
              request.effect === "no-effect-confirmed"
                ? "dispatch-not-started"
                : "dispatch-effect-unknown",
            terminationReason:
              request.effect === "no-effect-confirmed"
                ? "native-effect-not-started"
                : "native-effect-cannot-be-safely-retried",
          };
          const finished = contract.finishAttempt(start, outcome, options.clock);
          const terminalReservation: ExecutionReservation = {
            ...reservation,
            attemptId: finished.attempt.attemptId,
            dispatchState: "terminal",
            consumedAt: options.clock.wallNow(),
          };
          const set = eventSet(
            operation.rootOperationId,
            request.idempotencyKey,
            payloadFingerprint,
            [
              { type: "attempt-started", start },
              { type: "attempt-finished", finished },
              { type: "reservation-updated", reservation: terminalReservation },
            ],
          );
          append(set);
          return { ok: true, value: finished } as const;
        });
      } catch {
        return appendFailure();
      }
    },

    issueStartPermit(request) {
      const sets = options.repository.readEventSets();
      const set = sets.find(
        (candidate) => candidate.eventSetId === request.canonicalCommitReceiptId,
      );
      if (set === undefined) {
        return { ok: false, error: { kind: "not-found", persisted: false } };
      }
      const projection = foldExecutionEventSets(sets);
      const reservation = projection.reservations.find(
        (candidate) => candidate.reservationId === request.reservationId,
      );
      if (reservation?.dispatchState !== "claimed") {
        return {
          ok: false,
          error: { kind: "invalid-transition", persisted: false },
        };
      }
      try {
        const receipt = options.projectionSink.projectRequired(set);
        if (receipt.digest !== set.digest) {
          return {
            ok: false,
            error: { kind: "digest-mismatch", persisted: true },
          };
        }
        return {
          ok: true,
          value: {
            reservationId: request.reservationId,
            canonicalCommitReceiptId: set.eventSetId,
            stateProjectionReceiptId: receipt.stateProjectionReceiptId,
            runtimeProjectionReceiptId: receipt.runtimeProjectionReceiptId,
          },
        };
      } catch {
        return {
          ok: false,
          error: { kind: "projection-pending-rebuild", persisted: true },
        };
      }
    },

    finishAttempt(request) {
      const payloadFingerprint = digest({
        attemptId: request.start.attempt.attemptId,
        outcome: request.outcome,
      });
      try {
        return options.repository.transaction((sets, append) => {
          const existing = existingForKey(sets, request.idempotencyKey);
          if (existing !== undefined) {
            if (existing.payloadFingerprint !== payloadFingerprint) {
              return {
                ok: false,
                error: { kind: "idempotency-conflict", persisted: false },
              } as const;
            }
            const event = existing.events.find(
              (candidate): candidate is Extract<ExecutionEvent, { type: "attempt-finished" }> =>
                candidate.type === "attempt-finished",
            );
            return event === undefined
              ? ({
                  ok: false,
                  error: { kind: "invalid-transition", persisted: false },
                } as const)
              : ({ ok: true, value: event.finished } as const);
          }
          const projection = foldExecutionEventSets(sets);
          const attempt = projection.attempts.find(
            (candidate) => candidate.attemptId === request.start.attempt.attemptId,
          );
          if (attempt === undefined) {
            return { ok: false, error: { kind: "not-found", persisted: false } } as const;
          }
          if (attempt.outcome !== null) {
            return {
              ok: false,
              error: { kind: "invalid-transition", persisted: false },
            } as const;
          }
          const finished = contract.finishAttempt(request.start, request.outcome, options.clock);
          const reservation = projection.reservations.find(
            (candidate) => candidate.reservationId === request.start.reservationId,
          );
          const events: ExecutionEvent[] = [{ type: "attempt-finished", finished }];
          if (reservation !== undefined) {
            events.push({
              type: "reservation-updated",
              reservation: {
                ...reservation,
                dispatchState: "terminal",
                consumedAt: options.clock.wallNow(),
              },
            });
          }
          const set = eventSet(
            request.start.rootOperationId,
            request.idempotencyKey,
            payloadFingerprint,
            events,
          );
          append(set);
          return { ok: true, value: finished } as const;
        });
      } catch {
        return appendFailure();
      }
    },

    finishOperation(request) {
      const payloadFingerprint = digest({
        operationId: request.start.operation.operationId,
        outcome: request.outcome,
      });
      try {
        return options.repository.transaction((sets, append) => {
          const existing = existingForKey(sets, request.idempotencyKey);
          if (existing !== undefined) {
            if (existing.payloadFingerprint !== payloadFingerprint) {
              return {
                ok: false,
                error: { kind: "idempotency-conflict", persisted: false },
              } as const;
            }
            const event = existing.events.find(
              (candidate) => candidate.type === "operation-finished",
            );
            if (event?.type !== "operation-finished") {
              return {
                ok: false,
                error: { kind: "invalid-transition", persisted: false },
              } as const;
            }
            return { ok: true, value: event.finished } as const;
          }
          const projection = foldExecutionEventSets(sets);
          const operation = projection.operations.find(
            (candidate) => candidate.operationId === request.start.operation.operationId,
          );
          if (operation?.status !== "started") {
            return {
              ok: false,
              error: { kind: operation ? "invalid-transition" : "not-found", persisted: false },
            } as const;
          }
          const hasOpenAttempt = projection.attempts.some(
            (attempt) => attempt.operationId === operation.operationId && attempt.outcome === null,
          );
          const hasNonterminalChild = projection.operations.some(
            (candidate) =>
              candidate.parentOperationId === operation.operationId &&
              candidate.status === "started",
          );
          if (hasOpenAttempt || hasNonterminalChild) {
            return {
              ok: false,
              error: { kind: "invalid-transition", persisted: false },
            } as const;
          }
          const finished = contract.finishOperation(request.start, request.outcome, options.clock);
          const set = eventSet(
            operation.rootOperationId,
            request.idempotencyKey,
            payloadFingerprint,
            [{ type: "operation-finished", finished }],
          );
          append(set);
          return { ok: true, value: finished } as const;
        });
      } catch {
        return appendFailure();
      }
    },

    readProjection(query) {
      return foldExecutionEventSets(options.repository.readEventSets(), query);
    },
  };
}
