#!/usr/bin/env bun
import { isMode, resultExitCode, runGate } from "./no-silent-drop/engine.ts";
import { errorResult } from "./no-silent-drop/model.ts";

const mode = process.argv[2];
const result = isMode(mode)
  ? await runGate(mode)
  : errorResult(
      "RULE_INVALID",
      "usage: bun tests/no-silent-drop-gate.ts <check|census-evidence|approve-evidence|baseline-candidate>",
    );

process.stdout.write(`${JSON.stringify(result)}\n`);
process.exitCode = resultExitCode(result);
