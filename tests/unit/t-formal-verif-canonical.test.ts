import { describe, expect, test } from "bun:test";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";

describe("formal verification canonical identity", () => {
  test("ignores object insertion order", () => expect(canonicalIdentity({ b: 2, a: 1 }).sha256).toBe(canonicalIdentity({ a: 1, b: 2 }).sha256));
  test("preserves array order", () => expect(canonicalIdentity([1, 2]).sha256).not.toBe(canonicalIdentity([2, 1]).sha256));
  test("sorts nested keys", () => expect(new TextDecoder().decode(canonicalIdentity({ z: { b: 2, a: 1 } }).bytes)).toBe('{"z":{"a":1,"b":2}}'));
  test.each([Number.NaN, Infinity, -Infinity, undefined, Symbol("x"), () => 1])("rejects non JSON value %p", (value) => expect(() => canonicalIdentity(value)).toThrow());
  test("uses lowercase 64 hex", () => expect(canonicalIdentity({ x: 1 }).sha256).toMatch(/^[0-9a-f]{64}$/));
  test("domain separates identities", () => expect(canonicalIdentity({}, "a").sha256).not.toBe(canonicalIdentity({}, "b").sha256));
  test("serializes and hashes exactly once", () => { const counters = { serializations: 0, hashes: 0, encodedBytes: 0 }; const value = canonicalIdentity({ x: 1 }, "test", counters); expect(counters).toEqual({ serializations: 1, hashes: 1, encodedBytes: value.bytes.byteLength }); });
  test("property: key insertion order is immaterial for 100 generated records", () => {
    for (let i = 0; i < 100; i++) {
      const record = Object.fromEntries(Array.from({ length: (i % 7) + 1 }, (_, j) => [`k${(i * 17 + j * 13) % 31}`, i - j]));
      const reversed = Object.fromEntries(Object.entries(record).reverse());
      expect(canonicalIdentity(record).sha256).toBe(canonicalIdentity(reversed).sha256);
    }
  });
});
