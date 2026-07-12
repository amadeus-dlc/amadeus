import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("t220 runner totals boundary", () => {
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
