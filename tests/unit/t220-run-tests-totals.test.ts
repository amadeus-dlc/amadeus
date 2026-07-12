import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildTestsTotals, writeTestsTotals } from "../lib/run-tests-totals.ts";

const source = readFileSync(join(import.meta.dir, "../run-tests.ts"), "utf8");
describe("t220 run-tests totals seam", () => {
  test("builds the fixed four-key contract", () => expect(buildTestsTotals(2, 1, 9, 3)).toEqual({ files: 2, failedFiles: 1, assertions: 9, failedAssertions: 3 }));
  test("maps existing summary counters", () => expect(source).toContain("buildTestsTotals(totalFiles, failedFiles, totalTests, totalFailed)"));
  test("writes JSON successfully", () => {
    const root = mkdtempSync(join(tmpdir(), "t220-"));
    try { const path = join(root, "nested", "totals.json"); expect(writeTestsTotals(path, buildTestsTotals(1, 0, 4, 0))).toBe(true); expect(JSON.parse(readFileSync(path, "utf8")).assertions).toBe(4); }
    finally { rmSync(root, { recursive: true, force: true }); }
  });
  test("writes immediately before summary", () => expect(source.indexOf("writeTestsTotals(\n    join(coverageRoot")).toBeLessThan(source.indexOf('process.stdout.write("\\n==============================\\n")')));
  test("does not depend on coverage flag", () => expect(source.match(/writeTestsTotals\([\s\S]{0,300}/)?.[0]).not.toContain("args.coverage"));
  test("writer is best effort", () => expect(writeTestsTotals("/dev/null/impossible.json", buildTestsTotals(0, 0, 0, 0))).toBe(false));
  test("summary labels remain unchanged", () => expect(source).toContain("Total assertions: " + "$" + "{totalTests}"));
});
