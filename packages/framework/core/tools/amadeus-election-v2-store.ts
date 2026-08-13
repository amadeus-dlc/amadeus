// Canonical v2 persistence for multi-question elections. Domain decisions
// stay with the caller; this module owns durable ordering and consistency.

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
  BallotV2Codec,
  type CanonicalBallot,
  type CanonicalElectionDefinition,
  type CanonicalTally,
  ElectionDefinitionCodec,
  TallyV2Codec,
} from "./amadeus-election-codec.ts";
import type { ElectionState } from "./amadeus-election-model.ts";
import {
  appendElectionToRegistry,
  type ElectionRegistryEntry,
  mintElectionDirName,
  readElectionsRegistry,
  updateElectionStatus,
  writeStoreFile,
} from "./amadeus-election-store.ts";

export type ElectionV2State =
  | "draft"
  | "open"
  | "collecting"
  | "partial"
  | "tallied"
  | "rendered"
  | "recorded";

export type ElectionV2StoreError =
  | "missing"
  | "corrupt"
  | "unsupported"
  | "io-error"
  | "duplicate"
  | "run-conflict"
  | "state-conflict"
  | "history-mismatch"
  | "registry-mismatch";

export type ElectionV2StoreResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ElectionV2StoreError };

export type TallyDurableStep = "history" | "current" | "state" | "registry" | "timeline";

export type TallyCommitResult =
  | {
      readonly ok: true;
      readonly value: { readonly repaired: boolean; readonly durable: readonly TallyDurableStep[] };
    }
  | {
      readonly ok: false;
      readonly error: ElectionV2StoreError;
      readonly durable: readonly TallyDurableStep[];
    };

interface ResolvedElection {
  readonly dir: string;
  readonly registryEntry?: ElectionRegistryEntry;
}

interface LoadedElection {
  readonly definition: CanonicalElectionDefinition;
  readonly state: ElectionV2State;
  readonly legacy: boolean;
  readonly resolved: ResolvedElection;
}

interface PendingEvent {
  readonly arrivalSequence: number;
  readonly ballot: CanonicalBallot;
}

interface TallyEntry {
  readonly tally: CanonicalTally;
  readonly bytes: string;
  readonly legacy: boolean;
}

export type ElectionV2TimelineEvent = {
  readonly schemaVersion: 2;
  readonly kind: "tallied";
  readonly runId: string;
  readonly at: string;
};

export type ElectionV2TimelineRow = ElectionV2TimelineEvent | {
  readonly kind: "distributed" | "ballot" | "tallied" | "late";
  readonly at: string;
  readonly receivedAt?: string;
  readonly detail: string;
  readonly voter?: string;
};

export interface ElectionV2Snapshot {
  readonly definition: CanonicalElectionDefinition;
  readonly state: ElectionV2State;
  readonly pending: readonly CanonicalBallot[];
  readonly ledger: readonly CanonicalBallot[];
  readonly materialized: readonly CanonicalBallot[];
  readonly currentTally: CanonicalTally | null;
  readonly history: readonly CanonicalTally[];
  readonly timeline: readonly ElectionV2TimelineRow[];
}

const V2_STATES = new Set<string>([
  "draft",
  "open",
  "collecting",
  "partial",
  "tallied",
  "rendered",
  "recorded",
]);

function ok<T>(value: T): ElectionV2StoreResult<T> {
  return { ok: true, value };
}

function err(error: ElectionV2StoreError): ElectionV2StoreResult<never> {
  return { ok: false, error };
}

function failed(error: ElectionV2StoreError, durable: TallyDurableStep[]): TallyCommitResult {
  return { ok: false, error, durable };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(path: string): ElectionV2StoreResult<string> {
  if (!existsSync(path)) return err("missing");
  try {
    return ok(readFileSync(path, "utf8"));
  } catch {
    return err("io-error");
  }
}

function readJson(path: string): ElectionV2StoreResult<{ text: string; raw: unknown }> {
  const text = readText(path);
  if (!text.ok) return text;
  try {
    return ok({ text: text.value, raw: JSON.parse(text.value) as unknown });
  } catch {
    return err("corrupt");
  }
}

function codecError(category: string): ElectionV2StoreError {
  return category === "unsupported-version" ? "unsupported" : "corrupt";
}

function normalizeState(value: unknown): ElectionV2State | null {
  if (value === "hold") return "partial";
  return typeof value === "string" && V2_STATES.has(value) ? (value as ElectionV2State) : null;
}

function safeFileId(value: string): boolean {
  return value.length > 0 && value !== "." && value !== ".." && !/[\\/\0]/.test(value);
}

function transitionMatches(
  value: ElectionV2State | null,
  expected: ElectionV2State,
  next: ElectionV2State,
): boolean {
  return value !== null && [expected, next].includes(value);
}

function resolve(root: string, electionId: string): ElectionV2StoreResult<ResolvedElection> {
  if (!safeFileId(electionId)) return err("corrupt");
  const registry = readElectionsRegistry(root);
  if (registry.kind === "corrupt") return err("corrupt");
  if (registry.kind === "ok") {
    const entry = registry.entries.find((row) => row.electionId === electionId);
    if (entry !== undefined) {
      return safeFileId(entry.dirName)
        ? ok({ dir: join(root, entry.dirName), registryEntry: entry })
        : err("corrupt");
    }
  }
  const legacy = join(root, electionId);
  return existsSync(legacy) ? ok({ dir: legacy }) : err("missing");
}

function decodeElection(
  resolved: ResolvedElection,
  checkRegistry = true,
): ElectionV2StoreResult<LoadedElection> {
  const read = readJson(join(resolved.dir, "election.json"));
  if (!read.ok) return read;
  if (!isRecord(read.value.raw)) return err("corrupt");
  const state = normalizeState(read.value.raw.state);
  if (state === null) return err("corrupt");
  const { state: _state, ...definitionRaw } = read.value.raw;
  const decoded = ElectionDefinitionCodec.decode(definitionRaw);
  if (!decoded.ok) return err(codecError(decoded.error.category));
  if (
    checkRegistry &&
    resolved.registryEntry !== undefined &&
    normalizeState(resolved.registryEntry.status) !== state
  ) {
    return err("registry-mismatch");
  }
  return ok({
    definition: decoded.value,
    state,
    legacy: definitionRaw.schemaVersion === undefined,
    resolved,
  });
}

function load(root: string, electionId: string, checkRegistry = true): ElectionV2StoreResult<LoadedElection> {
  const resolved = resolve(root, electionId);
  return resolved.ok ? decodeElection(resolved.value, checkRegistry) : resolved;
}

function encodeElection(
  definition: CanonicalElectionDefinition,
  state: ElectionV2State,
): ElectionV2StoreResult<string> {
  const encoded = ElectionDefinitionCodec.encode(definition);
  if (!encoded.ok) return err(codecError(encoded.error.category));
  return ok(JSON.stringify({ ...(JSON.parse(encoded.value) as object), state }, null, 2));
}

function ballotContext(ballot: CanonicalBallot): { targetQuestionIds: string[] } {
  return { targetQuestionIds: ballot.responses.map((response) => response.questionId) };
}

function encodeBallot(
  ballot: CanonicalBallot,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<string> {
  const encoded = BallotV2Codec.encode(ballot, definition, ballotContext(ballot));
  return encoded.ok ? ok(encoded.value) : err(codecError(encoded.error.category));
}

function decodeBallot(
  raw: unknown,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<CanonicalBallot> {
  if (!isRecord(raw) || !Array.isArray(raw.responses)) return err("corrupt");
  const ids = raw.responses.flatMap((response) =>
    isRecord(response) && typeof response.questionId === "string" ? [response.questionId] : [],
  );
  const decoded = BallotV2Codec.decode(raw, definition, { targetQuestionIds: ids });
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
): ElectionV2StoreResult<{ idempotent: boolean; arrivalSequence: number }> | null {
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

function readPendingVoter(
  dir: string,
  voter: string,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<PendingEvent[]> {
  const path = pendingPath(dir, voter);
  if (!existsSync(path)) return ok([]);
  const read = readJson(path);
  if (!read.ok) return read;
  if (!isRecord(read.value.raw) || read.value.raw.schemaVersion !== 2 || !Array.isArray(read.value.raw.events)) {
    return err("corrupt");
  }
  const events: PendingEvent[] = [];
  for (const event of read.value.raw.events) {
    if (!isRecord(event) || !Number.isInteger(event.arrivalSequence) || (event.arrivalSequence as number) < 0) {
      return err("corrupt");
    }
    const ballot = decodeBallot(event.ballot, definition);
    if (!ballot.ok || ballot.value.voter !== voter) return err("corrupt");
    events.push({ arrivalSequence: event.arrivalSequence as number, ballot: ballot.value });
  }
  return ok(events);
}

function readAllPending(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<PendingEvent[]> {
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
  if (new Set(events.map((event) => event.arrivalSequence)).size !== events.length) return err("corrupt");
  return ok(events.sort((left, right) => left.arrivalSequence - right.arrivalSequence));
}

function readLedger(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<CanonicalBallot[]> {
  const read = readJson(join(dir, "ledger.json"));
  if (!read.ok) return read;
  if (!isRecord(read.value.raw) || !Array.isArray(read.value.raw.ballots)) return err("corrupt");
  if (read.value.raw.schemaVersion !== undefined && read.value.raw.schemaVersion !== 2) {
    return err("unsupported");
  }
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
): ElectionV2StoreResult<void> {
  try {
    mkdirSync(join(dir, "ballots"), { recursive: true });
  } catch {
    return err("io-error");
  }
  for (const voter of voters) {
    const latest = ballots.filter((ballot) => ballot.voter === voter).at(-1);
    if (latest === undefined) continue;
    const encoded = encodeBallot(latest, definition);
    if (!encoded.ok) return encoded;
    if (!writeStoreFile(join(dir, "ballots", `${voter}.json`), encoded.value).ok) return err("io-error");
  }
  return ok(undefined);
}

function readMaterialized(
  dir: string,
  voters: readonly string[],
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<CanonicalBallot[]> {
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

function consumePending(dir: string, voters: readonly string[]): ElectionV2StoreResult<void> {
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
): ElectionV2StoreResult<CanonicalBallot[]> {
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
): ElectionV2StoreResult<CanonicalTally> {
  const decoded = TallyV2Codec.decode(raw, definition);
  return decoded.ok ? ok(decoded.value) : err(codecError(decoded.error.category));
}

function encodeTally(
  tally: CanonicalTally,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<string> {
  const encoded = TallyV2Codec.encode(tally, definition);
  return encoded.ok ? ok(encoded.value) : err(codecError(encoded.error.category));
}

function readCurrent(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<TallyEntry | null> {
  const path = join(dir, "tally.json");
  if (!existsSync(path)) return ok(null);
  const read = readJson(path);
  if (!read.ok) return read;
  const decoded = decodeTally(read.value.raw, definition);
  return decoded.ok
    ? ok({
        tally: decoded.value,
        bytes: read.value.text,
        legacy: isRecord(read.value.raw) && read.value.raw.schemaVersion === undefined,
      })
    : decoded;
}

function readHistory(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<TallyEntry[]> {
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
    history.push({ tally: tally.value, bytes: read.value.text, legacy: false });
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
): ElectionV2StoreResult<void> {
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
  const digest = TallyV2Codec.establishedResultsDigest(prior, definition);
  return digest.ok && digest.value === next.preservedResultDigest
    ? ok(undefined)
    : err("history-mismatch");
}

function verifyPreservationChain(
  history: readonly TallyEntry[],
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<void> {
  for (let index = 1; index < history.length; index++) {
    const checked = verifyPreservation(history[index - 1]!.tally, history[index]!.tally, definition);
    if (!checked.ok) return checked;
  }
  return ok(undefined);
}

function verifyHistory(
  dir: string,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<TallyEntry[]> {
  const history = readHistory(dir, definition);
  if (!history.ok) return history;
  const current = readCurrent(dir, definition);
  if (!current.ok) return current;
  if (history.value.length === 0) {
    return current.value === null || current.value.legacy ? ok([]) : err("history-mismatch");
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
): ElectionV2StoreResult<{ history: TallyEntry[]; current: TallyEntry | null }> {
  const history = readHistory(dir, definition);
  if (!history.ok) return history;
  const current = readCurrent(dir, definition);
  if (!current.ok) return current;
  if (history.value.length === 0) {
    return current.value === null || current.value.legacy
      ? ok({ history: [], current: current.value })
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
): ElectionV2StoreResult<void> {
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

function createOnly(path: string, bytes: string): ElectionV2StoreResult<"created" | "same"> {
  if (existsSync(path)) {
    const existing = readText(path);
    if (!existing.ok) return existing;
    return existing.value === bytes ? ok("same") : err("run-conflict");
  }
  try {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, bytes, { flag: "wx" });
    renameSync(tmp, path);
    return ok("created");
  } catch {
    rmSync(`${path}.tmp`, { force: true });
    return err("io-error");
  }
}

function readTimeline(path: string): ElectionV2StoreResult<unknown[]> {
  const read = readJson(path);
  if (!read.ok) return read;
  return Array.isArray(read.value.raw) ? ok(read.value.raw) : err("corrupt");
}

function isTimelineEvent(value: unknown): value is ElectionV2TimelineEvent {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    value.kind === "tallied" &&
    typeof value.runId === "string" &&
    typeof value.at === "string"
  );
}

function isLegacyTimelineEvent(value: unknown): boolean {
  if (!isRecord(value) || value.schemaVersion !== undefined) return false;
  if (!["distributed", "ballot", "tallied", "late"].includes(value.kind as string)) return false;
  if (typeof value.at !== "string" || typeof value.detail !== "string") return false;
  if (value.voter !== undefined && typeof value.voter !== "string") return false;
  return value.receivedAt === undefined || typeof value.receivedAt === "string";
}

function validTimeline(events: readonly unknown[]): events is readonly ElectionV2TimelineRow[] {
  return events.every((event) => isTimelineEvent(event) || isLegacyTimelineEvent(event));
}

function appendTimeline(path: string, tally: CanonicalTally): ElectionV2StoreResult<"appended" | "same"> {
  const timeline = readTimeline(path);
  if (!timeline.ok) return timeline;
  if (!validTimeline(timeline.value)) return err("corrupt");
  const event: ElectionV2TimelineEvent = {
    schemaVersion: 2,
    kind: "tallied",
    runId: tally.runId,
    at: tally.talliedAt,
  };
  const matching = timeline.value.filter(
    (candidate) => isRecord(candidate) && candidate.runId === tally.runId,
  );
  if (matching.length > 1) return err("corrupt");
  if (matching.length === 1) {
    return isTimelineEvent(matching[0]) && sameValue(matching[0], event)
      ? ok("same")
      : err("run-conflict");
  }
  const write = writeStoreFile(path, JSON.stringify([...timeline.value, event], null, 2));
  return write.ok ? ok("appended") : err("io-error");
}

function writeCommitState(
  root: string,
  loaded: LoadedElection,
  expected: ElectionV2State,
  next: ElectionV2State,
  durable: TallyDurableStep[],
): TallyCommitResult | null {
  const registryState = normalizeState(loaded.resolved.registryEntry?.status);
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
    const update = updateElectionStatus(root, loaded.definition.electionId, next as ElectionState);
    if (!update.ok) return failed(update.error === "corrupt" ? "corrupt" : "io-error", durable);
  }
  durable.push("registry");
  return null;
}

function writeCurrentTally(
  path: string,
  bytes: string,
  current: TallyEntry | null,
): ElectionV2StoreResult<boolean> {
  const same = current?.bytes === bytes;
  if (same) return ok(true);
  return writeStoreFile(path, bytes).ok ? ok(false) : err("io-error");
}

function storeCreate(
  root: string,
  definition: CanonicalElectionDefinition,
): ElectionV2StoreResult<void> {
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
    if (!registry.ok) {
      if (registry.error === "duplicate") return err("duplicate");
      return err(registry.error === "corrupt" ? "corrupt" : "io-error");
    }
    const dir = join(root, dirName);
    mkdirSync(dir, { recursive: true });
    if (!writeStoreFile(join(dir, "election.json"), encoded.value).ok) return err("io-error");
    if (!writeStoreFile(join(dir, "ledger.json"), ledgerBytes([])).ok) return err("io-error");
    return writeStoreFile(join(dir, "timeline.json"), "[]").ok ? ok(undefined) : err("io-error");
  } catch {
    return err("io-error");
  }
}

export const ElectionV2Store = {
  create: storeCreate,

  load(
    root: string,
    electionId: string,
  ): ElectionV2StoreResult<{
    definition: CanonicalElectionDefinition;
    state: ElectionV2State;
    legacy: boolean;
  }> {
    const loaded = load(root, electionId);
    return loaded.ok
      ? ok({
          definition: loaded.value.definition,
          state: loaded.value.state,
          legacy: loaded.value.legacy,
        })
      : loaded;
  },

  readSnapshot(root: string, electionId: string): ElectionV2StoreResult<ElectionV2Snapshot> {
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
    if (history.value.length > 0) {
      const verified = verifyHistory(loaded.value.resolved.dir, loaded.value.definition);
      if (!verified.ok) return verified;
    }
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

  setState(
    root: string,
    electionId: string,
    state: ElectionV2State,
  ): ElectionV2StoreResult<void> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const encoded = encodeElection(loaded.value.definition, state);
    if (!encoded.ok) return encoded;
    if (!writeStoreFile(join(loaded.value.resolved.dir, "election.json"), encoded.value).ok) {
      return err("io-error");
    }
    if (loaded.value.resolved.registryEntry === undefined) return ok(undefined);
    const update = updateElectionStatus(root, electionId, state as ElectionState);
    return update.ok ? ok(undefined) : err(update.error === "corrupt" ? "corrupt" : "io-error");
  },

  appendPending(
    root: string,
    electionId: string,
    ballot: CanonicalBallot,
  ): ElectionV2StoreResult<{ idempotent: boolean; arrivalSequence: number }> {
    if (!safeFileId(ballot.voter)) return err("corrupt");
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const encoded = encodeBallot(ballot, loaded.value.definition);
    if (!encoded.ok) return encoded;
    const pending = readAllPending(loaded.value.resolved.dir, loaded.value.definition);
    if (!pending.ok) return pending;
    const sameIdentity = pending.value.find((event) => identity(event.ballot) === identity(ballot));
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
    const ledgerRetry = idempotentBallot(
      integrated,
      encoded.value,
      loaded.value.definition,
      -1,
    );
    if (ledgerRetry !== null) return ledgerRetry;
    const voterPending = readPendingVoter(
      loaded.value.resolved.dir,
      ballot.voter,
      loaded.value.definition,
    );
    if (!voterPending.ok) return voterPending;
    const arrivalSequence = Math.max(-1, ...pending.value.map((event) => event.arrivalSequence)) + 1;
    try {
      mkdirSync(join(loaded.value.resolved.dir, "pending"), { recursive: true });
    } catch {
      return err("io-error");
    }
    const file = {
      schemaVersion: 2,
      events: [
        ...voterPending.value,
        { arrivalSequence, ballot: JSON.parse(encoded.value) as CanonicalBallot },
      ],
    };
    const write = writeStoreFile(
      pendingPath(loaded.value.resolved.dir, ballot.voter),
      JSON.stringify(file, null, 2),
    );
    return write.ok ? ok({ idempotent: false, arrivalSequence }) : err("io-error");
  },

  integratePending(
    root: string,
    electionId: string,
    targetVoters: readonly string[],
  ): ElectionV2StoreResult<{ integrated: number }> {
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
  ): ElectionV2StoreResult<readonly CanonicalTally[]> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const history = verifyHistory(loaded.value.resolved.dir, loaded.value.definition);
    if (!history.ok) return history;
    if (history.value.length > 0) return ok(history.value.map((entry) => entry.tally));
    const current = readCurrent(loaded.value.resolved.dir, loaded.value.definition);
    return current.ok ? ok(current.value === null ? [] : [current.value.tally]) : current;
  },

  establishedResultsDigest(
    root: string,
    electionId: string,
    tally: CanonicalTally,
  ): ElectionV2StoreResult<string> {
    const loaded = load(root, electionId);
    if (!loaded.ok) return loaded;
    const digest = TallyV2Codec.establishedResultsDigest(tally, loaded.value.definition);
    return digest.ok ? ok(digest.value) : err(codecError(digest.error.category));
  },

  commitTally(
    root: string,
    electionId: string,
    tally: CanonicalTally,
    transition: { expectedState: ElectionV2State; nextState: ElectionV2State },
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
    const sameRun = baseline.value.history.find((entry) => entry.tally.runId === tally.runId);
    if (sameRun === undefined && baseline.value.current !== null) {
      const preservation = verifyPreservation(
        baseline.value.current.tally,
        tally,
        loaded.value.definition,
      );
      if (!preservation.ok) return failed(preservation.error, durable);
    }
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

  verify(root: string, electionId: string): ElectionV2StoreResult<void> {
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
    if (!validTimeline(timeline.value)) return err("corrupt");
    const runIds = timeline.value.flatMap((event) => (isTimelineEvent(event) ? [event.runId] : []));
    return new Set(runIds).size === runIds.length ? ok(undefined) : err("corrupt");
  },
};
