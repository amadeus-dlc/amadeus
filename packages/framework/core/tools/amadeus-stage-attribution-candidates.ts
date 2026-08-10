import { createHash } from "node:crypto";
import {
  journalRecordKey,
  journalRecordField,
  serializeJournalRecord,
} from "./amadeus-journal.ts";
import {
  CANDIDATE_FAMILIES,
  attributionCategoryForFamily,
  createCandidateId,
  createEventSetId,
  createExplicitLifecycleInterval,
  createIntentIdentity,
  createLifecycleIdentity,
  parseTargetStage,
  type AttributionCategory,
  type AttributionError,
  type AttributionResult,
  type AttributionWindow,
  type CandidateFamily,
  type CandidateFinding,
  type CandidateId,
  type CandidateRejectionReason,
  type DecodedCandidate,
  type EventSetId,
  type ExplicitLifecycleInterval,
  type IntentIdentity,
  type LifecycleIdentity,
  type RejectedCandidate,
  type TargetStage,
} from "./amadeus-stage-attribution-domain.ts";
import type { AttributedRecord } from "./amadeus-stage-stats.ts";

export { candidatePrimaryReason } from "./amadeus-stage-attribution-domain.ts";

export type AttributionCorpus = {
  readonly records: readonly AttributedRecord[];
  readonly canonicalDuplicateCount: number;
};

export type NormalizedCandidateEvent = {
  readonly sourceId: string;
  readonly sourceOrder: string;
  readonly eventSetId: EventSetId | null;
  readonly family: CandidateFamily;
  readonly category: AttributionCategory;
  readonly boundary: "start" | "terminal" | "evidence-only";
  readonly explicitIntent: IntentIdentity | null;
  readonly explicitStage: TargetStage | null;
  readonly lifecycleIdentity: LifecycleIdentity | null;
  readonly occurredAt: number | null;
};

export type DecodedInnerEvent = NormalizedCandidateEvent;

export type CandidateFamilyCount = {
  readonly family: CandidateFamily;
  readonly observed: number;
  readonly accepted: number;
  readonly rejected: number;
};

export type SecondaryDiagnostic = {
  readonly candidateId: CandidateId;
  readonly family: CandidateFamily;
  readonly reasons: readonly CandidateRejectionReason[];
  readonly sourceIds: readonly string[];
};

export type CandidateInventory = {
  readonly accepted: readonly ExplicitLifecycleInterval[];
  readonly rejected: readonly RejectedCandidate[];
  readonly familyCounts: readonly CandidateFamilyCount[];
  readonly secondaryDiagnostics: readonly SecondaryDiagnostic[];
};

export type EventSetDecodeError = Extract<AttributionError, { readonly type: "decode" }>;
export type CandidateDecodeError = EventSetDecodeError;

type ProjectedEvent = {
  readonly event: NormalizedCandidateEvent;
  readonly findings: readonly CandidateFinding[];
};

type EventSetProjection = {
  readonly outer: ProjectedEvent;
  readonly inner: readonly ProjectedEvent[];
  readonly parsedEventSetId: string | null;
};

type CandidateGroup = {
  readonly key: string;
  readonly family: CandidateFamily;
  readonly category: AttributionCategory;
  readonly explicitIntent: IntentIdentity | null;
  readonly explicitStage: TargetStage | null;
  readonly lifecycleIdentity: LifecycleIdentity | null;
  readonly events: ProjectedEvent[];
};

const EVENT_SET_FAMILIES = new Map<string, CandidateFamily>([
  ["EXECUTION_EVENT_SET_COMMITTED", "execution-event-set"],
  ["UNIT_POOL_EVENT_SET_COMMITTED", "unit-pool-event-set"],
  ["LOOP_MONITOR_EVENT_SET_COMMITTED", "loop-monitor"],
]);

const PREFIX_FAMILIES = [
  ["MERGE_DISPATCH_", "merge-dispatch"],
  ["LOOP_MONITOR_", "loop-monitor"],
  ["SUBAGENT_", "subagent"],
  ["SENSOR_", "sensor"],
  ["SWARM_", "swarm"],
  ["BOLT_", "bolt"],
] as const;

const BOUNDARIES = new Map<string, NormalizedCandidateEvent["boundary"]>([
  ["SENSOR_FIRED", "start"],
  ["SENSOR_PASSED", "terminal"],
  ["SENSOR_FAILED", "terminal"],
  ["SENSOR_BUDGET_OVERRIDE", "terminal"],
  ["SWARM_STARTED", "start"],
  ["SWARM_COMPLETED", "terminal"],
  ["BOLT_STARTED", "start"],
  ["BOLT_COMPLETED", "terminal"],
  ["BOLT_FAILED", "terminal"],
  ["SUBAGENT_STARTED", "start"],
  ["SUBAGENT_COMPLETED", "terminal"],
  ["MERGE_DISPATCH_INVOKED", "start"],
  ["MERGE_DISPATCH_RETURNED", "terminal"],
  ["MERGE_DISPATCH_FALLBACK", "terminal"],
]);

function finding(reason: CandidateRejectionReason): CandidateFinding {
  return Object.freeze({ type: "candidate-finding", reason });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string | null {
  const field = value[key];
  return typeof field === "string" && field.length > 0 ? field : null;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function bytewise(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function canonicalWire(entry: AttributedRecord): string {
  return serializeJournalRecord(entry.record).trimEnd();
}

function sourceIdentity(record: AttributedRecord): { sourceId: string; sourceOrder: string } {
  const sourceId = journalRecordKey(record.record);
  return { sourceId, sourceOrder: `${record.record.timestamp}\u0000${sourceId}\u0000${digest(canonicalWire(record))}` };
}

function explicitIntent(record: AttributedRecord): IntentIdentity | null {
  const result = createIntentIdentity(record.intent);
  return result.ok ? result.value : null;
}

function explicitStage(record: AttributedRecord): TargetStage | null {
  const value = journalRecordField(record.record, "Stage slug") ?? journalRecordField(record.record, "Stage");
  if (value === null) return null;
  const result = parseTargetStage(value);
  return result.ok ? result.value : null;
}

function identity(value: string | null): LifecycleIdentity | null {
  if (value === null) return null;
  const result = createLifecycleIdentity(value);
  return result.ok ? result.value : null;
}

function timestamp(record: AttributedRecord): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(record.record.timestamp)) return null;
  const milliseconds = Date.parse(record.record.timestamp);
  if (!Number.isFinite(milliseconds) || milliseconds % 1000 !== 0) return null;
  if (new Date(milliseconds).toISOString() !== record.record.timestamp.replace("Z", ".000Z")) return null;
  return milliseconds / 1000;
}

function familyOf(event: string): CandidateFamily | null {
  const exact = EVENT_SET_FAMILIES.get(event);
  if (exact !== undefined) return exact;
  if (event.endsWith("_TRANSACTION_COMMITTED")) return "transaction-envelope";
  for (const [prefix, family] of PREFIX_FAMILIES) {
    if (event.startsWith(prefix)) return family;
  }
  return null;
}

function recordIdentity(record: AttributedRecord, family: CandidateFamily): LifecycleIdentity | null {
  const field = (name: string): string | null => journalRecordField(record.record, name);
  switch (family) {
    case "sensor":
      return identity(field("Fire id"));
    case "swarm":
      return identity(field("Batch number"));
    case "bolt": {
      const slug = field("Bolt slug");
      if (slug !== null) return identity(slug);
      const batch = field("Batch number");
      const names = field("Bolt names");
      return batch !== null && names !== null ? identity(`batch:${batch}|bolts:${names}`) : null;
    }
    case "subagent":
      return identity(field("Agent ID"));
    case "loop-monitor": {
      const partition = field("Partition Key");
      const setId = field("Event Set Id");
      return partition !== null && setId !== null ? identity(`${partition}|${setId}`) : null;
    }
    case "merge-dispatch":
      return identity(field("Bolt slug"));
    case "transaction-envelope":
      return identity(field("Transaction Id"));
    case "execution-event-set":
    case "unit-pool-event-set":
      return null;
  }
}

function baseEvent(
  record: AttributedRecord,
  family: CandidateFamily,
  lifecycleIdentity: LifecycleIdentity | null,
  boundary: NormalizedCandidateEvent["boundary"],
  eventSetId: EventSetId | null = null,
  stage: TargetStage | null = explicitStage(record),
): NormalizedCandidateEvent {
  const source = sourceIdentity(record);
  return Object.freeze({
    ...source,
    eventSetId,
    family,
    category: attributionCategoryForFamily(family),
    boundary,
    explicitIntent: explicitIntent(record),
    explicitStage: stage,
    lifecycleIdentity,
    occurredAt: timestamp(record),
  });
}

function explicitEvidenceFindings(record: AttributedRecord): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  if (record.record.intentId !== record.intent) findings.push(finding("intent-mismatch"));
  return findings;
}

function projectPrefixRecord(record: AttributedRecord, event: string, family: CandidateFamily): ProjectedEvent {
  return {
    event: baseEvent(record, family, recordIdentity(record, family), BOUNDARIES.get(event) ?? "evidence-only"),
    findings: explicitEvidenceFindings(record),
  };
}

function eventSetError(): EventSetDecodeError {
  return {
    type: "decode",
    code: "invalid-identity",
    identity: "event-set",
    value: "invalid-event-set-envelope",
  };
}

function parseEventSetPayload(record: AttributedRecord): { value: Record<string, unknown> | null; findings: CandidateFinding[] } {
  const encoded = journalRecordField(record.record, "Event Set");
  if (encoded === null) return { value: null, findings: [finding("malformed-event-set")] };
  let value: unknown;
  try {
    value = JSON.parse(encoded);
  } catch {
    return { value: null, findings: [finding("malformed-event-set")] };
  }
  if (!isRecord(value)) return { value: null, findings: [finding("malformed-event-set")] };
  return { value, findings: [] };
}

function supportedEventSetShape(value: Record<string, unknown>, family: CandidateFamily): boolean {
  const common = stringField(value, "eventSetId") !== null &&
    stringField(value, "idempotencyKey") !== null &&
    stringField(value, "payloadFingerprint") !== null &&
    Array.isArray(value.events);
  if (!common) return false;
  if (family === "execution-event-set") {
    return stringField(value, "rootOperationId") !== null && stringField(value, "digest") !== null;
  }
  if (family === "unit-pool-event-set") return stringField(value, "batchId") !== null;
  return family === "loop-monitor" && isRecord(value.partition) && stringField(value, "partitionKey") !== null;
}

function eventSetIdentity(value: Record<string, unknown>): EventSetId | null {
  const raw = stringField(value, "eventSetId");
  if (raw === null) return null;
  const result = createEventSetId(raw);
  return result.ok ? result.value : null;
}

function eventSetEnvelopeFindings(
  record: AttributedRecord,
  family: CandidateFamily,
  value: Record<string, unknown>,
): CandidateFinding[] {
  const findings = explicitEvidenceFindings(record);
  if (!supportedEventSetShape(value, family)) findings.push(finding("unsupported-event-set-schema"));
  const setId = stringField(value, "eventSetId");
  const outerId = journalRecordField(record.record, "Event Set Id");
  if (family !== "execution-event-set" && outerId !== setId) findings.push(finding("malformed-event-set"));
  if (family === "loop-monitor" && journalRecordField(record.record, "Partition Key") !== stringField(value, "partitionKey")) {
    findings.push(finding("malformed-event-set"));
  }
  if (family === "execution-event-set" && setId !== null && Array.isArray(value.events)) {
    const computed = digest(JSON.stringify({ eventSetId: setId, events: value.events }));
    const embedded = stringField(value, "digest");
    const outer = journalRecordField(record.record, "Event Set Digest");
    if (embedded !== computed || outer !== computed) findings.push(finding("digest-mismatch"));
  }
  return findings;
}

function nestedRecord(value: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const nested = value[key];
  return isRecord(nested) ? nested : null;
}

function innerIdentity(value: Record<string, unknown>, family: CandidateFamily): LifecycleIdentity | null {
  if (family === "execution-event-set") {
    const type = stringField(value, "type");
    const envelope = type === "operation-started" ? nestedRecord(value, "operation") : nestedRecord(value, "finished");
    const operation = type === "operation-started" ? envelope : envelope === null ? null : nestedRecord(envelope, "operation");
    return identity(operation === null ? null : stringField(operation, "operationId"));
  }
  if (family === "unit-pool-event-set") {
    const type = stringField(value, "type");
    const envelope = type === "unit-acquired" ? nestedRecord(value, "attempt") : nestedRecord(value, "terminal");
    return identity(envelope === null ? null : stringField(envelope, "attemptId"));
  }
  return null;
}

function innerStage(record: AttributedRecord, value: Record<string, unknown>, family: CandidateFamily): TargetStage | null {
  if (family !== "execution-event-set") return explicitStage(record);
  const type = stringField(value, "type");
  const wrapper = type === "operation-started" ? nestedRecord(value, "operation") : nestedRecord(value, "finished");
  const operation = type === "operation-started" ? wrapper : wrapper === null ? null : nestedRecord(wrapper, "operation");
  const origin = operation === null ? null : nestedRecord(operation, "origin");
  const raw = origin === null ? null : stringField(origin, "stage");
  if (raw === null) return explicitStage(record);
  const parsed = parseTargetStage(raw);
  return parsed.ok ? parsed.value : null;
}

function innerBoundary(value: Record<string, unknown>, family: CandidateFamily): NormalizedCandidateEvent["boundary"] {
  const type = stringField(value, "type");
  if (family === "execution-event-set") {
    if (type === "operation-started") return "start";
    if (type === "operation-finished") return "terminal";
  }
  if (family === "unit-pool-event-set") {
    if (type === "unit-acquired") return "start";
    if (type === "unit-settled") return "terminal";
  }
  return "evidence-only";
}

function projectEventSet(record: AttributedRecord, family: CandidateFamily): EventSetProjection {
  const parsed = parseEventSetPayload(record);
  const fallback = baseEvent(record, family, recordIdentity(record, family), "evidence-only");
  if (parsed.value === null) return { outer: { event: fallback, findings: parsed.findings }, inner: [], parsedEventSetId: null };
  const value = parsed.value;
  const setId = eventSetIdentity(value);
  const findings = [...parsed.findings, ...eventSetEnvelopeFindings(record, family, value)];
  const outer = { event: baseEvent(record, family, recordIdentity(record, family), "evidence-only", setId), findings };
  if (!supportedEventSetShape(value, family) || setId === null || family === "loop-monitor") {
    return { outer, inner: [], parsedEventSetId: setId === null ? null : String(setId) };
  }
  const inner = (value.events as unknown[]).map((item): ProjectedEvent => {
    if (!isRecord(item)) {
      return { event: baseEvent(record, family, null, "evidence-only", setId), findings: [...findings, finding("malformed-event-set")] };
    }
    const lifecycle = innerIdentity(item, family);
    const boundary = innerBoundary(item, family);
    const innerFindings = [...findings];
    if (boundary !== "evidence-only" && lifecycle === null) innerFindings.push(finding("malformed-event-set"));
    return { event: baseEvent(record, family, lifecycle, boundary, setId, innerStage(record, item, family)), findings: innerFindings };
  });
  return { outer, inner, parsedEventSetId: String(setId) };
}

export function decodeEventSetEnvelope(
  record: AttributedRecord,
): AttributionResult<readonly DecodedInnerEvent[], EventSetDecodeError> {
  const event = journalRecordField(record.record, "Event");
  const family = event === null ? undefined : EVENT_SET_FAMILIES.get(event);
  if (family === undefined) return { ok: false, error: eventSetError() };
  const projection = projectEventSet(record, family);
  if (projection.outer.findings.length > 0 || projection.inner.some(({ findings }) => findings.length > 0)) {
    return { ok: false, error: eventSetError() };
  }
  return { ok: true, value: Object.freeze(projection.inner.map(({ event: inner }) => inner)) };
}

export function lifecycleIdentityOf(
  candidate: DecodedCandidate,
): AttributionResult<LifecycleIdentity, CandidateDecodeError> {
  if (candidate.lifecycleIdentity !== null) return { ok: true, value: candidate.lifecycleIdentity };
  const result = createLifecycleIdentity("");
  if (result.ok) throw new TypeError("empty lifecycle identity unexpectedly accepted");
  return result;
}

export function buildAttributionCorpus(
  records: readonly AttributedRecord[],
): AttributionCorpus {
  const attributionRecords = records.filter((entry) => {
    const event = journalRecordField(entry.record, "Event");
    return event !== null && familyOf(event) !== null;
  });
  const byWireIdentity = new Map<string, AttributedRecord>();
  for (const entry of attributionRecords) {
    const identity = journalRecordKey(entry.record);
    const existing = byWireIdentity.get(identity);
    if (existing === undefined || canonicalWire(entry) < canonicalWire(existing)) {
      byWireIdentity.set(identity, entry);
    }
  }
  const canonicalRecords = [...byWireIdentity.entries()]
    .sort(([left], [right]) => bytewise(left, right))
    .map(([, entry]) => entry);
  return Object.freeze({
    records: Object.freeze(canonicalRecords),
    canonicalDuplicateCount: attributionRecords.length - canonicalRecords.length,
  });
}

function partitionProjectedEvents(corpus: AttributionCorpus): {
  ordinary: ProjectedEvent[];
  eventSets: EventSetProjection[];
} {
  const ordinary: ProjectedEvent[] = [];
  const eventSets: EventSetProjection[] = [];
  for (const record of corpus.records) {
    const event = journalRecordField(record.record, "Event");
    if (event === null) continue;
    const family = familyOf(event);
    if (family === null) continue;
    if (EVENT_SET_FAMILIES.has(event)) eventSets.push(projectEventSet(record, family));
    else ordinary.push(projectPrefixRecord(record, event, family));
  }
  return { ordinary, eventSets };
}

function eventSetOccurrences(eventSets: readonly EventSetProjection[]): ReadonlyMap<string, number> {
  const byId = new Map<string, EventSetProjection[]>();
  for (const projected of eventSets) {
    if (projected.parsedEventSetId === null) continue;
    const occurrences = byId.get(projected.parsedEventSetId) ?? [];
    occurrences.push(projected);
    byId.set(projected.parsedEventSetId, occurrences);
  }
  return new Map([...byId].map(([eventSetId, occurrences]) => [eventSetId, occurrences.length]));
}

function resolvedEventSetEvents(
  eventSets: readonly EventSetProjection[],
  occurrences: ReadonlyMap<string, number>,
): ProjectedEvent[] {
  const resolved: ProjectedEvent[] = [];
  for (const projected of eventSets) {
    const collision = projected.parsedEventSetId !== null && (occurrences.get(projected.parsedEventSetId) ?? 0) > 1;
    if (collision) {
      resolved.push({
        event: { ...projected.outer.event, lifecycleIdentity: null },
        findings: [...projected.outer.findings, finding("duplicate-event-set-id")],
      });
    } else if (projected.inner.length > 0) {
      resolved.push(...projected.inner);
    } else {
      resolved.push(projected.outer);
    }
  }
  return resolved;
}

function allProjectedEvents(corpus: AttributionCorpus): ProjectedEvent[] {
  const { ordinary, eventSets } = partitionProjectedEvents(corpus);
  const projected = [...ordinary, ...resolvedEventSetEvents(eventSets, eventSetOccurrences(eventSets))];
  return projected.sort((left, right) =>
    bytewise(left.event.sourceOrder, right.event.sourceOrder) ||
    bytewise(left.event.family, right.event.family)
  );
}

function groupKey(event: NormalizedCandidateEvent): string {
  const intentToken = event.explicitIntent === null ? "missing-intent" : `intent:${event.explicitIntent}`;
  const stageToken = event.explicitStage === null ? "missing-stage" : `stage:${event.explicitStage}`;
  const identityToken = event.lifecycleIdentity === null ? `source:${event.sourceId}` : `identity:${event.lifecycleIdentity}`;
  return JSON.stringify([intentToken, stageToken, event.family, identityToken]);
}

function groupProjectedEvents(events: readonly ProjectedEvent[]): CandidateGroup[] {
  const groups = new Map<string, CandidateGroup>();
  for (const projected of events) {
    const key = groupKey(projected.event);
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, {
        key,
        family: projected.event.family,
        category: projected.event.category,
        explicitIntent: projected.event.explicitIntent,
        explicitStage: projected.event.explicitStage,
        lifecycleIdentity: projected.event.lifecycleIdentity,
        events: [projected],
      });
    } else {
      existing.events.push(projected);
    }
  }
  return [...groups.values()].sort((left, right) => bytewise(left.key, right.key));
}

function distinctFindings(findings: readonly CandidateFinding[]): CandidateFinding[] {
  const reasons = new Set(findings.map(({ reason }) => reason));
  return [...reasons].map(finding);
}

function sourceIds(group: CandidateGroup): EventSetId[] {
  const ids = [...new Set(group.events.map(({ event }) => event.sourceId))].sort();
  return ids.map((value) => {
    const result = createEventSetId(value);
    if (!result.ok) throw new TypeError("canonical source identity is invalid");
    return result.value;
  });
}

function candidateId(group: CandidateGroup): CandidateId {
  const result = createCandidateId(`candidate-${digest(group.key)}`);
  if (!result.ok) throw new TypeError("canonical candidate identity is invalid");
  return result.value;
}

function targetFindings(
  group: CandidateGroup,
  targetStage: TargetStage,
  eligibleWindows: readonly AttributionWindow[],
): CandidateFinding[] {
  const findings: CandidateFinding[] = [];
  if (group.explicitStage !== null && group.explicitStage !== targetStage) findings.push(finding("stage-mismatch"));
  if (group.explicitIntent !== null) {
    const eligible = eligibleWindows.some((window) =>
      window.intent === group.explicitIntent && window.stage === targetStage
    );
    if (!eligible) findings.push(finding("intent-mismatch"));
  }
  return findings;
}

function decodedCandidate(
  group: CandidateGroup,
  targetStage: TargetStage,
  eligibleWindows: readonly AttributionWindow[],
): DecodedCandidate {
  const ids = sourceIds(group);
  const boundaries = (kind: "start" | "terminal") => group.events
    .filter(({ event }) => event.boundary === kind)
    .map(({ event }) => ({
      sourceId: ids.find((id) => id === event.sourceId)!,
      kind,
      at: event.occurredAt,
    }));
  return Object.freeze({
    type: "decoded-candidate" as const,
    candidateId: candidateId(group),
    sourceIds: Object.freeze(ids),
    family: group.family,
    category: group.category,
    explicitIntent: group.explicitIntent,
    explicitStage: group.explicitStage,
    lifecycleIdentity: group.lifecycleIdentity,
    starts: Object.freeze(boundaries("start")),
    terminals: Object.freeze(boundaries("terminal")),
    findings: Object.freeze(distinctFindings([
      ...group.events.flatMap(({ findings }) => findings),
      ...targetFindings(group, targetStage, eligibleWindows),
    ])),
  });
}

function familyCounts(
  accepted: readonly ExplicitLifecycleInterval[],
  rejected: readonly RejectedCandidate[],
): CandidateFamilyCount[] {
  return CANDIDATE_FAMILIES.map((family) => {
    const acceptedCount = accepted.filter((candidate) => candidate.family === family).length;
    const rejectedCount = rejected.filter((candidate) => candidate.family === family).length;
    return Object.freeze({ family, observed: acceptedCount + rejectedCount, accepted: acceptedCount, rejected: rejectedCount });
  });
}

function secondaryDiagnostics(rejected: readonly RejectedCandidate[]): SecondaryDiagnostic[] {
  return rejected
    .filter(({ secondaryReasons }) => secondaryReasons.length > 0)
    .map((candidate) => Object.freeze({
      candidateId: candidate.candidateId,
      family: candidate.family,
      reasons: Object.freeze([...candidate.secondaryReasons]),
      sourceIds: Object.freeze(candidate.sourceIds.map(String)),
    }));
}

export function decodeCandidateInventory(input: {
  readonly corpus: AttributionCorpus;
  readonly targetStage: TargetStage;
  readonly eligibleWindows: readonly AttributionWindow[];
}): CandidateInventory {
  const accepted: ExplicitLifecycleInterval[] = [];
  const rejected: RejectedCandidate[] = [];
  for (const group of groupProjectedEvents(allProjectedEvents(input.corpus))) {
    const candidate = decodedCandidate(group, input.targetStage, input.eligibleWindows);
    const result = createExplicitLifecycleInterval(candidate);
    if (result.ok) accepted.push(result.value);
    else rejected.push(result.error);
  }
  accepted.sort((left, right) => bytewise(left.candidateId, right.candidateId));
  rejected.sort((left, right) => bytewise(left.candidateId, right.candidateId));
  return Object.freeze({
    accepted: Object.freeze(accepted),
    rejected: Object.freeze(rejected),
    familyCounts: Object.freeze(familyCounts(accepted, rejected)),
    secondaryDiagnostics: Object.freeze(secondaryDiagnostics(rejected)),
  });
}
