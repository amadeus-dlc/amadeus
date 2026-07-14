// Canonical JSON and digest primitives shared by driver and referee contracts.

import { createHash } from "node:crypto";

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonicalValue(entry)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export function digestValue(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return canonicalJson(actual) === canonicalJson(expected);
}

export function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export type NeutralSchemaResult =
  | Readonly<{ type: "ok"; value: undefined }>
  | Readonly<{
      type: "err";
      error: Readonly<{ code: "SCHEMA_INVALID" | "SCHEMA_SECRET_FIELD"; field: string }>;
    }>;

const SECRET_KEY = /(password|passwd|secret|token|credential|cookie|authorization|prompt|raw(response|output)?)/i;
const SAFE_CORRELATION_KEYS = new Set(["fencingToken", "startTokenHash", "nonceHash", "attemptNonceHash"]);

/** Rejects secret-shaped fields without retaining or echoing their values. */
export function rejectSecretLikeFields(
  value: unknown,
  path = "$",
  seen = new Set<object>(),
): NeutralSchemaResult {
  if (!value || typeof value !== "object") return Object.freeze({ type: "ok", value: undefined });
  if (seen.has(value)) {
    return Object.freeze({
      type: "err",
      error: Object.freeze({ code: "SCHEMA_INVALID", field: path }),
    });
  }
  seen.add(value);
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!SAFE_CORRELATION_KEYS.has(key) && SECRET_KEY.test(key)) {
      seen.delete(value);
      return Object.freeze({
        type: "err",
        error: Object.freeze({ code: "SCHEMA_SECRET_FIELD", field: `${path}.${key}` }),
      });
    }
    const nested = rejectSecretLikeFields(entry, `${path}.${key}`, seen);
    if (nested.type === "err") {
      seen.delete(value);
      return nested;
    }
  }
  seen.delete(value);
  return Object.freeze({ type: "ok", value: undefined });
}
