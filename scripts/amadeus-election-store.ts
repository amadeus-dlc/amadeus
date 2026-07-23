// amadeus-election-store.ts — U2 election-store: file I/O layer for the
// election TS foundation (intent 260718-election-ts-foundation; completed in
// Bolt 3 io-record-transport: late-ballot lane via classifyLate, amend
// coexistence, reexamRequired persistence). Layout (functional-design):
//
//   amadeus/spaces/<space>/elections/
//     elections.json  U1 registry: one row per created-after-U1 election
//     <electionId>/
//       election.json   definition + explicit state field (source of truth)
//       ledger.json     accepted-ballot append list
//       ballots/        materialized at tally time (blind lift)
//       tally.json      tally result + fixed ballot set
//       timeline.json   event append list (each entry only from an executed op)
//
// Single writer (conductor) by decision D-09 — no locking; torn writes are
// prevented by tmp+rename (writeStoreFile). Parse failures of existing files
// reject with "corrupt" (fail-closed load; never silently re-initialize).

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Ballot,
  classifyLate,
  lateReexamRequired,
  type Election,
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

// Older Bolt 1 ledgers lack the late lane; reading fills it in-memory only
// (the file gains the field on the next append — no silent rewrite on load).
function withLateLane(ledger: Partial<LedgerFile>): LedgerFile {
  return { ballots: ledger.ballots ?? [], late: ledger.late ?? [] };
}

function dirOf(root: string, electionId: string): string {
  return join(root, electionId);
}

// ---------------------------------------------------------------------------
// Elections registry (U1 space-record-catalog, Bolt B1)
//
// A single elections.json at the elections root mirrors every election created
// after U1 adoption: one row per election recording its canonical id, the
// CURRENT physical directory name, the creation instant, and the last-synced
// state. In THIS bolt the physical directories stay electionId-named at create
// (ruling E-SRCB1CG: no resolver/pathing change — that is U2), so a row's
// dirName equals its electionId verbatim. The registry is the future resolver's
// index; the date-prefixed dirName convention lands at U3 migration / the
// post-U2 create switch (see mintElectionDirName).
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
    const dir = dirOf(root, election.electionId);
    if (existsSync(join(dir, "election.json"))) return err("exists");
    // Order contract (ruling E-SRCB1CG): the registry row is appended BEFORE the
    // election directory is created. The root must exist first so elections.json
    // can land; the electionId dir is created only after the row commits, so a
    // registry failure (duplicate/corrupt) aborts create with no dir side-effect.
    try {
      mkdirSync(root, { recursive: true });
    } catch {
      return err("io-error");
    }
    const appended = appendElectionToRegistry(root, {
      electionId: election.electionId,
      dirName: election.electionId, // CURRENT physical name (= electionId this bolt)
      createdAt: nowUtcSecondsIso(),
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
    const read = readJson<ElectionFile>(join(dirOf(root, electionId), "election.json"));
    if (!read.ok) return read;
    const { state, ...election } = read.value;
    return ok({ election, state });
  },

  setState(root: string, electionId: string, state: ElectionState): Result<void, StoreError> {
    const path = join(dirOf(root, electionId), "election.json");
    const read = readJson<ElectionFile>(path);
    if (!read.ok) return read;
    const w = writeStoreFile(path, JSON.stringify({ ...read.value, state }, null, 2));
    if (!w.ok) return w;
    // Loud registry sync (ruling E-SRCB1CG): once election.json is written,
    // mirror the status to the registry row. Absent registry -> no-op ok
    // (pre-U1-adoption / pre-migration store state is normal). Registry present
    // but this election has no row, or a corrupt registry -> loud error: a
    // created-after-U1 election MUST have a row that stays in sync.
    const reg = readElectionsRegistry(root);
    if (reg.kind === "absent") return ok(undefined);
    if (reg.kind === "corrupt") return err("corrupt");
    return updateElectionStatus(root, electionId, state);
  },

  ledger(root: string, electionId: string): Result<LedgerFile, StoreError> {
    const read = readJson<Partial<LedgerFile>>(join(dirOf(root, electionId), "ledger.json"));
    if (!read.ok) return read;
    return ok(withLateLane(read.value));
  },

  // Duplicate rejection applies for the whole election lifetime (FR-3b) —
  // checked first on every path, late lane included, before the state branch.
  // Amend ballots coexist with their original (ADR-5: the original is never
  // overwritten; both stay on the ledger, correction trail intact).
  appendBallot(
    root: string,
    electionId: string,
    ballot: Ballot,
    receivedAt: string,
  ): Result<void, StoreError> {
    const dir = dirOf(root, electionId);
    const ledgerPath = join(dir, "ledger.json");
    const read = readJson<Partial<LedgerFile>>(ledgerPath);
    if (!read.ok) return read;
    const ledger = withLateLane(read.value);
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
      const next: LedgerFile = { ballots: ledger.ballots, late: [...ledger.late, late] };
      const w = writeStoreFile(ledgerPath, JSON.stringify(next, null, 2));
      if (!w.ok) return w;
      return Store.appendTimeline(root, electionId, {
        kind: "late",
        at: ballot.submittedAt,
        receivedAt,
        detail: `late ballot recorded: ${ballot.voter}${late.reexamRequired ? " (reexam required)" : ""}`,
        voter: ballot.voter,
      });
    }
    const next: LedgerFile = { ballots: [...ledger.ballots, ballot], late: ledger.late };
    const w = writeStoreFile(ledgerPath, JSON.stringify(next, null, 2));
    if (!w.ok) return w;
    return Store.appendTimeline(root, electionId, {
      kind: "ballot",
      at: ballot.submittedAt,
      receivedAt,
      detail: `ballot ${ballot.kind === "amend" ? "amendment" : "accepted"}: ${ballot.voter}`,
      voter: ballot.voter,
    });
  },

  // Only called from an executed operation's result (design invariant — the
  // CLI never books an event that did not happen).
  appendTimeline(root: string, electionId: string, event: TimelineEvent): Result<void, StoreError> {
    const path = join(dirOf(root, electionId), "timeline.json");
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
    const dir = dirOf(root, electionId);
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
    const w = writeStoreFile(
      join(dir, "tally.json"),
      JSON.stringify({ result, talliedAt, ballots: ledger.value.ballots, resolutions }, null, 2),
    );
    if (!w.ok) return w;
    return Store.appendTimeline(root, electionId, {
      kind: "tallied",
      at: talliedAt,
      detail: `tally: ${result.kind}`,
    });
  },
};
