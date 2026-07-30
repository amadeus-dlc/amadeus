// redaction.ts — the two-layer redaction policy (FR-DST-3/4/5, production).
//
// One policy instance is shared by BOTH layers (BR-9): the write-time layer
// (logger/meter/tracer emit) and the export-boundary layer (each exporter,
// immediately before append). A caller bypassing the emit path therefore
// still cannot smuggle sensitive data into a Signal Store.
//
// Admission is default-deny: only safe keys (the registry's required-attribute
// vocabulary plus correlation ids) and explicit opt-in keys are admitted.
// EVERY admitted value is credential-scrubbed (FR-DST-5): opt-in never means
// raw pass-through (BR-12), and scrubbing safe-key values too is defense in
// depth — the per-layer cost stays O(attributes x patterns) with patterns
// compiled once at module load (performance-requirements.md).
//
// FR-DST-4 revisit outcome (BR-11): `Command` is NOT a raw safe key. It is a
// required attribute of amadeus.operation.failed, so it cannot be dropped —
// it is admitted only through the scrubbed opt-in tier, so argv-derived
// values never persist with tokens/credentials intact.
//
// VER-2 (BR-16): the credential-free gate scans with the SAME pattern
// vocabulary (CREDENTIAL_SCRUB_PATTERNS) the scrubber masks with — one
// vocabulary source, no double maintenance.

import { REGISTERED_EVENTS } from "./event-registry.ts";

// A credential pattern: a stable label (reported by the VER-2 gate instead of
// the matched secret, so CI logs never echo credentials) plus a compiled
// global regex. Compiled ONCE here at module load, shared by both redaction
// layers and the gate scanner.
export type CredentialPattern = {
  readonly label: string;
  readonly pattern: RegExp;
};

export const CREDENTIAL_SCRUB_PATTERNS: readonly CredentialPattern[] = [
  { label: "aws-access-key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { label: "github-token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{22,})\b/g },
  { label: "api-token", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { label: "bearer-token", pattern: /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/g },
  { label: "private-key-block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  {
    label: "credential-assignment",
    pattern: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|credential)\s*[:=]\s*["']?[^\s"']{8,}/gi,
  },
];

// The mask that replaces a matched credential. Fixed-length and label-free so
// the stored value carries no hint of the secret's shape.
export const REDACTED = "[REDACTED]";

export type RedactionPolicy = {
  readonly safeKeys: readonly string[];
  readonly optIn: readonly string[];
  readonly scrubPatterns: readonly CredentialPattern[];
};

// The registry's required-attribute vocabulary is the production safe-key
// baseline (U1's representative list hardened to the full 78-event
// vocabulary): those keys are the audit fields by design, so a policy that
// dropped one would silently strip mandated attributes. `Command` is carved
// out into the opt-in tier (FR-DST-4).
const REGISTRY_REQUIRED_KEYS: readonly string[] = [
  ...new Set(REGISTERED_EVENTS.flatMap((def) => def.requiredAttributes).filter((key) => key !== "Command")),
];

export const DEFAULT_REDACTION_POLICY: RedactionPolicy = {
  safeKeys: [
    ...REGISTRY_REQUIRED_KEYS,
    // Low-cardinality operational keys predating the registry vocabulary plus
    // the correlation ids the AuditLogExporter itself may add as attributes.
    "Options",
    "Rationale",
    "Note",
    "Event",
    "Outcome",
    "ExitCode",
    "TraceId",
    "SpanId",
  ],
  // FR-DST-4: Command is admitted ONLY here — argv-derived values are always
  // scrubbed, never stored raw (BR-11/BR-12).
  optIn: ["Command"],
  scrubPatterns: CREDENTIAL_SCRUB_PATTERNS,
};

// Recursively mask credential-shaped substrings in every string of a JSON
// value. Non-string values pass through unchanged; input is never mutated.
export function scrubCredentials(value: unknown, patterns: readonly CredentialPattern[] = CREDENTIAL_SCRUB_PATTERNS): unknown {
  if (typeof value === "string") {
    let out = value;
    for (const { pattern } of patterns) {
      out = out.replace(pattern, REDACTED);
    }
    return out;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubCredentials(item, patterns));
  }
  if (value !== null && typeof value === "object") {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      scrubbed[key] = scrubCredentials(item, patterns);
    }
    return scrubbed;
  }
  return value;
}

// One redaction pass — used by BOTH layers (write-time and export boundary).
// Admits safe + opt-in keys only (default-deny) and credential-scrubs every
// admitted value. Input is never mutated: a shared attributes object must not
// be filtered in place. Idempotent, so the two layers compose safely.
export function redactAttributes(
  attrs: Record<string, unknown>,
  policy: RedactionPolicy = DEFAULT_REDACTION_POLICY
): Record<string, unknown> {
  const admitted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (!policy.safeKeys.includes(key) && !policy.optIn.includes(key)) continue;
    admitted[key] = scrubCredentials(value, policy.scrubPatterns);
  }
  return admitted;
}

// VER-2 scanner: report the LABELS of every credential pattern present in the
// given text (never the matched secrets). Returns [] when the text is clean —
// the credential-free gate fails on any non-empty result (BR-15).
export function scanForCredentials(text: string, patterns: readonly CredentialPattern[] = CREDENTIAL_SCRUB_PATTERNS): string[] {
  const labels: string[] = [];
  for (const { label, pattern } of patterns) {
    // String.match with a global regex is stateless (no lastIndex carry-over),
    // so a single compiled pattern instance is safe across calls.
    if (text.match(pattern) !== null) labels.push(label);
  }
  return labels;
}
