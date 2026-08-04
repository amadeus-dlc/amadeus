#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseRunLedger } from "./ledger.ts";
import { checkCapabilityMatrix, renderCapabilityMatrix, updateCapabilityMatrix } from "./projector.ts";
import { LIVE_CAPABILITIES } from "./registry.ts";

const REPO_ROOT = join(import.meta.dir, "../../..");
const DOCUMENT = join(REPO_ROOT, "docs/harness-engineering/live-e2e.md");
const LEDGER = join(REPO_ROOT, "tests/harness/live-e2e/runs.jsonl");

export function runMatrixCommand(command: "render" | "update" | "check"): number {
  const parsed = parseRunLedger(existsSync(LEDGER) ? readFileSync(LEDGER, "utf8") : "", {
    ledgerPath: LEDGER,
  });
  if (!parsed.ok) {
    process.stderr.write(`${parsed.error.kind}: ${parsed.error.diagnostic}\n`);
    return 1;
  }
  const expected = renderCapabilityMatrix(LIVE_CAPABILITIES, parsed.value);
  if (command === "render") {
    process.stdout.write(`${expected}\n`);
    return 0;
  }
  const document = readFileSync(DOCUMENT, "utf8");
  if (command === "update") {
    writeFileSync(DOCUMENT, updateCapabilityMatrix(document, expected), "utf8");
    return 0;
  }
  const checked = checkCapabilityMatrix(document, expected);
  if (!checked.ok) {
    process.stderr.write(`${checked.error.kind}: ${checked.error.diagnostic}\n`);
    return 1;
  }
  return 0;
}

if (import.meta.main) {
  const command = process.argv[2];
  if (command !== "render" && command !== "update" && command !== "check") {
    process.stderr.write("usage: bun tests/harness/live-e2e/project-matrix.ts <render|update|check>\n");
    process.exit(2);
  }
  process.exit(runMatrixCommand(command));
}
