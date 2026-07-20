import { describe, expect, test } from "bun:test";
import { parseChoiceResolution } from "../../scripts/amadeus-election";

describe("tie choice resolution parser", () => {
  test("parses canonical non-negative internal choice numbers", () => {
    expect(parseChoiceResolution("choice:0")).toBe(0);
    expect(parseChoiceResolution("choice:1")).toBe(1);
    expect(parseChoiceResolution("choice:42")).toBe(42);
  });

  test("rejects binary and malformed resolution values", () => {
    for (const value of ["adopted", "rejected", "choice:", "choice:00", "choice:01", "choice:x", " choice:1"])
      expect(parseChoiceResolution(value)).toBeNull();
  });
});
