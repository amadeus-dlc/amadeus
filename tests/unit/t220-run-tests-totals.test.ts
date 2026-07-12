import { describe, expect, test } from "bun:test";
import { buildTestsTotals } from "../lib/run-tests-totals.ts";

describe("t220 run-tests totals seam", () => {
  test("builds the fixed four-key contract", () => expect(buildTestsTotals(2, 1, 9, 3)).toEqual({ files: 2, failedFiles: 1, assertions: 9, failedAssertions: 3 }));
  test("preserves zero totals", () => expect(buildTestsTotals(0, 0, 0, 0)).toEqual({ files: 0, failedFiles: 0, assertions: 0, failedAssertions: 0 }));
  test("maps each counter independently", () => expect(buildTestsTotals(7, 2, 41, 5)).toEqual({ files: 7, failedFiles: 2, assertions: 41, failedAssertions: 5 }));
});
