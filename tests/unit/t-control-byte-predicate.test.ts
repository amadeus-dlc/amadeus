// size: small
//
// Byte-class coverage for the control-byte predicate (#2814). Pure: no
// filesystem, no process. Every byte value that decides the gate's verdict is
// asserted here, so a change to the excluded set cannot pass unnoticed.

import { describe, expect, test } from "bun:test";
import { findControlByte, isForbiddenControlByte } from "../lib/control-byte.ts";

describe("isForbiddenControlByte", () => {
  test("the three whitespace control bytes are excluded", () => {
    expect(isForbiddenControlByte(0x09)).toBe(false); // TAB
    expect(isForbiddenControlByte(0x0a)).toBe(false); // LF
    expect(isForbiddenControlByte(0x0d)).toBe(false); // CR
  });

  test("representative C0 control bytes and DEL are forbidden", () => {
    for (const byte of [0x00, 0x08, 0x0b, 0x0c, 0x1f, 0x7f]) {
      expect(isForbiddenControlByte(byte)).toBe(true);
    }
  });

  test("every byte below 0x20 except TAB/LF/CR is forbidden", () => {
    for (let byte = 0x00; byte < 0x20; byte += 1) {
      const excluded = byte === 0x09 || byte === 0x0a || byte === 0x0d;
      expect(isForbiddenControlByte(byte)).toBe(!excluded);
    }
  });

  test("printable ASCII and UTF-8 continuation range are not forbidden", () => {
    expect(isForbiddenControlByte(0x20)).toBe(false); // SPACE
    expect(isForbiddenControlByte(0x41)).toBe(false); // "A"
    expect(isForbiddenControlByte(0xe3)).toBe(false); // UTF-8 lead byte (Japanese)
    expect(isForbiddenControlByte(0x80)).toBe(false); // UTF-8 continuation byte
    expect(isForbiddenControlByte(0xff)).toBe(false);
  });
});

describe("findControlByte", () => {
  test("an empty buffer has no violation", () => {
    expect(findControlByte(new Uint8Array(0))).toBeNull();
  });

  test("clean UTF-8 text has no violation", () => {
    expect(findControlByte(new TextEncoder().encode("日本語\tline\r\nnext\n"))).toBeNull();
  });

  test("the FIRST violating byte is reported with its offset", () => {
    const buffer = Uint8Array.from([0x41, 0x42, 0x00, 0x43, 0x1f]);
    expect(findControlByte(buffer)).toEqual({ offset: 2, byte: 0x00 });
  });

  test("a violation at offset 0 is reported", () => {
    expect(findControlByte(Uint8Array.from([0x07, 0x41]))).toEqual({ offset: 0, byte: 0x07 });
  });

  test("DEL is reported", () => {
    expect(findControlByte(Uint8Array.from([0x41, 0x7f]))).toEqual({ offset: 1, byte: 0x7f });
  });

  test("escape notation written as text is not a violation", () => {
    // The literal characters backslash, x, 0, 0 — this is how the gate's own
    // sources spell control bytes, and it must stay scannable.
    expect(findControlByte(new TextEncoder().encode("\\x00 \\u0000 \\x7F"))).toBeNull();
  });
});
