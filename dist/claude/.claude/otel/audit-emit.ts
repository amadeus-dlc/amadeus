// audit-emit.ts — the TARGETED canonical audit emit seam (E-U8PRE O-T1).
//
// WHY THIS EXISTS ALONGSIDE THE ADAPTER. migration-adapter.ts refuses per-call
// intent/space fail-closed: at U7 the canonical path had no way to honour a
// target, and silently retargeting a delegated approval at the default intent
// was the worse failure. E-U8PRE O-T1 supplied the missing mechanism —
// emitEvent's `target`, which drives BOTH halves of the write (the shard the row
// lands in AND the row's own identity fields). This module is the single place
// that pairing plus the legacy-eventType lookup is expressed, so the targeting
// call sites migrated in G2 do not each re-derive it.
//
// The Adapter is unchanged and stays the seam for UNTARGETED sites — this module
// delegates to it rather than growing a second untargeted path.
//
// WHAT IT DELIBERATELY DOES NOT DO, matching the Adapter's contract:
//   - no path to the legacy writer, so it cannot become a dual-write (BR-1);
//   - no try/catch, so emitEvent's throw and the exporter's fatal latch travel
//     through untouched (BR-4);
//   - no attribute rewriting — fields meet the same two-layer redaction as any
//     other emit (BR-2);
//   - no fallback for an unregistered eventType: that is a drift-guard
//     violation and it throws (BR-3, VER-1).
//
// LOCK IDENTITY. The target reaches appendJournalRecordV2 as its (intent, space)
// pair, which is also the audit lock identity. A call issued from inside a
// withAuditLock section for the SAME identity therefore re-enters (the depth
// counter) instead of taking a second OS-level acquire — which is what keeps an
// enclosing section's own retry budget the only one that is ever spent. Passing
// a target that disagrees with the enclosing section would take a fresh acquire
// against a different bucket, so callers thread the SAME pair they locked on.

import type { AppendAuditResult } from "../tools/amadeus-audit.ts";
import { ensureOtelBootstrap } from "./bootstrap.ts";
import { getEventDefByAuditEvent } from "./event-registry.ts";
import type { RegisteredEventName } from "./event-registry.ts";
import { emitEvent } from "./logger-provider.ts";
import { appendAuditEntryViaEvents, appendAuditResultFromOutcome } from "./migration-adapter.ts";

// The legacy `appendAuditEntry` parameter and result shape, targeting included,
// so a migrating call site changes its import and the function name.
//
// The bootstrap is called on every emit rather than pushed onto each caller's
// entry point: it is idempotent by construction, the callers include paths with
// no entry point of their own to hook (emitError is reached from library code in
// any process), and a forgotten bootstrap surfaces as emitEvent's "emit before
// registerLoggerProvider" throw rather than a missing audit row.
export function emitAuditEvent(
  eventType: string,
  fields: Record<string, string>,
  projectDir: string,
  intent?: string,
  space?: string
): AppendAuditResult {
  ensureOtelBootstrap(projectDir);
  if (intent === undefined && space === undefined) {
    return appendAuditEntryViaEvents(eventType, fields, projectDir);
  }
  // Reverse registry lookup: an unmapped legacy eventType throws here (BR-3).
  const def = getEventDefByAuditEvent(eventType);
  return appendAuditResultFromOutcome(
    eventType,
    def.name,
    emitEvent(def.name as RegisteredEventName, fields, { intent, space })
  );
}
