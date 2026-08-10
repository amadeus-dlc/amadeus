import { describe, expect, test } from "bun:test";
import {
  resolveFinalTestTimeoutMs,
  resolveTestTimeFactor,
  scaleTestTime,
} from "../lib/test-time-factor.ts";

describe("TEST_TIME_FACTOR", () => {
  test("defaults only an unspecified value to one", () => {
    expect(resolveTestTimeFactor({})).toBe(1);
    expect(resolveTestTimeFactor({ TEST_TIME_FACTOR: "1" })).toBe(1);
    expect(resolveTestTimeFactor({ TEST_TIME_FACTOR: "2" })).toBe(2);
    expect(resolveTestTimeFactor({ TEST_TIME_FACTOR: "2.5" })).toBe(2.5);
    expect(resolveTestTimeFactor({ TEST_TIME_FACTOR: "3" })).toBe(3);
  });

  test.each(["", "0.5", "0", "-1", "NaN", "Infinity", "not-a-number"])(
    "rejects invalid value %s loudly",
    (value) => {
      expect(() => resolveTestTimeFactor({ TEST_TIME_FACTOR: value })).toThrow(
        "TEST_TIME_FACTOR",
      );
    },
  );

  test("scales a positive safe-integer base without shortening it", () => {
    expect(scaleTestTime(30_000, 1)).toBe(30_000);
    expect(scaleTestTime(30_000, 2)).toBe(60_000);
    expect(scaleTestTime(3, 1.1)).toBe(4);
  });

  test.each([0, -1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid base %p",
    (baseMs) => {
      expect(() => scaleTestTime(baseMs, 1)).toThrow("baseMs");
    },
  );

  test("rejects a non-finite or unsafe scaled result", () => {
    expect(() => scaleTestTime(Number.MAX_SAFE_INTEGER, 2)).toThrow("safe integer");
    expect(() => scaleTestTime(1, Number.MAX_VALUE)).toThrow("safe integer");
  });

  test("an AMADEUS_TEST_TIMEOUT final override is never multiplied again", () => {
    expect(resolveFinalTestTimeoutMs(600, { TEST_TIME_FACTOR: "2" })).toBe(600_000);
    expect(resolveFinalTestTimeoutMs(600, {
      AMADEUS_TEST_TIMEOUT: "120",
      TEST_TIME_FACTOR: "2",
    })).toBe(120_000);
    expect(resolveFinalTestTimeoutMs(600, {
      AMADEUS_TEST_TIMEOUT: "0",
      TEST_TIME_FACTOR: "2",
    })).toBe(0);
  });
});
