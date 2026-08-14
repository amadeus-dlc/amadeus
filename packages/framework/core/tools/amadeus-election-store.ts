// amadeus-election-store.ts — U2 election-store: file I/O layer for the
// election TS foundation (intent 260718-election-ts-foundation; completed in
// Bolt 3 io-record-transport: late-ballot lane via classifyLate, amend
// coexistence, reexamRequired persistence). Layout (functional-design):
//
//   amadeus/spaces/<space>/elections/
//     elections.json  U1 registry: one row per created-after-U1 election
//     <electionId>/
//       election.json   definition + explicit state field (source of truth)
//       pending/        per-voter accepted ballots before tally (gitignored)
//       ledger.json     accepted-ballot append list (filled at tally)
//       ballots/        materialized at tally time (blind lift)
//       tally.json      tally result + fixed ballot set
//       timeline.json   event append list (each entry only from an executed op)
//
// Single writer (conductor) by decision D-09 — no locking; torn writes are
// prevented by tmp+rename (writeStoreFile). Parse failures of existing files
// reject with "corrupt" (fail-closed load; never silently re-initialize).

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
  type Ballot,
  classifyLate,
  lateReexamRequired,
  Election,
  type ElectionState,
  err,
  type LateBallot,
  ok,
  type Result,
  type TallyResult,
  type TimelineEvent,
} from "./amadeus-election-model";

export type StoreError =
  | "exists"
  | "duplicate"
  | "not-found"
  | "io-error"
  | "corrupt"
  | "unknown-ref";

export type { TimelineEvent } from "./amadeus-election-model";

export function electionsRoot(projectDir: string, space = "default"): string {
  return join(projectDir, "amadeus", "spaces", space, "elections");
}

// Atomic write: same-directory tmp then rename (project idiom — writeFileAtomic
// class). All store writes funnel through this single path.
export function writeStoreFile(path: string, data: string): Result<void, "io-error"> {
  try {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, data);
    renameSync(tmp, path);
    return ok(undefined);
  } catch {
    return err("io-error");
  }
}

function readJson<T>(path: string): Result<T, StoreError> {
  if (!existsSync(path)) return err("not-found");
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return err("io-error");
  }
  try {
    return ok(JSON.parse(text) as T);
  } catch {
    return err("corrupt");
  }
}

type ElectionFile = Election & { state: ElectionState };
type LedgerFile = { ballots: Ballot[]; late: LateBallot[] };

// #1980: reading election.json used to cast straight to ElectionFile, so a file
// whose JSON parses but whose definition is invalid (the #1459 shapes) came back
// as a well-formed Election. Both read sites (Store.load, Store.setState) go
// through this composer instead. It adds NO validation of its own — the
// definition is checked by Election.parse (the single definition validator) and
// the state by VALID_STATES (the single state vocabulary) — and maps every
// rejection onto the existing "corrupt" error, adding no new StoreError value.
function parseElectionFile(raw: unknown): Result<ElectionFile, StoreError> {
  const election = Election.parse(raw);
  if (!election.ok) return err("corrupt");
  // Election.parse has already proved raw is a non-null object; the state field
  // is storage-only, so it is read here and checked against VALID_STATES — the
  // same vocabulary the registry rows are checked against.
  const state = (raw as Record<string, unknown>).state;
  if (typeof state !== "string" || !VALID_STATES.has(state)) return err("corrupt");
  return ok({ ...election.value, state: state as ElectionState });
}

// Older Bolt 1 ledgers lack the late lane; reading fills it in-memory only
// (the file gains the field on the next append — no silent rewrite on load).
function withLateLane(ledger: Partial<LedgerFile>): LedgerFile {
  return { ballots: ledger.ballots ?? [], late: ledger.late ?? [] };
}

// ---------------------------------------------------------------------------
// Pending ballot lane (Issue #1773 — blind independence on disk)
//
// ledger.json is a SHARED, git-tracked file. Writing an accepted ballot there
// while the election is still collecting hands every not-yet-voted voter two
// read channels onto a peer's choice/GoA/reservation/rationale: the harness's
// file-change notification and `git status` / `git diff`. So a ballot accepted
// before tally is written to pending/<voter>.json (a gitignored directory) and
// ledger.json stays empty until tally integrates the whole set at once.
//
// The pending entry carries the arrival sequence, so integration reproduces the
// exact append order the single ledger file used to hold — deterministic and
// independent of directory-listing order.
// ---------------------------------------------------------------------------

type PendingEntry = { seq: number; ballot: Ballot };
type PendingFile = { entries: PendingEntry[] };

export function pendingDir(electionDir: string): string {
  return join(electionDir, "pending");
}

function pendingPath(electionDir: string, voter: string): string {
  return join(pendingDir(electionDir), `${voter}.json`);
}

// A row must carry the two fields every consumer reads (the arrival seq and a
// ballot with a voter); anything else is a corrupt file, not a runtime throw.
function isPendingEntry(v: unknown): v is PendingEntry {
  if (typeof v !== "object" || v === null) return false;
  const row = v as { seq?: unknown; ballot?: unknown };
  if (typeof row.seq !== "number" || !Number.isFinite(row.seq)) return false;
  if (typeof row.ballot !== "object" || row.ballot === null) return false;
  return typeof (row.ballot as { voter?: unknown }).voter === "string";
}

function parsePendingRows(rows: unknown): Result<PendingEntry[], StoreError> {
  if (!Array.isArray(rows) || !rows.every(isPendingEntry)) return err("corrupt");
  return ok(rows);
}

// Read every per-voter file, flattened into arrival order. A missing directory
// is the normal empty case; a corrupt file is loud (fail-closed, same policy as
// every other store read).
function readPending(electionDir: string): Result<PendingEntry[], StoreError> {
  const dir = pendingDir(electionDir);
  if (!existsSync(dir)) return ok([]);
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch {
    return err("io-error");
  }
  const entries: PendingEntry[] = [];
  for (const name of names.sort()) {
    const read = readJson<Partial<PendingFile>>(join(dir, name));
    if (!read.ok) return read;
    const rows = parsePendingRows(read.value.entries);
    if (!rows.ok) return rows;
    entries.push(...rows.value);
  }
  // seq is the arrival axis; the voter tiebreak keeps the order total even if a
  // hand-edited file repeats a seq.
  return ok(entries.sort((a, b) => a.seq - b.seq || a.ballot.voter.localeCompare(b.ballot.voter)));
}

function appendPending(
  electionDir: string,
  ballot: Ballot,
  seq: number,
): Result<void, StoreError> {
  try {
    mkdirSync(pendingDir(electionDir), { recursive: true });
  } catch {
    return err("io-error");
  }
  const path = pendingPath(electionDir, ballot.voter);
  let entries: PendingEntry[] = [];
  if (existsSync(path)) {
    const read = readJson<Partial<PendingFile>>(path);
    if (!read.ok) return read;
    const rows = parsePendingRows(read.value.entries);
    if (!rows.ok) return rows;
    entries = rows.value;
  }
  const file: PendingFile = { entries: [...entries, { seq, ballot }] };
  return writeStoreFile(path, JSON.stringify(file, null, 2));
}

// Identity of an accepted ballot across the two lanes: one voter has at most
// one original plus amends, and each amend carries its own submission instant,
// so (voter, kind, submittedAt) is unique among accepted ballots.
function ballotKey(ballot: Ballot): string {
  return JSON.stringify([ballot.voter, ballot.kind, ballot.submittedAt]);
}

// Which pending ballots are not on the ledger yet. The write and the drain are
// two file operations and the drain can fail on its own, so integration is
// defined by CONTENT rather than by the drain having succeeded: a pending row
// already present on the ledger is never added again, which keeps the merged
// read (Store.ledger) and a retried integrate free of double counting even
// when the pending directory survives a failed drain.
function pendingNotOnLedger(pending: PendingEntry[], ledger: LedgerFile): Ballot[] {
  const known = new Set(ledger.ballots.map(ballotKey));
  return pending.filter((e) => !known.has(ballotKey(e.ballot))).map((e) => e.ballot);
}

// Move the whole pending set onto ledger.json and drain the directory. Called
// at the tally transition (Store.materialize) and idempotent: re-running it
// adds nothing and simply retries the drain.
function integratePending(electionDir: string): Result<void, StoreError> {
  const pending = readPending(electionDir);
  if (!pending.ok) return pending;
  if (pending.value.length === 0) return ok(undefined);
  const ledgerPath = join(electionDir, "ledger.json");
  const read = readJson<Partial<LedgerFile>>(ledgerPath);
  if (!read.ok) return read;
  const ledger = withLateLane(read.value);
  const missing = pendingNotOnLedger(pending.value, ledger);
  if (missing.length > 0) {
    const next: LedgerFile = { ballots: [...ledger.ballots, ...missing], late: ledger.late };
    const w = writeStoreFile(ledgerPath, JSON.stringify(next, null, 2));
    if (!w.ok) return w;
  }
  try {
    rmSync(pendingDir(electionDir), { recursive: true, force: true });
  } catch {
    return err("io-error");
  }
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Elections registry (U1 space-record-catalog, Bolt B1)
//
// A single elections.json at the elections root mirrors every election created
// after U1 adoption: one row per election recording its canonical id, the
// current physical directory name, the creation instant, and the last-synced
// state. U2 resolves readers through this index and creates new elections in a
// date-prefixed physical directory. Pre-U2 direct-name directories remain
// reachable only through the loud migration-window branch below.
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

const VALID_STATES: ReadonlySet<string> = new Set<ElectionState>([
  "draft",
  "open",
  "collecting",
  "partial",
  "tallied",
  "rendered",
  "recorded",
  "hold",
]);

// A row passes iff all four required fields are present with the right primitive
// types AND status is a known ElectionState. Unknown EXTRA fields are ignored
// (forward-compat); a missing/mistyped required field or unknown status is a
// row-level failure that makes the whole read corrupt (fail-closed). Exported
// as the pure (no-fs) row validator so U2's resolver can bind rows with the same
// check readElectionsRegistry applies.
export function isElectionRegistryEntry(v: unknown): v is ElectionRegistryEntry {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.electionId !== "string" || r.electionId.length === 0) return false;
  if (typeof r.dirName !== "string" || r.dirName.length === 0) return false;
  if (typeof r.createdAt !== "string" || r.createdAt.length === 0) return false;
  if (typeof r.status !== "string" || !VALID_STATES.has(r.status)) return false;
  return true;
}

// Read the registry, never silently reinitializing: a missing file is `absent`
// (a legitimate pre-adoption / pre-migration state), any parse failure or a row
// failing the 4-field check is `corrupt` (the caller decides loudness).
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

export type ResolvedElectionDir =
  | { kind: "registry"; dir: string }
  | { kind: "legacy-unmigrated"; dir: string };

const LEGACY_PATH_NOTICE = "unmigrated election";

// Resolve every election read through the registry. The only fallback is the
// declared migration window: an exact legacy electionId directory that still
// exists. It is deliberately loud and typed so migration completion can remove
// this branch mechanically.
export function resolveElectionDir(root: string, electionId: string): ResolvedElectionDir {
  const registry = readElectionsRegistry(root);
  if (registry.kind === "corrupt") {
    throw new Error(`elections registry corrupt: ${registry.detail}`);
  }
  if (registry.kind === "ok") {
    const byId = new Map(registry.entries.map((entry) => [entry.electionId, entry]));
    const entry = byId.get(electionId);
    if (entry !== undefined) return { kind: "registry", dir: join(root, entry.dirName) };
  }
  const legacyDir = join(root, electionId);
  if (existsSync(legacyDir)) {
    console.error(`${LEGACY_PATH_NOTICE} ${electionId} — legacy path(移行前)`);
    return { kind: "legacy-unmigrated", dir: legacyDir };
  }
  throw new Error(`election not in registry: ${electionId}`);
}

// Append a new row. absent -> start a fresh []; corrupt -> loud error (never
// silently reinitialize); duplicate electionId -> loud error. On success the
// whole array is rewritten atomically via writeStoreFile.
export function appendElectionToRegistry(
  root: string,
  entry: ElectionRegistryEntry,
): Result<void, StoreError> {
  const read = readElectionsRegistry(root);
  if (read.kind === "corrupt") return err("corrupt");
  const entries = read.kind === "ok" ? read.entries : [];
  if (entries.some((e) => e.electionId === entry.electionId)) return err("duplicate");
  return writeStoreFile(electionsRegistryPath(root), JSON.stringify([...entries, entry], null, 2));
}

// Sync a row's status. row missing -> loud error (a created-after-U1 election
// MUST carry a row); corrupt -> loud error; absent file -> loud not-found (the
// absent-is-a-no-op policy is the CALLER's concern — see Store.setState — so
// this function is only reached once a registry exists).
export function updateElectionStatus(
  root: string,
  electionId: string,
  status: ElectionState,
): Result<void, StoreError> {
  const read = readElectionsRegistry(root);
  if (read.kind === "corrupt") return err("corrupt");
  if (read.kind === "absent") return err("not-found");
  const idx = read.entries.findIndex((e) => e.electionId === electionId);
  if (idx < 0) return err("not-found");
  const next = read.entries.map((e, i) => (i === idx ? { ...e, status } : e));
  return writeStoreFile(electionsRegistryPath(root), JSON.stringify(next, null, 2));
}

// Exact-equality bind: does this registry entry's dirName match the given
// physical directory name? (U2 resolver uses this to bind a row to its dir.)
export function electionDirMatches(entry: ElectionRegistryEntry, dirName: string): boolean {
  return entry.dirName === dirName;
}

// Second-precision UTC ISO for the registry createdAt (`YYYY-MM-DDThh:mm:ssZ`) —
// minted locally so the store stays self-contained (matches the transport's
// normalizeAt shape without coupling to that module).
function nowUtcSecondsIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
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
//
// NOT CONSUMED BY create IN THIS BOLT (ruling E-SRCB1CG): create still names
// directories by electionId. Consumers are U3 (migration: rename legacy
// electionId dirs to this form) and the post-U2 create switch. Implemented and
// fully tested here so U2/U3 inherit a proven minting function.
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

export const Store = {
  create(root: string, election: Election): Result<void, StoreError> {
    // Order contract (ruling E-SRCB1CG): the registry row is appended BEFORE the
    // election directory is created. The root must exist first so elections.json
    // can land; the physical dir is created only after the row commits, so a
    // registry failure (duplicate/corrupt) aborts create with no dir side-effect.
    try {
      mkdirSync(root, { recursive: true });
    } catch {
      return err("io-error");
    }
    const createdAt = nowUtcSecondsIso();
    let existingDirNames: Set<string>;
    try {
      existingDirNames = new Set(
        readdirSync(root, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name),
      );
    } catch {
      return err("io-error");
    }
    const dirName = mintElectionDirName(election.electionId, createdAt, existingDirNames);
    const dir = join(root, dirName);
    if (existsSync(join(dir, "election.json"))) return err("exists");
    const appended = appendElectionToRegistry(root, {
      electionId: election.electionId,
      dirName,
      createdAt,
      status: "draft",
    });
    if (!appended.ok) return appended;
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      return err("io-error");
    }
    const file: ElectionFile = { ...election, state: "draft" };
    const w1 = writeStoreFile(join(dir, "election.json"), JSON.stringify(file, null, 2));
    if (!w1.ok) return w1;
    const ledger: LedgerFile = { ballots: [], late: [] };
    const w2 = writeStoreFile(join(dir, "ledger.json"), JSON.stringify(ledger, null, 2));
    if (!w2.ok) return w2;
    return writeStoreFile(join(dir, "timeline.json"), JSON.stringify([], null, 2));
  },

  load(root: string, electionId: string): Result<{ election: Election; state: ElectionState }, StoreError> {
    const raw = readJson<unknown>(
      join(resolveElectionDir(root, electionId).dir, "election.json"),
    );
    if (!raw.ok) return raw;
    const read = parseElectionFile(raw.value);
    if (!read.ok) return read;
    const { state, ...election } = read.value;
    return ok({ election, state });
  },

  setState(root: string, electionId: string, state: ElectionState): Result<void, StoreError> {
    const resolved = resolveElectionDir(root, electionId);
    const path = join(resolved.dir, "election.json");
    const raw = readJson<unknown>(path);
    if (!raw.ok) return raw;
    const read = parseElectionFile(raw.value);
    if (!read.ok) return read;
    const w = writeStoreFile(path, JSON.stringify({ ...read.value, state }, null, 2));
    if (!w.ok) return w;
    // Loud registry sync (ruling E-SRCB1CG): once election.json is written,
    // mirror the status to the registry row. A typed legacy resolution skips
    // registry sync during the declared migration window; registry-backed
    // elections must always keep their row in sync.
    if (resolved.kind === "legacy-unmigrated") return ok(undefined);
    return updateElectionStatus(root, electionId, state);
  },

  // The accepted-ballot view every reader (status, tally, verify) sees: the
  // integrated ledger file plus whatever is still pending, in arrival order.
  // Splitting the STORAGE (#1773) must not split the semantics.
  ledger(root: string, electionId: string): Result<LedgerFile, StoreError> {
    const dir = resolveElectionDir(root, electionId).dir;
    const read = readJson<Partial<LedgerFile>>(join(dir, "ledger.json"));
    if (!read.ok) return read;
    const ledger = withLateLane(read.value);
    const pending = readPending(dir);
    if (!pending.ok) return pending;
    // Pending rows already integrated (a drain that failed after the ledger
    // write left them behind) are not counted twice.
    return ok({
      ballots: [...ledger.ballots, ...pendingNotOnLedger(pending.value, ledger)],
      late: ledger.late,
    });
  },

  // Duplicate rejection applies for the whole election lifetime (FR-3b) —
  // checked first on every path, late lane included, before the state branch.
  // Amend ballots coexist with their original (ADR-5: the original is never
  // overwritten; both stay on the ledger, correction trail intact).
  // Both timeline write points (the pre-tally ballot row and the late row) are
  // stamped with `receivedAt` on `at` as well (Issue #1946): the self-reported
  // submittedAt stays on the ballot body as informational provenance and is
  // never an axis. The ballot itself already carries the same stamp, minted by
  // the CLI at acceptance.
  appendBallot(
    root: string,
    electionId: string,
    ballot: Ballot,
    receivedAt: string,
  ): Result<void, StoreError> {
    const dir = resolveElectionDir(root, electionId).dir;
    const ledgerPath = join(dir, "ledger.json");
    // Read the merged view (integrated + pending) so duplicate and amend-ref
    // checks see every accepted ballot regardless of which lane holds it.
    const read = Store.ledger(root, electionId);
    if (!read.ok) return read;
    const ledger = read.value;
    const accepted = [...ledger.ballots, ...ledger.late.map((l) => l.ballot)];
    const dup = accepted.some(
      (b) => b.voter === ballot.voter && b.kind !== "amend" && ballot.kind !== "amend",
    );
    if (dup) return err("duplicate");
    // BR-3 fail-closed: an amend must reference an existing accepted ballot from
    // the same voter (original or a prior amend) matching electionId/voter/
    // submittedAt. Checked here in the read phase — before any write — so an
    // unknown ref fails with no partial write (R-1 atomicity).
    if (ballot.kind === "amend") {
      const found = accepted.some(
        (b) =>
          b.voter === ballot.ref.voter &&
          b.electionId === ballot.ref.electionId &&
          b.submittedAt === ballot.ref.submittedAt,
      );
      if (!found) return err("unknown-ref");
    }
    const loaded = Store.load(root, electionId);
    if (!loaded.ok) return loaded;
    const state = loaded.value.state;
    if (state === "tallied" || state === "rendered" || state === "recorded" || state === "hold") {
      // Late lane (FR-3d): classify against the fixed tally time; a late GoA 8
      // persists reexamRequired for the human reexamination trail.
      const t = readJson<{ talliedAt: string }>(join(dir, "tally.json"));
      if (!t.ok) return t;
      // Reached only after tally, so receivedAt (minted now) is at/after
      // talliedAt. classifyLate returns non-null whenever receivedAt strictly
      // exceeds talliedAt; the fallback covers the same-second boundary
      // (receivedAt === talliedAt → null) where the ballot still missed the
      // fixed set and must land late anyway. The reexam rule is single-sourced
      // in the model (PR #1233 review minor 2).
      const late = classifyLate(t.value.talliedAt, receivedAt, ballot) ?? {
        ballot,
        late: true as const,
        reexamRequired: lateReexamRequired(ballot),
      };
      // Past tally the fixed set already lives in ledger.json; integrate first
      // so a late write never has to carry pending rows (and never drops them).
      const integrated = integratePending(dir);
      if (!integrated.ok) return integrated;
      const onDisk = readJson<Partial<LedgerFile>>(ledgerPath);
      if (!onDisk.ok) return onDisk;
      const fixed = withLateLane(onDisk.value);
      const next: LedgerFile = { ballots: fixed.ballots, late: [...fixed.late, late] };
      const w = writeStoreFile(ledgerPath, JSON.stringify(next, null, 2));
      if (!w.ok) return w;
      return Store.appendTimeline(root, electionId, {
        kind: "late",
        at: receivedAt,
        receivedAt,
        detail: `late ballot recorded: ${ballot.voter}${late.reexamRequired ? " (reexam required)" : ""}`,
        voter: ballot.voter,
      });
    }
    // Before tally the body goes to the gitignored pending lane, never to the
    // shared ledger file (#1773). seq is the arrival index across all voters.
    const w = appendPending(dir, ballot, ledger.ballots.length);
    if (!w.ok) return w;
    return Store.appendTimeline(root, electionId, {
      kind: "ballot",
      at: receivedAt,
      receivedAt,
      detail: `ballot ${ballot.kind === "amend" ? "amendment" : "accepted"}: ${ballot.voter}`,
      voter: ballot.voter,
    });
  },

  // Only called from an executed operation's result (design invariant — the
  // CLI never books an event that did not happen).
  appendTimeline(root: string, electionId: string, event: TimelineEvent): Result<void, StoreError> {
    const path = join(resolveElectionDir(root, electionId).dir, "timeline.json");
    const read = readJson<TimelineEvent[]>(path);
    if (!read.ok) return read;
    return writeStoreFile(path, JSON.stringify([...read.value, event], null, 2));
  },

  status(
    root: string,
    electionId: string,
  ): Result<{ voted: string[]; pending: string[]; state: ElectionState }, StoreError> {
    const loaded = Store.load(root, electionId);
    if (!loaded.ok) return loaded;
    const ledger = Store.ledger(root, electionId);
    if (!ledger.ok) return ledger;
    const voted = [...new Set(ledger.value.ballots.map((b) => b.voter))];
    const pending = loaded.value.election.voters.filter((v) => !voted.includes(v));
    return ok({ voted, pending, state: loaded.value.state });
  },

  // Materialize the full ballot set at tally time (blind lift) and fix the
  // tallied ballot set alongside the result.
  materialize(
    root: string,
    electionId: string,
    result: TallyResult,
    talliedAt: string,
  ): Result<void, StoreError> {
    const dir = resolveElectionDir(root, electionId).dir;
    // Tally is the transition where blindness ends: fold the pending lane into
    // ledger.json (deterministic arrival order) before fixing the ballot set.
    const integrated = integratePending(dir);
    if (!integrated.ok) return integrated;
    const ledger = Store.ledger(root, electionId);
    if (!ledger.ok) return ledger;
    try {
      mkdirSync(join(dir, "ballots"), { recursive: true });
    } catch {
      return err("io-error");
    }
    for (const b of ledger.value.ballots) {
      const w = writeStoreFile(
        join(dir, "ballots", `${b.voter}.json`),
        JSON.stringify(b, null, 2),
      );
      if (!w.ok) return w;
    }
    // Carry forward any hold-resolution history from a prior tally (a reopen
    // re-tallies, but the human rulings already given must survive — FR-4b).
    const prior = readJson<{ resolutions?: unknown[] }>(join(dir, "tally.json"));
    const resolutions = prior.ok ? (prior.value.resolutions ?? []) : [];
    // The `tallied` timeline row is NOT booked here (#2125 FR-2a): tally fixes
    // the ballot set, but the audit row belongs to the state-machine commit,
    // which happens in report --result tallied. Booking it here let a bare
    // tally append `tallied` from any state.
    return writeStoreFile(
      join(dir, "tally.json"),
      JSON.stringify({ result, talliedAt, ballots: ledger.value.ballots, resolutions }, null, 2),
    );
  },
};
