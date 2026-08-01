// fatal-latch.ts — the process-local fatal health latch (FR-EVT-3/4/5).
//
// Contract (ADR-3): a canonical audit write failure both throws synchronously
// AND sets this latch. Once set, every canonical state-mutation entrypoint
// must refuse (`assertMutationAllowed`), and NOTHING in this process clears
// it — an intermediate layer that swallows the exception cannot unblock
// later mutations. A new process re-earns mutation rights only through the
// non-destructive journal health probe (`verifyJournalHealth`, FR-EVT-5).

import { existsSync, readFileSync } from "node:fs";
import { acquireAuditLock, releaseAuditLock } from "../tools/amadeus-lib.ts";
import { isJournalEntryV2, journalRecordField, parseJournalLine } from "../tools/amadeus-journal.ts";

export type HealthProbe = { shardPath: string; projectDir: string };
export type HealthResult = { ok: true } | { ok: false; detail: string };

type LatchState = { set: false } | { set: true; reason: string; setAt: string };

let state: LatchState = { set: false };

// Set the latch. The FIRST failure reason is retained: later failures are
// consequences, and the original cause is what an operator needs.
export function setFatal(reason: string): void {
  if (state.set) return;
  state = { set: true, reason, setAt: new Date().toISOString() };
}

export function isFatalSet(): boolean {
  return state.set;
}

export function fatalReason(): string | null {
  return state.set ? state.reason : null;
}

// Refuse a canonical mutation when the latch is set. Every canonical
// state-mutation entrypoint calls this BEFORE acting (FR-EVT-4).
export function assertMutationAllowed(): void {
  if (state.set) {
    throw new Error(
      `fatal health latch set at ${state.setAt} — canonical mutations refused in this process: ${state.reason}`
    );
  }
}

// Rows that declare this shard took part in Bolt fork/merge. `audit-merge`
// appends a worktree's delta VERBATIM (amadeus-audit.ts mergeDeltaUnderLock:
// "running it back through an emit would re-mint each record's identity"), so
// once either row is present the shard is a union of segments and its ordinals
// are no longer globally monotonic BY DESIGN — measured on the parallel-Bolt
// flow as [1..19, 7, 8].
const MERGE_PROVENANCE_EVENTS: ReadonlySet<string> = new Set(["AUDIT_FORKED", "AUDIT_MERGED"]);

// Read consistency over one shard: every line parses, no record appears twice,
// and the sequence is strictly monotonic until the shard declares fork/merge
// provenance. The first inconsistency short-circuits with a detail.
//
// WHY NOT PLAIN MONOTONICITY (#1856). It flagged correctly merged ledgers, and
// under the fail-closed emit path that false positive silently stopped every
// canonical row a post-merge process would have written. Uniqueness is the
// invariant that survives a merge: the ordinal is clone-local and replayed on
// purpose, but a record landing twice means the same delta was merged twice.
// Only v2 rows carry a native dedup key (BR-5); a v1 key is DERIVED from
// intent:clone:seq, so checking it would re-introduce the ordinal rule under
// another name.
function checkShardConsistency(buffer: string): HealthResult {
  let lastSeq = 0;
  let merged = false;
  const seen = new Set<string>();
  for (const rawLine of buffer.split("\n")) {
    if (rawLine.trim() === "") continue;
    try {
      const entry = parseJournalLine(rawLine);
      if (isJournalEntryV2(entry)) {
        if (seen.has(entry.idempotencyKey)) {
          return { ok: false, detail: `duplicate record ${entry.idempotencyKey} at seq ${entry.seq}` };
        }
        seen.add(entry.idempotencyKey);
      }
      if (entry.seq <= lastSeq && !merged) {
        return { ok: false, detail: `sequence regression at seq ${entry.seq} after ${lastSeq}` };
      }
      if (entry.seq > lastSeq) lastSeq = entry.seq;
      if (MERGE_PROVENANCE_EVENTS.has(journalRecordField(entry, "Event") ?? "")) merged = true;
    } catch (cause) {
      return { ok: false, detail: `unparseable journal line: ${cause instanceof Error ? cause.message : String(cause)}` };
    }
  }
  return { ok: true };
}

// Non-destructive journal health probe (FR-EVT-5, ADR-9): an audit-lock
// round-trip plus read consistency. It NEVER appends — a trial write would
// dirty the canonical journal, so Phase 1 keeps the probe read-only.
export function verifyJournalHealth(probe: HealthProbe): HealthResult {
  if (!existsSync(probe.shardPath)) {
    return { ok: false, detail: `shard not found: ${probe.shardPath}` };
  }
  const locked = acquireAuditLock(probe.projectDir, 5, 50);
  try {
    return checkShardConsistency(readFileSync(probe.shardPath, "utf-8"));
  } catch (cause) {
    return { ok: false, detail: `probe read failed: ${cause instanceof Error ? cause.message : String(cause)}` };
  } finally {
    if (locked) releaseAuditLock(probe.projectDir);
  }
}

// Test seam: the latch is deliberately un-clearable in production (FR-EVT-4),
// so tests reset the module state explicitly between fixtures.
export function resetFatalLatchForTests(): void {
  state = { set: false };
}
