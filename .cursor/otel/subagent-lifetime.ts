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
//   2. GREEDY BY TYPE — for an id-less completion, the most RECENT unmatched
//      start of the same type. Subagents of one type nest more often than they
//      interleave, so a completion belongs to the innermost open dispatch;
//      ties on timestamp break on the clone-local `seq`, highest first, which
//      is the same "most recent" rule at finer resolution.
//
// A start is consumed at most once, so N completions can never manufacture
// more than N lifetimes.
//
// ORPHANS ARE DROPPED. Four of the seven harnesses have no subagent-start seam
// at all, so on those a completed row with no start is the normal steady state
// rather than a defect. Reporting it as a zero-length lifetime would put a
// duration into the record that never happened, so unmatched rows on BOTH
// sides are simply absent from the output (fail-open by omission).

import { journalRecordField, type JournalRecord } from "../tools/amadeus-journal.ts";

const SUBAGENT_STARTED_EVENT = "SUBAGENT_STARTED";
const SUBAGENT_COMPLETED_EVENT = "SUBAGENT_COMPLETED";

export type SubagentLifetime = {
  readonly agentType: string;
  // null when neither half carried an id (the id-less harnesses).
  readonly agentId: string | null;
  readonly startedAt: string;
  readonly completedAt: string;
  // Wall-clock interval. Never negative: a completion that predates its start
  // (clock skew across clones) is clamped to 0 rather than reported backwards.
  readonly durationMs: number;
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
// Tier 2: the most recent unmatched start of the same type.
function findStart(starts: readonly StartRow[], agentType: string, agentId: string | null): StartRow | undefined {
  if (agentId !== null) {
    const exact = starts.find((s) => !s.consumed && s.agentId === agentId && s.agentType === agentType);
    if (exact !== undefined) return exact;
  }
  let best: StartRow | undefined;
  for (const candidate of starts) {
    if (candidate.consumed || candidate.agentType !== agentType) continue;
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
      purpose: match.purpose,
      message: field(record, "Message"),
      startedSeq: match.seq,
    });
  }

  return lifetimes;
}
