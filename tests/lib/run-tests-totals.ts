import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface TestsTotals {
  files: number;
  failedFiles: number;
  assertions: number;
  failedAssertions: number;
}

export function buildTestsTotals(files: number, failed: number, assertions: number, failedAssertions: number): TestsTotals {
  return { files, failedFiles: failed, assertions, failedAssertions };
}

export function writeTestsTotals(path: string, totals: TestsTotals): boolean {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(totals, null, 2)}\n`, "utf8");
    return true;
  } catch (error) {
    process.stderr.write(`NOTE: could not write tests totals (${error})\n`);
    return false;
  }
}
