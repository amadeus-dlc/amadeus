import { createHash } from "node:crypto";

export type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;

export type LiveStatus = "success" | "skip" | "timeout" | "failure";

export type LiveCode =
  | "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN"
  | "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED"
  | "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING"
  | "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED"
  | "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING"
  | "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE"
  | "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED"
  | "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT"
  | "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED"
  | "AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED"
  | "AMADEUS_LIVE_E2E:PASS:SUCCESS";

export interface SanitizedEvidence {
  readonly kind: string;
  readonly value: string;
  readonly source: "policy" | "preflight" | "adapter" | "assertion" | "cleanup" | "ledger";
}

export interface LiveOutcome {
  readonly status: LiveStatus;
  readonly code: LiveCode;
  readonly diagnostic: string;
  readonly evidence: readonly SanitizedEvidence[];
}

const STATUS_PREFIX: Readonly<Record<LiveStatus, string>> = {
  success: "AMADEUS_LIVE_E2E:PASS:",
  skip: "AMADEUS_LIVE_E2E:SKIP:",
  timeout: "AMADEUS_LIVE_E2E:TIMEOUT:",
  failure: "AMADEUS_LIVE_E2E:FAIL:",
};

const TOKEN_PATTERN = /(?:sk|sess|key|token|secret)[-_=:][A-Za-z0-9._-]+/gi;
const ABSOLUTE_PATH_PATTERN = /(?:[A-Za-z]:\\|\/)(?:[^\s/\\]+[/\\])+[^\s]*/g;

export function codeMatchesStatus(status: LiveStatus, code: LiveCode): boolean {
  return code.startsWith(STATUS_PREFIX[status]);
}

export function sanitizeText(value: string, maxLength = 512): string {
  const redacted = value
    .replace(TOKEN_PATTERN, "[REDACTED]")
    .replace(ABSOLUTE_PATH_PATTERN, "<absolute-path>");
  if (redacted.length <= maxLength) return redacted;
  return `${redacted.slice(0, maxLength)}…[sha256:${digest(value)}]`;
}

export function sanitizeEvidence(evidence: SanitizedEvidence): SanitizedEvidence {
  return { ...evidence, value: sanitizeText(evidence.value) };
}

export function sanitizeOutcome(outcome: LiveOutcome): LiveOutcome {
  return {
    ...outcome,
    diagnostic: sanitizeText(outcome.diagnostic),
    evidence: outcome.evidence.map(sanitizeEvidence),
  };
}

export function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
