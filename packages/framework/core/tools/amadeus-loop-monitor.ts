// Harness-neutral declarative Loop Monitor contract (#2095).
//
// This module is deliberately pure. It validates and compiles workflow-level
// monitor declarations, creates content-addressed deliveries, and folds one
// causally ordered partition. Durable audit/index writes and Judge dispatch are
// owned by amadeus-loop-monitor-runtime.ts.

import { createHash } from "node:crypto";

export type LoopMonitorStatus = "CONFLICT" | "INCOMPLETE";

export interface LoopMonitorCompileError {
  readonly code:
    | "INVALID_MANIFEST"
    | "INVALID_CONTRIBUTION"
    | "UNKNOWN_FIELD"
    | "UNKNOWN_REFERENCE";
  readonly path: string;
  readonly message: string;
}

export interface EvidenceProviderDescriptor {
  readonly id: string;
}

export interface JudgeInstructionDescriptor {
  readonly id: string;
}

export type JudgeRouteDescriptor =
  | {
      readonly id: string;
      readonly kind: "transition";
      readonly targetEvent: string;
    }
  | {
      readonly id: string;
      readonly kind: "park";
      readonly reasonCode: string;
      readonly resumeCondition: string;
    };

export interface LoopMonitorContributions {
  readonly evidenceProviders: readonly EvidenceProviderDescriptor[];
  readonly judgeInstructions: readonly JudgeInstructionDescriptor[];
  readonly routes: readonly JudgeRouteDescriptor[];
}

export interface LoopMonitorRuntimeLimits {
  readonly maxPendingDeliveries: number;
}

export interface JudgeRouteConstraint {
  readonly routeIds: readonly string[];
  readonly fingerprint: string;
}

export interface CompiledLoopMonitor {
  readonly id: string;
  readonly cycle: readonly string[];
  readonly ignoreEvents: readonly string[];
  readonly threshold: number;
  readonly evidenceProvider: EvidenceProviderDescriptor;
  readonly judgeInstruction: JudgeInstructionDescriptor;
  readonly routes: readonly JudgeRouteDescriptor[];
  readonly routeConstraint: JudgeRouteConstraint;
  readonly transitionTable: Readonly<Record<string, readonly string[]>>;
  readonly runtimeLimits: LoopMonitorRuntimeLimits;
}

export interface CompiledLoopMonitorGraph {
  readonly schemaVersion: 1;
  readonly graphRevision: string;
  readonly runtimeLimits: LoopMonitorRuntimeLimits;
  readonly loopMonitors: readonly CompiledLoopMonitor[];
}

export type LoopMonitorCompileResult =
  | { readonly ok: true; readonly graph: CompiledLoopMonitorGraph }
  | { readonly ok: false; readonly errors: readonly LoopMonitorCompileError[] };

interface LoopMonitorAuthoring {
  readonly id: string;
  readonly cycle: readonly string[];
  readonly ignoreEvents: readonly string[];
  readonly threshold: number;
  readonly evidenceProviderId: string;
  readonly judgeInstructionId: string;
  readonly routes: readonly string[];
  readonly transitionTable: Readonly<Record<string, readonly string[]>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytewise(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort(bytewise).map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function digest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function error(
  errors: LoopMonitorCompileError[],
  code: LoopMonitorCompileError["code"],
  path: string,
  message: string,
): void {
  errors.push({ code, path, message });
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: LoopMonitorCompileError[],
): void {
  const allow = new Set(allowed);
  for (const field of Object.keys(value)) {
    if (!allow.has(field)) error(errors, "UNKNOWN_FIELD", `${path}.${field}`, `unknown field "${field}"`);
  }
}

function nonEmptyString(
  value: unknown,
  path: string,
  errors: LoopMonitorCompileError[],
): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  error(errors, "INVALID_MANIFEST", path, "must be a non-empty string");
  return null;
}

function uniqueStringArray(
  value: unknown,
  path: string,
  errors: LoopMonitorCompileError[],
  allowEmpty: boolean,
): readonly string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    error(errors, "INVALID_MANIFEST", path, "must be an array of non-empty strings");
    return null;
  }
  if (!allowEmpty && value.length === 0) {
    error(errors, "INVALID_MANIFEST", path, "must not be empty");
    return null;
  }
  if (new Set(value).size !== value.length) {
    error(errors, "INVALID_MANIFEST", path, "must contain unique values");
    return null;
  }
  return [...value];
}

function positiveInteger(
  value: unknown,
  path: string,
  errors: LoopMonitorCompileError[],
): number | null {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0) {
    return value;
  }
  error(errors, "INVALID_MANIFEST", path, "must be a positive finite integer");
  return null;
}

function parseTransitionTable(
  value: unknown,
  path: string,
  errors: LoopMonitorCompileError[],
): Readonly<Record<string, readonly string[]>> | null {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    error(errors, "INVALID_MANIFEST", path, "must be a non-empty transition object");
    return null;
  }
  const table = Object.create(null) as Record<string, readonly string[]>;
  for (const eventId of Object.keys(value).sort(bytewise)) {
    if (eventId.length === 0) {
      error(errors, "INVALID_MANIFEST", path, "transition event id must not be empty");
      continue;
    }
    const next = uniqueStringArray(value[eventId], `${path}.${eventId}`, errors, true);
    if (next !== null) table[eventId] = next;
  }
  return table;
}

function parseMonitor(
  value: unknown,
  index: number,
  errors: LoopMonitorCompileError[],
): LoopMonitorAuthoring | null {
  const path = `loopMonitors[${index}]`;
  if (!isRecord(value)) {
    error(errors, "INVALID_MANIFEST", path, "must be an object");
    return null;
  }
  rejectUnknownFields(value, [
    "id",
    "cycle",
    "ignoreEvents",
    "threshold",
    "evidenceProviderId",
    "judgeInstructionId",
    "routes",
    "transitionTable",
  ], path, errors);
  const id = nonEmptyString(value.id, `${path}.id`, errors);
  const cycle = uniqueStringArray(value.cycle, `${path}.cycle`, errors, false);
  const ignoreEvents = uniqueStringArray(value.ignoreEvents, `${path}.ignoreEvents`, errors, true);
  const threshold = positiveInteger(value.threshold, `${path}.threshold`, errors);
  const evidenceProviderId = nonEmptyString(value.evidenceProviderId, `${path}.evidenceProviderId`, errors);
  const judgeInstructionId = nonEmptyString(value.judgeInstructionId, `${path}.judgeInstructionId`, errors);
  const routes = uniqueStringArray(value.routes, `${path}.routes`, errors, false);
  const transitionTable = parseTransitionTable(value.transitionTable, `${path}.transitionTable`, errors);
  if (
    id === null || cycle === null || ignoreEvents === null || threshold === null ||
    evidenceProviderId === null || judgeInstructionId === null || routes === null ||
    transitionTable === null
  ) return null;
  const overlap = ignoreEvents.filter((eventId) => cycle.includes(eventId));
  if (overlap.length > 0) {
    error(errors, "INVALID_MANIFEST", `${path}.ignoreEvents`, `must not intersect cycle: ${overlap.join(", ")}`);
  }
  for (const eventId of cycle) {
    if (!Object.hasOwn(transitionTable, eventId)) {
      error(errors, "UNKNOWN_REFERENCE", `${path}.transitionTable`, `cycle event "${eventId}" has no transition row`);
    }
  }
  const knownEvents = new Set([...Object.keys(transitionTable), ...ignoreEvents]);
  for (const [eventId, nextEvents] of Object.entries(transitionTable)) {
    for (const nextEvent of nextEvents) {
      if (!knownEvents.has(nextEvent)) {
        error(errors, "UNKNOWN_REFERENCE", `${path}.transitionTable.${eventId}`, `unknown transition event "${nextEvent}"`);
      }
    }
  }
  return {
    id,
    cycle,
    ignoreEvents,
    threshold,
    evidenceProviderId,
    judgeInstructionId,
    routes,
    transitionTable,
  };
}

function descriptorMap<T extends { readonly id: string }>(
  descriptors: readonly T[],
  path: string,
  errors: LoopMonitorCompileError[],
): Map<string, T> {
  const result = new Map<string, T>();
  for (const [index, descriptor] of descriptors.entries()) {
    if (!isRecord(descriptor) || typeof descriptor.id !== "string" || descriptor.id.length === 0) {
      error(errors, "INVALID_CONTRIBUTION", `${path}[${index}]`, "descriptor id must be a non-empty string");
      continue;
    }
    if (result.has(descriptor.id)) {
      error(errors, "INVALID_CONTRIBUTION", `${path}[${index}].id`, `duplicate descriptor "${descriptor.id}"`);
      continue;
    }
    result.set(descriptor.id, descriptor);
  }
  return result;
}

function validateRouteDescriptor(
  route: JudgeRouteDescriptor,
  path: string,
  errors: LoopMonitorCompileError[],
): void {
  const allowed = route.kind === "transition"
    ? ["id", "kind", "targetEvent"]
    : ["id", "kind", "reasonCode", "resumeCondition"];
  rejectUnknownFields(route as unknown as Record<string, unknown>, allowed, path, errors);
  if (route.kind === "transition") {
    nonEmptyString(route.targetEvent, `${path}.targetEvent`, errors);
  } else if (route.kind === "park") {
    nonEmptyString(route.reasonCode, `${path}.reasonCode`, errors);
    nonEmptyString(route.resumeCondition, `${path}.resumeCondition`, errors);
  } else {
    error(errors, "INVALID_CONTRIBUTION", `${path}.kind`, "route kind must be transition or park");
  }
}

export function compileLoopMonitorManifest(
  value: unknown,
  contributions: LoopMonitorContributions,
): LoopMonitorCompileResult {
  const errors: LoopMonitorCompileError[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: [{ code: "INVALID_MANIFEST", path: "$", message: "manifest must be an object" }] };
  }
  rejectUnknownFields(value, ["loopMonitors", "runtimeLimits"], "$", errors);
  if (!Array.isArray(value.loopMonitors) || value.loopMonitors.length === 0) {
    error(errors, "INVALID_MANIFEST", "loopMonitors", "must be a non-empty array");
  }
  if (!isRecord(value.runtimeLimits)) {
    error(errors, "INVALID_MANIFEST", "runtimeLimits", "must be an object");
  }
  const runtimeLimits = isRecord(value.runtimeLimits)
    ? (() => {
        rejectUnknownFields(value.runtimeLimits, ["maxPendingDeliveries"], "runtimeLimits", errors);
        const maxPendingDeliveries = positiveInteger(
          value.runtimeLimits.maxPendingDeliveries,
          "runtimeLimits.maxPendingDeliveries",
          errors,
        );
        return maxPendingDeliveries === null ? null : { maxPendingDeliveries };
      })()
    : null;
  const authoring = Array.isArray(value.loopMonitors)
    ? value.loopMonitors.map((monitor, index) => parseMonitor(monitor, index, errors))
    : [];
  const monitorIds = authoring.flatMap((monitor) => monitor === null ? [] : [monitor.id]);
  if (new Set(monitorIds).size !== monitorIds.length) {
    error(errors, "INVALID_MANIFEST", "loopMonitors", "monitor ids must be unique");
  }

  const evidenceProviders = descriptorMap(contributions.evidenceProviders, "contributions.evidenceProviders", errors);
  const judgeInstructions = descriptorMap(contributions.judgeInstructions, "contributions.judgeInstructions", errors);
  const routes = descriptorMap(contributions.routes, "contributions.routes", errors);
  contributions.routes.forEach((route, index) => {
    validateRouteDescriptor(route, `contributions.routes[${index}]`, errors);
  });

  const compiled: CompiledLoopMonitor[] = [];
  if (runtimeLimits !== null) {
    for (const [index, monitor] of authoring.entries()) {
      if (monitor === null) continue;
      const evidenceProvider = evidenceProviders.get(monitor.evidenceProviderId);
      const judgeInstruction = judgeInstructions.get(monitor.judgeInstructionId);
      const selectedRoutes = monitor.routes.map((id) => routes.get(id));
      if (evidenceProvider === undefined) {
        error(errors, "UNKNOWN_REFERENCE", `loopMonitors[${index}].evidenceProviderId`, `unknown evidence provider "${monitor.evidenceProviderId}"`);
      }
      if (judgeInstruction === undefined) {
        error(errors, "UNKNOWN_REFERENCE", `loopMonitors[${index}].judgeInstructionId`, `unknown Judge instruction "${monitor.judgeInstructionId}"`);
      }
      selectedRoutes.forEach((route, routeIndex) => {
        if (route === undefined) {
          error(errors, "UNKNOWN_REFERENCE", `loopMonitors[${index}].routes[${routeIndex}]`, `unknown route "${monitor.routes[routeIndex]}"`);
        } else if (route.kind === "transition" && !Object.hasOwn(monitor.transitionTable, route.targetEvent)) {
          error(errors, "UNKNOWN_REFERENCE", `loopMonitors[${index}].routes[${routeIndex}]`, `route target "${route.targetEvent}" has no transition row`);
        }
      });
      if (evidenceProvider === undefined || judgeInstruction === undefined || selectedRoutes.some((route) => route === undefined)) {
        continue;
      }
      const exactRoutes = selectedRoutes as JudgeRouteDescriptor[];
      const routeConstraint: JudgeRouteConstraint = {
        routeIds: [...monitor.routes],
        fingerprint: digest(exactRoutes),
      };
      compiled.push({
        id: monitor.id,
        cycle: [...monitor.cycle],
        ignoreEvents: [...monitor.ignoreEvents],
        threshold: monitor.threshold,
        evidenceProvider,
        judgeInstruction,
        routes: exactRoutes,
        routeConstraint,
        transitionTable: monitor.transitionTable,
        runtimeLimits,
      });
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors: errors.sort((a, b) => bytewise(`${a.path}:${a.message}`, `${b.path}:${b.message}`)) };
  }
  const revisionInput = { schemaVersion: 1, runtimeLimits, loopMonitors: compiled };
  return {
    ok: true,
    graph: {
      schemaVersion: 1,
      graphRevision: digest(revisionInput),
      runtimeLimits: runtimeLimits as LoopMonitorRuntimeLimits,
      loopMonitors: compiled,
    },
  };
}

export interface LoopMonitorPartition {
  readonly intentUuid: string;
  readonly monitorId: string;
  readonly stageInstanceId: string;
  readonly graphRevision: string;
}

export interface EvidenceSnapshot {
  readonly fingerprint: string;
  readonly obligationIds: readonly string[];
}

export interface LoopTraceContext {
  readonly traceId: string;
  readonly spanId: string;
}

export interface LoopDeliveryPayload {
  readonly stageId: string;
  readonly references: readonly {
    readonly kind: string;
    readonly id: string;
    readonly digest: string;
  }[];
}

export interface LoopDelivery {
  readonly deliveryId: string;
  readonly partition: LoopMonitorPartition;
  readonly eventId: string;
  readonly predecessorDeliveryId: string | null;
  readonly upstreamEventIdentity: string;
  readonly payloadFingerprint: string;
  readonly payload: LoopDeliveryPayload;
  readonly evidence: EvidenceSnapshot;
  readonly routeConstraint: JudgeRouteConstraint;
  readonly trace: LoopTraceContext;
}

export type CreateLoopDeliveryInput = Omit<LoopDelivery, "deliveryId">;

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const TRACE_ID = /^[0-9a-f]{32}$/;
const SPAN_ID = /^[0-9a-f]{16}$/;

function assertSafeId(value: string, field: string): void {
  if (!SAFE_ID.test(value)) throw new Error(`unsafe-loop-delivery:${field}`);
}

function validateSafeDeliveryInput(input: CreateLoopDeliveryInput): void {
  assertSafeId(input.partition.intentUuid, "intentUuid");
  assertSafeId(input.partition.monitorId, "monitorId");
  assertSafeId(input.partition.stageInstanceId, "stageInstanceId");
  assertSafeId(input.partition.graphRevision, "graphRevision");
  assertSafeId(input.eventId, "eventId");
  assertSafeId(input.upstreamEventIdentity, "upstreamEventIdentity");
  assertSafeId(input.payload.stageId, "payload.stageId");
  if (!SHA256.test(input.payloadFingerprint)) throw new Error("unsafe-loop-delivery:payloadFingerprint");
  if (!SHA256.test(input.evidence.fingerprint)) throw new Error("unsafe-loop-delivery:evidenceFingerprint");
  if (!SHA256.test(input.routeConstraint.fingerprint)) throw new Error("unsafe-loop-delivery:constraintFingerprint");
  if (!TRACE_ID.test(input.trace.traceId) || !SPAN_ID.test(input.trace.spanId)) {
    throw new Error("unsafe-loop-delivery:trace");
  }
  input.evidence.obligationIds.forEach((id) => {
    assertSafeId(id, "evidence.obligationId");
  });
  input.routeConstraint.routeIds.forEach((id) => {
    assertSafeId(id, "routeConstraint.routeId");
  });
  input.payload.references.forEach((reference) => {
    assertSafeId(reference.kind, "payload.reference.kind");
    assertSafeId(reference.id, "payload.reference.id");
    if (!SHA256.test(reference.digest)) throw new Error("unsafe-loop-delivery:payload.reference.digest");
  });
}

function immutableDelivery(input: CreateLoopDeliveryInput, deliveryId: string): LoopDelivery {
  return {
    deliveryId,
    partition: { ...input.partition },
    eventId: input.eventId,
    predecessorDeliveryId: input.predecessorDeliveryId,
    upstreamEventIdentity: input.upstreamEventIdentity,
    payloadFingerprint: input.payloadFingerprint,
    payload: {
      stageId: input.payload.stageId,
      references: input.payload.references.map((reference) => ({ ...reference })),
    },
    evidence: {
      fingerprint: input.evidence.fingerprint,
      obligationIds: [...input.evidence.obligationIds],
    },
    routeConstraint: {
      routeIds: [...input.routeConstraint.routeIds],
      fingerprint: input.routeConstraint.fingerprint,
    },
    trace: { ...input.trace },
  };
}

export function createLoopDelivery(input: CreateLoopDeliveryInput): LoopDelivery {
  validateSafeDeliveryInput(input);
  const deliveryId = `delivery-${digest([
    input.partition,
    input.upstreamEventIdentity,
    input.payloadFingerprint,
  ]).slice("sha256:".length)}`;
  return immutableDelivery(input, deliveryId);
}

export interface LoopJudgeReservation {
  readonly invocationId: string;
  readonly monitorId: string;
  readonly epoch: number;
  readonly triggerDeliveryId: string;
  readonly graphRevision: string;
  readonly evidenceFingerprint: string;
  readonly constraintFingerprint: string;
  readonly trace: LoopTraceContext;
}

export interface LoopLatch {
  readonly monitorId: string;
  readonly epoch: number;
  readonly evidenceFingerprint: string;
  readonly invocationId: string;
  readonly routeId: string;
  readonly reasonCode: string;
  readonly resumeCondition: string;
}

export interface LoopMonitorProjection {
  readonly partition: LoopMonitorPartition;
  readonly chainHead: string | null;
  readonly lastSemanticEventId: string | null;
  readonly matchedPrefix: number;
  readonly cycleCount: number;
  readonly epoch: number;
  readonly history: readonly LoopDelivery[];
  readonly pending: readonly LoopDelivery[];
  readonly pendingJudge: LoopJudgeReservation | null;
  readonly latch: LoopLatch | null;
}

export function createLoopMonitorProjection(
  partition: LoopMonitorPartition,
  _monitor: CompiledLoopMonitor,
): LoopMonitorProjection {
  return {
    partition: { ...partition },
    chainHead: null,
    lastSemanticEventId: null,
    matchedPrefix: 0,
    cycleCount: 0,
    epoch: 0,
    history: [],
    pending: [],
    pendingJudge: null,
    latch: null,
  };
}

export type LoopDeliveryResult =
  | {
      readonly ok: true;
      readonly projection: LoopMonitorProjection;
      readonly duplicate: boolean;
      readonly pending: boolean;
      readonly judgeReservation: LoopJudgeReservation | null;
    }
  | {
      readonly ok: false;
      readonly status: LoopMonitorStatus;
      readonly reason: string;
    };

function samePartition(a: LoopMonitorPartition, b: LoopMonitorPartition): boolean {
  return a.intentUuid === b.intentUuid && a.monitorId === b.monitorId &&
    a.stageInstanceId === b.stageInstanceId && a.graphRevision === b.graphRevision;
}

function knownDelivery(projection: LoopMonitorProjection, delivery: LoopDelivery): LoopDelivery | undefined {
  return [...projection.history, ...projection.pending].find(
    (candidate) => candidate.upstreamEventIdentity === delivery.upstreamEventIdentity,
  );
}

function edgeConflict(projection: LoopMonitorProjection, delivery: LoopDelivery): boolean {
  return [...projection.history, ...projection.pending].some((candidate) =>
    candidate.predecessorDeliveryId === delivery.predecessorDeliveryId &&
    candidate.deliveryId !== delivery.deliveryId
  );
}

function historyLimit(monitor: CompiledLoopMonitor): number {
  // This is the pattern-matching window, not the durable idempotency index.
  // Runtime duplicate and causal-fork checks scan all committed event sets.
  return Math.max(monitor.threshold + 1, monitor.cycle.length + 1);
}

function reserveJudge(
  projection: LoopMonitorProjection,
  monitor: CompiledLoopMonitor,
  delivery: LoopDelivery,
): LoopJudgeReservation {
  const invocationId = `judge-${digest([
    projection.partition.intentUuid,
    monitor.id,
    projection.epoch,
    delivery.deliveryId,
    projection.partition.graphRevision,
    delivery.evidence.fingerprint,
    delivery.routeConstraint.fingerprint,
  ]).slice("sha256:".length)}`;
  return {
    invocationId,
    monitorId: monitor.id,
    epoch: projection.epoch,
    triggerDeliveryId: delivery.deliveryId,
    graphRevision: projection.partition.graphRevision,
    evidenceFingerprint: delivery.evidence.fingerprint,
    constraintFingerprint: delivery.routeConstraint.fingerprint,
    trace: { ...delivery.trace },
  };
}

function applySemanticEvent(
  projection: LoopMonitorProjection,
  monitor: CompiledLoopMonitor,
  delivery: LoopDelivery,
): LoopDeliveryResult {
  if (!Object.hasOwn(monitor.transitionTable, delivery.eventId) && !monitor.ignoreEvents.includes(delivery.eventId)) {
    return { ok: false, status: "CONFLICT", reason: "unknown-event" };
  }
  const appendedHistory = [...projection.history, delivery].slice(-historyLimit(monitor));
  if (monitor.ignoreEvents.includes(delivery.eventId)) {
    return {
      ok: true,
      projection: { ...projection, chainHead: delivery.deliveryId, history: appendedHistory },
      duplicate: false,
      pending: false,
      judgeReservation: null,
    };
  }
  if (projection.lastSemanticEventId !== null) {
    const allowed = monitor.transitionTable[projection.lastSemanticEventId] ?? [];
    if (!allowed.includes(delivery.eventId)) {
      return { ok: false, status: "CONFLICT", reason: "invalid-transition" };
    }
  }

  const head = monitor.cycle[0]!;
  let matchedPrefix = projection.matchedPrefix;
  let cycleCount = projection.cycleCount;
  let epoch = projection.epoch;
  let judgeReservation: LoopJudgeReservation | null = null;
  const expected = matchedPrefix < monitor.cycle.length ? monitor.cycle[matchedPrefix] : head;
  if (delivery.eventId === expected) {
    if (matchedPrefix === monitor.cycle.length) {
      cycleCount += 1;
      matchedPrefix = 1;
      if (cycleCount >= monitor.threshold && projection.pendingJudge === null) {
        judgeReservation = reserveJudge(projection, monitor, delivery);
      }
    } else {
      matchedPrefix += 1;
    }
  } else {
    const wasTracking = matchedPrefix > 0 || cycleCount > 0;
    matchedPrefix = delivery.eventId === head ? 1 : 0;
    cycleCount = 0;
    if (wasTracking) epoch += 1;
  }
  const nextProjection: LoopMonitorProjection = {
    ...projection,
    chainHead: delivery.deliveryId,
    lastSemanticEventId: delivery.eventId,
    matchedPrefix,
    cycleCount,
    epoch,
    history: appendedHistory,
    pendingJudge: judgeReservation ?? projection.pendingJudge,
  };
  return {
    ok: true,
    projection: nextProjection,
    duplicate: false,
    pending: false,
    judgeReservation,
  };
}

function drainPending(
  initial: LoopDeliveryResult & { readonly ok: true },
  monitor: CompiledLoopMonitor,
): LoopDeliveryResult {
  let result: LoopDeliveryResult = initial;
  while (true) {
    if (!result.ok) return result;
    const projection = result.projection;
    const ready = projection.pending.filter(
      (delivery) => delivery.predecessorDeliveryId === projection.chainHead,
    );
    if (ready.length === 0) return result;
    if (ready.length > 1) return { ok: false, status: "CONFLICT", reason: "causal-fork" };
    const [next] = ready;
    if (next === undefined) return result;
    const without = {
      ...projection,
      pending: projection.pending.filter((delivery) => delivery.deliveryId !== next.deliveryId),
    };
    const applied = applySemanticEvent(without, monitor, next);
    if (!applied.ok) return applied;
    result = {
      ...applied,
      judgeReservation: applied.judgeReservation ?? result.judgeReservation,
    };
  }
}

export function applyLoopDelivery(
  projection: LoopMonitorProjection,
  monitor: CompiledLoopMonitor,
  delivery: LoopDelivery,
): LoopDeliveryResult {
  if (!samePartition(projection.partition, delivery.partition) || delivery.partition.monitorId !== monitor.id) {
    return { ok: false, status: "CONFLICT", reason: "partition-mismatch" };
  }
  if (delivery.routeConstraint.fingerprint !== monitor.routeConstraint.fingerprint) {
    return { ok: false, status: "CONFLICT", reason: "route-constraint-mismatch" };
  }
  const known = knownDelivery(projection, delivery);
  if (known !== undefined) {
    if (known.deliveryId === delivery.deliveryId && known.payloadFingerprint === delivery.payloadFingerprint) {
      return { ok: true, projection, duplicate: true, pending: false, judgeReservation: null };
    }
    return { ok: false, status: "CONFLICT", reason: "delivery-identity-payload-conflict" };
  }
  if (edgeConflict(projection, delivery)) {
    return { ok: false, status: "CONFLICT", reason: "causal-fork" };
  }
  const predecessorMatches = delivery.predecessorDeliveryId === projection.chainHead;
  if (!predecessorMatches) {
    if (projection.pending.length >= monitor.runtimeLimits.maxPendingDeliveries) {
      return { ok: false, status: "INCOMPLETE", reason: "pending-overflow" };
    }
    return {
      ok: true,
      projection: { ...projection, pending: [...projection.pending, delivery] },
      duplicate: false,
      pending: true,
      judgeReservation: null,
    };
  }
  const applied = applySemanticEvent(projection, monitor, delivery);
  return applied.ok ? drainPending(applied, monitor) : applied;
}
