// audit-rows.ts — read an audit shard that is MIXED v1/v2.
//
// The OTel migration moves call sites onto the canonical emit path one at a
// time, so a single shard legitimately carries both journal shapes at once:
//
//   schema v1 (unmigrated writer):  { event: "AUDIT_FORKED", fields: {...} }
//   schema v2 (migrated writer):    { eventName: "amadeus.audit.forked",
//                                     attributes: { Event: "AUDIT_FORKED", ... } }
//
// The v1 audit event type rides the v2 row as an `Event` attribute precisely so
// the shared production readers (auditBlockField, findAllEvents, the presence
// scan) keep seeing it — audit-log-exporter.ts. Test helpers that hand-rolled
// their own `row.event === X` filter do NOT, and a migrated row then reads to
// them exactly like a row that was never written: the assertion fails for a
// reason that has nothing to do with what it is testing.
//
// This is the one definition of that normalisation, so migrating the next batch
// of call sites does not mean editing five private copies of it again.

// The raw row with `event` and `fields` normalised ACROSS it, not replacing it.
// Callers reach for the shared ledger fields too — `seq` when they rebuild a
// dense sequence, `timestamp` when they sort across shards — so a view that
// kept only the two normalised keys would fix one class of assertion and break
// another.
export type NormalisedAuditRow = Record<string, unknown> & {
  // The v1 audit event type, whichever shape the row was written in.
  readonly event: string | null;
  // The row's field bag: v1 `fields`, or v2 `attributes`.
  readonly fields: Record<string, string>;
};

export function normaliseAuditRow(raw: Record<string, unknown>): NormalisedAuditRow {
  if (typeof raw.eventName === "string") {
    const attributes = (raw.attributes ?? {}) as Record<string, string>;
    // `Event` is lifted OUT of the field bag, not left in it. It is the audit
    // event type, which schema v1 carried as the top-level `event` key and not
    // as a field — the exporter relocates it into `attributes` purely so the
    // legacy readers keep finding it (audit-log-exporter.ts:157). Presenting it
    // as a field would make every migrated row's field set differ from its
    // pre-migration self by one phantom entry.
    const { Event: _carrier, ...fields } = attributes;
    return { ...raw, event: attributes.Event ?? null, fields };
  }
  return {
    ...raw,
    event: typeof raw.event === "string" ? raw.event : null,
    fields: (raw.fields ?? {}) as Record<string, string>,
  };
}

// Parse a JSONL shard body. Non-JSON lines are skipped rather than thrown on:
// a torn trailing write must not turn every assertion in a suite into a parse
// error.
export function auditRowsFrom(body: string): NormalisedAuditRow[] {
  const rows: NormalisedAuditRow[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      rows.push(normaliseAuditRow(JSON.parse(trimmed) as Record<string, unknown>));
    } catch {
      // torn line — skip
    }
  }
  return rows;
}

export function countAuditEvent(body: string, event: string): number {
  return auditRowsFrom(body).filter((row) => row.event === event).length;
}
