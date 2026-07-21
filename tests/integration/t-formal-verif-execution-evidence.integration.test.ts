import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import { parseCellResult } from "../../scripts/formal-verif/contract.ts";
import { receiptIdentity } from "../../scripts/formal-verif/receipt.ts";
import { runExecutionEvidenceScenario } from "../formal-verif/support/execution-evidence-harness.ts";

describe("formal verification U1 to U3 execution evidence seam", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));
  const root = () => { const value = mkdtempSync(join(tmpdir(), "fv-execution-integration-")); roots.push(value); return value; };
  test("publishes raw bytes and returns a verified suite proof", async () => { const result = await runExecutionEvidenceScenario(root()); expect(result.ok && result.value.rawStdout).toEqual([0, 10, 255]); expect(result.ok && result.value.proof).toBe("CompleteSuiteProof"); });
  test("uses a U1 canonical bundle identity", async () => { const result = await runExecutionEvidenceScenario(root()); expect(result.ok && result.value.bundleId).toMatch(/^[0-9a-f]{64}$/); expect(canonicalIdentity({ id: result.ok && result.value.bundleId }).sha256).toMatch(/^[0-9a-f]{64}$/); });
  test("retains timeout as HARNESS_ERROR rather than NOT_DETECTED", async () => { const result = await runExecutionEvidenceScenario(root(), "timeout"); expect(result.ok && result.value.verdict).toBe("HARNESS_ERROR"); expect(result.ok && result.value.proof).toBe("IncompleteSuiteProof"); });
  test("U1 strict parser rejects a handwritten partial result", () => expect(parseCellResult({ verdict: "DETECTED" }).ok).toBe(false));
  test("U1 safe receipt excludes raw private content", () => expect(receiptIdentity({ bundleId: "a", rawPayload: "secret" }).safe).toEqual({ bundleId: "a" }));
});
