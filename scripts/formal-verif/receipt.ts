import { canonicalIdentity } from "./canonical.ts";

const PRIVATE_KEY = /secret|credential|token|password|home|sealed|raw/i;
const PATH_VALUE = /(?:^|[\s"'=])(?:~[\\/]|[A-Za-z]:[\\/]|\\\\|\/(?!\/)[^\s"']+)/i;

function redact(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return PATH_VALUE.test(value) ? "[redacted-path]" : value;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[redacted-cycle]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  return Object.fromEntries(Object.entries(value).filter(([key]) => !PRIVATE_KEY.test(key)).map(([key, item]) => [key, redact(item, seen)]));
}

export function redactReceipt(value: Record<string, unknown>): Record<string, unknown> {
  return redact(value, new WeakSet()) as Record<string, unknown>;
}

export function receiptIdentity(value: Record<string, unknown>): { safe: Record<string, unknown>; identity: string } {
  const safe = redactReceipt(value);
  return { safe, identity: canonicalIdentity(safe, "amadeus.formal-verif.receipt.v1").sha256 };
}
