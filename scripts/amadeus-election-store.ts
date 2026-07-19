// amadeus-election-store.ts — U2 election-store: file I/O layer for the
// election TS foundation (intent 260718-election-ts-foundation; completed in
// Bolt 3 io-record-transport: late-ballot lane via classifyLate, amend
// coexistence, reexamRequired persistence). Layout (functional-design):
//
//   amadeus/spaces/<space>/elections/<electionId>/
//     election.json   definition + explicit state field (source of truth)
//     ledger.json     accepted-ballot append list
//     ballots/        materialized at tally time (blind lift)
//     tally.json      tally result + fixed ballot set
//     timeline.json   event append list (each entry only from an executed op)
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

export type StoreError = "exists" | "duplicate" | "not-found" | "io-error" | "corrupt";

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

export const Store = {
  create(root: string, election: Election): Result<void, StoreError> {
    const dir = dirOf(root, election.electionId);
    if (existsSync(join(dir, "election.json"))) return err("exists");
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
    return writeStoreFile(path, JSON.stringify({ ...read.value, state }, null, 2));
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
  appendBallot(root: string, electionId: string, ballot: Ballot): Result<void, StoreError> {
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
    const loaded = Store.load(root, electionId);
    if (!loaded.ok) return loaded;
    const state = loaded.value.state;
    if (state === "tallied" || state === "rendered" || state === "recorded" || state === "hold") {
      // Late lane (FR-3d): classify against the fixed tally time; a late GoA 8
      // persists reexamRequired for the human reexamination trail.
      const t = readJson<{ talliedAt: string }>(join(dir, "tally.json"));
      if (!t.ok) return t;
      // A ballot arriving after the tallied transition but stamped at/before
      // talliedAt still lands in the late lane (it missed the fixed set); the
      // reexam rule is single-sourced in the model (PR #1233 review minor 2).
      const late = classifyLate(t.value.talliedAt, ballot) ?? {
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
    const w = writeStoreFile(
      join(dir, "tally.json"),
      JSON.stringify({ result, talliedAt, ballots: ledger.value.ballots }, null, 2),
    );
    if (!w.ok) return w;
    return Store.appendTimeline(root, electionId, {
      kind: "tallied",
      at: talliedAt,
      detail: `tally: ${result.kind}`,
    });
  },
};
