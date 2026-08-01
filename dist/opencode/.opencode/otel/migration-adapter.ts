// migration-adapter.ts — the migration-period compatibility Adapter
// (FR-MIG-1, BR-1..BR-4).
//
// A legacy call site swaps `appendAuditEntry(eventType, fields, pd)` for
// `appendAuditEntryViaEvents(eventType, fields, pd)` — same parameter shape,
// same result shape, so the rewrite is one line — and its write then travels
// the canonical path: registry lookup by legacy v1 eventType, then emitEvent
// (Logger Provider -> AuditLogExporter -> audit JSONL).
//
// WHY NOT THE LEGACY NAME. component-methods.md sketches the Adapter as
// literally `appendAuditEntry`. Keeping that name would make the VER-4
// call-site guard unable to tell a MIGRATED site from an unmigrated one — both
// would read as `appendAuditEntry(`, and the guard's whole purpose is counting
// down the unmigrated ones. BR-2's requirement is the SIGNATURE (parameter and
// result shape), which is what makes the rewrite mechanical; the distinct name
// preserves that while keeping the guard meaningful. Declared as a deviation.
//
// WHAT THIS DELIBERATELY DOES NOT DO:
//   - no path to the old writer, so it cannot become a dual-write (BR-1);
//   - no try/catch, so emitEvent's throw and the exporter's fatal latch both
//     travel through untouched (BR-4);
//   - no attribute rewriting, defaulting or dropping — fields go through as
//     they are and meet the SAME two-layer redaction as any other emit, so
//     nothing reaches the journal by way of the Adapter that could not reach
//     it directly (BR-2, security-design.md);
//   - no fallback for an unregistered eventType: that is a drift-guard
//     violation and it throws (BR-3, VER-1);
//   - no pre-read of intent state. Checking the post-complete seal here would
//     add I/O to a delegation the design keeps at one map lookup
//     (performance-design.md), which is why the seal outcome is PROPAGATED
//     from the append instead (E-U7CG-Q3B ruling A').

import type { AppendAuditResult } from "../tools/amadeus-audit.ts";
import { getEventDefByAuditEvent } from "./event-registry.ts";
import type { RegisteredEventName } from "./event-registry.ts";
import { emitEvent } from "./logger-provider.ts";
import type { EmitOutcome } from "./logger-provider.ts";

// The legacy `appendAuditEntry` parameter shape. projectDir is accepted for
// call-shape compatibility but the write target comes from the registered
// provider — which is also why intent/space cannot be honoured here.
export function appendAuditEntryViaEvents(
  eventType: string,
  fields: Record<string, string>,
  _projectDir: string,
  intent?: string,
  space?: string
): AppendAuditResult {
  // Fail-closed on per-call targeting (E-U7CG-Q3A). emitEvent routes to the
  // target registerLoggerProvider was given; honouring a per-call intent/space
  // needs a canonical mechanism that does not exist yet. Silently writing to
  // the DEFAULT intent instead would land a delegated approval in the wrong
  // ledger, so the Adapter refuses rather than retargets. Such call sites stay
  // on the guard's allowlist until the follow-up ruling.
  if (intent !== undefined || space !== undefined) {
    throw new Error(
      `per-call intent/space targeting is not supported by the migration adapter (${eventType}) — the canonical path writes to the registered provider's target (E-U7CG-Q3A); keep this call site on the legacy writer until the follow-up ruling`
    );
  }
  // Reverse registry lookup: an unmapped legacy eventType throws here (BR-3).
  const def = getEventDefByAuditEvent(eventType);
  return appendAuditResultFromOutcome(eventType, def.name, emitEvent(def.name as RegisteredEventName, fields));
}

// The emit outcome -> legacy result mapping, exported as a pure seam so the
// telemetry-invariant arm is reachable from a test: through the public function
// it is unreachable by construction (getEventDefByAuditEvent only ever resolves
// canonical defs, since a telemetry def carries auditEvent: null), and an
// unreachable throw is exactly the kind of guard that rots untested.
export function appendAuditResultFromOutcome(
  eventType: string,
  eventName: string,
  outcome: EmitOutcome
): AppendAuditResult {
  if (outcome.appended) {
    return { appended: true, event: eventType, timestamp: outcome.timestamp };
  }
  if (outcome.reason === "intent-complete" || outcome.reason === "fatal-latch") {
    return { appended: false, reason: outcome.reason, event: eventType, timestamp: outcome.timestamp };
  }
  // A telemetry outcome means the registry and this adapter disagree about
  // durability — the legacy eventType resolved to a def that never reaches the
  // audit journal, so there is no honest AppendAuditResult to return.
  throw new Error(
    `legacy eventType ${eventType} resolved to telemetry-classified ${eventName} — invariant violation (BR-3)`
  );
}
