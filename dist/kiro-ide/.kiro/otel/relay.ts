// relay.ts — Local Signal Store → OTLP Collector, forwarding only
// (FR-RLY-1/2/3).
//
// This is what the old projector degrades into. The projector RECONSTRUCTED a
// trace: it read the audit journal, guessed parent/child edges from time
// containment, minted deterministic ids and synthesised timing events. None of
// that survives here. The Relay reads records the Signal Stores already hold,
// maps each one onto its OTLP shape, and forwards it. Nothing in this module
// reads the journal, and nothing in it invents a field a record does not carry
// (BR-1/BR-2).
//
// Everything past the store read is best-effort (BR-3/BR-10): a Collector that
// is down, unreachable or slow leaves a diagnostics line and a cursor that did
// not move, never an exception and never a changed workflow outcome. The
// cursor advances for delivered batches only, so an undelivered record is
// retried on the next flush rather than lost (BR-7).

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveProjectDir } from "../tools/amadeus-lib.ts";
import { resolveObservabilityConfig, telemetryDir } from "../tools/amadeus-observability.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes, scrubCredentials } from "./redaction.ts";
import type { RedactionPolicy } from "./redaction.ts";

// The three Local Signal Stores. `storeId` in the domain model is this kind,
// not a file: one kind is sharded across per-clone files, so a cursor's
// position is a per-file offset map under one kind.
export type SignalKind = "span" | "metric" | "log";

export const SIGNAL_KINDS: readonly SignalKind[] = ["span", "metric", "log"];

const STORE_PREFIX: Readonly<Record<SignalKind, string>> = {
  span: "spans-",
  metric: "metrics-",
  log: "logs-",
};

// OTLP/HTTP JSON paths, one per signal — the wire format the old projector
// already spoke, kept because FR-EXP-6 rules the exporter SDK out.
const SIGNAL_PATH: Readonly<Record<SignalKind, string>> = {
  span: "/v1/traces",
  metric: "/v1/metrics",
  log: "/v1/logs",
};

export type Cursor = {
  readonly storeId: SignalKind;
  // Store file name -> number of records already delivered from it.
  readonly position: Readonly<Record<string, number>>;
  readonly updatedAt: string;
};

export type RelayResult = {
  readonly sent: number;
  readonly skipped: number;
  readonly cursorAdvanced: boolean;
  readonly diagnostics: readonly string[];
};

// The Collector port. Production passes nothing and lands on `fetch`; a test
// passes a stub. Never a mode flag inside the sender.
export type PostOutcome = { readonly ok: boolean; readonly detail: string };
export type OtlpPost = (url: string, body: unknown) => Promise<PostOutcome>;

export type FlushOptions = {
  readonly projectDir: string;
  // Overrides the persisted cursor for that one store kind.
  readonly since?: Cursor;
  readonly batchSize?: number;
  // Collector base URL; absent means there is nowhere to forward to.
  readonly endpoint?: string;
  readonly post?: OtlpPost;
  readonly redaction?: RedactionPolicy;
  readonly retentionMs?: number;
  readonly now?: number;
};

// Provisional defaults carried over from the projector's own bounds; the
// measured values are an ADR of the Phase 1 measurement
// (performance-requirements.md § batch 読取).
export const DEFAULT_BATCH_SIZE = 500;
export const POST_TIMEOUT_MS = 5_000;

const EMPTY_RESULT: RelayResult = { sent: 0, skipped: 0, cursorAdvanced: false, diagnostics: [] };

const CURSOR_FILE = "relay-cursor.json";

export function readCursors(dir: string): Record<string, Cursor> {
  const path = join(dir, CURSOR_FILE);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, Cursor>;
  } catch {
    return {}; // an unreadable cursor replays; at-least-once tolerates that
  }
}

function writeCursors(dir: string, cursors: Record<string, Cursor>): void {
  try {
    writeFileSync(join(dir, CURSOR_FILE), `${JSON.stringify(cursors, null, 2)}\n`, "utf-8");
  } catch {
    // fail-open: a cursor we could not persist replays next flush (BR-8)
  }
}

function noteDiagnostics(dir: string, message: string): void {
  try {
    appendFileSync(join(dir, "diagnostics.log"), `${new Date().toISOString()} relay: ${message}\n`, "utf-8");
  } catch {
    // fail-open all the way down
  }
}

function storeFiles(dir: string, kind: SignalKind): string[] {
  return readdirSync(dir)
    .filter((name) => name.startsWith(STORE_PREFIX[kind]) && name.endsWith(".jsonl"))
    .sort();
}

// One store line, already complete when it was written. The Relay carries it
// forward; it does not add to it (BR-2).
export type SignalStoreRecord = {
  readonly storeId: SignalKind;
  readonly file: string;
  readonly payload: Record<string, unknown>;
};

function parseStoreLines(raw: string, kind: SignalKind, file: string, from: number): SignalStoreRecord[] {
  const records: SignalStoreRecord[] = [];
  let index = 0;
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    index += 1;
    if (index <= from) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (parsed !== null && typeof parsed === "object") {
        records.push({ storeId: kind, file, payload: parsed as Record<string, unknown> });
      }
    } catch {
      // a torn line is dropped; a half-written record is not a Relay failure
    }
  }
  return records;
}

// Reads at most `batchSize` records past the cursor, in file order, and
// reports how many of each file they came from so a delivered batch can move
// exactly that far (BR-7).
export function readPending(
  dir: string,
  kind: SignalKind,
  cursor: Cursor | undefined,
  batchSize: number
): { readonly records: readonly SignalStoreRecord[]; readonly consumed: Record<string, number> } {
  const records: SignalStoreRecord[] = [];
  const consumed: Record<string, number> = {};
  for (const file of storeFiles(dir, kind)) {
    if (records.length >= batchSize) break;
    let raw: string;
    try {
      raw = readFileSync(join(dir, file), "utf-8");
    } catch {
      continue; // an unreadable shard never blocks the other shards
    }
    const from = cursor?.position[file] ?? 0;
    const room = batchSize - records.length;
    const pending = parseStoreLines(raw, kind, file, from).slice(0, room);
    if (pending.length === 0) continue;
    records.push(...pending);
    consumed[file] = pending.length;
  }
  return { records, consumed };
}

// --- OTLP mapping -----------------------------------------------------------
//
// A pure projection of what the record holds. Every id, timestamp and status
// comes off the record; a field the record does not carry is absent from the
// payload rather than derived (BR-2).

const anyValue = (value: unknown): Record<string, unknown> => {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: JSON.stringify(value ?? null) };
};

// Export-boundary redaction (FR-DST-3 layer 2, ALWAYS export-boundary rule):
// the attribute bag is filtered again on the way out, so a record that reached
// the store before a policy tightened cannot leave the machine unfiltered.
function otlpAttributes(value: unknown, policy: RedactionPolicy): Record<string, unknown>[] {
  if (value === null || typeof value !== "object") return [];
  return Object.entries(redactAttributes(value as Record<string, unknown>, policy)).map(([key, item]) => ({
    key,
    value: anyValue(item),
  }));
}

const nano = (ms: unknown): string =>
  typeof ms === "number" && Number.isFinite(ms) ? `${BigInt(Math.max(0, Math.round(ms)))}000000` : "0";

const SPAN_KIND_CODE: Readonly<Record<string, number>> = {
  INTERNAL: 1,
  SERVER: 2,
  CLIENT: 3,
  PRODUCER: 4,
  CONSUMER: 5,
};

const STATUS_CODE: Readonly<Record<string, number>> = { UNSET: 0, OK: 1, ERROR: 2 };

function otlpSpanEvents(payload: Record<string, unknown>, policy: RedactionPolicy): Record<string, unknown>[] {
  const events = Array.isArray(payload.events) ? (payload.events as Record<string, unknown>[]) : [];
  return events.map((event) => ({
    name: String(event.name ?? ""),
    timeUnixNano: nano(event.timeMs),
    attributes: otlpAttributes(event.attributes, policy),
  }));
}

function otlpSpanLinks(payload: Record<string, unknown>, policy: RedactionPolicy): Record<string, unknown>[] {
  const links = Array.isArray(payload.links) ? (payload.links as Record<string, unknown>[]) : [];
  return links.map((link) => ({
    traceId: String(link.traceId ?? ""),
    spanId: String(link.spanId ?? ""),
    attributes: otlpAttributes(link.attributes, policy),
  }));
}

function otlpSpanStatus(payload: Record<string, unknown>): Record<string, unknown> {
  const status = (payload.status ?? {}) as { code?: unknown; message?: unknown };
  return {
    code: STATUS_CODE[String(status.code ?? "UNSET")] ?? 0,
    ...(typeof status.message === "string" ? { message: status.message } : {}),
  };
}

function otlpSpan(payload: Record<string, unknown>, policy: RedactionPolicy): Record<string, unknown> {
  return {
    traceId: String(payload.traceId ?? ""),
    spanId: String(payload.spanId ?? ""),
    ...(typeof payload.parentSpanId === "string" ? { parentSpanId: payload.parentSpanId } : {}),
    name: String(payload.name ?? ""),
    kind: SPAN_KIND_CODE[String(payload.kind ?? "INTERNAL")] ?? 1,
    startTimeUnixNano: nano(payload.startMs),
    endTimeUnixNano: nano(payload.endMs),
    attributes: otlpAttributes(payload.attributes, policy),
    events: otlpSpanEvents(payload, policy),
    links: otlpSpanLinks(payload, policy),
    status: otlpSpanStatus(payload),
  };
}

// Resource is the exporter's own identity bag (service name, instance id), so
// it keeps its keys rather than passing the default-deny attribute filter —
// but its values are credential-scrubbed like everything else leaving the
// machine.
function resourceAttributes(
  records: readonly SignalStoreRecord[],
  policy: RedactionPolicy
): Record<string, unknown>[] {
  const merged: Record<string, unknown> = {};
  for (const record of records) {
    const resource = record.payload.resource;
    if (resource === null || typeof resource !== "object") continue;
    Object.assign(merged, resource as Record<string, unknown>);
  }
  return Object.entries(merged).map(([key, value]) => ({
    key,
    value: anyValue(scrubCredentials(value, policy.scrubPatterns)),
  }));
}

const SCOPE = { name: "amadeus-otel-relay" };

export function toOtlpTraces(
  records: readonly SignalStoreRecord[],
  policy: RedactionPolicy = DEFAULT_REDACTION_POLICY
): unknown {
  return {
    resourceSpans: [
      {
        resource: { attributes: resourceAttributes(records, policy) },
        scopeSpans: [{ scope: SCOPE, spans: records.map((record) => otlpSpan(record.payload, policy)) }],
      },
    ],
  };
}

const isoNano = (timestamp: unknown): string => {
  const parsed = typeof timestamp === "string" ? Date.parse(timestamp) : Number.NaN;
  return Number.isNaN(parsed) ? "0" : nano(parsed);
};

const correlation = (payload: Record<string, unknown>): Record<string, string> => ({
  ...(typeof payload.traceId === "string" ? { traceId: payload.traceId } : {}),
  ...(typeof payload.spanId === "string" ? { spanId: payload.spanId } : {}),
});

// One OTLP metric per store record: the store holds already-measured points,
// so there is no aggregation step here to invent one (BR-2). A counter maps to
// a monotonic sum, a histogram to a single-observation histogram point — the
// two instrument kinds the Metrics subset admits (FR-EXP-5).
function otlpMetric(payload: Record<string, unknown>, policy: RedactionPolicy): Record<string, unknown> {
  const value = typeof payload.value === "number" ? payload.value : 0;
  const point = {
    timeUnixNano: isoNano(payload.timestamp),
    attributes: otlpAttributes(payload.attributes, policy),
    ...correlation(payload),
  };
  const name = String(payload.name ?? "");
  if (payload.kind === "histogram") {
    return {
      name,
      histogram: {
        aggregationTemporality: 2,
        dataPoints: [{ ...point, count: "1", sum: value }],
      },
    };
  }
  return {
    name,
    sum: {
      aggregationTemporality: 2,
      isMonotonic: true,
      dataPoints: [{ ...point, asDouble: value }],
    },
  };
}

export function toOtlpMetrics(
  records: readonly SignalStoreRecord[],
  policy: RedactionPolicy = DEFAULT_REDACTION_POLICY
): unknown {
  return {
    resourceMetrics: [
      {
        resource: { attributes: resourceAttributes(records, policy) },
        scopeMetrics: [{ scope: SCOPE, metrics: records.map((record) => otlpMetric(record.payload, policy)) }],
      },
    ],
  };
}

function otlpLog(payload: Record<string, unknown>, policy: RedactionPolicy): Record<string, unknown> {
  const body = typeof payload.body === "string" ? payload.body : String(payload.name ?? "");
  return {
    timeUnixNano: isoNano(payload.timestamp),
    body: { stringValue: body },
    attributes: otlpAttributes(payload.attributes, policy),
    ...correlation(payload),
  };
}

export function toOtlpLogs(
  records: readonly SignalStoreRecord[],
  policy: RedactionPolicy = DEFAULT_REDACTION_POLICY
): unknown {
  return {
    resourceLogs: [
      {
        resource: { attributes: resourceAttributes(records, policy) },
        scopeLogs: [{ scope: SCOPE, logRecords: records.map((record) => otlpLog(record.payload, policy)) }],
      },
    ],
  };
}

type OtlpBody = (records: readonly SignalStoreRecord[], policy: RedactionPolicy) => unknown;

const BODY_OF: Readonly<Record<SignalKind, OtlpBody>> = {
  span: toOtlpTraces,
  metric: toOtlpMetrics,
  log: toOtlpLogs,
};

// --- flush ------------------------------------------------------------------

async function defaultPost(url: string, body: unknown): Promise<PostOutcome> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
    });
    return response.ok ? { ok: true, detail: "" } : { ok: false, detail: `status ${response.status}` };
  } catch (cause) {
    // Only the error KIND travels into diagnostics — never a response body or
    // header (security-design.md § diagnostics の節度設計).
    return { ok: false, detail: cause instanceof Error ? cause.name : "post failed" };
  }
}

function advanced(cursor: Cursor | undefined, kind: SignalKind, consumed: Record<string, number>, at: string): Cursor {
  const position: Record<string, number> = { ...(cursor?.position ?? {}) };
  for (const [file, count] of Object.entries(consumed)) {
    position[file] = (position[file] ?? 0) + count;
  }
  return { storeId: kind, position, updatedAt: at };
}

// --- duplicate tracking -----------------------------------------------------
//
// Delivery is at-least-once and stays that way (BR-8). A lost cursor replays a
// batch, and the Relay does NOT suppress the replay — suppression here would
// be exactly-once dressed up, and the Collector is the side that decides how
// to absorb a repeat. What the Relay owes is visibility: a key it has already
// delivered is reported as a duplicate so a repeat in the Collector has a
// traceable origin.

const IDEMPOTENCY_FILE = "relay-idempotency.json";

// The record's own identity — ids for a span, name plus timestamp for the
// other two. Nothing is minted: a record without an identity of its own is not
// tracked rather than given a synthetic key (BR-2).
export function idempotencyKey(record: SignalStoreRecord): string | null {
  const payload = record.payload;
  if (record.storeId === "span") {
    if (typeof payload.traceId !== "string" || typeof payload.spanId !== "string") return null;
    return `span:${payload.traceId}:${payload.spanId}`;
  }
  if (typeof payload.timestamp !== "string") return null;
  return `${record.storeId}:${String(payload.name ?? "")}:${payload.timestamp}`;
}

function readIdempotency(dir: string): Record<string, string> {
  const path = join(dir, IDEMPOTENCY_FILE);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeIdempotency(dir: string, tracked: Record<string, string>): void {
  try {
    writeFileSync(join(dir, IDEMPOTENCY_FILE), `${JSON.stringify(tracked, null, 2)}\n`, "utf-8");
  } catch {
    // best-effort: losing the tracking file costs visibility, not delivery
  }
}

// Drops tracking entries older than the retention window, so the file follows
// the stores it describes instead of growing without bound.
function pruneIdempotency(tracked: Record<string, string>, nowMs: number, retentionMs: number): void {
  for (const [key, sentAt] of Object.entries(tracked)) {
    const at = Date.parse(sentAt);
    if (!Number.isNaN(at) && nowMs - at > retentionMs) delete tracked[key];
  }
}

// Records what was delivered and reports how many of those keys had already
// been delivered before.
function trackDelivered(records: readonly SignalStoreRecord[], tracked: Record<string, string>, at: string): number {
  let repeats = 0;
  for (const record of records) {
    const key = idempotencyKey(record);
    if (key === null) continue;
    if (key in tracked) repeats += 1;
    else tracked[key] = at;
  }
  return repeats;
}

// --- retention and rotation -------------------------------------------------
//
// Compaction removes DELIVERED records only, so a store never loses a record
// the cursor has not passed (BR-11). Two conditions trigger it: a delivered
// record older than the retention window, and a store file over the rotation
// size. Both provisional pending the Phase 1 ADR.

export const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const ROTATION_MAX_BYTES = 8 * 1024 * 1024;

// The record's own time. Spans carry epoch millis, metrics and logs an ISO
// timestamp; a record with neither is treated as fresh, so an unreadable time
// keeps a record rather than dropping it.
function recordTimeMs(payload: Record<string, unknown>): number | null {
  if (typeof payload.endMs === "number") return payload.endMs;
  if (typeof payload.startMs === "number") return payload.startMs;
  if (typeof payload.timestamp === "string") {
    const parsed = Date.parse(payload.timestamp);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function expired(line: string, nowMs: number, retentionMs: number): boolean {
  try {
    const parsed: unknown = JSON.parse(line);
    if (parsed === null || typeof parsed !== "object") return true;
    const time = recordTimeMs(parsed as Record<string, unknown>);
    return time !== null && nowMs - time > retentionMs;
  } catch {
    return true; // a torn line is never delivered again; compaction drops it
  }
}

// Rewrites one store file without its expired delivered prefix and returns how
// many records went, so the caller can shrink the cursor by exactly that much.
function compactStoreFile(dir: string, file: string, delivered: number, nowMs: number, retentionMs: number): number {
  const path = join(dir, file);
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return 0;
  }
  const lines = raw.split("\n").filter((line) => line.trim() !== "");
  if (delivered === 0) return 0;
  const oversized = Buffer.byteLength(raw, "utf-8") > ROTATION_MAX_BYTES;
  let drop = 0;
  while (drop < delivered && (oversized || expired(lines[drop] as string, nowMs, retentionMs))) {
    drop += 1;
  }
  if (drop === 0) return 0;
  try {
    const kept = lines.slice(drop);
    writeFileSync(path, kept.length === 0 ? "" : `${kept.join("\n")}\n`, "utf-8");
  } catch {
    return 0; // a failed rewrite leaves the store as it was; the cursor holds
  }
  return drop;
}

function compact(dir: string, cursors: Record<string, Cursor>, nowMs: number, retentionMs: number): boolean {
  let changed = false;
  for (const kind of SIGNAL_KINDS) {
    const cursor = cursors[kind];
    if (cursor === undefined) continue;
    const position: Record<string, number> = { ...cursor.position };
    for (const [file, delivered] of Object.entries(position)) {
      const dropped = compactStoreFile(dir, file, delivered, nowMs, retentionMs);
      if (dropped === 0) continue;
      position[file] = delivered - dropped;
      changed = true;
    }
    if (changed) cursors[kind] = { ...cursor, position };
  }
  return changed;
}

const LOCK_DIR = ".relay-lock";
const LOCK_STALE_MS = 10 * 60 * 1000;

// mkdir is the atomic primitive; a lock whose owner stamp is older than the
// stale window is reclaimed once (a process that died mid-flush must not stop
// every later flush). Contention is never waited out: the flush gives up
// (BR-9), because a session-end trigger has nothing to gain from queueing.
function acquireLock(dir: string): boolean {
  const lock = join(dir, LOCK_DIR);
  try {
    mkdirSync(lock);
    writeFileSync(join(lock, "owner.json"), JSON.stringify({ pid: process.pid, startedAtMs: Date.now() }), "utf-8");
    return true;
  } catch {
    try {
      const owner = JSON.parse(readFileSync(join(lock, "owner.json"), "utf-8")) as { startedAtMs?: number };
      if (typeof owner.startedAtMs === "number" && Date.now() - owner.startedAtMs > LOCK_STALE_MS) {
        rmSync(lock, { recursive: true, force: true });
        return acquireLock(dir);
      }
    } catch {
      // an unreadable stamp counts as held: skipping a flush is the safe arm
    }
    return false;
  }
}

function releaseLock(dir: string): void {
  try {
    rmSync(join(dir, LOCK_DIR), { recursive: true, force: true });
  } catch {
    // best-effort; a stale lock is reclaimed by the next flush
  }
}

export async function flushSignals(options: FlushOptions): Promise<RelayResult> {
  const dir = telemetryDir(options.projectDir);
  if (dir === null || !existsSync(dir)) return EMPTY_RESULT;
  if (!acquireLock(dir)) {
    const note = "another flush holds the lock — this flush ends immediately";
    noteDiagnostics(dir, note);
    return { ...EMPTY_RESULT, diagnostics: [note] };
  }
  try {
    return await flushLocked(dir, options);
  } finally {
    releaseLock(dir);
  }
}

// One signal's forwarding attempt. Returns what happened so the caller stays a
// plain fold over the three kinds.
type KindOutcome = {
  readonly sent: number;
  readonly skipped: number;
  readonly cursor: Cursor | null;
  readonly diagnostics: readonly string[];
};

const NOTHING_PENDING: KindOutcome = { sent: 0, skipped: 0, cursor: null, diagnostics: [] };

async function flushKind(
  dir: string,
  kind: SignalKind,
  cursor: Cursor | undefined,
  tracked: Record<string, string>,
  options: FlushOptions,
  at: string
): Promise<KindOutcome> {
  const { records, consumed } = readPending(dir, kind, cursor, options.batchSize ?? DEFAULT_BATCH_SIZE);
  if (records.length === 0) return NOTHING_PENDING;
  if (options.endpoint === undefined) {
    return {
      sent: 0,
      skipped: records.length,
      cursor: null,
      diagnostics: [`${kind}: no collector endpoint configured — ${records.length} record(s) left pending`],
    };
  }
  const policy = options.redaction ?? DEFAULT_REDACTION_POLICY;
  const post = options.post ?? defaultPost;
  const url = `${options.endpoint.replace(/\/$/, "")}${SIGNAL_PATH[kind]}`;
  const outcome = await post(url, BODY_OF[kind](records, policy));
  if (!outcome.ok) {
    // The Collector being down is not a failure: the cursor stays put and the
    // batch is retried next flush (BR-3/BR-7/BR-10).
    const note = `${kind}: collector unreachable (${outcome.detail}) — ${records.length} record(s) retried next flush`;
    noteDiagnostics(dir, note);
    return { sent: 0, skipped: records.length, cursor: null, diagnostics: [note] };
  }
  const repeats = trackDelivered(records, tracked, at);
  return {
    sent: records.length,
    skipped: 0,
    cursor: advanced(cursor, kind, consumed, at),
    diagnostics:
      repeats > 0 ? [`${kind}: ${repeats} record(s) delivered a second time (duplicate, at-least-once)`] : [],
  };
}

async function flushLocked(dir: string, options: FlushOptions): Promise<RelayResult> {
  const at = new Date(options.now ?? Date.now()).toISOString();
  const cursors = readCursors(dir);
  const tracked = readIdempotency(dir);
  const diagnostics: string[] = [];
  let sent = 0;
  let skipped = 0;
  let cursorAdvanced = false;

  for (const kind of SIGNAL_KINDS) {
    const cursor = options.since?.storeId === kind ? options.since : cursors[kind];
    const outcome = await flushKind(dir, kind, cursor, tracked, options, at);
    sent += outcome.sent;
    skipped += outcome.skipped;
    diagnostics.push(...outcome.diagnostics);
    if (outcome.cursor !== null) {
      cursors[kind] = outcome.cursor;
      cursorAdvanced = true;
    }
  }

  const nowMs = options.now ?? Date.now();
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  const compacted = compact(dir, cursors, nowMs, retentionMs);
  if (cursorAdvanced || compacted) writeCursors(dir, cursors);
  if (sent > 0) {
    pruneIdempotency(tracked, nowMs, retentionMs);
    writeIdempotency(dir, tracked);
  }
  return { sent, skipped, cursorAdvanced, diagnostics };
}

// --- session-end entry point ------------------------------------------------
//
// The one CLI boundary in otel/ (components.md § 境界と所有権). session-end
// spawns it detached: the flush is a fire-and-forget forwarding pass, and the
// hook's own outcome never depends on it (BR-13, NFR-2).

export type RelaySummary = {
  readonly status: "flushed" | "disabled" | "no-endpoint" | "no-intent";
  readonly result?: RelayResult;
};

// The standard OTEL_ env wins over the configured value (設計裁定 Q11).
export function resolveEndpoint(projectDir: string, env: Record<string, string | undefined>): string | undefined {
  const fromEnv = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  return resolveObservabilityConfig(projectDir).otlpEndpoint;
}

export async function runRelay(
  projectDir: string,
  options: { readonly post?: OtlpPost; readonly env?: Record<string, string | undefined>; readonly now?: number } = {}
): Promise<RelaySummary> {
  if (!resolveObservabilityConfig(projectDir).enabled) return { status: "disabled" };
  const endpoint = resolveEndpoint(projectDir, options.env ?? process.env);
  if (endpoint === undefined) return { status: "no-endpoint" };
  if (telemetryDir(projectDir) === null) return { status: "no-intent" };
  const result = await flushSignals({
    projectDir,
    endpoint,
    ...(options.post !== undefined ? { post: options.post } : {}),
    ...(options.now !== undefined ? { now: options.now } : {}),
  });
  return { status: "flushed", result };
}

export function parseCliArgs(argv: readonly string[]): { readonly projectDir?: string } {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--project-dir") return { projectDir: argv[i + 1] };
  }
  return {};
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args[0] !== "flush") {
    process.stderr.write("Usage: relay.ts flush [--project-dir <path>]\n");
    process.exit(1);
  }
  const summary = await runRelay(resolveProjectDir(parseCliArgs(args.slice(1)).projectDir));
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}
