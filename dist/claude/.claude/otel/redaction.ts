// redaction.ts — write-time redaction policy (FR-DST-3 first layer, minimal).
//
// Default-deny key filter applied at emit time: only safe keys (low
// cardinality, no free text) plus explicit opt-in keys reach the Signal
// Stores. The export-boundary second layer and value scrubbing
// (FR-DST-4/FR-DST-5) are U4 hardening; U1 pins the structural split so the
// policy can never be bypassed by a caller forgetting to filter.

export type RedactionPolicy = {
  readonly safeKeys: readonly string[];
  readonly optIn: readonly string[];
};

// Safe keys cover the representative U1 vocabulary plus the correlation ids
// the AuditLogExporter adds itself. `command` is deliberately NOT safe: its
// argv-derived values are under FR-DST-4 review, so U1 keeps them out.
export const DEFAULT_REDACTION_POLICY: RedactionPolicy = {
  safeKeys: [
    "Stage",
    "Decision",
    "Details",
    "Options",
    "Rationale",
    "Reason",
    "Note",
    "Event",
    "Tool",
    "Outcome",
    "ExitCode",
    "TraceId",
    "SpanId",
  ],
  optIn: [],
};

// Return a new attributes object holding only admitted keys. Input is never
// mutated — a shared attributes object must not be filtered in place.
export function redactAttributes(
  attrs: Record<string, unknown>,
  policy: RedactionPolicy = DEFAULT_REDACTION_POLICY
): Record<string, unknown> {
  const admitted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (!policy.safeKeys.includes(key) && !policy.optIn.includes(key)) continue;
    admitted[key] = value;
  }
  return admitted;
}
