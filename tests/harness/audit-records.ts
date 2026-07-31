// audit-records.ts — read a journal line under the HISTORICAL field names,
// whichever schema stamped it.
//
// Migrated call sites write schema v2 records: the legacy audit event type
// rides as the `Event` attribute and the payload lives under `attributes`,
// where v1 put them at `event` and `fields`. Production readers already hide
// that difference (auditBlockField serves envelope keys under their historical
// Markdown field names), so a test that hand-parses the JSONL should do the
// same rather than pin one schema — otherwise every migrated emitter reads as
// "no row" instead of failing on something real.
//
// v1 records pass through untouched, so a shard mixing both schemas — which is
// exactly what a workspace looks like mid-migration — reads uniformly.

export type NormalizedAuditRecord = {
  event: string | null;
  fields: Record<string, string>;
  [key: string]: unknown;
};

export function normalizeAuditRecord(raw: unknown): NormalizedAuditRecord {
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== 2) return record as NormalizedAuditRecord;
  const attributes = (record.attributes ?? {}) as Record<string, string>;
  return {
    ...record,
    event: attributes.Event ?? null,
    heading: String(record.eventName ?? ""),
    fields: attributes,
  };
}
