#!/usr/bin/env bun
import { join } from "node:path";
import {
  evaluateTimingSinks,
  loadTimingAllowlist,
  scanTestTimingSinks,
  validateTimingAllowlist,
} from "./lib/test-time-factor-guard.ts";

export function runTestTimeFactorGuard(repoRoot: string = join(import.meta.dir, "..")): number {
  try {
    const { findings, paths } = scanTestTimingSinks(repoRoot);
    const allowlist = loadTimingAllowlist(join(repoRoot, "tests", ".test-time-factor-allowlist.json"));
    const errors = [
      ...validateTimingAllowlist(allowlist, paths),
      ...evaluateTimingSinks(findings, allowlist).errors,
    ];
    if (errors.length > 0) {
      for (const error of errors) process.stderr.write(`test-time-factor guard: ${error}\n`);
      return 1;
    }
    process.stdout.write(`test-time-factor guard: ${findings.length} classified fixed timing sink(s)\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`test-time-factor guard: ${(error as Error).message}\n`);
    return 1;
  }
}

if (import.meta.main) process.exit(runTestTimeFactorGuard());
