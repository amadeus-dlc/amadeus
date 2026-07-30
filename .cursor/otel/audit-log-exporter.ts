// audit-log-exporter.ts — canonical EventRecord → audit JSONL, synchronous
// same-process append (FR-EXP-2, FR-JRN-3).
//
// The append path deliberately reuses the existing locked journal append
// structure (lock → sequence → append → idempotency, the exact
// appendAuditEntry structure, via appendJournalRecordV2) so NFR-1 holds by
// construction. U4 hardening over the U1 skeleton:
//   - records encode through the U3 schema v2 codec — no private serialize
//     format (BR-13);
//   - the accept set is registry-validated HERE (BR-10): unregistered names,
//     missing required attributes, and telemetry-classified defs are refused
//     BEFORE append, as invariant violations that throw WITHOUT the latch
//     (caller bugs, not write failures);
//   - the export-boundary redaction layer (FR-DST-3 layer 2) applies to the
//     attributes immediately before encode, so a caller that bypassed the
//     write-time layer still cannot reach the journal unfiltered;
//   - the failure contract is unified across ALL failure paths (BR-4/BR-14):
//     lock failure, disk failure, ANY append failure sets the process-local
//     fatal latch AND rethrows synchronously (FR-EVT-3, ADR-3) — never one
//     without the other.

import { appendJournalRecordV2 } from "../tools/amadeus-audit.ts";
import type { JournalAppendOutcome } from "../tools/amadeus-audit.ts";
import type { JournalEntryV2 } from "../tools/amadeus-journal.ts";
import { JOURNAL_SCHEMA_VERSION_V2, serializeJournalEntryV2 } from "../tools/amadeus-journal.ts";
import { getEventDef } from "./event-registry.ts";
import type { RegisteredEventName } from "./event-registry.ts";
import { setFatal } from "./fatal-latch.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes } from "./redaction.ts";
import type { RedactionPolicy } from "./redaction.ts";

// The canonical durability record (domain-entities.md §CanonicalEventRecord,
// schema v2). Identity fields (intentId/space/cloneId) are resolved at emit
// time; the shard-local sequence is assigned inside the locked append.
export type CanonicalEventRecord = {
  readonly schemaVersion: number;
  readonly eventId: string;
  readonly timestamp: string;
  readonly eventName: RegisteredEventName;
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
  // Returns whether the append landed: the post-complete seal SUPPRESSES
  // without throwing, so that outcome is only knowable from the return value
  // (E-U7CG-Q3B ruling A'). Callers that do not care may ignore it.
  exportCanonicalEvent(record: CanonicalEventRecord): JournalAppendOutcome;
};

// The append seam: the default is the real locked journal append (lock →
// sequence → v2 codec encode → synchronous append). Tests inject a failing
// seam to drive the failure contract without corrupting a real journal.
// A seam that returns nothing is read as a successful append: the only void
// producers are test doubles modelling a landed write (a failing double
// throws). Keeping `void` in the union is what makes the E-U7CG-Q3B change a
// minimal diff — the existing injected seams stay type-compatible unchanged.
export type AuditAppend = (
  record: CanonicalEventRecord,
  projectDir: string,
  intent?: string,
  space?: string
) => JournalAppendOutcome | void;

export type AuditLogExporterOptions = {
  readonly projectDir: string;
  readonly intent?: string;
  readonly space?: string;
  readonly latch?: { setFatal(reason: string): void };
  readonly append?: AuditAppend;
  readonly redaction?: RedactionPolicy;
};

// Map a canonical record onto the v2 journal row. The shard-local sequence is
// assigned inside the locked append; the exporter's dry-run encode adds a
// placeholder.
function toJournalRow(record: CanonicalEventRecord): Omit<JournalEntryV2, "seq"> {
  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId: record.eventId,
    timestamp: record.timestamp,
    eventName: record.eventName,
    attributes: record.attributes,
    intentId: record.intentId,
    space: record.space,
    cloneId: record.cloneId,
    traceId: record.traceId,
    spanId: record.spanId,
    traceFlags: record.traceFlags,
    idempotencyKey: record.idempotencyKey,
    canonical: record.durability === "canonical",
  };
}

export function createAuditLogExporter(options: AuditLogExporterOptions): AuditLogExporter {
  const latch = options.latch ?? { setFatal };
  const policy = options.redaction ?? DEFAULT_REDACTION_POLICY;
  const append: AuditAppend =
    options.append ??
    ((record, projectDir, intent, space) => appendJournalRecordV2(toJournalRow(record), projectDir, intent, space));
  return {
    exportCanonicalEvent(record: CanonicalEventRecord): JournalAppendOutcome {
      // Accept-set validation (BR-10): invariant violations — caller bugs —
      // throw WITHOUT touching the fatal latch.
      const def = getEventDef(record.eventName);
      if (record.schemaVersion !== JOURNAL_SCHEMA_VERSION_V2) {
        throw new Error(
          `canonical record schemaVersion must be ${JOURNAL_SCHEMA_VERSION_V2}, got ${record.schemaVersion} — invariant violation (BR-13)`
        );
      }
      if (def.durability !== "canonical") {
        throw new Error(
          `telemetry-classified event ${record.eventName} refused by the audit exporter — canonical accept set only (FR-EXP-4)`
        );
      }
      const missing = def.requiredAttributes.filter((key) => !(key in record.attributes));
      if (missing.length > 0) {
        throw new Error(
          `missing required attribute(s) for ${record.eventName}: ${missing.join(", ")} — invariant violation (BR-10)`
        );
      }
      // Export-boundary redaction (FR-DST-3 layer 2), applied immediately
      // before encode even when the write-time layer already ran. The v1
      // audit event type rides as an `Event` attribute so the legacy ledger
      // readers (auditBlockField, findAllEvents, the presence scan) keep
      // seeing the record while shards are mixed v1/v2 — until U6 swaps
      // those readers onto the Journal Module's mixed reader.
      const redacted = { ...redactAttributes(record.attributes, policy), Event: def.auditEvent as string };
      // Dry-run encode: malformed records (non-JSON attributes, bad shape)
      // fail here as codec invariant violations — before any I/O, so they
      // throw WITHOUT the latch (not write failures).
      serializeJournalEntryV2({ ...toJournalRow({ ...record, attributes: redacted }), seq: 1 });
      try {
        // An injected seam that returns nothing modelled a landed write.
        return append({ ...record, attributes: redacted }, options.projectDir, options.intent, options.space) ?? { appended: true };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        latch.setFatal(`canonical event write failed (${record.eventName}): ${message}`);
        throw cause;
      }
    },
  };
}
