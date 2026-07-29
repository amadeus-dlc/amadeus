// audit-log-exporter.ts — canonical EventRecord → audit JSONL, synchronous
// same-process append (FR-EXP-2, FR-JRN-3).
//
// The append path deliberately reuses the existing locked journal append
// (lock → sequence → append → idempotency, the exact appendAuditEntry
// structure) so NFR-1 holds by construction and every current reader keeps
// understanding the records (the canonical name maps to the v1 vocabulary in
// the registry). U4 hardens this into the schema-v2 codec (U3); the failure
// contract is already final here: ANY append failure sets the process-local
// fatal latch AND rethrows synchronously (FR-EVT-3, ADR-3) — never one
// without the other.

import { appendAuditEntry } from "../tools/amadeus-audit.ts";
import { getEventDef } from "./event-registry.ts";
import type { EventDef } from "./event-registry.ts";
import { setFatal } from "./fatal-latch.ts";

// The canonical durability record (domain-entities.md §CanonicalEventRecord,
// schema v2 minimal shape). The v1 mapping below flattens attributes into
// journal fields; the v2 codec (U3) will carry this shape natively.
export type CanonicalEventRecord = {
  readonly schemaVersion: number;
  readonly eventId: string;
  readonly timestamp: string;
  readonly eventName: string;
  readonly attributes: Record<string, unknown>;
  readonly intentId: string;
  readonly space: string;
  readonly cloneId: string;
  readonly traceId: string | null;
  readonly spanId: string | null;
  readonly traceFlags: number;
  readonly idempotencyKey: string;
  readonly durability: "canonical";
};

export type AuditLogExporter = {
  // Synchronous. Throws (after setting the fatal latch) on ANY write failure.
  exportCanonicalEvent(record: CanonicalEventRecord): void;
};

// The append seam: the default is the existing locked journal append. Tests
// inject a failing seam to drive the failure contract without corrupting a
// real journal.
export type AuditAppend = (
  def: EventDef,
  fields: Record<string, string>,
  projectDir: string,
  intent?: string,
  space?: string
) => void;

export type AuditLogExporterOptions = {
  readonly projectDir: string;
  readonly intent?: string;
  readonly space?: string;
  readonly latch?: { setFatal(reason: string): void };
  readonly append?: AuditAppend;
};

export function createAuditLogExporter(options: AuditLogExporterOptions): AuditLogExporter {
  const latch = options.latch ?? { setFatal };
  const append: AuditAppend =
    options.append ??
    ((def, fields, projectDir, intent, space) => {
      // canonical defs always carry an auditEvent mapping (registry invariant).
      appendAuditEntry(def.auditEvent as string, fields, projectDir, intent, space);
    });
  return {
    exportCanonicalEvent(record: CanonicalEventRecord): void {
      const def = getEventDef(record.eventName);
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(record.attributes)) {
        fields[key] = typeof value === "string" ? value : JSON.stringify(value);
      }
      // Correlation ids ride as ordinary v1 fields so current readers can
      // already join an audit record to its trace (FR-TRC-6).
      if (record.traceId !== null) fields.TraceId = record.traceId;
      if (record.spanId !== null) fields.SpanId = record.spanId;
      try {
        append(def, fields, options.projectDir, options.intent, options.space);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        latch.setFatal(`canonical event write failed (${record.eventName}): ${message}`);
        throw cause;
      }
    },
  };
}
