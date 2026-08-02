// Harness-neutral fixed-width Unit execution pool (#1919).
//
// This module is the C5 proposal owner: every function is pure. It validates
// plans, folds canonical events, and proposes a closed transition. It never
// reads audit, mints identities, writes state, or calls a harness. The C2
// runtime adapter owns those effects.

export const UNIT_ATTEMPT_DEFAULT_CAP = 2;
export const UNIT_ATTEMPT_HARD_CAP = 3;
export const RECONCILIATION_DEFAULT_CAP = 2;
export const RECONCILIATION_HARD_CAP = 3;
export const RECONCILIATION_PROBE_MS = 5_000;
export const RECONCILIATION_PROBE_HARD_MS = 10_000;

export type UnitPoolOutcome =
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dependency-unsatisfied"
  | "batch-unsafe"
  | "dispatch-not-started"
  | "dispatch-effect-unknown"
  | "worker-unresponsive"
  | "cancel-unconfirmed";

export type UnitPoolPhase = "open" | "draining" | "terminal";
export type UnitPoolResult = "completed" | "partial-failure" | "cancelled" | "terminated" | null;

export interface UnitPlanEntry {
  readonly unitId: string;
  readonly dependsOn: readonly string[];
}

export type UnitPlanValidation =
  | { readonly ok: true; readonly orderedUnitIds: readonly string[] }
  | {
      readonly ok: false;
      readonly reason: "invalid-unit-plan";
      readonly detail: "duplicate-unit" | "missing-dependency" | "self-edge" | "cycle";
    };

function bytewise(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export function validateAndOrderUnits(units: readonly UnitPlanEntry[]): UnitPlanValidation {
  const byId = new Map<string, UnitPlanEntry>();
  for (const unit of units) {
    if (byId.has(unit.unitId)) return { ok: false, reason: "invalid-unit-plan", detail: "duplicate-unit" };
    byId.set(unit.unitId, unit);
  }
  for (const unit of units) {
    if (unit.dependsOn.includes(unit.unitId)) return { ok: false, reason: "invalid-unit-plan", detail: "self-edge" };
    if (unit.dependsOn.some((dependency) => !byId.has(dependency))) {
      return { ok: false, reason: "invalid-unit-plan", detail: "missing-dependency" };
    }
  }
  const remaining = new Set(byId.keys());
  const completed = new Set<string>();
  const ordered: string[] = [];
  while (remaining.size > 0) {
    const layer = [...remaining]
      .filter((unitId) => byId.get(unitId)!.dependsOn.every((dependency) => completed.has(dependency)))
      .sort(bytewise);
    if (layer.length === 0) return { ok: false, reason: "invalid-unit-plan", detail: "cycle" };
    for (const unitId of layer) {
      remaining.delete(unitId);
      completed.add(unitId);
      ordered.push(unitId);
    }
  }
  return { ok: true, orderedUnitIds: ordered };
}

export interface QueueEntry {
  readonly queueEntryId: string;
  readonly unitId: string;
  readonly ordinal: number;
}

export interface ActiveAttempt {
  readonly attemptId: string;
  readonly slotId: string;
  readonly unitId: string;
  readonly attemptOrdinal: number;
  readonly dispatchConfirmed: boolean;
  readonly nativeHandle?: string;
}

export interface TerminalUnit {
  readonly unitId: string;
  readonly attemptId: string | null;
  readonly outcome: UnitPoolOutcome;
}

export interface ReconciliationRecord {
  readonly attemptId: string;
  readonly kind: string;
  readonly ordinal: number;
  readonly effect: "no-effect-confirmed" | "effect-possible" | "unknown";
}

export interface UnitPoolProjection {
  readonly batchId: string | null;
  readonly cap: number;
  readonly phase: UnitPoolPhase;
  readonly result: UnitPoolResult;
  readonly units: readonly UnitPlanEntry[];
  readonly queue: readonly QueueEntry[];
  readonly active: readonly ActiveAttempt[];
  readonly terminal: readonly TerminalUnit[];
  readonly attemptCounts: Readonly<Record<string, number>>;
  readonly reconciliations: readonly ReconciliationRecord[];
  readonly lateResults: readonly { attemptId: string; outcome: UnitPoolOutcome }[];
}

const EMPTY: UnitPoolProjection = {
  batchId: null,
  cap: 0,
  phase: "open",
  result: null,
  units: [],
  queue: [],
  active: [],
  terminal: [],
  attemptCounts: {},
  reconciliations: [],
  lateResults: [],
};

export type UnitPoolEvent =
  | { readonly type: "batch-initialized"; readonly batchId: string; readonly cap: number; readonly units: readonly UnitPlanEntry[]; readonly queue: readonly QueueEntry[] }
  | { readonly type: "unit-acquired"; readonly attempt: ActiveAttempt; readonly queueEntryId: string }
  | { readonly type: "dispatch-confirmed"; readonly attemptId: string; readonly nativeHandle: string }
  | { readonly type: "reconciliation-recorded"; readonly record: ReconciliationRecord }
  | { readonly type: "unit-settled"; readonly terminal: TerminalUnit }
  | { readonly type: "unit-requeued"; readonly entry: QueueEntry }
  | { readonly type: "units-cancelled"; readonly units: readonly TerminalUnit[] }
  | { readonly type: "batch-draining"; readonly queuedOutcome: "batch-unsafe" | "cancelled" }
  | { readonly type: "batch-terminated"; readonly result: Exclude<UnitPoolResult, null> }
  | { readonly type: "late-result-observed"; readonly attemptId: string; readonly outcome: UnitPoolOutcome };

export interface UnitPoolEventSet {
  readonly eventSetId: string;
  readonly batchId: string;
  readonly idempotencyKey: string;
  readonly payloadFingerprint: string;
  readonly events: readonly UnitPoolEvent[];
}

function finalResult(projection: UnitPoolProjection): UnitPoolResult {
  if (projection.queue.length > 0 || projection.active.length > 0) return null;
  if (projection.terminal.length < projection.units.length) return null;
  const outcomes = projection.terminal.map((unit) => unit.outcome);
  if (outcomes.some((outcome) => outcome === "batch-unsafe" || outcome === "dispatch-effect-unknown" || outcome === "worker-unresponsive" || outcome === "cancel-unconfirmed")) return "terminated";
  if (outcomes.some((outcome) => outcome === "cancelled")) return "cancelled";
  if (outcomes.some((outcome) => outcome !== "succeeded")) return "partial-failure";
  return "completed";
}

export function applyUnitPoolEvent(current: UnitPoolProjection, event: UnitPoolEvent): UnitPoolProjection {
  let next = current;
  switch (event.type) {
    case "batch-initialized":
      next = { ...EMPTY, batchId: event.batchId, cap: event.cap, units: [...event.units], queue: [...event.queue] };
      break;
    case "unit-acquired":
      next = {
        ...current,
        queue: current.queue.filter((entry) => entry.queueEntryId !== event.queueEntryId),
        active: [...current.active, event.attempt],
        attemptCounts: { ...current.attemptCounts, [event.attempt.unitId]: event.attempt.attemptOrdinal },
      };
      break;
    case "dispatch-confirmed":
      next = { ...current, active: current.active.map((attempt) => attempt.attemptId === event.attemptId ? { ...attempt, dispatchConfirmed: true, nativeHandle: event.nativeHandle } : attempt) };
      break;
    case "reconciliation-recorded":
      next = { ...current, reconciliations: [...current.reconciliations, event.record] };
      break;
    case "unit-settled":
      next = { ...current, active: current.active.filter((attempt) => attempt.attemptId !== event.terminal.attemptId), terminal: [...current.terminal.filter((unit) => unit.unitId !== event.terminal.unitId), event.terminal] };
      break;
    case "unit-requeued":
      next = { ...current, queue: [...current.queue, event.entry], terminal: current.terminal.filter((unit) => unit.unitId !== event.entry.unitId) };
      break;
    case "units-cancelled": {
      const ids = new Set(event.units.map((unit) => unit.unitId));
      next = { ...current, queue: current.queue.filter((entry) => !ids.has(entry.unitId)), terminal: [...current.terminal, ...event.units] };
      break;
    }
    case "batch-draining": {
      const cancelled = current.queue.map((entry) => ({ unitId: entry.unitId, attemptId: null, outcome: event.queuedOutcome } as TerminalUnit));
      next = { ...current, phase: "draining", queue: [], terminal: [...current.terminal, ...cancelled] };
      break;
    }
    case "batch-terminated":
      next = { ...current, phase: "terminal", result: event.result };
      break;
    case "late-result-observed":
      next = { ...current, lateResults: [...current.lateResults, { attemptId: event.attemptId, outcome: event.outcome }] };
      break;
  }
  return next;
}

export function finalizeUnitPoolProjection(projection: UnitPoolProjection): UnitPoolProjection {
  const result = finalResult(projection);
  return result === null ? projection : { ...projection, phase: "terminal", result };
}

export function foldUnitPoolEventSets(sets: readonly UnitPoolEventSet[], batchId?: string): UnitPoolProjection {
  return sets
    .filter((set) => batchId === undefined || set.batchId === batchId)
    .reduce((projection, set) => finalizeUnitPoolProjection(set.events.reduce(applyUnitPoolEvent, projection)), EMPTY);
}

export type UnitPoolCommand =
  | { readonly kind: "initial-enqueue"; readonly batchId: string; readonly cap: number; readonly units: readonly UnitPlanEntry[]; readonly queue: readonly QueueEntry[] }
  | { readonly kind: "acquire"; readonly batchId: string; readonly queueEntryId: string; readonly attemptId: string; readonly slotId: string }
  | { readonly kind: "confirm-dispatch"; readonly batchId: string; readonly attemptId: string; readonly nativeHandle: string }
  | { readonly kind: "record-reconciliation"; readonly batchId: string; readonly attemptId: string; readonly reconciliationKind: string; readonly effect: ReconciliationRecord["effect"]; readonly queueEntryId: string }
  | { readonly kind: "settle-release"; readonly batchId: string; readonly attemptId: string; readonly outcome: UnitPoolOutcome }
  | { readonly kind: "settle-release-requeue"; readonly batchId: string; readonly attemptId: string; readonly outcome: "dispatch-not-started"; readonly queueEntryId: string }
  | { readonly kind: "settle-release-cancel-dependents"; readonly batchId: string; readonly attemptId: string; readonly outcome: UnitPoolOutcome }
  | { readonly kind: "terminate-batch"; readonly batchId: string; readonly result: Exclude<UnitPoolResult, null>; readonly queuedOutcome: "batch-unsafe" | "cancelled" }
  | { readonly kind: "late-result-observed"; readonly batchId: string; readonly attemptId: string; readonly outcome: UnitPoolOutcome };

export type UnitPoolProposal =
  | { readonly ok: true; readonly events: readonly UnitPoolEvent[] }
  | { readonly ok: false; readonly reason: string };

function terminalOutcome(projection: UnitPoolProjection, unitId: string): UnitPoolOutcome | null {
  return projection.terminal.find((entry) => entry.unitId === unitId)?.outcome ?? null;
}

function ready(projection: UnitPoolProjection, unitId: string): boolean {
  const unit = projection.units.find((candidate) => candidate.unitId === unitId);
  return unit?.dependsOn.every((dependency) => terminalOutcome(projection, dependency) === "succeeded") ?? false;
}

function transitiveDependents(projection: UnitPoolProjection, failedUnitId: string): string[] {
  const selected = new Set<string>([failedUnitId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const unit of projection.units) {
      if (!selected.has(unit.unitId) && unit.dependsOn.some((dependency) => selected.has(dependency))) {
        selected.add(unit.unitId);
        changed = true;
      }
    }
  }
  selected.delete(failedUnitId);
  return [...selected];
}

type PoolCommand<K extends UnitPoolCommand["kind"]> = Extract<UnitPoolCommand, { readonly kind: K }>;
type SettlementCommand = PoolCommand<"settle-release" | "settle-release-requeue" | "settle-release-cancel-dependents">;

function cancelledDependentEvents(projection: UnitPoolProjection, failedUnitId: string): UnitPoolEvent[] {
  const dependentIds = new Set(transitiveDependents(projection, failedUnitId));
  const cancelled = projection.queue
    .filter((entry) => dependentIds.has(entry.unitId))
    .map((entry) => ({ unitId: entry.unitId, attemptId: null, outcome: "dependency-unsatisfied" as const }));
  return cancelled.length === 0 ? [] : [{ type: "units-cancelled", units: cancelled }];
}

function proposeInitialEnqueue(
  projection: UnitPoolProjection,
  command: PoolCommand<"initial-enqueue">,
): UnitPoolProposal {
  if (projection.batchId !== null) return { ok: false, reason: "already-initialized" };
  if (!Number.isInteger(command.cap) || command.cap < 1 || command.cap > 4) return { ok: false, reason: "invalid-cap" };
  const validation = validateAndOrderUnits(command.units);
  if (!validation.ok) return { ok: false, reason: `${validation.reason}:${validation.detail}` };
  return {
    ok: true,
    events: [{
      type: "batch-initialized",
      batchId: command.batchId,
      cap: Math.min(command.cap, Math.max(1, command.units.length)),
      units: command.units,
      queue: command.queue,
    }],
  };
}

function proposeAcquire(projection: UnitPoolProjection, command: PoolCommand<"acquire">): UnitPoolProposal {
  if (projection.phase !== "open") return { ok: false, reason: "pool-not-open" };
  if (projection.active.length >= projection.cap) return { ok: false, reason: "capacity-exhausted" };
  const firstReady = projection.queue.find((entry) => ready(projection, entry.unitId));
  if (firstReady === undefined) return { ok: false, reason: "no-ready-unit" };
  if (firstReady.queueEntryId !== command.queueEntryId) return { ok: false, reason: "fifo-violation" };
  const attemptOrdinal = (projection.attemptCounts[firstReady.unitId] ?? 0) + 1;
  if (attemptOrdinal > UNIT_ATTEMPT_DEFAULT_CAP) return { ok: false, reason: "unit-attempt-budget-exhausted" };
  return {
    ok: true,
    events: [{
      type: "unit-acquired",
      queueEntryId: firstReady.queueEntryId,
      attempt: {
        attemptId: command.attemptId,
        slotId: command.slotId,
        unitId: firstReady.unitId,
        attemptOrdinal,
        dispatchConfirmed: false,
      },
    }],
  };
}

function proposeDispatchConfirmation(
  projection: UnitPoolProjection,
  command: PoolCommand<"confirm-dispatch">,
): UnitPoolProposal {
  const attempt = projection.active.find((candidate) => candidate.attemptId === command.attemptId);
  if (attempt === undefined || attempt.dispatchConfirmed) return { ok: false, reason: "invalid-dispatch-transition" };
  return { ok: true, events: [{ type: "dispatch-confirmed", attemptId: command.attemptId, nativeHandle: command.nativeHandle }] };
}

function proposeNoEffectReconciliation(
  projection: UnitPoolProjection,
  command: PoolCommand<"record-reconciliation">,
  attempt: ActiveAttempt,
  recorded: UnitPoolEvent,
): UnitPoolProposal {
  if (projection.phase === "draining") {
    return { ok: true, events: [recorded, {
      type: "unit-settled",
      terminal: { unitId: attempt.unitId, attemptId: attempt.attemptId, outcome: "dispatch-not-started" },
    }] };
  }
  if (attempt.attemptOrdinal >= UNIT_ATTEMPT_DEFAULT_CAP) {
    return { ok: true, events: [
      recorded,
      { type: "unit-settled", terminal: { unitId: attempt.unitId, attemptId: attempt.attemptId, outcome: "failed" } },
      ...cancelledDependentEvents(projection, attempt.unitId),
    ] };
  }
  return { ok: true, events: [
    recorded,
    { type: "unit-settled", terminal: { unitId: attempt.unitId, attemptId: attempt.attemptId, outcome: "dispatch-not-started" } },
    { type: "unit-requeued", entry: { queueEntryId: command.queueEntryId, unitId: attempt.unitId, ordinal: projection.queue.length } },
  ] };
}

function proposeReconciliation(
  projection: UnitPoolProjection,
  command: PoolCommand<"record-reconciliation">,
): UnitPoolProposal {
  const attempt = projection.active.find((candidate) => candidate.attemptId === command.attemptId);
  if (attempt === undefined) return { ok: false, reason: "attempt-not-active" };
  const ordinal = projection.reconciliations.filter(
    (record) => record.attemptId === command.attemptId && record.kind === command.reconciliationKind,
  ).length + 1;
  if (ordinal > RECONCILIATION_DEFAULT_CAP) {
    return { ok: true, events: [
      { type: "unit-settled", terminal: { unitId: attempt.unitId, attemptId: attempt.attemptId, outcome: "worker-unresponsive" } },
      { type: "batch-draining", queuedOutcome: "batch-unsafe" },
    ] };
  }
  const recorded: UnitPoolEvent = {
    type: "reconciliation-recorded",
    record: { attemptId: command.attemptId, kind: command.reconciliationKind, ordinal, effect: command.effect },
  };
  if (command.effect === "no-effect-confirmed") {
    return proposeNoEffectReconciliation(projection, command, attempt, recorded);
  }
  return { ok: true, events: [
    recorded,
    { type: "unit-settled", terminal: { unitId: attempt.unitId, attemptId: attempt.attemptId, outcome: "dispatch-effect-unknown" } },
    { type: "batch-draining", queuedOutcome: "batch-unsafe" },
  ] };
}

function proposeRequeueSettlement(
  projection: UnitPoolProjection,
  command: PoolCommand<"settle-release-requeue">,
  attempt: ActiveAttempt,
  settled: UnitPoolEvent,
): UnitPoolProposal {
  if (projection.phase === "draining") return { ok: true, events: [settled] };
  if (attempt.attemptOrdinal >= UNIT_ATTEMPT_DEFAULT_CAP) {
    return { ok: true, events: [
      { type: "unit-settled", terminal: { unitId: attempt.unitId, attemptId: attempt.attemptId, outcome: "failed" } },
      ...cancelledDependentEvents(projection, attempt.unitId),
    ] };
  }
  return { ok: true, events: [settled, {
    type: "unit-requeued",
    entry: { queueEntryId: command.queueEntryId, unitId: attempt.unitId, ordinal: projection.queue.length },
  }] };
}

function proposeSettlement(projection: UnitPoolProjection, command: SettlementCommand): UnitPoolProposal {
  const attempt = projection.active.find((candidate) => candidate.attemptId === command.attemptId);
  if (attempt === undefined) return { ok: false, reason: "attempt-not-active" };
  if (!attempt.dispatchConfirmed && command.kind !== "settle-release-requeue") {
    return { ok: false, reason: "dispatch-not-confirmed" };
  }
  const settled: UnitPoolEvent = {
    type: "unit-settled",
    terminal: { unitId: attempt.unitId, attemptId: attempt.attemptId, outcome: command.outcome },
  };
  if (command.kind === "settle-release") return { ok: true, events: [settled] };
  if (command.kind === "settle-release-requeue") {
    return proposeRequeueSettlement(projection, command, attempt, settled);
  }
  return { ok: true, events: [settled, ...cancelledDependentEvents(projection, attempt.unitId)] };
}

export function proposeUnitPoolCommand(projection: UnitPoolProjection, command: UnitPoolCommand): UnitPoolProposal {
  if (command.kind === "initial-enqueue") return proposeInitialEnqueue(projection, command);
  if (projection.batchId !== command.batchId) return { ok: false, reason: "batch-not-found" };
  if (command.kind === "late-result-observed") return { ok: true, events: [{ type: "late-result-observed", attemptId: command.attemptId, outcome: command.outcome }] };
  if (projection.phase === "terminal") return { ok: false, reason: "pool-not-open" };
  if (command.kind === "acquire") return proposeAcquire(projection, command);
  if (command.kind === "confirm-dispatch") return proposeDispatchConfirmation(projection, command);
  if (command.kind === "record-reconciliation") return proposeReconciliation(projection, command);
  if (command.kind === "terminate-batch") {
    return { ok: true, events: [
      { type: "batch-draining", queuedOutcome: command.queuedOutcome },
      { type: "batch-terminated", result: command.result },
    ] };
  }
  return proposeSettlement(projection, command);
}
