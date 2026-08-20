// amadeus-journal.ts — JSONL journal codec (Issue #1628, Phase 1 PR-2;
// schema v2 added for FR-JRN-1/2/5).
//
// The Intent Event Journal is the successor storage format for the audit
// ledger: one JSON object per line, append-only, per-clone shards, git
// versioned — the same operational envelope as the Markdown shards it
// replaces, with structured fields (idempotency key, trace context hooks,
// schema version) carried natively instead of via regex-parsed Markdown.
//
// This module is the shared canonical JSONL codec plus the Journal Module
// reader surface: v1/v2 serialize / parse, the mixed-version reader, the
// cross-clone/worktree shard merge, the v1->v2 converter, and the
// human-readable View. Everything here is filesystem-free; callers own I/O.
// The live audit and state paths, migration converter, and OTLP projector
// all share this codec. The Markdown-side renderer stays in amadeus-audit.ts
// (formatAuditRecord); amadeus-journal-convert.ts bridges the two formats
// during migration.
//
// Field-value invariant: values are stored exactly as the Markdown ledger
// stored them — CR/LF already collapsed to the literal two-character "\n"
// sequence by escapeAuditValue at append time. The codec does NOT re-escape
// or unescape; JSON.stringify handles the container encoding. One logical
// record therefore always occupies exactly one physical line.

import { createHash } from "node:crypto";

// Bumped when a wire-incompatible change lands; readers accept <= current.
// v1 remains available for the backward converter and the atomic approval
// recovery batch; live canonical audit paths use schema v2.
export const JOURNAL_SCHEMA_VERSION = 1;

// Schema v2 (FR-JRN-1): OTel-shaped records carried natively by the journal.
// Readers accept every version <= MAX; newer versions are refused (BR-10).
export const JOURNAL_SCHEMA_VERSION_V2 = 2;
export const JOURNAL_SCHEMA_VERSION_MAX = JOURNAL_SCHEMA_VERSION_V2;

// One journal record. `event` is null for raw records (the append-raw
// successor), whose body is preserved verbatim in `rawBody`; canonical
// records carry the closed event vocabulary plus ordered key/value fields.
export type JournalEntry = {
  readonly schemaVersion: number;
  // Per-shard monotonic sequence, 1-based. (cloneId, seq) is unique within
  // an intent; intentId + cloneId + seq is the global idempotency key.
  readonly seq: number;
  readonly cloneId: string;
  readonly intentId: string;
  readonly timestamp: string;
  readonly heading: string;
  readonly event: string | null;
  // Present iff event !== null. Key order is significant (render order).
  readonly fields?: Readonly<Record<string, string>>;
  // Present iff event === null: the raw body lines exactly as rendered
  // between the Timestamp line and the record terminator.
  readonly rawBody?: string;
  // Converter-only escape hatch for historical records that do not match the
  // canonical block frame (e.g. a hand-irregular leading line). rawBody then
  // holds the ENTIRE legacy segment verbatim and heading may be empty. The
  // switchover writers never produce opaque entries.
  readonly opaque?: true;
};

// v1 alias used by the mixed-version reader union (domain-entities.md).
export type V1JournalEntry = JournalEntry;

// Schema v2 journal record (FR-JRN-1). The OTel event shape carried natively:
// typed attributes, trace correlation, and an explicit idempotency key ride
// as first-class fields instead of flattened v1 string fields. The codec
// layer is filesystem-free; I/O stays with the caller.
export type JournalEntryV2 = {
  readonly schemaVersion: number; // always JOURNAL_SCHEMA_VERSION_V2
  // Unique ID of this event occurrence (registry-correlated on writer-issued
  // records; deterministically derived on converted v1 records).
  readonly eventId: string;
  // Clone-local sequence, 1-based and monotonic within a shard. Uniqueness
  // across clones/worktrees comes from cloneId (fork lineage token), never
  // from cross-clone seq coordination (BR-3/BR-4).
  readonly seq: number;
  readonly timestamp: string; // ISO 8601
  readonly eventName: string; // OTel event name
  readonly attributes: Readonly<Record<string, unknown>>; // typed attributes (JSON values)
  readonly intentId: string;
  readonly space: string;
  readonly cloneId: string;
  // Trace Context correlation; null when the record predates or lacks a
  // trace (never synthesized — BR-8).
  readonly traceId: string | null;
  readonly spanId: string | null;
  readonly traceFlags: number; // W3C trace flags (8-bit)
  // Global dedup key (BR-5). Writer-issued records stamp their own; converted
  // v1 records preserve `intentId:cloneId:seq` so conversion is idempotent
  // under merge dedup (BR-9).
  readonly idempotencyKey: string;
  // Durability marker: canonical (audit-grade) vs telemetry-classified.
  readonly canonical: boolean;
};

// The mixed-version reader output: parseJournalLine branches on
// schemaVersion and returns one of these (FR-JRN-2).
export type JournalRecord = V1JournalEntry | JournalEntryV2;

// Both record types type schemaVersion as number (v1 writers assign the
// JOURNAL_SCHEMA_VERSION constant), so narrowing goes through this guard.
export function isJournalEntryV2(record: JournalRecord): record is JournalEntryV2 {
  return record.schemaVersion === JOURNAL_SCHEMA_VERSION_V2;
}

// Idempotency key of either record version (BR-5): v1 derives it from
// identity, v2 carries it natively.
export function journalRecordKey(record: JournalRecord): string {
  return isJournalEntryV2(record) ? record.idempotencyKey : journalEntryId(record);
}

// --- normalized field access (FR-JRN-4) ---

// Field lookup over a mixed-version record under the historical audit field
// names — the NormalizedJournalRecord view (domain-entities.md) the tool
// readers consume so they never branch on the schema version. The envelope
// serves "Timestamp" on both versions. "Event" serves the v1 audit event
// type: on a v2 row the AuditLogExporter stamps it into the `Event`
// attribute (eventName carries the registry's OTel name, e.g.
// "amadeus.question.answered"), so the attribute wins and eventName is the
// fallback for converted rows (convertV1ToV2 sets eventName to the audit
// event and carries no Event attribute). Payload fields come from the v1
// fields map or the v2 attributes. v2 typed attributes normalize to the
// string form v1 carried (JSON text for non-strings; a null attribute reads
// as absent), matching the trimming the legacy accessor applied to v1 field
// values. Returns null when the field is absent. A v1 raw record
// (event: null) has no payload fields here — its preserved body is the
// caller's concern (auditBlockField scans it).
export function journalRecordField(record: JournalRecord, fieldName: string): string | null {
  if (fieldName === "Timestamp") return record.timestamp;
  if (isJournalEntryV2(record)) {
    if (fieldName === "Event") {
      const stamped = record.attributes.Event;
      return typeof stamped === "string" ? stamped.trim() : record.eventName;
    }
    const value = record.attributes[fieldName];
    if (value === undefined || value === null) return null;
    return (typeof value === "string" ? value : JSON.stringify(value)).trim();
  }
  if (fieldName === "Event") return record.event;
  const value = record.fields?.[fieldName];
  return value !== undefined ? value.trim() : null;
}

// Doctor migration-evidence read (FR-JRN-4): doctor appends are JSONL journal
// records (one per line) since the Issue #1628 switchover. Every non-empty
// line must decode through the common reader (v1 or v2) as a record whose
// event is one of the doctor health events — anything else means the doctor
// wrote something it must not, and the migration evidence refuses. Lives in
// the journal codec module (not amadeus-migrate.ts, its only caller) so the
// in-process tests (t365) never import the spawn-only migrate CLI — importing
// it would 0-stamp its whole module in LCOV (seam placement in a measured
// module).
export function parseDoctorAuditSuffix(input: string, _allowHeader: boolean): string[] | null {
  const events: string[] = [];
  for (const line of input.split("\n")) {
    if (line === "") continue;
    let record: JournalRecord;
    try {
      record = parseJournalLine(line);
    } catch {
      return null;
    }
    const event = journalRecordField(record, "Event");
    if (event !== "GUARDRAIL_LOADED" && event !== "HEALTH_CHECKED") return null;
    events.push(event);
  }
  return events;
}

// Stable global idempotency key for exactly-once projection / merge dedup.
export function journalEntryId(entry: JournalEntry): string {
  return `${entry.intentId}:${entry.cloneId}:${entry.seq}`;
}

// Fork-lineage clone token (PR-3 fork/merge design, recorded here with the
// codec so the identity scheme lives in one file): a Bolt worktree appends
// to a shard FILE named with the main clone's token (path resolution across
// fork/merge subprocesses), but its ROWS must not collide with rows the main
// clone keeps appending concurrently — both sides would otherwise continue
// from the same (cloneId, seq) tail. The worktree side therefore stamps a
// deterministic lineage token derived from the main token + Bolt slug, so
// (cloneId, seq) stays unique across the fork without any coordination.
export function forkLineageCloneId(mainCloneId: string, boltSlug: string): string {
  return createHash("md5").update(`${mainCloneId}\0${boltSlug}`).digest("hex").slice(0, 12);
}

// --- serialize ---

export class JournalCodecError extends Error {}

function assertSingleLine(value: string, what: string): void {
  if (/\r|\n/.test(value)) {
    throw new JournalCodecError(`${what} must not contain raw newlines`);
  }
}

// One entry -> one physical line (terminated by the caller's appendFileSync
// with the returned string, which includes the trailing newline). Key order
// is fixed so identical entries serialize byte-identically everywhere.
function assertSerializable(entry: JournalEntry): void {
  if (!Number.isInteger(entry.seq) || entry.seq < 1) {
    throw new JournalCodecError(`seq must be a positive integer, got ${entry.seq}`);
  }
  assertSingleLine(entry.timestamp, "timestamp");
  assertSingleLine(entry.heading, "heading");
  if (entry.event === null) {
    if (entry.fields !== undefined) {
      throw new JournalCodecError("raw entry (event: null) must not carry fields");
    }
    return;
  }
  if (entry.opaque !== undefined) {
    throw new JournalCodecError("opaque is only valid on raw entries (event: null)");
  }
  assertSingleLine(entry.event, "event");
  if (entry.rawBody !== undefined) {
    throw new JournalCodecError("canonical entry must not carry rawBody");
  }
  for (const [key, value] of Object.entries(entry.fields ?? {})) {
    assertSingleLine(key, `field key ${JSON.stringify(key)}`);
    assertSingleLine(value, `field value for ${JSON.stringify(key)}`);
  }
}

export function serializeJournalEntry(entry: JournalEntry): string {
  assertSerializable(entry);
  const wire: Record<string, unknown> = {
    schemaVersion: entry.schemaVersion,
    seq: entry.seq,
    cloneId: entry.cloneId,
    intentId: entry.intentId,
    timestamp: entry.timestamp,
    heading: entry.heading,
    event: entry.event,
  };
  if (entry.event === null) {
    wire.rawBody = entry.rawBody ?? "";
    if (entry.opaque === true) wire.opaque = true;
  } else {
    wire.fields = entry.fields ?? {};
  }
  return `${JSON.stringify(wire)}\n`;
}

// --- v2 serialize ---

// JSON values only: typed attributes must survive serialize -> parse
// byte-identically, so undefined/functions/symbols/class instances are
// refused rather than silently dropped by JSON.stringify (BR-1). Plain and
// null-prototype objects both count as JSON containers.
function isJsonObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isJsonValue(value: unknown): boolean {
  if (value === null) return true;
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      if (Array.isArray(value)) return value.every(isJsonValue);
      if (!isJsonObject(value)) return false;
      return Object.values(value as Record<string, unknown>).every(isJsonValue);
    default:
      return false;
  }
}

function isAttributesRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  if (!isJsonObject(value)) return false;
  return Object.values(value).every(isJsonValue);
}

function assertSerializableV2(entry: JournalEntryV2): void {
  if (entry.schemaVersion !== JOURNAL_SCHEMA_VERSION_V2) {
    throw new JournalCodecError(`v2 entry schemaVersion must be ${JOURNAL_SCHEMA_VERSION_V2}, got ${entry.schemaVersion}`);
  }
  if (!Number.isInteger(entry.seq) || entry.seq < 1) {
    throw new JournalCodecError(`seq must be a positive integer, got ${entry.seq}`);
  }
  assertSingleLine(entry.eventId, "eventId");
  assertSingleLine(entry.eventName, "eventName");
  assertSingleLine(entry.timestamp, "timestamp");
  assertSingleLine(entry.intentId, "intentId");
  assertSingleLine(entry.space, "space");
  assertSingleLine(entry.cloneId, "cloneId");
  assertSingleLine(entry.idempotencyKey, "idempotencyKey");
  if (entry.traceId !== null) assertSingleLine(entry.traceId, "traceId");
  if (entry.spanId !== null) assertSingleLine(entry.spanId, "spanId");
  if (!Number.isInteger(entry.traceFlags) || entry.traceFlags < 0 || entry.traceFlags > 255) {
    throw new JournalCodecError(`traceFlags must be an integer in 0..255, got ${entry.traceFlags}`);
  }
  if (typeof entry.canonical !== "boolean") {
    throw new JournalCodecError("canonical must be a boolean");
  }
  if (!isAttributesRecord(entry.attributes)) {
    throw new JournalCodecError("attributes must be a plain object of JSON values");
  }
  for (const key of Object.keys(entry.attributes)) {
    assertSingleLine(key, `attribute key ${JSON.stringify(key)}`);
  }
}

// Recursively sort object keys so identical entries serialize byte-identically
// regardless of attribute insertion order (BR-2, fixed key order). The
// accumulator is null-prototype so an attribute key of "__proto__" cannot
// hijack the prototype chain and vanish from the wire form.
function sortedJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJsonValue);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortedJsonValue(source[key]);
    }
    return sorted;
  }
  return value;
}

// One v2 entry -> one physical line, key order fixed (BR-1/BR-2).
export function serializeJournalEntryV2(entry: JournalEntryV2): string {
  assertSerializableV2(entry);
  const wire = {
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId: entry.eventId,
    seq: entry.seq,
    timestamp: entry.timestamp,
    eventName: entry.eventName,
    attributes: sortedJsonValue(entry.attributes),
    intentId: entry.intentId,
    space: entry.space,
    cloneId: entry.cloneId,
    traceId: entry.traceId,
    spanId: entry.spanId,
    traceFlags: entry.traceFlags,
    idempotencyKey: entry.idempotencyKey,
    canonical: entry.canonical,
  };
  return `${JSON.stringify(wire)}\n`;
}

// Version-dispatching serializer for mixed-version record lists (merge
// output, View normalization round-trips).
export function serializeJournalRecord(record: JournalRecord): string {
  // This is a codec dispatch, not a disk-writing call site. The deletion gate
  // registers this v1 branch explicitly so a future writer cannot hide here.
  return isJournalEntryV2(record) ? serializeJournalEntryV2(record) : serializeJournalEntry(record);
}

// --- parse ---

function isStringRecord(value: unknown): value is Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((v) => typeof v === "string");
}

// Parse one physical line back into a JournalRecord. Throws JournalCodecError
// on anything malformed — a journal shard is security-relevant state, so a
// bad line is a loud diagnosis, never a silent skip (parse, don't validate).
type JournalEnvelope = {
  schemaVersion: number;
  seq: number;
  cloneId: string;
  intentId: string;
  timestamp: string;
  heading: string;
};

// Read only the version discriminator; both version branches share the
// acceptance rule (integer >= 1, <= JOURNAL_SCHEMA_VERSION_MAX — BR-10).
function peekSchemaVersion(record: Record<string, unknown>): number {
  const schemaVersion = record.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new JournalCodecError("journal line has an invalid schemaVersion");
  }
  if (schemaVersion > JOURNAL_SCHEMA_VERSION_MAX) {
    throw new JournalCodecError(
      `journal line schemaVersion ${schemaVersion} is newer than supported ${JOURNAL_SCHEMA_VERSION_MAX}`,
    );
  }
  return schemaVersion;
}

function parseEnvelope(record: Record<string, unknown>, schemaVersion: number): JournalEnvelope {
  const seq = record.seq;
  if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 1) {
    throw new JournalCodecError("journal line has an invalid seq");
  }
  for (const key of ["cloneId", "intentId", "timestamp", "heading"] as const) {
    if (typeof record[key] !== "string") {
      throw new JournalCodecError(`journal line is missing string field ${key}`);
    }
  }
  return {
    schemaVersion,
    seq,
    cloneId: record.cloneId as string,
    intentId: record.intentId as string,
    timestamp: record.timestamp as string,
    heading: record.heading as string,
  };
}

function parseRawTail(record: Record<string, unknown>, envelope: JournalEnvelope): JournalEntry {
  if (typeof record.rawBody !== "string") {
    throw new JournalCodecError("raw journal line (event: null) must carry a string rawBody");
  }
  if (record.opaque !== undefined && record.opaque !== true) {
    throw new JournalCodecError("journal line opaque must be true when present");
  }
  return {
    ...envelope,
    event: null,
    rawBody: record.rawBody,
    ...(record.opaque === true ? { opaque: true as const } : {}),
  };
}

function parseV1Record(record: Record<string, unknown>, schemaVersion: number): JournalEntry {
  const envelope = parseEnvelope(record, schemaVersion);
  const event = record.event;
  if (event !== null && typeof event !== "string") {
    throw new JournalCodecError("journal line event must be a string or null");
  }
  if (event === null) return parseRawTail(record, envelope);
  if (!isStringRecord(record.fields)) {
    throw new JournalCodecError("canonical journal line must carry a string-valued fields object");
  }
  return { ...envelope, event, fields: record.fields };
}

function parseV2Record(record: Record<string, unknown>): JournalEntryV2 {
  for (const key of ["eventId", "eventName", "intentId", "space", "cloneId", "timestamp", "idempotencyKey"] as const) {
    if (typeof record[key] !== "string") {
      throw new JournalCodecError(`v2 journal line is missing string field ${key}`);
    }
  }
  const seq = record.seq;
  if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 1) {
    throw new JournalCodecError("v2 journal line has an invalid seq");
  }
  if (!isAttributesRecord(record.attributes)) {
    throw new JournalCodecError("v2 journal line must carry an attributes object of JSON values");
  }
  for (const key of ["traceId", "spanId"] as const) {
    if (record[key] !== null && typeof record[key] !== "string") {
      throw new JournalCodecError(`v2 journal line ${key} must be a string or null`);
    }
  }
  const traceFlags = record.traceFlags;
  if (typeof traceFlags !== "number" || !Number.isInteger(traceFlags) || traceFlags < 0 || traceFlags > 255) {
    throw new JournalCodecError("v2 journal line traceFlags must be an integer in 0..255");
  }
  if (typeof record.canonical !== "boolean") {
    throw new JournalCodecError("v2 journal line canonical must be a boolean");
  }
  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId: record.eventId as string,
    seq,
    timestamp: record.timestamp as string,
    eventName: record.eventName as string,
    attributes: record.attributes as Record<string, unknown>,
    intentId: record.intentId as string,
    space: record.space as string,
    cloneId: record.cloneId as string,
    traceId: record.traceId as string | null,
    spanId: record.spanId as string | null,
    traceFlags,
    idempotencyKey: record.idempotencyKey as string,
    canonical: record.canonical,
  };
}

export function parseJournalLine(line: string): JournalRecord {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch (cause) {
    throw new JournalCodecError(
      `journal line is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new JournalCodecError("journal line must be a JSON object");
  }
  const record = value as Record<string, unknown>;
  const schemaVersion = peekSchemaVersion(record);
  if (schemaVersion === JOURNAL_SCHEMA_VERSION_V2) return parseV2Record(record);
  return parseV1Record(record, schemaVersion);
}

// Physical line split for a JSONL shard buffer: every non-empty line is one
// record. Shared by the writers (seq derivation) and parseJournalShard.
export function splitJournalLines(buffer: string): string[] {
  return buffer.split("\n").filter((line) => line !== "");
}

// Parse a whole shard buffer (all lines). Line numbers in errors are 1-based.
// This is the v1 reader (FR-MIG-5 retention): it refuses v2 lines so existing
// v1-only consumers keep a precise type. Mixed-version callers use
// readJournalRecords instead.
export function parseJournalShard(buffer: string): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const lines = buffer.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line === "") continue; // trailing newline / blank line tolerance
    try {
      const record = parseJournalLine(line);
      if (isJournalEntryV2(record)) {
        throw new JournalCodecError("v2 journal line in a v1 shard parse; use readJournalRecords");
      }
      entries.push(record);
    } catch (cause) {
      throw new JournalCodecError(
        `line ${i + 1}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }
  return entries;
}

// The mixed-version reader (FR-JRN-2, reader-first): decodes a v1/v2 mixed
// JSONL shard buffer into the discriminated union, line by line. Strict like
// parseJournalShard — a bad line is a loud, line-numbered JournalCodecError
// (BR-10). Filesystem-free: the caller reads the shard.
export function readJournalRecords(buffer: string): JournalRecord[] {
  const records: JournalRecord[] = [];
  const lines = buffer.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line === "") continue;
    try {
      records.push(parseJournalLine(line));
    } catch (cause) {
      throw new JournalCodecError(
        `line ${i + 1}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }
  return records;
}

// --- merge (FR-JRN-2) ---

// One input shard for the merge: a named JSONL buffer. The name rides into
// decode errors so a bad line is reported with its origin, never dropped
// silently (BR-10). Filesystem-free: the caller reads the shard files.
export type JournalShard = {
  readonly sourceId: string;
  readonly buffer: string;
};

export type JournalDecodeError = {
  readonly sourceId: string;
  readonly line: number; // 1-based within the shard buffer
  readonly message: string;
};

export type MergedJournal = {
  // Deduped, deterministically ordered records, v1/v2 mixed as read — the
  // merge never converts implicitly (BR-7).
  readonly records: JournalRecord[];
  // Records removed by idempotency-key dedup (audit visibility).
  readonly duplicatesDropped: number;
  // Lines that failed to decode, with positions. Merge keeps going past a
  // bad line so one torn shard cannot hide the rest of the journal.
  readonly decodeErrors: JournalDecodeError[];
};

// Deterministic total order for merge output and the View: timestamp
// ascending, idempotency key lexicographic as tie-break, serialized form as
// the final tie-break for exact key collisions (a merge dedups those away,
// but the View can receive them). Clone-local sequences are NEVER a
// cross-shard ordering key (BR-6).
function compareJournalRecords(a: JournalRecord, b: JournalRecord): number {
  if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? -1 : 1;
  const ka = journalRecordKey(a);
  const kb = journalRecordKey(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  const sa = serializeJournalRecord(a);
  const sb = serializeJournalRecord(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

// Within one idempotency-key group the survivor is picked deterministically —
// prefer the newer schema, then the lexicographically smallest serialized
// form — so the merge result never depends on shard input order.
function pickSurvivor(group: readonly JournalRecord[]): JournalRecord {
  let best = group[0]!;
  for (const record of group.slice(1)) {
    if (record.schemaVersion !== best.schemaVersion) {
      if (record.schemaVersion > best.schemaVersion) best = record;
      continue;
    }
    if (serializeJournalRecord(record) < serializeJournalRecord(best)) best = record;
  }
  return best;
}

// Merge clone/worktree shards into one journal view (FR-JRN-2). Dedup is by
// idempotency key only (BR-5); fork lineage tokens keep (cloneId, seq)
// collision-free across worktrees so no arbitration is needed (BR-4). O(N)
// dedup via Map + one O(N log N) sort.
export function mergeShards(shards: readonly JournalShard[]): MergedJournal {
  const decodeErrors: JournalDecodeError[] = [];
  const groups = new Map<string, JournalRecord[]>();
  let total = 0;
  for (const shard of shards) {
    const lines = shard.buffer.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!;
      if (line === "") continue;
      let record: JournalRecord;
      try {
        record = parseJournalLine(line);
      } catch (cause) {
        decodeErrors.push({
          sourceId: shard.sourceId,
          line: i + 1,
          message: cause instanceof Error ? cause.message : String(cause),
        });
        continue;
      }
      total += 1;
      const key = journalRecordKey(record);
      const group = groups.get(key);
      if (group === undefined) groups.set(key, [record]);
      else group.push(record);
    }
  }
  const records = [...groups.values()].map(pickSurvivor).sort(compareJournalRecords);
  return { records, duplicatesDropped: total - records.length, decodeErrors };
}

// --- converter (v1 -> v2, FR-JRN-1) ---

export type ConvertV1Options = {
  // v1 records carry no space identity; the caller (which knows the space it
  // read the shard from) supplies it. Defaults to the framework default
  // space. Never guessed from record content (BR-8).
  readonly space?: string;
  // Maps a v1 audit event name to its OTel event name. Callers with registry
  // access (U4/U6) inject the registry mapping; the default keeps the v1
  // name, which IS the canonical audit vocabulary the registry maps onto.
  readonly eventNameFor?: (auditEvent: string) => string;
};

export type ConvertV1Result =
  | { readonly ok: true; readonly entry: JournalEntryV2 }
  // Raw (event: null) and opaque records have no canonical event to map;
  // they are skipped with an explicit reason, never silently (BR-9).
  | { readonly ok: false; readonly reason: "raw-record" | "opaque-record"; readonly message: string };

// Pure, idempotent v1 -> v2 conversion. The idempotency key is preserved so a
// converted record dedups against its v1 original under mergeShards (BR-9).
// trace/span IDs are lifted from the TraceId/SpanId fields the Bolt-1
// exporter already writes; absent them they stay null — never synthesized.
// Attributes carry the v1 fields verbatim (no-loss).
export function convertV1ToV2(entry: JournalEntry, options: ConvertV1Options = {}): ConvertV1Result {
  if (entry.event === null) {
    const reason = entry.opaque === true ? "opaque-record" : "raw-record";
    return {
      ok: false,
      reason,
      message: `${journalEntryId(entry)}: ${reason === "opaque-record" ? "opaque" : "raw"} record has no canonical event to convert`,
    };
  }
  const idempotencyKey = journalEntryId(entry);
  const fields = entry.fields ?? {};
  return {
    ok: true,
    entry: {
      schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
      // v1 has no per-event ID; derive a deterministic one from the global
      // key so conversion is reproducible.
      eventId: `v1:${idempotencyKey}`,
      seq: entry.seq,
      timestamp: entry.timestamp,
      eventName: (options.eventNameFor ?? ((auditEvent: string) => auditEvent))(entry.event),
      attributes: { ...fields },
      intentId: entry.intentId,
      space: options.space ?? "default",
      cloneId: entry.cloneId,
      traceId: typeof fields.TraceId === "string" ? fields.TraceId : null,
      spanId: typeof fields.SpanId === "string" ? fields.SpanId : null,
      traceFlags: 0,
      idempotencyKey,
      canonical: true,
    },
  };
}

// --- human-readable View (FR-JRN-5) ---

function renderAttributeValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function renderV2Block(entry: JournalEntryV2): string {
  let block = `\n## ${entry.eventName}\n`;
  block += `**Timestamp**: ${entry.timestamp}\n`;
  block += `**EventId**: ${entry.eventId}\n`;
  block += `**Seq**: ${entry.seq}\n`;
  block += `**Intent**: ${entry.intentId}\n`;
  block += `**Space**: ${entry.space}\n`;
  block += `**Clone**: ${entry.cloneId}\n`;
  if (entry.traceId !== null) block += `**TraceId**: ${entry.traceId}\n`;
  if (entry.spanId !== null) block += `**SpanId**: ${entry.spanId}\n`;
  block += `**TraceFlags**: ${entry.traceFlags}\n`;
  block += `**IdempotencyKey**: ${entry.idempotencyKey}\n`;
  block += `**Canonical**: ${entry.canonical}\n`;
  for (const key of Object.keys(entry.attributes).sort()) {
    block += `**${key}**: ${renderAttributeValue(entry.attributes[key])}\n`;
  }
  block += `\n---\n`;
  return block;
}

// Pretty-print records as human-readable text — the v2 successor of the
// Markdown audit rendering (FR-JRN-5). The ordering matches mergeShards
// exactly (timestamp + key tie-break). v1 records mixed into the input are
// normalized through convertV1ToV2 first (BR-11); raw/opaque v1 records,
// which have no canonical event, render their preserved body verbatim like
// the legacy renderer. Display-only: no record mutation, no journal writes
// (BR-12).
export function renderJournalView(records: readonly JournalRecord[]): string {
  const sorted = [...records].sort(compareJournalRecords);
  let out = "";
  for (const record of sorted) {
    if (isJournalEntryV2(record)) {
      out += renderV2Block(record);
      continue;
    }
    const converted = convertV1ToV2(record);
    if (converted.ok) {
      out += renderV2Block(converted.entry);
      continue;
    }
    out += `\n## ${record.heading || "(raw record)"}\n`;
    out += `**Timestamp**: ${record.timestamp}\n`;
    out += `${record.rawBody ?? ""}\n`;
    out += `\n---\n`;
  }
  return out;
}
