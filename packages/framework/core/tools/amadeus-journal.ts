// amadeus-journal.ts — JSONL journal codec (Issue #1628, Phase 1 PR-2).
//
// The Intent Event Journal is the successor storage format for the audit
// ledger: one JSON object per line, append-only, per-clone shards, git
// versioned — the same operational envelope as the Markdown shards it
// replaces, with structured fields (idempotency key, trace context hooks,
// schema version) carried natively instead of via regex-parsed Markdown.
//
// This module is PURE CODEC: serialize / parse / identity helpers. It owns
// no filesystem access and is intentionally unwired — nothing imports it
// until the switchover lands (PR-3). The Markdown-side renderer stays in
// amadeus-audit.ts (formatAuditRecord); the converter
// (amadeus-journal-convert.ts) bridges the two during migration.
//
// Field-value invariant: values are stored exactly as the Markdown ledger
// stored them — CR/LF already collapsed to the literal two-character "\n"
// sequence by escapeAuditValue at append time. The codec does NOT re-escape
// or unescape; JSON.stringify handles the container encoding. One logical
// record therefore always occupies exactly one physical line.

import { createHash } from "node:crypto";

// Bumped when a wire-incompatible change lands; readers accept <= current.
export const JOURNAL_SCHEMA_VERSION = 1;

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

// --- parse ---

function isStringRecord(value: unknown): value is Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((v) => typeof v === "string");
}

// Parse one physical line back into a JournalEntry. Throws JournalCodecError
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

function parseEnvelope(record: Record<string, unknown>): JournalEnvelope {
  const schemaVersion = record.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new JournalCodecError("journal line has an invalid schemaVersion");
  }
  if (schemaVersion > JOURNAL_SCHEMA_VERSION) {
    throw new JournalCodecError(
      `journal line schemaVersion ${schemaVersion} is newer than supported ${JOURNAL_SCHEMA_VERSION}`,
    );
  }
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

export function parseJournalLine(line: string): JournalEntry {
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
  const envelope = parseEnvelope(record);
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

// Physical line split for a JSONL shard buffer: every non-empty line is one
// record. Shared by the writers (seq derivation) and parseJournalShard.
export function splitJournalLines(buffer: string): string[] {
  return buffer.split("\n").filter((line) => line !== "");
}

// Parse a whole shard buffer (all lines). Line numbers in errors are 1-based.
export function parseJournalShard(buffer: string): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const lines = buffer.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line === "") continue; // trailing newline / blank line tolerance
    try {
      entries.push(parseJournalLine(line));
    } catch (cause) {
      throw new JournalCodecError(
        `line ${i + 1}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }
  return entries;
}
