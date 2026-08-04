// Durable orchestration adapter for the harness-neutral Loop Monitor (#2095).
//
// One canonical event set is one atomic logical commit. Harnesses receive only
// commit-receipt-derived dispatch permits; they never own cycle counters,
// idempotency decisions, retry budgets, or route validation.

import { createHash } from "node:crypto";
import {
  applyLoopDelivery,
  createLoopMonitorProjection,
  type CompiledLoopMonitor,
  type CompiledLoopMonitorGraph,
  type JudgeRouteDescriptor,
  type LoopDelivery,
  type LoopJudgeReservation,
  type LoopLatch,
  type LoopMonitorPartition,
  type LoopMonitorProjection,
  type LoopTraceContext,
} from "./amadeus-loop-monitor.ts";

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

function sha256(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function stableId(namespace: string, value: unknown): string {
  return `${namespace}-${sha256(value).slice("sha256:".length, "sha256:".length + 32)}`;
}

export function loopMonitorReceiptId(eventSetId: string, eventSetDigest: string): string {
  return stableId("loop-receipt", [eventSetId, eventSetDigest]);
}

export function loopMonitorPartitionKey(partition: LoopMonitorPartition): string {
  return stableId("loop-partition", [
    partition.intentUuid,
    partition.monitorId,
    partition.stageInstanceId,
    partition.graphRevision,
  ]);
}

export interface JudgeResult {
  readonly invocationId: string;
  readonly routeId: string;
  readonly evidenceFingerprint: string;
  readonly constraintFingerprint: string;
  readonly trace: LoopTraceContext;
}

export type JudgeDispatchResult =
  | { readonly kind: "completed"; readonly result: JudgeResult }
  | { readonly kind: "accepted"; readonly nativeHandle: string }
  | { readonly kind: "not-started"; readonly reason: string };

export type JudgeReconcileResult =
  | { readonly kind: "completed"; readonly result: JudgeResult }
  | { readonly kind: "no-effect-attested"; readonly attestationId: string }
  | { readonly kind: "effect-possible"; readonly reason: string }
  | { readonly kind: "unknown"; readonly reason: string };

export interface JudgeDispatchRequest {
  readonly invocationId: string;
  readonly monitorId: string;
  readonly evidenceProviderId: string;
  readonly judgeInstructionId: string;
  readonly evidenceFingerprint: string;
  readonly routeConstraintFingerprint: string;
  readonly allowedRouteIds: readonly string[];
  readonly trace: LoopTraceContext;
}

export interface JudgePort {
  dispatch(request: JudgeDispatchRequest): JudgeDispatchResult;
  reconcile(request: JudgeDispatchRequest): JudgeReconcileResult;
}

export type LoopMonitorEvent =
  | { readonly type: "LOOP_DELIVERY_OBSERVED"; readonly delivery: LoopDelivery }
  | { readonly type: "LOOP_MONITOR_TRIGGERED"; readonly reservation: LoopJudgeReservation }
  | { readonly type: "LOOP_JUDGE_STARTED"; readonly reservation: LoopJudgeReservation }
  | {
      readonly type: "LOOP_JUDGE_ATTEMPT_STARTED";
      readonly invocationId: string;
      readonly attempt: 1;
      readonly attestationId: string;
      readonly trace: LoopTraceContext;
    }
  | { readonly type: "LOOP_JUDGE_RESULT_OBSERVED"; readonly result: JudgeResult }
  | { readonly type: "LOOP_JUDGE_COMPLETED"; readonly invocationId: string; readonly routeId: string }
  | {
      readonly type: "LOOP_ROUTE_APPLIED";
      readonly invocationId: string;
      readonly routeId: string;
      readonly targetEvent: string | null;
    }
  | { readonly type: "LOOP_LATCH_SET"; readonly latch: LoopLatch }
  | {
      readonly type: "LOOP_LATCH_CLEARED";
      readonly monitorId: string;
      readonly priorEvidenceFingerprint: string;
      readonly basis: "evidence-change" | "human-retry";
      readonly humanTurnId: string | null;
    }
  | { readonly type: "WORKFLOW_UNPARKED"; readonly monitorId: string; readonly reasonCode: string }
  | { readonly type: "LOOP_JUDGE_AWAITING_HUMAN"; readonly invocationId: string; readonly reason: string }
  | {
      readonly type: "LIVE_SMOKE_AUTHORIZED";
      readonly authorizationId: string;
      readonly actorId: string;
      readonly scopeDigest: string;
    };

export interface LoopMonitorEventSet {
  readonly eventSetId: string;
  readonly partition: LoopMonitorPartition;
  readonly partitionKey: string;
  readonly idempotencyKey: string;
  readonly payloadFingerprint: string;
  readonly events: readonly LoopMonitorEvent[];
}

export interface LoopMonitorCommitReceipt {
  readonly receiptId: string;
  readonly eventSetId: string;
  readonly eventSetDigest: string;
  readonly partitionKey: string;
}

export interface CommittedJudgeDispatchPermit {
  readonly invocationId: string;
  readonly partition: LoopMonitorPartition;
  readonly receiptId: string;
  readonly eventSetId: string;
  readonly eventSetDigest: string;
}

export interface LoopMonitorRepository {
  transaction<T>(
    partition: LoopMonitorPartition,
    body: (
      sets: readonly LoopMonitorEventSet[],
      append: (set: LoopMonitorEventSet) => LoopMonitorCommitReceipt,
    ) => T,
  ): T;
  readEventSets(partition: LoopMonitorPartition): readonly LoopMonitorEventSet[];
  isCommitted(receipt: LoopMonitorCommitReceipt): boolean;
}

export function createMemoryLoopMonitorRepository(
  options: { readonly failAppend?: boolean } = {},
): LoopMonitorRepository {
  const byPartition = new Map<string, LoopMonitorEventSet[]>();
  const receipts = new Map<string, LoopMonitorCommitReceipt>();
  return {
    transaction(partition, body) {
      const key = loopMonitorPartitionKey(partition);
      const sets = byPartition.get(key) ?? [];
      return body(sets, (set) => {
        if (options.failAppend) throw new Error("injected-loop-monitor-append-failure");
        const eventSetDigest = sha256(set);
        const receipt: LoopMonitorCommitReceipt = {
          receiptId: loopMonitorReceiptId(set.eventSetId, eventSetDigest),
          eventSetId: set.eventSetId,
          eventSetDigest,
          partitionKey: key,
        };
        sets.push(set);
        byPartition.set(key, sets);
        receipts.set(receipt.receiptId, receipt);
        return receipt;
      });
    },
    readEventSets(partition) {
      return [...(byPartition.get(loopMonitorPartitionKey(partition)) ?? [])];
    },
    isCommitted(receipt) {
      const stored = receipts.get(receipt.receiptId);
      return stored !== undefined && stored.eventSetId === receipt.eventSetId &&
        stored.eventSetDigest === receipt.eventSetDigest && stored.partitionKey === receipt.partitionKey;
    },
  };
}

export interface LoopMonitorRuntimeProjection extends LoopMonitorProjection {
  readonly judgeRedispatchAttempts: 0 | 1;
  readonly observedJudgeResult: JudgeResult | null;
  readonly lastCompletedInvocationId: string | null;
  readonly lastRouteId: string | null;
  readonly awaitingHumanReason: string | null;
}

function initialProjection(
  partition: LoopMonitorPartition,
  monitor: CompiledLoopMonitor,
): LoopMonitorRuntimeProjection {
  return {
    ...createLoopMonitorProjection(partition, monitor),
    judgeRedispatchAttempts: 0,
    observedJudgeResult: null,
    lastCompletedInvocationId: null,
    lastRouteId: null,
    awaitingHumanReason: null,
  };
}

function applyRuntimeEvent(
  projection: LoopMonitorRuntimeProjection,
  monitor: CompiledLoopMonitor,
  event: LoopMonitorEvent,
): LoopMonitorRuntimeProjection {
  switch (event.type) {
    case "LOOP_DELIVERY_OBSERVED": {
      const result = applyLoopDelivery(projection, monitor, event.delivery);
      if (!result.ok) throw new Error(`invalid-loop-monitor-audit:${result.status}:${result.reason}`);
      return { ...projection, ...result.projection };
    }
    case "LOOP_MONITOR_TRIGGERED":
    case "LOOP_JUDGE_STARTED":
      if (projection.pendingJudge?.invocationId !== event.reservation.invocationId) {
        throw new Error("invalid-loop-monitor-audit:judge-reservation-mismatch");
      }
      return projection;
    case "LOOP_JUDGE_ATTEMPT_STARTED":
      if (projection.pendingJudge?.invocationId !== event.invocationId || projection.judgeRedispatchAttempts !== 0) {
        throw new Error("invalid-loop-monitor-audit:judge-attempt-mismatch");
      }
      return { ...projection, judgeRedispatchAttempts: 1 };
    case "LOOP_JUDGE_RESULT_OBSERVED":
      return { ...projection, observedJudgeResult: event.result };
    case "LOOP_JUDGE_COMPLETED":
      return {
        ...projection,
        pendingJudge: null,
        lastCompletedInvocationId: event.invocationId,
        awaitingHumanReason: null,
      };
    case "LOOP_ROUTE_APPLIED":
      return { ...projection, lastRouteId: event.routeId };
    case "LOOP_LATCH_SET":
      return { ...projection, latch: event.latch, pendingJudge: null };
    case "LOOP_LATCH_CLEARED":
      return { ...projection, latch: null, awaitingHumanReason: null };
    case "WORKFLOW_UNPARKED":
    case "LIVE_SMOKE_AUTHORIZED":
      return projection;
    case "LOOP_JUDGE_AWAITING_HUMAN":
      return { ...projection, awaitingHumanReason: event.reason };
  }
}

export function foldLoopMonitorEventSets(
  sets: readonly LoopMonitorEventSet[],
  partition: LoopMonitorPartition,
  monitor: CompiledLoopMonitor,
): LoopMonitorRuntimeProjection {
  let projection = initialProjection(partition, monitor);
  const ids = new Map<string, string>();
  for (const set of sets) {
    if (set.partitionKey !== loopMonitorPartitionKey(partition)) continue;
    const existing = ids.get(set.eventSetId);
    const setDigest = sha256(set);
    if (existing !== undefined) {
      if (existing !== setDigest) throw new Error("invalid-loop-monitor-audit:event-set-id-conflict");
      continue;
    }
    ids.set(set.eventSetId, setDigest);
    for (const event of set.events) projection = applyRuntimeEvent(projection, monitor, event);
  }
  return projection;
}

function deliveryReplayDecision(
  sets: readonly LoopMonitorEventSet[],
  delivery: LoopDelivery,
): "duplicate" | "causal-fork" | "identity-conflict" | null {
  for (const set of sets) {
    for (const event of set.events) {
      if (event.type !== "LOOP_DELIVERY_OBSERVED") continue;
      const observed = event.delivery;
      if (observed.upstreamEventIdentity === delivery.upstreamEventIdentity) {
        return observed.deliveryId === delivery.deliveryId &&
            observed.payloadFingerprint === delivery.payloadFingerprint
          ? "duplicate"
          : "identity-conflict";
      }
      if (
        observed.predecessorDeliveryId === delivery.predecessorDeliveryId &&
        observed.deliveryId !== delivery.deliveryId
      ) {
        return "causal-fork";
      }
    }
  }
  return null;
}

function routeById(monitor: CompiledLoopMonitor, routeId: string): JudgeRouteDescriptor | null {
  return monitor.routes.find((route) => route.id === routeId) ?? null;
}

function judgeRequest(
  monitor: CompiledLoopMonitor,
  reservation: LoopJudgeReservation,
): JudgeDispatchRequest {
  return {
    invocationId: reservation.invocationId,
    monitorId: monitor.id,
    evidenceProviderId: monitor.evidenceProvider.id,
    judgeInstructionId: monitor.judgeInstruction.id,
    evidenceFingerprint: reservation.evidenceFingerprint,
    routeConstraintFingerprint: reservation.constraintFingerprint,
    allowedRouteIds: [...monitor.routeConstraint.routeIds],
    trace: { ...reservation.trace },
  };
}

function tracesEqual(a: LoopTraceContext, b: LoopTraceContext): boolean {
  return a.traceId === b.traceId && a.spanId === b.spanId;
}

function matchingJudgeResult(
  monitor: CompiledLoopMonitor,
  reservation: LoopJudgeReservation,
  result: JudgeResult,
): boolean {
  return result.invocationId === reservation.invocationId &&
    result.evidenceFingerprint === reservation.evidenceFingerprint &&
    result.constraintFingerprint === reservation.constraintFingerprint &&
    tracesEqual(result.trace, reservation.trace) &&
    routeById(monitor, result.routeId) !== null;
}

function eventSet(
  partition: LoopMonitorPartition,
  idempotencyKey: string,
  payload: unknown,
  events: readonly LoopMonitorEvent[],
): LoopMonitorEventSet {
  const payloadFingerprint = sha256(payload);
  return {
    eventSetId: stableId("loop-event-set", [loopMonitorPartitionKey(partition), idempotencyKey, payloadFingerprint]),
    partition: { ...partition },
    partitionKey: loopMonitorPartitionKey(partition),
    idempotencyKey,
    payloadFingerprint,
    events,
  };
}

function committedPermit(
  partition: LoopMonitorPartition,
  invocationId: string,
  receipt: LoopMonitorCommitReceipt,
): CommittedJudgeDispatchPermit {
  return {
    invocationId,
    partition: { ...partition },
    receiptId: receipt.receiptId,
    eventSetId: receipt.eventSetId,
    eventSetDigest: receipt.eventSetDigest,
  };
}

export type LoopMonitorCoordinatorResult =
  | { readonly kind: "observed" | "pending" | "duplicate"; readonly projection: LoopMonitorRuntimeProjection }
  | {
      readonly kind: "judge-reserved";
      readonly invocationId: string;
      readonly permit: CommittedJudgeDispatchPermit;
      readonly projection: LoopMonitorRuntimeProjection;
    }
  | { readonly kind: "route-applied"; readonly routeId: string; readonly projection: LoopMonitorRuntimeProjection }
  | {
      readonly kind: "latched";
      readonly reasonCode: string;
      readonly resumeCondition: string;
      readonly evidenceFingerprint: string;
      readonly projection: LoopMonitorRuntimeProjection;
    }
  | { readonly kind: "cleared"; readonly projection: LoopMonitorRuntimeProjection }
  | { readonly kind: "AWAITING_HUMAN"; readonly reason: string; readonly projection: LoopMonitorRuntimeProjection }
  | { readonly kind: "CONFLICT" | "INCOMPLETE"; readonly reason: string };

export interface VerifiedHumanTurn {
  readonly verified: true;
  readonly eventType: "HUMAN_TURN";
  readonly turnId: string;
}

export function verifyHumanRetry(value: {
  readonly eventType: string;
  readonly actor: string;
  readonly turnId: string;
}): VerifiedHumanTurn | null {
  return value.eventType === "HUMAN_TURN" && value.actor === "human" && value.turnId.length > 0
    ? { verified: true, eventType: "HUMAN_TURN", turnId: value.turnId }
    : null;
}

export interface LiveAuthorizationPort {
  authorize(request: {
    readonly intentUuid: string;
    readonly monitorId: string;
    readonly scopeDigest: string;
  }):
    | { readonly authorized: true; readonly authorizationId: string; readonly actorId: string }
    | { readonly authorized: false; readonly reason: string };
}

export interface LoopMonitorCoordinator {
  observeDelivery(delivery: LoopDelivery): LoopMonitorCoordinatorResult;
  dispatchJudge(permit: CommittedJudgeDispatchPermit, port: JudgePort): LoopMonitorCoordinatorResult;
  resumeJudge(partition: LoopMonitorPartition, port: JudgePort): LoopMonitorCoordinatorResult;
  clearLatch(request: {
    readonly partition: LoopMonitorPartition;
    readonly evidenceFingerprint?: string;
    readonly humanRetry?: VerifiedHumanTurn;
  }): LoopMonitorCoordinatorResult;
  authorizeLiveSmoke(
    partition: LoopMonitorPartition,
    scopeDigest: string,
    port: LiveAuthorizationPort,
  ): { readonly kind: "authorized"; readonly receipt: LoopMonitorCommitReceipt } | { readonly kind: "CONFLICT"; readonly reason: string };
  readProjection(partition: LoopMonitorPartition): LoopMonitorRuntimeProjection;
}

export interface LoopMonitorStatusEnvelope {
  readonly outcome: "active" | "parked" | "awaiting-human";
  readonly partition: LoopMonitorPartition;
  readonly epoch: number;
  readonly matchedPrefix: number;
  readonly cycleCount: number;
  readonly threshold: number;
  readonly pendingDeliveries: number;
  readonly pendingJudgeInvocationId: string | null;
  readonly stopReason: string | null;
  readonly evidenceFingerprint: string | null;
  readonly resumeCondition: string | null;
}

export function projectLoopMonitorStatus(
  projection: LoopMonitorRuntimeProjection,
  monitor: CompiledLoopMonitor,
): LoopMonitorStatusEnvelope {
  const outcome = projection.latch !== null
    ? "parked"
    : projection.awaitingHumanReason !== null
    ? "awaiting-human"
    : "active";
  return {
    outcome,
    partition: { ...projection.partition },
    epoch: projection.epoch,
    matchedPrefix: projection.matchedPrefix,
    cycleCount: projection.cycleCount,
    threshold: monitor.threshold,
    pendingDeliveries: projection.pending.length,
    pendingJudgeInvocationId: projection.pendingJudge?.invocationId ?? null,
    stopReason: projection.latch?.reasonCode ?? projection.awaitingHumanReason,
    evidenceFingerprint: projection.latch?.evidenceFingerprint ??
      projection.pendingJudge?.evidenceFingerprint ?? null,
    resumeCondition: projection.latch?.resumeCondition ?? null,
  };
}

export function renderLoopMonitorStatus(status: LoopMonitorStatusEnvelope): string {
  const lines = [
    `Loop Monitor: ${status.partition.monitorId}`,
    `Outcome: ${status.outcome}`,
    `Cycle: ${status.cycleCount}/${status.threshold} (epoch ${status.epoch}, prefix ${status.matchedPrefix})`,
    `Pending deliveries: ${status.pendingDeliveries}`,
  ];
  if (status.pendingJudgeInvocationId !== null) lines.push(`Pending Judge: ${status.pendingJudgeInvocationId}`);
  if (status.stopReason !== null) lines.push(`Stop reason: ${status.stopReason}`);
  if (status.evidenceFingerprint !== null) lines.push(`Evidence fingerprint: ${status.evidenceFingerprint}`);
  if (status.resumeCondition !== null) lines.push(`Resume condition: ${status.resumeCondition}`);
  return lines.join("\n");
}

export function replayLoopMonitorPartition(
  repository: LoopMonitorRepository,
  graph: CompiledLoopMonitorGraph,
  partition: LoopMonitorPartition,
): {
  readonly projection: LoopMonitorRuntimeProjection;
  readonly status: LoopMonitorStatusEnvelope;
  readonly eventSetCount: number;
} {
  if (partition.graphRevision !== graph.graphRevision) {
    throw new Error("loop-monitor-replay-graph-revision-mismatch");
  }
  const monitor = graph.loopMonitors.find((candidate) => candidate.id === partition.monitorId);
  if (monitor === undefined) throw new Error("loop-monitor-replay-monitor-not-found");
  const sets = repository.readEventSets(partition);
  const projection = foldLoopMonitorEventSets(sets, partition, monitor);
  return {
    projection,
    status: projectLoopMonitorStatus(projection, monitor),
    eventSetCount: sets.length,
  };
}

export function createLoopMonitorCoordinator(options: {
  readonly graph: CompiledLoopMonitorGraph;
  readonly repository: LoopMonitorRepository;
}): LoopMonitorCoordinator {
  const { graph, repository } = options;

  function resolve(partition: LoopMonitorPartition): CompiledLoopMonitor | null {
    if (partition.graphRevision !== graph.graphRevision) return null;
    return graph.loopMonitors.find((monitor) => monitor.id === partition.monitorId) ?? null;
  }

  function read(partition: LoopMonitorPartition): LoopMonitorRuntimeProjection {
    const monitor = resolve(partition);
    if (monitor === null) throw new Error("loop-monitor-partition-not-in-compiled-graph");
    return foldLoopMonitorEventSets(repository.readEventSets(partition), partition, monitor);
  }

  function appendAwaitingHuman(
    partition: LoopMonitorPartition,
    monitor: CompiledLoopMonitor,
    reservation: LoopJudgeReservation,
    reason: string,
  ): LoopMonitorCoordinatorResult {
    return repository.transaction(partition, (sets, append) => {
      const current = foldLoopMonitorEventSets(sets, partition, monitor);
      if (current.awaitingHumanReason !== null) {
        return { kind: "AWAITING_HUMAN", reason: current.awaitingHumanReason, projection: current };
      }
      append(eventSet(partition, `judge-awaiting:${reservation.invocationId}`, reason, [{
        type: "LOOP_JUDGE_AWAITING_HUMAN",
        invocationId: reservation.invocationId,
        reason,
      }]));
      return { kind: "AWAITING_HUMAN", reason, projection: read(partition) };
    });
  }

  function completeJudgeResult(
    partition: LoopMonitorPartition,
    monitor: CompiledLoopMonitor,
    result: JudgeResult,
  ): LoopMonitorCoordinatorResult {
    return repository.transaction(partition, (sets, append) => {
      const current = foldLoopMonitorEventSets(sets, partition, monitor);
      const reservation = current.pendingJudge;
      if (reservation === null) {
        if (current.lastCompletedInvocationId === result.invocationId && current.lastRouteId !== null) {
          return { kind: "route-applied", routeId: current.lastRouteId, projection: current };
        }
        return { kind: "CONFLICT", reason: "judge-invocation-not-pending" };
      }
      const observed: LoopMonitorEvent = { type: "LOOP_JUDGE_RESULT_OBSERVED", result };
      if (!matchingJudgeResult(monitor, reservation, result)) {
        append(eventSet(partition, `judge-result-observed:${reservation.invocationId}`, result, [observed]));
        return { kind: "CONFLICT", reason: "judge-result-mismatch" };
      }
      const route = routeById(monitor, result.routeId);
      if (route === null) return { kind: "CONFLICT", reason: "judge-result-mismatch" };
      const events: LoopMonitorEvent[] = [
        observed,
        { type: "LOOP_JUDGE_COMPLETED", invocationId: reservation.invocationId, routeId: result.routeId },
        {
          type: "LOOP_ROUTE_APPLIED",
          invocationId: reservation.invocationId,
          routeId: result.routeId,
          targetEvent: route.kind === "transition" ? route.targetEvent : null,
        },
      ];
      if (route.kind === "park") {
        events.push({
          type: "LOOP_LATCH_SET",
          latch: {
            monitorId: monitor.id,
            epoch: reservation.epoch,
            evidenceFingerprint: reservation.evidenceFingerprint,
            invocationId: reservation.invocationId,
            routeId: route.id,
            reasonCode: route.reasonCode,
            resumeCondition: route.resumeCondition,
          },
        });
      }
      append(eventSet(partition, `judge-complete:${reservation.invocationId}`, result, events));
      const projection = read(partition);
      return route.kind === "park"
        ? {
            kind: "latched",
            reasonCode: route.reasonCode,
            resumeCondition: route.resumeCondition,
            evidenceFingerprint: reservation.evidenceFingerprint,
            projection,
          }
        : { kind: "route-applied", routeId: route.id, projection };
    });
  }

  function dispatch(
    permit: CommittedJudgeDispatchPermit,
    port: JudgePort,
  ): LoopMonitorCoordinatorResult {
    const monitor = resolve(permit.partition);
    if (monitor === null) return { kind: "CONFLICT", reason: "partition-not-in-compiled-graph" };
    const receipt: LoopMonitorCommitReceipt = {
      receiptId: permit.receiptId,
      eventSetId: permit.eventSetId,
      eventSetDigest: permit.eventSetDigest,
      partitionKey: loopMonitorPartitionKey(permit.partition),
    };
    if (!repository.isCommitted(receipt)) {
      return { kind: "CONFLICT", reason: "dispatch-permit-not-committed" };
    }
    const projection = read(permit.partition);
    const reservation = projection.pendingJudge;
    if (reservation === null || reservation.invocationId !== permit.invocationId) {
      return { kind: "CONFLICT", reason: "dispatch-permit-invocation-mismatch" };
    }
    const outcome = port.dispatch(judgeRequest(monitor, reservation));
    if (outcome.kind === "completed") {
      return completeJudgeResult(permit.partition, monitor, outcome.result);
    }
    return { kind: "pending", projection };
  }

  return {
    observeDelivery(delivery) {
      const monitor = resolve(delivery.partition);
      if (monitor === null) return { kind: "CONFLICT", reason: "partition-not-in-compiled-graph" };
      try {
        return repository.transaction(delivery.partition, (sets, append) => {
          let current = foldLoopMonitorEventSets(sets, delivery.partition, monitor);
          const replayDecision = deliveryReplayDecision(sets, delivery);
          if (replayDecision === "duplicate") return { kind: "duplicate", projection: current };
          if (replayDecision === "identity-conflict") {
            return { kind: "CONFLICT", reason: "upstream-identity-payload-conflict" };
          }
          if (replayDecision === "causal-fork") return { kind: "CONFLICT", reason: "causal-fork" };
          if (current.latch?.evidenceFingerprint === delivery.evidence.fingerprint) {
            return {
              kind: "latched",
              reasonCode: current.latch.reasonCode,
              resumeCondition: current.latch.resumeCondition,
              evidenceFingerprint: current.latch.evidenceFingerprint,
              projection: current,
            };
          }
          const prefixEvents: LoopMonitorEvent[] = [];
          if (current.latch !== null) {
            prefixEvents.push(
              {
                type: "LOOP_LATCH_CLEARED",
                monitorId: monitor.id,
                priorEvidenceFingerprint: current.latch.evidenceFingerprint,
                basis: "evidence-change",
                humanTurnId: null,
              },
              { type: "WORKFLOW_UNPARKED", monitorId: monitor.id, reasonCode: current.latch.reasonCode },
            );
            current = { ...current, latch: null };
          }
          const decision = applyLoopDelivery(current, monitor, delivery);
          if (!decision.ok) return { kind: decision.status, reason: decision.reason };
          if (decision.duplicate) return { kind: "duplicate", projection: current };
          const events: LoopMonitorEvent[] = [...prefixEvents, { type: "LOOP_DELIVERY_OBSERVED", delivery }];
          if (decision.judgeReservation !== null) {
            events.push(
              { type: "LOOP_MONITOR_TRIGGERED", reservation: decision.judgeReservation },
              { type: "LOOP_JUDGE_STARTED", reservation: decision.judgeReservation },
            );
          }
          const set = eventSet(
            delivery.partition,
            `delivery:${delivery.upstreamEventIdentity}`,
            delivery.payloadFingerprint,
            events,
          );
          const receipt = append(set);
          const projection = read(delivery.partition);
          if (decision.judgeReservation !== null) {
            return {
              kind: "judge-reserved",
              invocationId: decision.judgeReservation.invocationId,
              permit: committedPermit(delivery.partition, decision.judgeReservation.invocationId, receipt),
              projection,
            };
          }
          return { kind: decision.pending ? "pending" : "observed", projection };
        });
      } catch (cause) {
        return { kind: "INCOMPLETE", reason: `canonical-write-failed:${cause instanceof Error ? cause.message : String(cause)}` };
      }
    },

    dispatchJudge: dispatch,

    resumeJudge(partition, port) {
      const monitor = resolve(partition);
      if (monitor === null) return { kind: "CONFLICT", reason: "partition-not-in-compiled-graph" };
      const projection = read(partition);
      const reservation = projection.pendingJudge;
      if (reservation === null) return { kind: "CONFLICT", reason: "judge-invocation-not-pending" };
      if (projection.awaitingHumanReason !== null) {
        return { kind: "AWAITING_HUMAN", reason: projection.awaitingHumanReason, projection };
      }
      const reconciled = port.reconcile(judgeRequest(monitor, reservation));
      if (reconciled.kind === "completed") {
        return completeJudgeResult(partition, monitor, reconciled.result);
      }
      if (reconciled.kind === "effect-possible" || reconciled.kind === "unknown") {
        return appendAwaitingHuman(
          partition,
          monitor,
          reservation,
          reconciled.kind === "effect-possible" ? "judge-effect-possible" : "judge-effect-unknown",
        );
      }
      if (projection.judgeRedispatchAttempts >= 1) {
        return appendAwaitingHuman(partition, monitor, reservation, "judge-redispatch-exhausted");
      }
      return repository.transaction(partition, (sets, append) => {
        const current = foldLoopMonitorEventSets(sets, partition, monitor);
        if (current.judgeRedispatchAttempts >= 1) {
          return appendAwaitingHuman(partition, monitor, reservation, "judge-redispatch-exhausted");
        }
        const set = eventSet(partition, `judge-redispatch:${reservation.invocationId}`, reconciled, [{
          type: "LOOP_JUDGE_ATTEMPT_STARTED",
          invocationId: reservation.invocationId,
          attempt: 1,
          attestationId: reconciled.attestationId,
          trace: { ...reservation.trace },
        }]);
        const receipt = append(set);
        return dispatch(committedPermit(partition, reservation.invocationId, receipt), port);
      });
    },

    clearLatch(request) {
      const monitor = resolve(request.partition);
      if (monitor === null) return { kind: "CONFLICT", reason: "partition-not-in-compiled-graph" };
      return repository.transaction(request.partition, (sets, append) => {
        const current = foldLoopMonitorEventSets(sets, request.partition, monitor);
        if (current.latch === null) return { kind: "CONFLICT", reason: "latch-not-set" };
        const evidenceChanged = request.evidenceFingerprint !== undefined &&
          request.evidenceFingerprint !== current.latch.evidenceFingerprint;
        const humanRetry = request.humanRetry?.verified === true &&
          request.humanRetry.eventType === "HUMAN_TURN";
        if (!evidenceChanged && !humanRetry) {
          return { kind: "CONFLICT", reason: "latch-clear-not-authorized" };
        }
        const basis = evidenceChanged ? "evidence-change" as const : "human-retry" as const;
        append(eventSet(request.partition, `latch-clear:${current.latch.invocationId}:${basis}`, request, [
          {
            type: "LOOP_LATCH_CLEARED",
            monitorId: monitor.id,
            priorEvidenceFingerprint: current.latch.evidenceFingerprint,
            basis,
            humanTurnId: request.humanRetry?.turnId ?? null,
          },
          { type: "WORKFLOW_UNPARKED", monitorId: monitor.id, reasonCode: current.latch.reasonCode },
        ]));
        return { kind: "cleared", projection: read(request.partition) };
      });
    },

    authorizeLiveSmoke(partition, scopeDigest, port) {
      if (resolve(partition) === null) return { kind: "CONFLICT", reason: "partition-not-in-compiled-graph" };
      const authorization = port.authorize({
        intentUuid: partition.intentUuid,
        monitorId: partition.monitorId,
        scopeDigest,
      });
      if (!authorization.authorized) return { kind: "CONFLICT", reason: authorization.reason };
      return repository.transaction(partition, (_sets, append) => {
        const receipt = append(eventSet(partition, `live-smoke:${authorization.authorizationId}`, authorization, [{
          type: "LIVE_SMOKE_AUTHORIZED",
          authorizationId: authorization.authorizationId,
          actorId: authorization.actorId,
          scopeDigest,
        }]));
        return { kind: "authorized", receipt };
      });
    },

    readProjection: read,
  };
}
