// subagent-lifetime.ts — pairing SUBAGENT_STARTED with SUBAGENT_COMPLETED (U4).
//
// A READ-ONLY post-process over journal records. It writes nothing, emits
// nothing, and never mutates its input: the journal is the source of truth and
// this is one derived view of it.
//
// WHY PAIRING NEEDS A RULE AT ALL. Both halves carry `Agent Type`; only some
// carry `Agent ID`, because the id exists only on the harnesses whose start
// seam supplies one. That makes the match two-tiered:
//
//   1. EXACT — equal, non-empty `Agent ID` on both halves. Unambiguous, so it
//      is resolved first and independently of position.
//   2. GREEDY BY TYPE — applies only when a SIDE IS MISSING an id, which is
//      what makes the ids uninformative in the first place. Picks the most
//      RECENT unmatched start of the same type: subagents of one type nest
//      more often than they interleave, so a completion belongs to the
//      innermost open dispatch. Ties on timestamp break on the clone-local
//      `seq`, highest first — the same "most recent" rule at finer resolution.
//   3. Anything else is unmatched.
//
// Tier 2 is deliberately NOT a catch-all. When both halves carry an id and the
// ids disagree, the harness has told us these are different agents; pairing
// them by type anyway would report an interval that spans two of them.
//
// A start is consumed at most once, so N completions can never manufacture
// more than N lifetimes.
//
// THE TWO UNMATCHED SIDES ARE NOT SYMMETRIC.
//   - An unmatched COMPLETED row is DROPPED. Only the harnesses that expose a
//     dispatch seam emit the start half at all, so wherever that seam is
//     absent a completion with no start is the normal steady state rather than
//     a defect, and synthesizing a start for it would put an interval into the
//     record that never happened.
//   - An unmatched STARTED row is REPORTED, with `incomplete: true` and a null
//     `completedAt`/`durationMs`. A subagent that began and never finished is
//     the signal this half was registered to carry (FR-SUB-3); dropping it
//     would hide exactly the condition the pairing exists to surface. Null
//     rather than 0 because the interval is UNKNOWN, not instantaneous.

import { journalRecordField, type JournalRecord } from "../tools/amadeus-journal.ts";

const SUBAGENT_STARTED_EVENT = "SUBAGENT_STARTED";
const SUBAGENT_COMPLETED_EVENT = "SUBAGENT_COMPLETED";

export type SubagentLifetime = {
  readonly agentType: string;
  // null when neither half carried an id (the id-less harnesses).
  readonly agentId: string | null;
  readonly startedAt: string;
  // null when the subagent never reported completion (`incomplete`).
  readonly completedAt: string | null;
  // Wall-clock interval, or null while still open. Never negative: a
  // completion that predates its start (clock skew across clones) is clamped
  // to 0 rather than reported backwards.
  readonly durationMs: number | null;
  // True when no completion was ever matched to this start — the idle-death
  // signal, not an error.
  readonly incomplete: boolean;
  readonly purpose: string | null;
  readonly message: string | null;
  // The clone-local sequence of the START row, exposed so a caller can trace a
  // composed lifetime back to the exact record it was built from.
  readonly startedSeq: number;
};

type StartRow = {
  readonly agentType: string;
  readonly agentId: string | null;
  readonly timestamp: string;
  readonly seq: number;
  readonly purpose: string | null;
  consumed: boolean;
};

function field(record: JournalRecord, name: string): string | null {
  const value = journalRecordField(record, name);
  return value !== null && value !== "" ? value : null;
}

// Most recent first: timestamp descending, then seq descending.
function moreRecent(a: StartRow, b: StartRow): boolean {
  if (a.timestamp !== b.timestamp) return a.timestamp > b.timestamp;
  return a.seq > b.seq;
}

function elapsedMs(startedAt: string, completedAt: string): number {
  const start = Date.parse(startedAt);
  const end = Date.parse(completedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

// Tier 1: an exact, non-empty id match, resolved independently of position.
// Tier 2: the most recent unmatched start of the same type — restricted to
// starts where the id is ABSENT when the completion carries one, because two
// present-but-different ids name two different agents rather than an
// ambiguity to resolve by recency.
function findStart(starts: readonly StartRow[], agentType: string, agentId: string | null): StartRow | undefined {
  if (agentId !== null) {
    const exact = starts.find((s) => !s.consumed && s.agentId === agentId && s.agentType === agentType);
    if (exact !== undefined) return exact;
  }
  let best: StartRow | undefined;
  for (const candidate of starts) {
    if (candidate.consumed || candidate.agentType !== agentType) continue;
    if (agentId !== null && candidate.agentId !== null) continue;
    if (best === undefined || moreRecent(candidate, best)) best = candidate;
  }
  return best;
}

export function composeSubagentLifetimes(records: readonly JournalRecord[]): SubagentLifetime[] {
  const starts: StartRow[] = [];
  const lifetimes: SubagentLifetime[] = [];

  for (const record of records) {
    const event = journalRecordField(record, "Event");
    if (event !== SUBAGENT_STARTED_EVENT && event !== SUBAGENT_COMPLETED_EVENT) continue;

    const agentType = field(record, "Agent Type");
    if (agentType === null) continue;
    const agentId = field(record, "Agent ID");

    if (event === SUBAGENT_STARTED_EVENT) {
      starts.push({
        agentType,
        agentId,
        timestamp: record.timestamp,
        seq: record.seq,
        purpose: field(record, "Purpose"),
        consumed: false,
      });
      continue;
    }

    const match = findStart(starts, agentType, agentId);
    if (match === undefined) continue; // orphan completion

    match.consumed = true;
    lifetimes.push({
      agentType,
      agentId: agentId ?? match.agentId,
      startedAt: match.timestamp,
      completedAt: record.timestamp,
      durationMs: elapsedMs(match.timestamp, record.timestamp),
      incomplete: false,
      purpose: match.purpose,
      message: field(record, "Message"),
      startedSeq: match.seq,
    });
  }

  // The starts nothing ever closed. Appended after the completed ones — which
  // keeps the completion ordering above intact — and in dispatch order, so a
  // reader looking for idle deaths finds them contiguous at the end.
  for (const open of starts) {
    if (open.consumed) continue;
    lifetimes.push({
      agentType: open.agentType,
      agentId: open.agentId,
      startedAt: open.timestamp,
      completedAt: null,
      durationMs: null,
      incomplete: true,
      purpose: open.purpose,
      message: null,
      startedSeq: open.seq,
    });
  }

  return lifetimes;
}
