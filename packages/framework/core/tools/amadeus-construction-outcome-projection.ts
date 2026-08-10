// Pure Construction Unit outcome projection (#2833).
//
// Callers normalize canonical audit events onto ConstructionOutcomeRecord.
// This module owns only the deterministic join and failure transition view; it
// performs no audit, state, worktree, or process I/O.

export type UnitOutcome = "succeeded" | "failed" | "cancelled";

export interface UnitKey {
  readonly intent: string;
  readonly stage: string;
  readonly unit: string;
  readonly attempt?: string;
  readonly batch?: string;
}

export interface UnitOutcomeEntry extends UnitKey {
  readonly outcome: UnitOutcome;
  readonly reason?: string;
  readonly sequence: number;
}

export type ProjectionDiagnosticCode =
  | "missing-join-key"
  | "ambiguous-attempt"
  | "contradictory-terminal";

export interface ProjectionDiagnostic {
  readonly eventId: string;
  readonly sequence: number;
  readonly code: ProjectionDiagnosticCode;
  readonly missing: readonly (keyof UnitKey)[];
}

interface CorrelatedRecord {
  readonly eventId: string;
  readonly sequence: number;
}

export type ConstructionOutcomeRecord =
  | CorrelatedRecord & {
      readonly event: "UNIT_POOL_EVENT_SET_COMMITTED";
      readonly terminals: readonly UnitOutcomeEntry[];
    }
  | CorrelatedRecord & {
      readonly event: "BOLT_FAILED";
      readonly target: UnitKey;
      readonly reason: string;
    }
  | CorrelatedRecord & {
      readonly event: "SWARM_BATON_RETURNED";
      readonly target: UnitKey;
    };

export type ProjectionResult =
  | {
      readonly ok: true;
      readonly projection: {
        readonly units: readonly UnitOutcomeEntry[];
        readonly unresolvedFailures: readonly UnitOutcomeEntry[];
        readonly constructionSuspended: boolean;
        readonly suspensionReason?: string;
      };
    }
  | { readonly ok: false; readonly diagnostics: readonly ProjectionDiagnostic[] };

export type ConstructionOutcomeProjection = Extract<ProjectionResult, { ok: true }>["projection"];

export type FailureTransition =
  | { readonly kind: "continue" }
  | { readonly kind: "retry-unit"; readonly target: UnitKey }
  | {
      readonly kind: "skip-unit";
      readonly target: UnitKey;
      readonly outcome: "cancelled";
      readonly reason: string;
    }
  | {
      readonly kind: "await-unit-ruling";
      readonly target: UnitKey;
      readonly siblings: readonly UnitOutcomeEntry[];
    }
  | {
      readonly kind: "parked";
      readonly trigger: UnitKey;
      readonly preservedOutcomes: readonly UnitOutcomeEntry[];
    };

export type FailureRuling =
  | { readonly kind: "retry"; readonly attempt: string }
  | { readonly kind: "skip"; readonly reason: string }
  | { readonly kind: "abort"; readonly reason: string };

export interface ConstructionProjectionContext {
  readonly intent: string;
  readonly stage: string;
  readonly batches?: readonly (readonly string[])[];
}

export type ConstructionAuditNormalization =
  | { readonly ok: true; readonly records: readonly ConstructionOutcomeRecord[] }
  | { readonly ok: false; readonly diagnostics: readonly ProjectionDiagnostic[] };

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareStrings(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function auditRowOrder(left: Record<string, unknown>, right: Record<string, unknown>): number {
  const byTimestamp = compareStrings(
    stringField(left.timestamp) ?? "",
    stringField(right.timestamp) ?? "",
  );
  if (byTimestamp !== 0) return byTimestamp;
  const leftClone = stringField(left.cloneId) ?? "";
  const rightClone = stringField(right.cloneId) ?? "";
  if (leftClone === rightClone) {
    const leftSequence = Number.isInteger(left.seq) ? left.seq as number : 0;
    const rightSequence = Number.isInteger(right.seq) ? right.seq as number : 0;
    if (leftSequence !== rightSequence) return leftSequence - rightSequence;
  }
  const leftIdentity = stringField(left.idempotencyKey) ?? stringField(left.eventId) ?? "";
  const rightIdentity = stringField(right.idempotencyKey) ?? stringField(right.eventId) ?? "";
  return bytewise(leftIdentity, rightIdentity);
}

function canonicalAuditRows(audit: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const line of audit.split("\n")) {
    if (!line.startsWith("{")) continue;
    try {
      const row: unknown = JSON.parse(line);
      if (isRecord(row) && row.schemaVersion === 2 && row.canonical === true) rows.push(row);
    } catch {
      // Unreadable lines never become outcome evidence.
    }
  }
  return rows.sort(auditRowOrder);
}

function boltTarget(
  intent: string,
  attributes: Record<string, unknown>,
  unitField: "Bolt names" | "Failed Bolt",
): UnitKey {
  const names = stringField(attributes[unitField]);
  const unit = stringField(attributes["Bolt slug"])
    ?? (names && !names.includes(",") ? names : undefined)
    ?? "";
  return {
    intent,
    stage: stringField(attributes.Stage) ?? "",
    unit,
    attempt: stringField(attributes["Attempt Id"]),
    batch: stringField(attributes["Batch Id"]),
  };
}

function hasExplicitCorrelation(attributes: Record<string, unknown>): boolean {
  return ["Stage", "Attempt Id", "Batch Id"].some((field) => stringField(attributes[field]) !== undefined);
}

function currentTerminalKey(key: UnitKey): string {
  return JSON.stringify([key.intent, key.stage, key.unit, key.batch]);
}

type ConstructionAuditEvent =
  | "UNIT_POOL_EVENT_SET_COMMITTED"
  | "BOLT_STARTED"
  | "BOLT_COMPLETED"
  | "BOLT_FAILED"
  | "SWARM_BATON_RETURNED";

interface CurrentTerminal {
  readonly entry: UnitOutcomeEntry;
  readonly eventId: string;
  readonly sequence: number;
}

interface NormalizationState {
  readonly records: ConstructionOutcomeRecord[];
  readonly diagnostics: ProjectionDiagnostic[];
  readonly soloStarts: Set<string>;
  readonly currentTerminals: Map<string, CurrentTerminal>;
}

interface AuditRowContext {
  readonly attributes: Record<string, unknown>;
  readonly eventId: string;
  readonly sequence: number;
  readonly intent: string;
  readonly stage: string;
}

const CONSTRUCTION_AUDIT_EVENTS: readonly ConstructionAuditEvent[] = [
  "UNIT_POOL_EVENT_SET_COMMITTED",
  "BOLT_STARTED",
  "BOLT_COMPLETED",
  "BOLT_FAILED",
  "SWARM_BATON_RETURNED",
];

function constructionAuditEvent(value: unknown): ConstructionAuditEvent | undefined {
  const event = stringField(value);
  return event !== undefined && (CONSTRUCTION_AUDIT_EVENTS as readonly string[]).includes(event)
    ? event as ConstructionAuditEvent
    : undefined;
}

function missingKeyDiagnostic(
  state: NormalizationState,
  context: AuditRowContext,
  missing: readonly (keyof UnitKey)[],
): void {
  state.diagnostics.push({
    eventId: context.eventId,
    sequence: context.sequence,
    code: "missing-join-key",
    missing,
  });
}

function normalizeSoloLifecycle(
  event: "BOLT_STARTED" | "BOLT_COMPLETED",
  context: AuditRowContext,
  state: NormalizationState,
): void {
  if (!hasExplicitCorrelation(context.attributes)) return;
  const target = boltTarget(context.intent, context.attributes, "Bolt names");
  const missing = missingJoinKeys(target);
  if (missing.length > 0) {
    missingKeyDiagnostic(state, context, missing);
    return;
  }
  if (event === "BOLT_STARTED") {
    state.soloStarts.add(keyId(target));
    state.currentTerminals.delete(currentTerminalKey(target));
    return;
  }
  if (!target.batch?.startsWith("solo:") || !state.soloStarts.has(keyId(target))) return;
  const outcome = context.attributes.Outcome === "cancelled" ? "cancelled" : "succeeded";
  state.currentTerminals.set(currentTerminalKey(target), {
    entry: {
      ...target,
      outcome,
      ...(typeof context.attributes.Reason === "string"
        ? { reason: context.attributes.Reason }
        : {}),
      sequence: context.sequence,
    },
    eventId: context.eventId,
    sequence: context.sequence,
  });
}

function poolTerminalValues(candidate: Record<string, unknown>): unknown[] {
  if (candidate.type === "unit-settled") return [candidate.terminal];
  return candidate.type === "units-cancelled" && Array.isArray(candidate.units)
    ? candidate.units
    : [];
}

function normalizePoolTerminal(
  value: unknown,
  batch: string | undefined,
  context: AuditRowContext,
  state: NormalizationState,
): void {
  if (typeof value !== "object" || value === null) return;
  const terminal = value as Record<string, unknown>;
  const outcome = terminal.outcome;
  if (outcome !== "succeeded" && outcome !== "failed" && outcome !== "cancelled") return;
  const entry: UnitOutcomeEntry = {
    intent: context.intent,
    stage: context.stage,
    unit: stringField(terminal.unitId) ?? "",
    attempt: stringField(terminal.attemptId),
    batch,
    outcome,
    ...(typeof terminal.reason === "string" ? { reason: terminal.reason } : {}),
    sequence: context.sequence,
  };
  state.currentTerminals.set(currentTerminalKey(entry), {
    entry,
    eventId: context.eventId,
    sequence: context.sequence,
  });
}

function parsePoolEventSet(
  context: AuditRowContext,
  state: NormalizationState,
): Record<string, unknown> | undefined {
  try {
    const eventSet: unknown = JSON.parse(String(context.attributes["Event Set"] ?? ""));
    if (isRecord(eventSet)) return eventSet;
  } catch {
    // Invalid event sets fall through to the deterministic diagnostic below.
  }
  missingKeyDiagnostic(state, context, ["unit", "attempt", "batch"]);
  return undefined;
}

function normalizePoolCommit(context: AuditRowContext, state: NormalizationState): void {
  const eventSet = parsePoolEventSet(context, state);
  if (eventSet === undefined) return;
  const batch = stringField(eventSet.batchId) ?? stringField(context.attributes["Batch Id"]);
  const events = Array.isArray(eventSet.events) ? eventSet.events : [];
  for (const value of events) {
    if (typeof value !== "object" || value === null) continue;
    const candidate = value as Record<string, unknown>;
    if (candidate.type === "unit-requeued") {
      const entry = candidate.entry as Record<string, unknown> | undefined;
      const unit = stringField(entry?.unitId);
      if (unit && batch) {
        state.currentTerminals.delete(currentTerminalKey({
          intent: context.intent,
          stage: context.stage,
          unit,
          batch,
        }));
      }
      continue;
    }
    for (const terminal of poolTerminalValues(candidate)) {
      normalizePoolTerminal(terminal, batch, context, state);
    }
  }
}

function normalizeFailureOrBaton(
  event: "BOLT_FAILED" | "SWARM_BATON_RETURNED",
  context: AuditRowContext,
  state: NormalizationState,
): void {
  const target: UnitKey = event === "BOLT_FAILED"
    ? boltTarget(context.intent, context.attributes, "Failed Bolt")
    : {
        intent: context.intent,
        stage: context.stage,
        unit: stringField(context.attributes["Unit name"]) ?? "",
        attempt: stringField(context.attributes["Attempt Id"]),
        batch: stringField(context.attributes["Batch number"]),
      };
  if (event === "SWARM_BATON_RETURNED") {
    state.records.push({ event, eventId: context.eventId, sequence: context.sequence, target });
    return;
  }
  const reason = String(context.attributes.Reason ?? context.attributes["Error summary"] ?? "failed");
  state.records.push({ event, eventId: context.eventId, sequence: context.sequence, target, reason });
  if (!target.batch?.startsWith("solo:") || !state.soloStarts.has(keyId(target))) return;
  state.currentTerminals.set(currentTerminalKey(target), {
    entry: { ...target, outcome: "failed", sequence: context.sequence },
    eventId: `${context.eventId}:solo-terminal`,
    sequence: context.sequence,
  });
  state.records.push({
    event: "SWARM_BATON_RETURNED",
    eventId: `${context.eventId}:solo-closure`,
    sequence: context.sequence,
    target,
  });
}

function normalizedTerminalRecords(state: NormalizationState): ConstructionOutcomeRecord[] {
  const groups = new Map<string, {
    eventId: string;
    sequence: number;
    terminals: UnitOutcomeEntry[];
  }>();
  for (const value of state.currentTerminals.values()) {
    const identity = `${value.eventId}:${value.sequence}`;
    const group = groups.get(identity) ?? {
      eventId: value.eventId,
      sequence: value.sequence,
      terminals: [],
    };
    group.terminals.push(value.entry);
    groups.set(identity, group);
  }
  return [...groups.values()].map((group) => ({
    event: "UNIT_POOL_EVENT_SET_COMMITTED",
    ...group,
  }));
}

export function normalizeConstructionOutcomeAudit(audit: string): ConstructionAuditNormalization {
  const state: NormalizationState = {
    records: [],
    diagnostics: [],
    soloStarts: new Set<string>(),
    currentTerminals: new Map<string, CurrentTerminal>(),
  };
  const seen = new Set<string>();
  for (const raw of canonicalAuditRows(audit)) {
    const attributes = raw.attributes as Record<string, unknown> | undefined;
    const event = constructionAuditEvent(attributes?.Event);
    if (!attributes || event === undefined) continue;
    const eventId = stringField(raw.eventId) ?? "(missing-event-identity)";
    if (seen.has(eventId)) continue;
    seen.add(eventId);
    const context: AuditRowContext = {
      attributes,
      eventId,
      sequence: Number.isInteger(raw.seq) ? raw.seq as number : 0,
      intent: stringField(raw.intentId) ?? "",
      stage: stringField(attributes.Stage) ?? "",
    };
    switch (event) {
      case "BOLT_STARTED":
      case "BOLT_COMPLETED":
        normalizeSoloLifecycle(event, context, state);
        break;
      case "UNIT_POOL_EVENT_SET_COMMITTED":
        normalizePoolCommit(context, state);
        break;
      case "BOLT_FAILED":
      case "SWARM_BATON_RETURNED":
        normalizeFailureOrBaton(event, context, state);
        break;
    }
  }
  state.records.push(...normalizedTerminalRecords(state));
  return state.diagnostics.length > 0
    ? { ok: false, diagnostics: state.diagnostics }
    : { ok: true, records: state.records };
}

function unitKeyOf(entry: UnitOutcomeEntry): UnitKey {
  const { intent, stage, unit, attempt, batch } = entry;
  return { intent, stage, unit, attempt, batch };
}

export function constructionFailureTransition(
  projection: ConstructionOutcomeProjection,
  ruling?: FailureRuling,
): FailureTransition {
  const target = projection.unresolvedFailures[0];
  if (target === undefined) return { kind: "continue" };
  if (ruling?.kind === "retry") {
    return {
      kind: "retry-unit",
      target: { ...unitKeyOf(target), attempt: ruling.attempt },
    };
  }
  if (ruling?.kind === "skip") {
    return {
      kind: "skip-unit",
      target: unitKeyOf(target),
      outcome: "cancelled",
      reason: ruling.reason,
    };
  }
  if (ruling?.kind === "abort") {
    return {
      kind: "parked",
      trigger: unitKeyOf(target),
      preservedOutcomes: projection.units,
    };
  }
  return {
    kind: "await-unit-ruling",
    target: unitKeyOf(target),
    siblings: projection.units.filter((entry) => keyId(entry) !== keyId(target)),
  };
}

function keyId(key: UnitKey): string {
  return JSON.stringify([key.intent, key.stage, key.unit, key.attempt, key.batch]);
}

function batchOrder(
  entry: UnitOutcomeEntry,
  batches: readonly (readonly string[])[],
): number {
  const byBatch = entry.batch === undefined ? -1 : Number.parseInt(entry.batch, 10) - 1;
  if (Number.isInteger(byBatch) && byBatch >= 0 && byBatch < batches.length) return byBatch;
  const byUnit = batches.findIndex((batch) => batch.includes(entry.unit));
  return byUnit < 0 ? Number.MAX_SAFE_INTEGER : byUnit;
}

function bytewise(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

const JOIN_KEYS = ["intent", "stage", "unit", "attempt", "batch"] as const;

function missingJoinKeys(key: UnitKey): (keyof UnitKey)[] {
  return JOIN_KEYS.filter((field) => {
    const value = key[field];
    return typeof value !== "string" || value.length === 0;
  });
}

function missingJoinDiagnostics(
  records: readonly ConstructionOutcomeRecord[],
): ProjectionDiagnostic[] {
  const diagnostics: ProjectionDiagnostic[] = [];
  for (const record of records) {
    const keys = record.event === "UNIT_POOL_EVENT_SET_COMMITTED"
      ? record.terminals
      : [record.target];
    for (const key of keys) {
      const missing = missingJoinKeys(key);
      if (missing.length > 0) {
        diagnostics.push({
          eventId: record.eventId,
          sequence: record.sequence,
          code: "missing-join-key",
          missing,
        });
      }
    }
  }
  return diagnostics;
}

function contradictoryTerminalDiagnostics(
  records: readonly ConstructionOutcomeRecord[],
): ProjectionDiagnostic[] {
  const observed = new Map<string, UnitOutcome>();
  const diagnostics: ProjectionDiagnostic[] = [];
  for (const record of records) {
    if (record.event !== "UNIT_POOL_EVENT_SET_COMMITTED") continue;
    for (const terminal of record.terminals) {
      const identity = `${keyId(terminal)}:${terminal.sequence}`;
      const prior = observed.get(identity);
      if (prior !== undefined && prior !== terminal.outcome) {
        diagnostics.push({
          eventId: record.eventId,
          sequence: record.sequence,
          code: "contradictory-terminal",
          missing: [],
        });
      } else {
        observed.set(identity, terminal.outcome);
      }
    }
  }
  return diagnostics;
}

function ambiguousAttemptDiagnostics(
  records: readonly ConstructionOutcomeRecord[],
): ProjectionDiagnostic[] {
  const keysByAttempt = new Map<string, string>();
  const diagnostics: ProjectionDiagnostic[] = [];
  for (const record of records) {
    if (record.event !== "UNIT_POOL_EVENT_SET_COMMITTED") continue;
    for (const terminal of record.terminals) {
      if (terminal.attempt === undefined) continue;
      const identity = keyId(terminal);
      const prior = keysByAttempt.get(terminal.attempt);
      if (prior !== undefined && prior !== identity) {
        diagnostics.push({
          eventId: record.eventId,
          sequence: record.sequence,
          code: "ambiguous-attempt",
          missing: [],
        });
      } else {
        keysByAttempt.set(terminal.attempt, identity);
      }
    }
  }
  return diagnostics;
}

export function projectConstructionOutcomes(
  records: readonly ConstructionOutcomeRecord[],
  context: ConstructionProjectionContext,
): ProjectionResult {
  const scoped = records.filter((record) => {
    const keys = record.event === "UNIT_POOL_EVENT_SET_COMMITTED" ? record.terminals : [record.target];
    return keys.some((key) => key.intent === context.intent && key.stage === context.stage);
  });
  const diagnostics = [
    ...missingJoinDiagnostics(scoped),
    ...ambiguousAttemptDiagnostics(scoped),
    ...contradictoryTerminalDiagnostics(scoped),
  ];
  if (diagnostics.length > 0) return { ok: false, diagnostics };
  const terminals = scoped
    .filter((record): record is Extract<ConstructionOutcomeRecord, { event: "UNIT_POOL_EVENT_SET_COMMITTED" }> =>
      record.event === "UNIT_POOL_EVENT_SET_COMMITTED")
    .flatMap((record) => record.terminals)
    .filter((entry) => entry.intent === context.intent && entry.stage === context.stage);
  const failures = scoped.filter(
    (record): record is Extract<ConstructionOutcomeRecord, { event: "BOLT_FAILED" }> =>
      record.event === "BOLT_FAILED" &&
      record.target.intent === context.intent &&
      record.target.stage === context.stage,
  );
  const closures = new Set(scoped
    .filter((record): record is Extract<ConstructionOutcomeRecord, { event: "SWARM_BATON_RETURNED" }> =>
      record.event === "SWARM_BATON_RETURNED" &&
      record.target.intent === context.intent &&
      record.target.stage === context.stage)
    .map((record) => keyId(record.target)));
  const reasonByKey = new Map(failures.map((record) => [keyId(record.target), record.reason]));
  const batches = context.batches ?? [];
  const order = (left: UnitOutcomeEntry, right: UnitOutcomeEntry): number =>
    batchOrder(left, batches) - batchOrder(right, batches) || bytewise(left.unit, right.unit);
  const units = [...terminals].sort(order);
  const unresolvedFailures = units
    .filter((entry) => entry.outcome === "failed" && closures.has(keyId(entry)))
    .map((entry) => {
      const reason = reasonByKey.get(keyId(entry));
      return reason === undefined ? entry : { ...entry, reason };
    })
    .sort(order);
  const suspension = failures.find((record) => record.reason === "aborted");
  return {
    ok: true,
    projection: {
      units,
      unresolvedFailures,
      constructionSuspended: suspension !== undefined,
      ...(suspension === undefined ? {} : { suspensionReason: suspension.reason }),
    },
  };
}
