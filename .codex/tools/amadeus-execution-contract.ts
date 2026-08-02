// Harness-neutral execution identity and measurement contract (#1602).
//
// This module is deliberately pure. It neither writes the audit journal nor
// dispatches native work: the lifecycle coordinator owns canonical mutation
// and harness adapters only translate native facts.

import { createHash } from "node:crypto";

export type Fact<T> =
  | { readonly state: "available"; readonly value: T }
  | { readonly state: "unavailable"; readonly reason: string }
  | { readonly state: "legacy-unknown" }
  | { readonly state: "incomplete"; readonly missingFields: readonly string[] };

export type MeasurementQuality = "monotonic" | "wall-fallback" | "invalid";
export type ClockSource = "monotonic" | "wall";

export interface DurationMeasurement {
  readonly clockSource: ClockSource;
  readonly measurementQuality: MeasurementQuality;
  readonly durationMs?: number;
  readonly error?: string;
}

export interface Clock {
  wallNow(): string;
  monotonicNowMs(): number | null;
}

export interface ExecutionOrigin {
  readonly stage: string;
  readonly agent: string;
  readonly tool: string;
}

export type OperationStatus = "proposed" | "started" | "succeeded" | "failed" | "cancelled";

export interface LogicalOperation {
  readonly operationId: string;
  readonly rootOperationId: string;
  readonly parentOperationId?: string;
  readonly supersedesOperationId?: string;
  readonly kind: string;
  readonly origin: ExecutionOrigin;
  readonly status: OperationStatus;
}

export type ExecutionIdentity = Pick<
  LogicalOperation,
  "operationId" | "rootOperationId" | "parentOperationId"
>;

interface ClockObservation {
  readonly wall: string;
  readonly monotonicMs: number | null;
}

export interface BeginRootInput {
  readonly intentUuid: string;
  readonly stageSlug: string;
  readonly stageInstanceId: string;
  readonly revision: number;
  readonly kind: string;
  readonly origin: ExecutionOrigin;
  readonly supersedesOperationId?: string;
}

export interface BeginChildInput {
  readonly childKind: string;
  readonly semanticSubjectId: string;
  readonly childOrdinal: number;
  readonly origin: ExecutionOrigin;
}

export interface OperationProposal {
  readonly operation: LogicalOperation;
  readonly observedStart: ClockObservation;
}

export interface DispatchConfirmation {
  readonly reservationId: string;
  readonly operationId: string;
  readonly rootOperationId: string;
  readonly attemptOrdinal: number;
  readonly nativeHandle: Fact<string>;
  readonly dispatchEvidence: Fact<string>;
}

export type AttemptOutcomeName =
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dispatch-not-started"
  | "dispatch-effect-unknown";

export interface AttemptOutcome {
  readonly outcome: AttemptOutcomeName;
  readonly terminationReason: string;
}

export interface ExecutionAttempt {
  readonly attemptId: string;
  readonly operationId: string;
  readonly ordinal: number;
  readonly origin: ExecutionOrigin | null;
  readonly dispatchEvidence: Fact<string>;
  readonly startedAtFact: Fact<string>;
  readonly finishedAtFact: Fact<string>;
  readonly outcome: AttemptOutcomeName | null;
  readonly terminationReason: string | null;
  readonly measurement: DurationMeasurement | null;
  readonly nativeHandle: Fact<string>;
}

export interface AttemptStart {
  readonly attempt: ExecutionAttempt;
  readonly rootOperationId: string;
  readonly reservationId: string;
  readonly observedStart: ClockObservation;
}

export interface FinishedExecutionAttempt
  extends Omit<
    ExecutionAttempt,
    "finishedAtFact" | "outcome" | "terminationReason" | "measurement"
  > {
  readonly finishedAtFact: Fact<string>;
  readonly outcome: AttemptOutcomeName;
  readonly terminationReason: string;
  readonly measurement: DurationMeasurement;
}

export interface AttemptFinished {
  readonly attempt: FinishedExecutionAttempt;
  readonly rootOperationId: string;
  readonly reservationId: string;
}

export interface ExecutionStart {
  readonly operation: LogicalOperation;
  readonly observedStart: ClockObservation;
}

export interface OperationOutcome {
  readonly outcome: Extract<OperationStatus, "succeeded" | "failed" | "cancelled">;
  readonly terminationReason: string;
}

export interface OperationFinished {
  readonly operation: LogicalOperation;
  readonly terminationReason: string;
  readonly measurement: DurationMeasurement;
  readonly finishedAtFact: Fact<string>;
}

export interface NativeExecutionFacts {
  readonly nativeHandle?: Fact<string>;
  readonly model: Fact<string>;
  readonly harnessVersion: Fact<string>;
  readonly clockAvailability: Fact<string>;
}

export interface NormalizedExecutionFacts {
  readonly nativeHandle: Fact<string>;
  readonly model: Fact<string>;
  readonly harnessVersion: Fact<string>;
  readonly clockAvailability: Fact<string>;
}

export interface ExecutionContract {
  beginRootProposal(input: BeginRootInput, clock: Clock): OperationProposal;
  beginChildProposal(parent: ExecutionIdentity, input: BeginChildInput, clock: Clock): OperationProposal;
  attemptFromConfirmation(confirmation: DispatchConfirmation, clock: Clock): AttemptStart;
  finishAttempt(start: AttemptStart, outcome: AttemptOutcome, clock: Clock): AttemptFinished;
  finishOperation(start: ExecutionStart, outcome: OperationOutcome, clock: Clock): OperationFinished;
  normalizeNativeFacts(input: NativeExecutionFacts): NormalizedExecutionFacts;
}

export function executionStableId(namespace: string, tuple: readonly unknown[]): string {
  const digest = createHash("sha256").update(JSON.stringify(tuple)).digest("hex");
  return `${namespace}-${digest.slice(0, 32)}`;
}

function observeClock(clock: Clock): ClockObservation {
  return { wall: clock.wallNow(), monotonicMs: clock.monotonicNowMs() };
}

function availableWall(observation: ClockObservation): Fact<string> {
  return Number.isFinite(Date.parse(observation.wall))
    ? { state: "available", value: observation.wall }
    : { state: "incomplete", missingFields: ["wall"] };
}

function duration(start: ClockObservation, end: ClockObservation): DurationMeasurement {
  if (
    start.monotonicMs !== null &&
    end.monotonicMs !== null &&
    Number.isFinite(start.monotonicMs) &&
    Number.isFinite(end.monotonicMs)
  ) {
    if (end.monotonicMs < start.monotonicMs) {
      return {
        clockSource: "monotonic",
        measurementQuality: "invalid",
        error: "monotonic-clock-regressed",
      };
    }
    return {
      clockSource: "monotonic",
      measurementQuality: "monotonic",
      durationMs: end.monotonicMs - start.monotonicMs,
    };
  }

  const startWall = Date.parse(start.wall);
  const endWall = Date.parse(end.wall);
  if (!Number.isFinite(startWall) || !Number.isFinite(endWall)) {
    return {
      clockSource: "wall",
      measurementQuality: "invalid",
      error: "wall-clock-unavailable",
    };
  }
  if (endWall < startWall) {
    return {
      clockSource: "wall",
      measurementQuality: "invalid",
      error: "wall-clock-regressed",
    };
  }
  return {
    clockSource: "wall",
    measurementQuality: "wall-fallback",
    durationMs: endWall - startWall,
  };
}

function createContract(): ExecutionContract {
  return {
    beginRootProposal(input, clock) {
      const observedStart = observeClock(clock);
      const operationId = executionStableId("root", [
        input.intentUuid,
        input.stageSlug,
        input.stageInstanceId,
        input.revision,
        observedStart.wall,
      ]);
      return {
        operation: {
          operationId,
          rootOperationId: operationId,
          ...(input.supersedesOperationId
            ? { supersedesOperationId: input.supersedesOperationId }
            : {}),
          kind: input.kind,
          origin: input.origin,
          status: "proposed",
        },
        observedStart,
      };
    },

    beginChildProposal(parent, input, clock) {
      if (parent.operationId === "") throw new Error("parent operation id is required");
      if (parent.rootOperationId === "") throw new Error("root operation id is required");
      const operationId = executionStableId("child", [
        parent.rootOperationId,
        parent.operationId,
        input.childKind,
        input.semanticSubjectId,
        input.childOrdinal,
      ]);
      if (operationId === parent.operationId) throw new Error("execution operation cycle");
      return {
        operation: {
          operationId,
          rootOperationId: parent.rootOperationId,
          parentOperationId: parent.operationId,
          kind: input.childKind,
          origin: input.origin,
          status: "proposed",
        },
        observedStart: observeClock(clock),
      };
    },

    attemptFromConfirmation(confirmation, clock) {
      const observedStart = observeClock(clock);
      const attemptId = executionStableId("attempt", [
        confirmation.operationId,
        confirmation.reservationId,
        confirmation.attemptOrdinal,
      ]);
      return {
        attempt: {
          attemptId,
          operationId: confirmation.operationId,
          ordinal: confirmation.attemptOrdinal,
          origin: null,
          dispatchEvidence: confirmation.dispatchEvidence,
          startedAtFact: availableWall(observedStart),
          finishedAtFact: { state: "incomplete", missingFields: ["finishedAt"] },
          outcome: null,
          terminationReason: null,
          measurement: null,
          nativeHandle: confirmation.nativeHandle,
        },
        rootOperationId: confirmation.rootOperationId,
        reservationId: confirmation.reservationId,
        observedStart,
      };
    },

    finishAttempt(start, outcome, clock) {
      const observedEnd = observeClock(clock);
      return {
        attempt: {
          ...start.attempt,
          finishedAtFact: availableWall(observedEnd),
          outcome: outcome.outcome,
          terminationReason: outcome.terminationReason,
          measurement: duration(start.observedStart, observedEnd),
        },
        rootOperationId: start.rootOperationId,
        reservationId: start.reservationId,
      };
    },

    finishOperation(start, outcome, clock) {
      const observedEnd = observeClock(clock);
      return {
        operation: { ...start.operation, status: outcome.outcome },
        terminationReason: outcome.terminationReason,
        measurement: duration(start.observedStart, observedEnd),
        finishedAtFact: availableWall(observedEnd),
      };
    },

    normalizeNativeFacts(input) {
      return {
        nativeHandle:
          input.nativeHandle ??
          { state: "unavailable", reason: "native-handle-not-exposed" },
        model: input.model,
        harnessVersion: input.harnessVersion,
        clockAvailability: input.clockAvailability,
      };
    },
  };
}

const EXECUTION_CONTRACT = createContract();

export function createExecutionContract(): ExecutionContract {
  return EXECUTION_CONTRACT;
}
