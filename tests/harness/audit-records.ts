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

// The heading table is imported from the SHIPPED copy rather than the canonical
// source: this harness is copied into sandboxes that carry dist + docs + tests
// only, and a packages/ import would not resolve there.
import { EVENT_HEADINGS } from "../../dist/claude/.claude/tools/amadeus-audit.ts";

export type NormalizedAuditRecord = {
  event: string | null;
  fields: Record<string, string>;
  [key: string]: unknown;
};

export function normalizeAuditRecord(raw: unknown): NormalizedAuditRecord {
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== 2) return record as NormalizedAuditRecord;
  const attributes = (record.attributes ?? {}) as Record<string, string>;
  const event = attributes.Event ?? null;
  return {
    ...record,
    event,
    // The prose heading, resolved through the same table the legacy writer
    // stamped it from. A v2 row stores the OTel eventName instead, but the
    // heading is a field readers group on — handing back the eventName would
    // silently change what `heading` means. An event outside the table falls
    // back to the eventName, so an unmapped row reads as "heading not in the
    // table" rather than as having none.
    heading: (event !== null ? EVENT_HEADINGS[event] : undefined) ?? String(record.eventName ?? ""),
    fields: attributes,
  };
}

// Whole-shard convenience over the same normalisation, so a caller that wants
// "the records in this buffer" does not re-derive the line split each time.
// Blank lines are skipped; anything else must parse, so a malformed line fails
// the case loudly rather than being silently dropped.
export function auditRowsFrom(body: string): NormalizedAuditRecord[] {
  return body
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => normalizeAuditRecord(JSON.parse(line)));
}

// How many records in `body` carry `event`, under either schema.
export function countAuditEvent(body: string, event: string): number {
  return auditRowsFrom(body).filter((row) => row.event === event).length;
}
