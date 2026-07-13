import { describe, expect, test } from "bun:test";
import { countTextLines, summarizeCcn } from "../../scripts/metrics-snapshot.ts";

describe("t221 six collectors", () => {
  test("LOC counts trailing newline, no trailing newline, CRLF and empty text exactly", () => {
    expect(countTextLines("one\ntwo\n")).toBe(2);
    expect(countTextLines("one\ntwo")).toBe(2);
    expect(countTextLines("one\r\ntwo\r\n")).toBe(2);
    expect(countTextLines("")).toBe(0);
  });
  test("CCN p50, p90 and over-threshold values are numerically fixed", () => {
    const records = [1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map((ccn) => ({ ccn }));
    expect(summarizeCcn(records)).toMatchObject({ functions: 10, p50: 5, p90: 9, max: 20, over_threshold: 1, threshold: 15 });
  });
});
