import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkCapabilityMatrix, renderCapabilityMatrix } from "../harness/live-e2e/projector.ts";
import { parseRunLedger } from "../harness/live-e2e/ledger.ts";
import { LIVE_CAPABILITIES } from "../harness/live-e2e/registry.ts";

const DOCUMENT_PATH = resolve("docs/harness-engineering/live-e2e.md");
const LEDGER_PATH = resolve("tests/harness/live-e2e/runs.jsonl");

describe("live E2E runbook contract", () => {
  test("documents every registry adapter and mandatory operational boundary", () => {
    const document = readFileSync(DOCUMENT_PATH, "utf8");
    for (const heading of [
      "## Safety boundary",
      "## Running a live journey",
      "## Ledger and matrix",
      "## Distribution change trigger",
      "## Troubleshooting",
    ]) {
      expect(document).toContain(heading);
    }
    for (const capability of LIVE_CAPABILITIES) {
      expect(document).toContain(capability.id);
      expect(document).toContain(capability.optInKey);
    }
    expect(document).toContain("GitHub Actions");
    expect(document).toContain("dist/<harness>");
    expect(document).toContain("driver");
    expect(document).toContain("installer");
    expect(document).toContain("tests/harness/live-e2e/runs.jsonl");
  });

  test("committed matrix is the deterministic registry plus ledger projection", () => {
    const parsed = parseRunLedger(readFileSync(LEDGER_PATH, "utf8"), { ledgerPath: LEDGER_PATH });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const expected = renderCapabilityMatrix(LIVE_CAPABILITIES, parsed.value);
    expect(checkCapabilityMatrix(readFileSync(DOCUMENT_PATH, "utf8"), expected)).toEqual({
      ok: true,
      value: undefined,
    });
  });
});
