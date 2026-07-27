// covers: file:scripts/plugin-projection.ts
// size: small
//
// U3 host-projection-all — computeProjectionHash is the single write⇔check
// comparison primitive (REL-U3-2): both the projector's write and
// checkPluginProjections hash file bytes through this one function, so check can
// never drift from write. Pure over bytes; a small unit fixes determinism and
// byte-sensitivity.

import { describe, expect, test } from "bun:test";

import { computeProjectionHash } from "../../scripts/plugin-projection.ts";

describe("t305 computeProjectionHash (single write⇔check primitive)", () => {
  test("is deterministic for identical bytes", () => {
    const a = Buffer.from("amadeus-plugin-bundle\n", "utf-8");
    const b = Buffer.from("amadeus-plugin-bundle\n", "utf-8");
    expect(computeProjectionHash(a)).toBe(computeProjectionHash(b));
  });

  test("differs for a one-byte change (byte equality iff hex equality)", () => {
    const base = computeProjectionHash(Buffer.from("hello", "utf-8"));
    const tweaked = computeProjectionHash(Buffer.from("hellp", "utf-8"));
    expect(base).not.toBe(tweaked);
  });

  test("is a 64-char sha256 hex digest", () => {
    expect(computeProjectionHash(Buffer.from("", "utf-8"))).toMatch(/^[0-9a-f]{64}$/);
  });
});
