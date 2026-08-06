import { createHash, randomBytes } from "node:crypto";

/** Crockford Base32 alphabet (no I, L, O, U). */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// The leading character carries the 2 zero pad bits, so it never exceeds 7.
const ULID_RE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

export type Ulid = string & { readonly __brand: "Ulid" };

/** Encode 128 bits (16 bytes) as a 26-character Crockford ULID (130 bits with 2 leading zero pad bits). */
function encodeUlidBytes(bytes: Uint8Array): Ulid {
  if (bytes.length !== 16) throw new Error(`ULID requires 16 bytes, got ${bytes.length}`);
  let bits = 0n;
  for (const byte of bytes) bits = (bits << 8n) | BigInt(byte);
  let out = "";
  for (let i = 25; i >= 0; i -= 1) {
    out += CROCKFORD[Number((bits >> BigInt(i * 5)) & 0x1fn)];
  }
  return out as Ulid;
}

function writeTimestamp(ms: number, target: Uint8Array): void {
  if (!Number.isInteger(ms) || ms < 0 || ms > 0xffff_ffff_ffff) {
    throw new Error(`ULID timestamp out of range: ${ms}`);
  }
  let value = ms;
  for (let i = 5; i >= 0; i -= 1) {
    target[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
}

/** Mint a new ULID (48-bit timestamp + 80-bit cryptographically random). Monotonicity is not required. */
export function mintUlid(nowMs: number = Date.now()): Ulid {
  const bytes = new Uint8Array(16);
  writeTimestamp(nowMs, bytes);
  bytes.set(randomBytes(10), 6);
  return encodeUlidBytes(bytes);
}

/**
 * Deterministic ULID for migration/replay: timestamp bits fixed at 0 and the
 * 80-bit randomness taken from sha256(seed). Fold is order-independent, so the
 * zero timestamp is intentional.
 */
export function ulidFromSeed(seed: string): Ulid {
  const bytes = new Uint8Array(16);
  writeTimestamp(0, bytes);
  bytes.set(createHash("sha256").update(seed).digest().subarray(0, 10), 6);
  return encodeUlidBytes(bytes);
}

export function isUlid(value: string): value is Ulid {
  return ULID_RE.test(value);
}

export function parseUlid(value: string, label = "ulid"): Ulid {
  if (!isUlid(value)) throw new Error(`${label} is not a ULID: ${value}`);
  return value;
}
