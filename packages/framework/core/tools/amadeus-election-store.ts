// amadeus-election-store.ts — the single election store: registry, path
// primitives, and canonical multi-question persistence. Domain decisions stay
// with the caller; this module owns durable ordering and consistency.
//
//   amadeus/spaces/<space>/elections/
//     elections.json  registry: one row per election (id, dirName, createdAt, status)
//     <YYMMDD>-<slug>/
//       election.json   definition (schemaVersion 2) + explicit state field
//       pending/        per-voter ballots before integration (gitignored)
//       ledger.json     integrated ballot list
//       ballots/        materialized latest ballot per voter
//       tally.json      current tally run
//       tallies/        one file per tally run, named <runId>.json
//       timeline.json   append-only tally event list
//       views/          per-voter blind distribution views
//
// Per-voter writers by decision D-09 (revised for #3046, ADR-5; revised again
// for #3225). Each voter's pending ballots live in a single file, and
// appendPending derives the next arrivalSequence purely from that voter's own
// file (read set == write set), so concurrent appends from DIFFERENT voters
// never race: they touch independent files and number independently of one
// another.
//
// Concurrent appends from the SAME voter serialise through a per-voter
// mkdir-based lock (acquirePendingLock/releasePendingLock below — the same
// atomic-mkdir idiom the audit lock in amadeus-lib.ts uses). appendPending's
// whole read-then-write window (read the voter's pending file, compute the
// next arrivalSequence, write the file back via writeStoreFile) runs inside
// that lock, so a second same-voter call never reads a snapshot the first
// call is still overwriting: it waits for the lock, then re-reads the
// winner's already-persisted event and appends on top of it. Every ballot a
// caller submits is therefore durably persisted — no same-voter write can
// silently clobber another (#3225).
//
// arrivalSequence is therefore unique per voter, not globally; cross-voter
// overlap is expected. Global ordering is a deterministic (arrivalSequence,
// voter) lexicographic comparison applied once at read time (readAllPending),
// not a property stored on disk. Every read is fail-closed: a file that does not
// decode as the canonical schema, or whose own arrivalSequence values are not
// strictly increasing, is rejected — never re-parsed under an older shape and
// never silently re-initialized or re-sorted.

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  BallotCodec,
  type CanonicalBallot,
  type CanonicalElectionDefinition,
  type CanonicalTally,
  ElectionDefinitionCodec,
  TallyCodec,
} from "./amadeus-election-codec.ts";

export type ElectionState =
  | "draft"
  | "open"
  | "collecting"
  | "partial"
  | "tallied"
  | "rendered"
  | "recorded";

export type ElectionStoreError =
  | "missing"
  | "corrupt"
  | "unsupported"
  | "io-error"
  | "duplicate"
  | "run-conflict"
  | "state-conflict"
  | "history-mismatch"
  | "tally-order-conflict"
  | "registry-mismatch";

export type ElectionStoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ElectionStoreError };

export type TallyDurableStep = "history" | "current" | "state" | "registry" | "timeline";

export type TallyCommitResult =
  | {
      readonly ok: true;
      readonly value: { readonly repaired: boolean; readonly durable: readonly TallyDurableStep[] };
    }
  | {
      readonly ok: false;
      readonly error: ElectionStoreError;
      readonly durable: readonly TallyDurableStep[];
    };

interface ResolvedElection {
  readonly dir: string;
  readonly registryEntry?: ElectionRegistryEntry;
}

interface LoadedElection {
  readonly definition: CanonicalElectionDefinition;
  readonly state: ElectionState;
  readonly resolved: ResolvedElection;
}

interface PendingEvent {
  readonly arrivalSequence: number;
  readonly ballot: CanonicalBallot;
}

interface TallyEntry {
  readonly tally: CanonicalTally;
  readonly bytes: string;
}

export type ElectionTimelineEvent = {
  readonly schemaVersion: 2;
  readonly kind: "tallied";
  readonly runId: string;
  readonly at: string;
};

export interface ElectionSnapshot {
  readonly definition: CanonicalElectionDefinition;
  readonly state: ElectionState;
  readonly pending: readonly CanonicalBallot[];
  readonly ledger: readonly CanonicalBallot[];
  readonly materialized: readonly CanonicalBallot[];
  readonly currentTally: CanonicalTally | null;
  readonly history: readonly CanonicalTally[];
  readonly timeline: readonly ElectionTimelineEvent[];
}

const ELECTION_STATES: ReadonlySet<string> = new Set<ElectionState>([
  "draft",
  "open",
  "collecting",
  "partial",
  "tallied",
  "rendered",
  "recorded",
]);

function ok<T>(value: T): ElectionStoreResult<T> {
  return { ok: true, value };
}

function err(error: ElectionStoreError): ElectionStoreResult<never> {
  return { ok: false, error };
}

function failed(error: ElectionStoreError, durable: TallyDurableStep[]): TallyCommitResult {
  return { ok: false, error, durable };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function electionsRoot(projectDir: string, space = "default"): string {
  return join(projectDir, "amadeus", "spaces", space, "elections");
}

// Staging file for a same-directory tmp+rename, carrying the same per-process
// nonce as the canonical writeFileAtomic (amadeus-lib.ts). Deriving the name
// from the destination alone would hand every writer of one path the same
// staging file, which is a shared mutable resource in the middle of an
// operation whose whole point is that it has no shared middle state (#3183).
function stagingPath(path: string): string {
  return `${path}.tmp-${process.pid}-${randomUUID()}`;
}

// Atomic write: same-directory tmp then rename (project idiom — writeFileAtomic
// class). All store writes funnel through this single path. The catch arm
// removes this call's own staging file: names are unique per call, so a
// stranded one is never reclaimed by the next write reusing the name.
export function writeStoreFile(path: string, data: string): ElectionStoreResult<void> {
  const tmp = stagingPath(path);
  try {
    writeFileSync(tmp, data);
    renameSync(tmp, path);
    return ok(undefined);
  } catch {
    rmSync(tmp, { force: true });
    return err("io-error");
  }
}

function readText(path: string): ElectionStoreResult<string> {
  if (!existsSync(path)) return err("missing");
  try {
    return ok(readFileSync(path, "utf8"));
  } catch {
    return err("io-error");
  }
}

function readJson(path: string): ElectionStoreResult<{ text: string; raw: unknown }> {
  const text = readText(path);
  if (!text.ok) return text;
  try {
    return ok({ text: text.value, raw: JSON.parse(text.value) as unknown });
  } catch {
    return err("corrupt");
  }
}

function codecError(category: string): ElectionStoreError {
  return category === "unsupported-version" ? "unsupported" : "corrupt";
}

function parseState(value: unknown): ElectionState | null {
  return typeof value === "string" && ELECTION_STATES.has(value) ? (value as ElectionState) : null;
}

function safeFileId(value: string): boolean {
  return value.length > 0 && value !== "." && value !== ".." && !/[\\/\0]/.test(value);
}

function transitionMatches(
  value: ElectionState | null,
  expected: ElectionState,
  next: ElectionState,
): boolean {
  return value !== null && [expected, next].includes(value);
}

// ---------------------------------------------------------------------------
// Elections registry
//
// A single elections.json at the elections root indexes every election: one row
// per election recording its canonical id, the physical directory name, the
// creation instant, and the last-synced state. Every reader resolves through
// this index — an election absent from the registry is not reachable.
// ---------------------------------------------------------------------------

export type ElectionRegistryEntry = {
  electionId: string;
  dirName: string;
  createdAt: string;
  status: ElectionState;
};

export function electionsRegistryPath(root: string): string {
  return join(root, "elections.json");
}

export type RegistryRead =
  | { kind: "ok"; entries: ElectionRegistryEntry[] }
  | { kind: "absent" }
  | { kind: "corrupt"; detail: string };

// A row passes iff all four required fields are present with the right primitive
// types, the two identity fields are safe single path segments, and status is a
// known ElectionState. Unknown extra fields are ignored; a missing, mistyped,
// unsafe or unknown-status field is a row-level failure that makes the whole
// read corrupt (fail-closed). Path safety is enforced HERE, at the one load
// path, so no consumer can join an unvalidated dirName onto the elections root.
export function isElectionRegistryEntry(v: unknown): v is ElectionRegistryEntry {
  if (!isRecord(v)) return false;
  if (typeof v.electionId !== "string" || !safeFileId(v.electionId)) return false;
  if (typeof v.dirName !== "string" || !safeFileId(v.dirName)) return false;
  if (typeof v.createdAt !== "string" || v.createdAt.length === 0) return false;
  if (typeof v.status !== "string" || !ELECTION_STATES.has(v.status)) return false;
  return true;
}

// Read the registry, never silently reinitializing: a missing file is `absent`
// (no election has been created yet), any parse failure or a row failing the
// row check is `corrupt` (the caller decides loudness).
export function readElectionsRegistry(root: string): RegistryRead {
  const path = electionsRegistryPath(root);
  if (!existsSync(path)) return { kind: "absent" };
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { kind: "corrupt", detail: "elections.json is unreadable" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "corrupt", detail: "elections.json is not valid JSON" };
  }
  if (!Array.isArray(parsed)) {
    return { kind: "corrupt", detail: "elections.json root is not an array" };
  }
  const entries: ElectionRegistryEntry[] = [];
  for (const row of parsed) {
    if (!isElectionRegistryEntry(row)) {
      return { kind: "corrupt", detail: "a registry row failed the 4-field check" };
    }
    entries.push({
      electionId: row.electionId,
      dirName: row.dirName,
      createdAt: row.createdAt,
      status: row.status,
    });
  }
  return { kind: "ok", entries };
}

// Physical directory of an election, resolved through the registry. Throws when
// the election has no row — there is no other path to an election directory.
export function resolveElectionDir(root: string, electionId: string): string {
  const registry = readElectionsRegistry(root);
  if (registry.kind === "corrupt") {
    throw new Error(`elections registry corrupt: ${registry.detail}`);
  }
  const entry =
    registry.kind === "ok"
      ? registry.entries.find((row) => row.electionId === electionId)
      : undefined;
  if (entry === undefined) throw new Error(`election not in registry: ${electionId}`);
  return join(root, entry.dirName);
}

// Append a new row. absent -> start a fresh []; corrupt -> loud error (never
// silently reinitialize); duplicate electionId -> loud error. On success the
// whole array is rewritten atomically via writeStoreFile.
export function appendElectionToRegistry(
  root: string,
  entry: ElectionRegistryEntry,
): ElectionStoreResult<void> {
  const read = readElectionsRegistry(root);
  if (read.kind === "corrupt") return err("corrupt");
  const entries = read.kind === "ok" ? read.entries : [];
  if (entries.some((e) => e.electionId === entry.electionId)) return err("duplicate");
  return writeStoreFile(electionsRegistryPath(root), JSON.stringify([...entries, entry], null, 2));
}

// Sync a row's status. row missing -> loud error (every election MUST carry a
// row); corrupt -> loud error; absent file -> loud missing.
export function updateElectionStatus(
  root: string,
  electionId: string,
  status: ElectionState,
): ElectionStoreResult<void> {
  const read = readElectionsRegistry(root);
  if (read.kind === "corrupt") return err("corrupt");
  if (read.kind === "absent") return err("missing");
  const idx = read.entries.findIndex((e) => e.electionId === electionId);
  if (idx < 0) return err("missing");
  const next = read.entries.map((e, i) => (i === idx ? { ...e, status } : e));
  return writeStoreFile(electionsRegistryPath(root), JSON.stringify(next, null, 2));
}

// Exact-equality bind: does this registry entry's dirName match the given
// physical directory name?
export function electionDirMatches(entry: ElectionRegistryEntry, dirName: string): boolean {
  return entry.dirName === dirName;
}

// Compact UTC date stamp YYMMDD from an ISO instant. Ported pure from
// packages/framework/core/tools/amadeus-lib.ts:dateStamp (kept local — the store
// must NOT import the framework). UTC so the stamp is timezone-independent.
function dateStamp(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

// Deterministic free-text -> kebab slug (lowercase; non-alphanumerics -> hyphens;
// collapse + trim; cap length; ensure a leading letter). Ported verbatim from
// packages/framework/core/tools/amadeus-lib.ts:slugify (kept local, framework
// not imported). Idempotent: slugify(slugify(x)) === slugify(x).
function slugify(text: string, maxLength: number): string {
  let s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  if (!/^[a-z]/.test(s)) s = `e-${s}`.replace(/-+$/g, "");
  if (s.length === 0) s = "election";
  return s;
}

// UUIDv7 -> seconds-precision UTC ISO. A version-7 UUID carries a 48-bit
// big-endian Unix-ms timestamp in its 12 leading hex digits; this decodes it.
// Returns null for any input that is not a well-formed version-7 variant-10xx
// UUID, or whose decoded instant is not a real date.
const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uuidv7ToUtcIso(uuid: string): string | null {
  if (typeof uuid !== "string" || !UUID_V7_RE.test(uuid)) return null;
  const hex = uuid.replace(/-/g, "").slice(0, 12);
  const ms = Number.parseInt(hex, 16);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Build the date-prefixed physical directory name `<YYMMDD>-<slug>` for an
// election, disambiguating collisions with a `-2`, `-3`, … counter over the
// caller-supplied set of existing names. LOUD throw after 1000 exhausted names
// (a runaway collision is a defect, never silently masked).
export function mintElectionDirName(
  electionId: string,
  createdAtIso: string,
  existingDirNames: Set<string>,
): string {
  const base = `${dateStamp(createdAtIso)}-${slugify(electionId, 24)}`;
  if (!existingDirNames.has(base)) return base;
  for (let n = 2; n <= 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!existingDirNames.has(candidate)) return candidate;
  }
  throw new Error(
    `mintElectionDirName: no free directory name for "${electionId}" after 1000 attempts`,
  );
}

// ---------------------------------------------------------------------------
// Canonical election persistence
// ---------------------------------------------------------------------------

function resolve(root: string, electionId: string): ElectionStoreResult<ResolvedElection> {
  if (!safeFileId(electionId)) return err("corrupt");
  const registry = readElectionsRegistry(root);
  if (registry.kind === "corrupt") return err("corrupt");
  if (registry.kind === "absent") return err("missing");
  const entry = registry.entries.find((row) => row.electionId === electionId);
  if (entry === undefined) return err("missing");
  return ok({ dir: join(root, entry.dirName), registryEntry: entry });
}

function decodeElection(
  resolved: ResolvedElection,
  checkRegistry = true,
): ElectionStoreResult<LoadedElection> {
  const read = readJson(join(resolved.dir, "election.json"));
  if (!read.ok) return read;
  if (!isRecord(read.value.raw)) return err("corrupt");
  const state = parseState(read.value.raw.state);
  if (state === null) return err("corrupt");
  const { state: _state, ...definitionRaw } = read.value.raw;
  const decoded = ElectionDefinitionCodec.decode(definitionRaw);
  if (!decoded.ok) return err(codecError(decoded.error.category));
  if (
    checkRegistry &&
    resolved.registryEntry !== undefined &&
    parseState(resolved.registryEntry.status) !== state
  ) {
    return err("registry-mismatch");
  }
  return ok({ definition: decoded.value, state, resolved });
}

function load(
  root: string,
  electionId: string,
  checkRegistry = true,
): ElectionStoreResult<LoadedElection> {
  const resolved = resolve(root, electionId);
  return resolved.ok ? decodeElection(resolved.value, checkRegistry) : resolved;
}

function encodeElection(
  definition: CanonicalElectionDefinition,
  state: ElectionState,
): ElectionStoreResult<string> {
  const encoded = ElectionDefinitionCodec.encode(definition);
  if (!encoded.ok) return err(codecError(encoded.error.category));
  const raw = JSON.parse(encoded.value) as unknown;
  if (!isRecord(raw)) return err("corrupt");
  return ok(JSON.stringify({ ...raw, state }, null, 2));
}

function ballotContext(ballot: CanonicalBallot): { targetQuestionIds: string[] } {
  return { targetQuestionIds: ballot.responses.map((response) => response.questionId) };
}

function encodeBallot(
  ballot: CanonicalBallot,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<string> {
  const encoded = BallotCodec.encode(ballot, definition, ballotContext(ballot));
  return encoded.ok ? ok(encoded.value) : err(codecError(encoded.error.category));
}

function decodeBallot(
  raw: unknown,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<CanonicalBallot> {
  if (!isRecord(raw)) return err("corrupt");
  if (!Array.isArray(raw.responses)) return err("corrupt");
  const ids = raw.responses.flatMap((response) =>
    isRecord(response) && typeof response.questionId === "string" ? [response.questionId] : [],
  );
  const decoded = BallotCodec.decode(raw, definition, { targetQuestionIds: ids });
  return decoded.ok ? ok(decoded.value) : err(codecError(decoded.error.category));
}

function identity(ballot: CanonicalBallot): string {
  return JSON.stringify([ballot.voter, ballot.kind, ballot.submittedAt]);
}

function idempotentBallot(
  existing: CanonicalBallot | undefined,
  ballotBytes: string,
  definition: CanonicalElectionDefinition,
  arrivalSequence: number,
): ElectionStoreResult<{ idempotent: boolean; arrivalSequence: number }> | null {
  if (existing === undefined) return null;
  const encoded = encodeBallot(existing, definition);
  if (!encoded.ok) return encoded;
  return encoded.value === ballotBytes
    ? ok({ idempotent: true, arrivalSequence })
    : err("duplicate");
}

function pendingPath(dir: string, voter: string): string {
  return join(dir, "pending", `${voter}.json`);
}

// #3225: per-(dir, voter) mutual exclusion for appendPending's read-then-write
// window. mkdir is atomic at the OS level (POSIX and Windows both guarantee
// exactly one caller observes success for a given path), so this is the same
// idiom as the audit lock in amadeus-lib.ts. Unlike that lock, this one is
// colocated directly under the voter's own pending file rather than hashed
// into the shared OS tmpdir: the resource being guarded (`<dir>/pending/<voter>.json`)
// already lives at a path that is unique per (root, electionId, voter), so
// there is no cross-identity collision to dodge and no hashing indirection is
// needed. This is the simplest concurrency-control shape that closes the
// race (compare-and-set on a whole-file rewrite would still need a check
// immediately before the rename, which is itself a second read-then-write
// window — a lock has no such residual gap), chosen over CAS for that reason.
function pendingLockDir(dir: string, voter: string): string {
  return join(dir, "pending", `.lock-${voter}`);
}

const PENDING_LOCK_RETRY_MS = 5;
// ~2s total budget. The guarded section is a single read + write of one
// voter's pending file (no I/O beyond that), so any real acquire completes
// in well under a millisecond; this budget only exists to absorb CI/dev
// machine scheduling noise, not to model a slow critical section.
const PENDING_LOCK_MAX_RETRIES = 400;

function acquirePendingLock(dir: string, voter: string): boolean {
  try {
    mkdirSync(join(dir, "pending"), { recursive: true });
  } catch {
    return false;
  }
  const lockDir = pendingLockDir(dir, voter);
  for (let attempt = 0; attempt <= PENDING_LOCK_MAX_RETRIES; attempt++) {
    try {
      mkdirSync(lockDir);
      return true;
    } catch {
      // EEXIST: another writer for this voter holds the lock. Sleep and
      // retry rather than reap — the guarded section is short-lived enough
      // that stale-owner recovery (as the audit lock needs) is not worth the
      // added complexity here; a wedged lock can only come from a process
      // that crashed mid-write, which is already an exceptional condition.
      if (attempt < PENDING_LOCK_MAX_RETRIES) {
        Bun.sleepSync(PENDING_LOCK_RETRY_MS);
      }
    }
  }
  return false;
}

function releasePendingLock(dir: string, voter: string): void {
  try {
    rmSync(pendingLockDir(dir, voter), { recursive: true, force: true });
  } catch {
    // Best-effort: a failed release only costs a future acquirer some of its
    // retry budget, never data loss — the write it guarded already committed
    // via writeStoreFile's atomic tmp+rename before release is attempted.
  }
}

function readPendingVoter(
  dir: string,
  voter: string,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<PendingEvent[]> {
  const path = pendingPath(dir, voter);
  if (!existsSync(path)) return ok([]);
  const read = readJson(path);
  if (!read.ok) return read;
  if (
    !isRecord(read.value.raw) ||
    read.value.raw.schemaVersion !== 2 ||
    read.value.raw.electionId !== definition.electionId ||
    read.value.raw.voter !== voter ||
    !Array.isArray(read.value.raw.events)
  ) {
    return err("corrupt");
  }
  const events: PendingEvent[] = [];
  let previousSequence = -1;
  for (const event of read.value.raw.events) {
    if (
      !isRecord(event) ||
      !Number.isInteger(event.arrivalSequence) ||
      (event.arrivalSequence as number) < 0
    ) {
      return err("corrupt");
    }
    const arrivalSequence = event.arrivalSequence as number;
    // ADR-5 contract 2/3: a voter's own arrivalSequence values must be
    // strictly increasing — appendPending only ever appends a new maximum, so
    // any other shape on disk (out of order, repeated, or otherwise) is
    // corruption, never silently re-sorted.
    if (arrivalSequence <= previousSequence) return err("corrupt");
    previousSequence = arrivalSequence;
    const ballot = decodeBallot(event.ballot, definition);
    if (!ballot.ok || ballot.value.voter !== voter) return err("corrupt");
    events.push({ arrivalSequence, ballot: ballot.value });
  }
  return ok(events);
}

// ADR-5 contract 3: the single shared definition of cross-voter pending
// order, applied once at read time. arrivalSequence is only unique per
// voter, so ties are broken by voter — deterministic regardless of on-disk
// write order or directory-listing order.
function comparePendingEvents(left: PendingEvent, right: PendingEvent): number {
  if (left.arrivalSequence !== right.arrivalSequence) {
    return left.arrivalSequence - right.arrivalSequence;
  }
  if (left.ballot.voter === right.ballot.voter) return 0;
  return left.ballot.voter < right.ballot.voter ? -1 : 1;
}

function readAllPending(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<PendingEvent[]> {
  const pendingDir = join(dir, "pending");
  if (!existsSync(pendingDir)) return ok([]);
  let names: string[];
  try {
    names = readdirSync(pendingDir).filter((name) => name.endsWith(".json")).sort();
  } catch {
    return err("io-error");
  }
  const events: PendingEvent[] = [];
  for (const name of names) {
    const rows = readPendingVoter(dir, name.slice(0, -5), definition);
    if (!rows.ok) return rows;
    events.push(...rows.value);
  }
  // ADR-5 contract 2: arrivalSequence is scoped per voter, so overlapping
  // values across DIFFERENT voters are expected, not corruption. Only a
  // duplicate (voter, arrivalSequence) pair is fail-closed — and since each
  // voter's own file is already checked for strict monotonicity above, that
  // can only happen if two voter files somehow decoded the same voter twice
  // (defence in depth against a future reader change, not reachable today).
  const compositeKeys = events.map((event) => `${event.ballot.voter}:${event.arrivalSequence}`);
  if (new Set(compositeKeys).size !== compositeKeys.length) {
    return err("corrupt");
  }
  return ok(events.sort(comparePendingEvents));
}

function readLedger(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<CanonicalBallot[]> {
  const read = readJson(join(dir, "ledger.json"));
  if (!read.ok) return read;
  if (!isRecord(read.value.raw) || !Array.isArray(read.value.raw.ballots)) return err("corrupt");
  if (read.value.raw.schemaVersion !== 2) return err("unsupported");
  const ballots: CanonicalBallot[] = [];
  for (const raw of read.value.raw.ballots) {
    const decoded = decodeBallot(raw, definition);
    if (!decoded.ok) return decoded;
    ballots.push(decoded.value);
  }
  return ok(ballots);
}

function ledgerBytes(ballots: readonly CanonicalBallot[]): string {
  return JSON.stringify({ schemaVersion: 2, ballots }, null, 2);
}

function materialize(
  dir: string,
  voters: readonly string[],
  ballots: readonly CanonicalBallot[],
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<void> {
  try {
    mkdirSync(join(dir, "ballots"), { recursive: true });
  } catch {
    return err("io-error");
  }
  for (const voter of voters) {
    const latest = ballots
      .filter((ballot) => ballot.voter === voter)
      .reduce<CanonicalBallot | undefined>(
        (best, candidate) =>
          best === undefined || (candidate.receivedAt ?? "") >= (best.receivedAt ?? "")
            ? candidate
            : best,
        undefined,
      );
    if (latest === undefined) continue;
    const encoded = encodeBallot(latest, definition);
    if (!encoded.ok) return encoded;
    if (!writeStoreFile(join(dir, "ballots", `${voter}.json`), encoded.value).ok) {
      return err("io-error");
    }
  }
  return ok(undefined);
}

function readMaterialized(
  dir: string,
  voters: readonly string[],
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<CanonicalBallot[]> {
  const ballots: CanonicalBallot[] = [];
  for (const voter of voters) {
    const path = join(dir, "ballots", `${voter}.json`);
    if (!existsSync(path)) continue;
    const read = readJson(path);
    if (!read.ok) return read;
    const ballot = decodeBallot(read.value.raw, definition);
    if (!ballot.ok || ballot.value.voter !== voter) return err("corrupt");
    ballots.push(ballot.value);
  }
  return ok(ballots);
}

function consumePending(dir: string, voters: readonly string[]): ElectionStoreResult<void> {
  try {
    for (const voter of voters) rmSync(pendingPath(dir, voter), { force: true });
    const pendingDir = join(dir, "pending");
    if (existsSync(pendingDir) && readdirSync(pendingDir).length === 0) {
      rmSync(pendingDir, { recursive: true });
    }
    return ok(undefined);
  } catch {
    return err("io-error");
  }
}

function mergePendingEvents(
  ledger: readonly CanonicalBallot[],
  selected: readonly PendingEvent[],
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<CanonicalBallot[]> {
  const known = new Map(ledger.map((ballot) => [identity(ballot), ballot]));
  const next = [...ledger];
  for (const event of selected) {
    const prior = known.get(identity(event.ballot));
    if (prior === undefined) {
      known.set(identity(event.ballot), event.ballot);
      next.push(event.ballot);
      continue;
    }
    const left = encodeBallot(prior, definition);
    const right = encodeBallot(event.ballot, definition);
    if (!left.ok || !right.ok) return err("corrupt");
    if (left.value !== right.value) return err("duplicate");
  }
  return ok(next);
}

function decodeTally(
  raw: unknown,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<CanonicalTally> {
  const decoded = TallyCodec.decode(raw, definition);
  return decoded.ok ? ok(decoded.value) : err(codecError(decoded.error.category));
}

function encodeTally(
  tally: CanonicalTally,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<string> {
  const encoded = TallyCodec.encode(tally, definition);
  return encoded.ok ? ok(encoded.value) : err(codecError(encoded.error.category));
}

function readCurrent(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<TallyEntry | null> {
  const path = join(dir, "tally.json");
  if (!existsSync(path)) return ok(null);
  const read = readJson(path);
  if (!read.ok) return read;
  const decoded = decodeTally(read.value.raw, definition);
  return decoded.ok ? ok({ tally: decoded.value, bytes: read.value.text }) : decoded;
}

function readHistory(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<TallyEntry[]> {
  const historyDir = join(dir, "tallies");
  if (!existsSync(historyDir)) return ok([]);
  let names: string[];
  try {
    names = readdirSync(historyDir).filter((name) => name.endsWith(".json")).sort();
  } catch {
    return err("io-error");
  }
  const history: TallyEntry[] = [];
  for (const name of names) {
    const read = readJson(join(historyDir, name));
    if (!read.ok) return read;
    const tally = decodeTally(read.value.raw, definition);
    if (!tally.ok || name !== `${tally.value.runId}.json`) return err("corrupt");
    history.push({ tally: tally.value, bytes: read.value.text });
  }
  history.sort(
    (left, right) =>
      left.tally.talliedAt.localeCompare(right.tally.talliedAt) ||
      left.tally.runId.localeCompare(right.tally.runId),
  );
  return ok(history);
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function verifyPreservation(
  prior: CanonicalTally,
  next: CanonicalTally,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<void> {
  const targets = new Set(next.targetQuestionIds);
  const priorResults = new Map(prior.results.map((result) => [result.questionId, result]));
  for (const result of next.results) {
    if (!targets.has(result.questionId) && !sameValue(result, priorResults.get(result.questionId))) {
      return err("history-mismatch");
    }
  }
  if (targets.size === definition.questions.length) {
    return next.preservedResultDigest === null ? ok(undefined) : err("history-mismatch");
  }
  const digest = TallyCodec.establishedResultsDigest(prior, definition);
  return digest.ok && digest.value === next.preservedResultDigest
    ? ok(undefined)
    : err("history-mismatch");
}

function verifyPreservationChain(
  history: readonly TallyEntry[],
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<void> {
  for (let index = 1; index < history.length; index++) {
    const checked = verifyPreservation(history[index - 1]!.tally, history[index]!.tally, definition);
    if (!checked.ok) return checked;
  }
  return ok(undefined);
}

function verifyHistory(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<TallyEntry[]> {
  const history = readHistory(dir, definition);
  if (!history.ok) return history;
  const current = readCurrent(dir, definition);
  if (!current.ok) return current;
  if (history.value.length === 0) {
    return current.value === null ? ok([]) : err("history-mismatch");
  }
  if (current.value === null || history.value.at(-1)?.bytes !== current.value.bytes) {
    return err("history-mismatch");
  }
  const preserved = verifyPreservationChain(history.value, definition);
  return preserved.ok ? history : preserved;
}

function readCommitBaseline(
  dir: string,
  definition: CanonicalElectionDefinition,
  tally: CanonicalTally,
  bytes: string,
): ElectionStoreResult<{ history: TallyEntry[]; current: TallyEntry | null }> {
  const history = readHistory(dir, definition);
  if (!history.ok) return history;
  const current = readCurrent(dir, definition);
  if (!current.ok) return current;
  if (history.value.length === 0) {
    return current.value === null
      ? ok({ history: [], current: null })
      : err("history-mismatch");
  }
  const last = history.value.at(-1) as TallyEntry;
  if (last.bytes === current.value?.bytes) {
    const verified = verifyHistory(dir, definition);
    return verified.ok ? ok({ history: verified.value, current: current.value }) : verified;
  }
  const partial = verifyPartialHistoryBaseline(history.value, current.value, tally, bytes, definition);
  return partial.ok ? ok({ history: history.value, current: current.value }) : partial;
}

function verifyPartialHistoryBaseline(
  history: readonly TallyEntry[],
  current: TallyEntry | null,
  tally: CanonicalTally,
  bytes: string,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<void> {
  const last = history.at(-1) as TallyEntry;
  if (last.tally.runId !== tally.runId) return err("history-mismatch");
  if (last.bytes !== bytes) return err("run-conflict");
  const previous = history.at(-2);
  if (previous?.bytes !== undefined && previous.bytes !== current?.bytes) {
    return err("history-mismatch");
  }
  const prefix = verifyPreservationChain(history.slice(0, -1), definition);
  if (!prefix.ok) return prefix;
  if (current !== null) {
    const checked = verifyPreservation(current.tally, tally, definition);
    if (!checked.ok) return checked;
  }
  return ok(undefined);
}

// History is ordered by (talliedAt, runId) and verification requires its tail to
// be the current tally, so a fresh run must sort strictly after every stored one.
function verifyTallyOrder(
  history: readonly TallyEntry[],
  tally: CanonicalTally,
): ElectionStoreResult<void> {
  const last = history.at(-1);
  if (last === undefined) return ok(undefined);
  const order =
    last.tally.talliedAt.localeCompare(tally.talliedAt) ||
    last.tally.runId.localeCompare(tally.runId);
  return order < 0 ? ok(undefined) : err("tally-order-conflict");
}

function verifyNewRun(
  history: readonly TallyEntry[],
  current: TallyEntry | null,
  tally: CanonicalTally,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<void> {
  if (history.some((entry) => entry.tally.runId === tally.runId)) return ok(undefined);
  const ordered = verifyTallyOrder(history, tally);
  if (!ordered.ok) return ordered;
  return current === null ? ok(undefined) : verifyPreservation(current.tally, tally, definition);
}

// Create-if-absent, staged the same way. The catch arm removes only this
// call's own staging file: it used to remove the shared `${path}.tmp` name,
// so a losing writer deleted the winner's in-flight file and failed both
// (#3183).
function createOnly(path: string, bytes: string): ElectionStoreResult<"created" | "same"> {
  if (existsSync(path)) {
    const existing = readText(path);
    if (!existing.ok) return existing;
    return existing.value === bytes ? ok("same") : err("run-conflict");
  }
  const tmp = stagingPath(path);
  try {
    writeFileSync(tmp, bytes, { flag: "wx" });
    renameSync(tmp, path);
    return ok("created");
  } catch {
    rmSync(tmp, { force: true });
    return err("io-error");
  }
}

function readTimeline(path: string): ElectionStoreResult<unknown[]> {
  const read = readJson(path);
  if (!read.ok) return read;
  return Array.isArray(read.value.raw) ? ok(read.value.raw) : err("corrupt");
}

function isTimelineEvent(value: unknown): value is ElectionTimelineEvent {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    value.kind === "tallied" &&
    typeof value.runId === "string" &&
    typeof value.at === "string"
  );
}

function validTimeline(events: readonly unknown[]): events is readonly ElectionTimelineEvent[] {
  return events.every(isTimelineEvent);
}

function appendTimeline(path: string, tally: CanonicalTally): ElectionStoreResult<"appended" | "same"> {
  const timeline = readTimeline(path);
  if (!timeline.ok) return timeline;
  const events: readonly unknown[] = timeline.value;
  if (!validTimeline(events)) return err("corrupt");
  const event: ElectionTimelineEvent = {
    schemaVersion: 2,
    kind: "tallied",
    runId: tally.runId,
    at: tally.talliedAt,
  };
  const matching = events.filter((candidate) => candidate.runId === tally.runId);
  if (matching.length > 1) return err("corrupt");
  if (matching.length === 1) {
    return sameValue(matching[0], event) ? ok("same") : err("run-conflict");
  }
  const write = writeStoreFile(path, JSON.stringify([...events, event], null, 2));
  return write.ok ? ok("appended") : err("io-error");
}

function writeCommitState(
  root: string,
  loaded: LoadedElection,
  expected: ElectionState,
  next: ElectionState,
  durable: TallyDurableStep[],
): TallyCommitResult | null {
  const registryState = parseState(loaded.resolved.registryEntry?.status);
  if (![expected, next].includes(loaded.state)) return failed("state-conflict", durable);
  if (
    loaded.resolved.registryEntry !== undefined &&
    !transitionMatches(registryState, expected, next)
  ) {
    return failed("registry-mismatch", durable);
  }
  if (loaded.state === expected) {
    const encoded = encodeElection(loaded.definition, next);
    if (!encoded.ok) return failed(encoded.error, durable);
    if (!writeStoreFile(join(loaded.resolved.dir, "election.json"), encoded.value).ok) {
      return failed("io-error", durable);
    }
  }
  durable.push("state");
  if (loaded.resolved.registryEntry === undefined) {
    durable.push("registry");
    return null;
  }
  if (registryState === expected) {
    const update = updateElectionStatus(root, loaded.definition.electionId, next);
    if (!update.ok) return failed(update.error === "corrupt" ? "corrupt" : "io-error", durable);
  }
  durable.push("registry");
  return null;
}

function writeCurrentTally(
  path: string,
  bytes: string,
  current: TallyEntry | null,
): ElectionStoreResult<boolean> {
  const same = current?.bytes === bytes;
  if (same) return ok(true);
  return writeStoreFile(path, bytes).ok ? ok(false) : err("io-error");
}

function storeCreate(
  root: string,
  definition: CanonicalElectionDefinition,
): ElectionStoreResult<void> {
  const encoded = encodeElection(definition, "draft");
  if (!encoded.ok) return encoded;
  if (!safeFileId(definition.electionId) || definition.voters.some((voter) => !safeFileId(voter))) {
    return err("corrupt");
  }
  try {
    mkdirSync(root, { recursive: true });
    const createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const dirName = mintElectionDirName(definition.electionId, createdAt, new Set(readdirSync(root)));
    const registry = appendElectionToRegistry(root, {
      electionId: definition.electionId,
      dirName,
      createdAt,
      status: "draft",
    });
    if (!registry.ok) return err(registry.error);
    const dir = join(root, dirName);
    mkdirSync(dir, { recursive: true });
    if (!writeStoreFile(join(dir, "election.json"), encoded.value).ok) return err("io-error");
    if (!writeStoreFile(join(dir, "ledger.json"), ledgerBytes([])).ok) return err("io-error");
    return writeStoreFile(join(dir, "timeline.json"), "[]").ok ? ok(undefined) : err("io-error");
  } catch {
    return err("io-error");
  }
}

export const ElectionStore = {
  create: storeCreate,

  load(
    root: string,
    electionId: string,
  ): ElectionStoreResult<{
    definition: CanonicalElectionDefinition;
    state: ElectionState;
  }> {
    const loaded = load(root, electionId);
    return loaded.ok
      ? ok({ definition: loaded.value.definition, state: loaded.value.state })
      : loaded;
  },

  readSnapshot(root: string, electionId: string): ElectionStoreResult<ElectionSnapshot> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const pending = readAllPending(loaded.value.resolved.dir, loaded.value.definition);
    if (!pending.ok) return pending;
    const ledger = readLedger(loaded.value.resolved.dir, loaded.value.definition);
    if (!ledger.ok) return ledger;
    const materialized = readMaterialized(
      loaded.value.resolved.dir,
      loaded.value.definition.voters,
      loaded.value.definition,
    );
    if (!materialized.ok) return materialized;
    const history = readHistory(loaded.value.resolved.dir, loaded.value.definition);
    if (!history.ok) return history;
    const current = readCurrent(loaded.value.resolved.dir, loaded.value.definition);
    if (!current.ok) return current;
    const verified = verifyHistory(loaded.value.resolved.dir, loaded.value.definition);
    if (!verified.ok) return verified;
    const timeline = readTimeline(join(loaded.value.resolved.dir, "timeline.json"));
    if (!timeline.ok || !validTimeline(timeline.value)) return err("corrupt");
    return ok({
      definition: loaded.value.definition,
      state: loaded.value.state,
      pending: pending.value.map((event) => event.ballot),
      ledger: ledger.value,
      materialized: materialized.value,
      currentTally: current.value?.tally ?? null,
      history: history.value.map((entry) => entry.tally),
      timeline: timeline.value,
    });
  },

  setState(root: string, electionId: string, state: ElectionState): ElectionStoreResult<void> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const encoded = encodeElection(loaded.value.definition, state);
    if (!encoded.ok) return encoded;
    if (!writeStoreFile(join(loaded.value.resolved.dir, "election.json"), encoded.value).ok) {
      return err("io-error");
    }
    if (loaded.value.resolved.registryEntry === undefined) return ok(undefined);
    return updateElectionStatus(root, electionId, state);
  },

  appendPending(
    root: string,
    electionId: string,
    ballot: CanonicalBallot,
  ): ElectionStoreResult<{ idempotent: boolean; arrivalSequence: number }> {
    if (!safeFileId(ballot.voter)) return err("corrupt");
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const encoded = encodeBallot(ballot, loaded.value.definition);
    if (!encoded.ok) return encoded;
    // #3225: serialise same-voter appendPending calls so the read-then-write
    // window below (read the voter's own pending file, compute the next
    // arrivalSequence, rewrite the whole file) can never race a sibling call
    // for the same voter — see acquirePendingLock's header comment.
    if (!acquirePendingLock(loaded.value.resolved.dir, ballot.voter)) {
      return err("io-error");
    }
    try {
      // ADR-5 contract 1: read set == write set. Numbering and the same-pending
      // identity check both come from the calling voter's own file only — an
      // identity match can never live in another voter's file anyway, since
      // identity() embeds ballot.voter. This is what removes the cross-voter
      // TOCTOU: two different voters' appendPending calls never share a read
      // (and, since #3225, never share a lock either — the lock is per-voter).
      const voterPending = readPendingVoter(
        loaded.value.resolved.dir,
        ballot.voter,
        loaded.value.definition,
      );
      if (!voterPending.ok) return voterPending;
      const sameIdentity = voterPending.value.find((event) => identity(event.ballot) === identity(ballot));
      const pendingRetry = idempotentBallot(
        sameIdentity?.ballot,
        encoded.value,
        loaded.value.definition,
        sameIdentity?.arrivalSequence ?? -1,
      );
      if (pendingRetry !== null) return pendingRetry;
      const ledger = readLedger(loaded.value.resolved.dir, loaded.value.definition);
      if (!ledger.ok) return ledger;
      const integrated = ledger.value.find((candidate) => identity(candidate) === identity(ballot));
      const ledgerRetry = idempotentBallot(integrated, encoded.value, loaded.value.definition, -1);
      if (ledgerRetry !== null) return ledgerRetry;
      const arrivalSequence = Math.max(-1, ...voterPending.value.map((event) => event.arrivalSequence)) + 1;
      try {
        mkdirSync(join(loaded.value.resolved.dir, "pending"), { recursive: true });
      } catch {
        return err("io-error");
      }
      // Re-encode previously stored events so every persisted ballot keeps the
      // codec's canonical serialization instead of a decoded object's key order.
      const events: { arrivalSequence: number; ballot: unknown }[] = [];
      for (const event of voterPending.value) {
        const reencoded = encodeBallot(event.ballot, loaded.value.definition);
        if (!reencoded.ok) return reencoded;
        events.push({
          arrivalSequence: event.arrivalSequence,
          ballot: JSON.parse(reencoded.value) as unknown,
        });
      }
      events.push({ arrivalSequence, ballot: JSON.parse(encoded.value) as unknown });
      const file = {
        schemaVersion: 2,
        electionId,
        voter: ballot.voter,
        events,
      };
      const write = writeStoreFile(
        pendingPath(loaded.value.resolved.dir, ballot.voter),
        JSON.stringify(file, null, 2),
      );
      return write.ok ? ok({ idempotent: false, arrivalSequence }) : err("io-error");
    } finally {
      releasePendingLock(loaded.value.resolved.dir, ballot.voter);
    }
  },

  integratePending(
    root: string,
    electionId: string,
    targetVoters: readonly string[],
  ): ElectionStoreResult<{ integrated: number }> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    if (new Set(targetVoters).size !== targetVoters.length) return err("duplicate");
    if (targetVoters.some((voter) => !safeFileId(voter))) return err("corrupt");
    if (targetVoters.some((voter) => !loaded.value.definition.voters.includes(voter))) {
      return err("corrupt");
    }
    const pending = readAllPending(loaded.value.resolved.dir, loaded.value.definition);
    if (!pending.ok) return pending;
    const selected = pending.value.filter((event) => targetVoters.includes(event.ballot.voter));
    const ledger = readLedger(loaded.value.resolved.dir, loaded.value.definition);
    if (!ledger.ok) return ledger;
    const merged = mergePendingEvents(ledger.value, selected, loaded.value.definition);
    if (!merged.ok) return merged;
    if (!writeStoreFile(join(loaded.value.resolved.dir, "ledger.json"), ledgerBytes(merged.value)).ok) {
      return err("io-error");
    }
    const files = materialize(
      loaded.value.resolved.dir,
      targetVoters,
      merged.value,
      loaded.value.definition,
    );
    if (!files.ok) return files;
    const consumed = consumePending(loaded.value.resolved.dir, targetVoters);
    return consumed.ok ? ok({ integrated: selected.length }) : consumed;
  },

  readTallyHistory(
    root: string,
    electionId: string,
  ): ElectionStoreResult<readonly CanonicalTally[]> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const history = verifyHistory(loaded.value.resolved.dir, loaded.value.definition);
    if (!history.ok) return history;
    // A verified empty history implies a null current tally, so the map covers
    // both shapes without re-reading the current file.
    return ok(history.value.map((entry) => entry.tally));
  },

  establishedResultsDigest(
    root: string,
    electionId: string,
    tally: CanonicalTally,
  ): ElectionStoreResult<string> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const digest = TallyCodec.establishedResultsDigest(tally, loaded.value.definition);
    return digest.ok ? ok(digest.value) : err(codecError(digest.error.category));
  },

  commitTally(
    root: string,
    electionId: string,
    tally: CanonicalTally,
    transition: { expectedState: ElectionState; nextState: ElectionState },
  ): TallyCommitResult {
    const durable: TallyDurableStep[] = [];
    if (!safeFileId(tally.runId)) return failed("corrupt", durable);
    const loaded = load(root, electionId, false);
    if (!loaded.ok) return failed(loaded.error, durable);
    const encoded = encodeTally(tally, loaded.value.definition);
    if (!encoded.ok) return failed(encoded.error, durable);
    const baseline = readCommitBaseline(
      loaded.value.resolved.dir,
      loaded.value.definition,
      tally,
      encoded.value,
    );
    if (!baseline.ok) return failed(baseline.error, durable);
    const freshRun = verifyNewRun(
      baseline.value.history,
      baseline.value.current,
      tally,
      loaded.value.definition,
    );
    if (!freshRun.ok) return failed(freshRun.error, durable);
    const historyDir = join(loaded.value.resolved.dir, "tallies");
    try {
      mkdirSync(historyDir, { recursive: true });
    } catch {
      return failed("io-error", durable);
    }
    const historyWrite = createOnly(join(historyDir, `${tally.runId}.json`), encoded.value);
    if (!historyWrite.ok) return failed(historyWrite.error, durable);
    durable.push("history");
    const currentWrite = writeCurrentTally(
      join(loaded.value.resolved.dir, "tally.json"),
      encoded.value,
      baseline.value.current,
    );
    if (!currentWrite.ok) return failed(currentWrite.error, durable);
    const currentSame = currentWrite.value;
    durable.push("current");
    const fresh = load(root, electionId, false);
    if (!fresh.ok) return failed(fresh.error, durable);
    const stateWrite = writeCommitState(
      root,
      fresh.value,
      transition.expectedState,
      transition.nextState,
      durable,
    );
    if (stateWrite !== null) return stateWrite;
    const timeline = appendTimeline(join(loaded.value.resolved.dir, "timeline.json"), tally);
    if (!timeline.ok) return failed(timeline.error, durable);
    durable.push("timeline");
    return {
      ok: true,
      value: {
        repaired: historyWrite.value === "same" || currentSame || timeline.value === "same",
        durable,
      },
    };
  },

  verify(root: string, electionId: string): ElectionStoreResult<void> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const ledger = readLedger(loaded.value.resolved.dir, loaded.value.definition);
    if (!ledger.ok) return ledger;
    const pending = readAllPending(loaded.value.resolved.dir, loaded.value.definition);
    if (!pending.ok) return pending;
    const history = verifyHistory(loaded.value.resolved.dir, loaded.value.definition);
    if (!history.ok) return history;
    const timeline = readTimeline(join(loaded.value.resolved.dir, "timeline.json"));
    if (!timeline.ok) return timeline;
    const events: readonly unknown[] = timeline.value;
    if (!validTimeline(events)) return err("corrupt");
    const runIds = events.map((event) => event.runId);
    return new Set(runIds).size === runIds.length ? ok(undefined) : err("corrupt");
  },
};
