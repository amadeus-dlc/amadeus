import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildTestsTotals, writeTestsTotals } from "../lib/run-tests-totals.ts";

describe("t220 runner totals boundary", () => {
  test("writer creates JSON and isolates write failure", () => {
    const root = mkdtempSync(join(tmpdir(), "t220-"));
    try {
      const path = join(root, "nested", "totals.json");
      expect(writeTestsTotals(path, buildTestsTotals(1, 0, 4, 0))).toBe(true);
      expect(JSON.parse(readFileSync(path, "utf8")).assertions).toBe(4);
      expect(writeTestsTotals("/dev/null/impossible.json", buildTestsTotals(0, 0, 0, 0))).toBe(false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  test("runner source keeps totals immediately before the unchanged summary", () => {
    const source = readFileSync(join(import.meta.dir, "../run-tests.ts"), "utf8");
    expect(source).toContain("buildTestsTotals(totalFiles, failedFiles, totalTests, totalFailed)");
    expect(source.indexOf("writeTestsTotals(\n    join(coverageRoot")).toBeLessThan(source.indexOf('process.stdout.write("\\n==============================\\n")'));
    expect(source.match(/writeTestsTotals\([\s\S]{0,300}/)?.[0]).not.toContain("args.coverage");
    expect(source).toContain("Total assertions: " + "$" + "{totalTests}");
  });
  test("non-coverage run emits totals matching SUMMARY", () => {
    const root = join(import.meta.dir, "../..");
    const result = spawnSync(process.execPath, ["tests/run-tests.ts", "--unit", "--filter", "t221-metrics-snapshot-core"], { cwd: root, encoding: "utf8" });
    expect(result.status).toBe(0);
    const totals = JSON.parse(readFileSync(join(root, "coverage/tests-totals.json"), "utf8"));
    expect(totals).toEqual({
      files: Number(/Test files: (\d+)/.exec(result.stdout)?.[1]),
      failedFiles: Number(/Failed files: (\d+)/.exec(result.stdout)?.[1]),
      assertions: Number(/Total assertions: (\d+)/.exec(result.stdout)?.[1]),
      failedAssertions: Number(/Failed assertions: (\d+)/.exec(result.stdout)?.[1]),
    });
    expect(result.stdout).toContain(`Total assertions: ${totals.assertions}`);
  }, 10_000);
});
