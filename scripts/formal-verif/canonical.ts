import { createHash } from "node:crypto";

export interface CanonicalIdentity {
  bytes: Uint8Array;
  sha256: string;
}
export interface CanonicalCounters { serializations: number; hashes: number; encodedBytes: number }

function normalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number is not canonical JSON");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) out[key] = normalize(source[key]);
    return out;
  }
  throw new TypeError(`unsupported canonical JSON value: ${typeof value}`);
}

export function canonicalIdentity(value: unknown, domain = "amadeus.formal-verif.value.v1", counters?: CanonicalCounters): CanonicalIdentity {
  const json = JSON.stringify(normalize(value));
  const bytes = new TextEncoder().encode(json);
  const sha256 = createHash("sha256").update(domain).update("\0").update(bytes).digest("hex");
  if (counters) { counters.serializations++; counters.hashes++; counters.encodedBytes += bytes.byteLength; }
  return { bytes, sha256 };
}
