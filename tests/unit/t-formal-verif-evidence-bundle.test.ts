import { describe, expect, test } from "bun:test";
import { createEvidenceBundle, createEvidenceEnvelope, STREAM_PAYLOAD_LIMIT, verifyEvidenceBundle } from "../../scripts/formal-verif/evidence-bundle.ts";
import type { CellEvidenceInput } from "../../scripts/formal-verif/execution-evidence.ts";

const cell = { schemaVersion: 1 as const, arm: "tla" as const, fixtureId: "HEALTHY_BASELINE", baselineSha: "b".repeat(64), armSha: "a".repeat(64), verdict: "NOT_DETECTED" as const, exitCode: 0, toolVersions: { bun: "1" }, seedOrBound: { bound: 3 }, startedAt: "2026-07-20T00:00:00Z", finishedAt: "2026-07-20T00:00:01Z", counterexampleId: null, evidencePaths: [] };
const input = (stdout = new Uint8Array([0, 10, 255])): CellEvidenceInput => ({ revisionIdentity: "9".repeat(64), key: { arm: "tla", subject: "HEALTHY_BASELINE", sample: { kind: "MEASURED", runNo: 1 } }, inputSetHash: "c".repeat(64), command: { argv: ["bin/tool"], cwd: ".", environmentKeys: ["LANG"], snapshotIdentity: "d".repeat(64) }, result: cell, stdout, stderr: new Uint8Array([13, 10]), timing: { processDurationMs: 1, cellElapsedMs: 2, suiteElapsedMs: 3 } });

describe("formal verification evidence bundle", () => {
  test("builds a content-addressed closed five-payload bundle", () => {
    const result = createEvidenceBundle(input());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.manifest.map((item) => item.role)).toEqual(["result.json", "command.json", "stdout.bin", "stderr.bin", "timing.json"]);
      expect(result.value.bundleId).toMatch(/^[0-9a-f]{64}$/);
      expect(result.value.payloads["stdout.bin"]).toEqual(new Uint8Array([0, 10, 255]));
    }
  });
  test("is deterministic for the same five payloads", () => { const a = createEvidenceBundle(input()); const b = createEvidenceBundle(input()); expect(a.ok && b.ok && a.value.bundleId).toBe(b.ok && b.value.bundleId); });
  test("binds raw stdout bytes", () => { const a = createEvidenceBundle(input(new Uint8Array([0]))); const b = createEvidenceBundle(input(new Uint8Array([1]))); expect(a.ok && b.ok && a.value.bundleId).not.toBe(b.ok && b.value.bundleId); });
  test("copies mutable raw streams", () => { const bytes = new Uint8Array([1, 2]); const result = createEvidenceBundle(input(bytes)); bytes.fill(9); expect(result.ok && result.value.payloads["stdout.bin"]).toEqual(new Uint8Array([1, 2])); });
  test("accepts a stream at the exact cap", () => expect(createEvidenceBundle(input(new Uint8Array(STREAM_PAYLOAD_LIMIT))).ok).toBe(true));
  test("rejects a stream one byte above the cap", () => expect(createEvidenceBundle(input(new Uint8Array(STREAM_PAYLOAD_LIMIT + 1))).ok).toBe(false));
  test("verifies an unchanged bundle", () => { const result = createEvidenceBundle(input()); expect(result.ok && verifyEvidenceBundle(result.value).ok).toBe(true); });
  test("rejects payload byte tampering", () => { const result = createEvidenceBundle(input()); if (!result.ok) throw new Error("setup"); const tampered = { ...result.value, payloads: { ...result.value.payloads, "stderr.bin": new Uint8Array([9]) } }; expect(verifyEvidenceBundle(tampered).ok).toBe(false); });
  test("rejects a missing payload role", () => { const result = createEvidenceBundle(input()); if (!result.ok) throw new Error("setup"); const payloads = { ...result.value.payloads } as Record<string, Uint8Array>; delete payloads["timing.json"]; expect(verifyEvidenceBundle({ ...result.value, payloads: payloads as never }).ok).toBe(false); });
  test("creates a separately domain-protected envelope", () => { const bundle = createEvidenceBundle(input()); if (!bundle.ok) throw new Error("setup"); const envelope = createEvidenceEnvelope(bundle.value, { expectedRunnerHead: null, expectedStoreHead: null, runnerSequence: 0, storeSequence: 0 }, "2026-07-20T00:00:02Z"); expect(envelope.ok && envelope.value.envelopeHash).toMatch(/^[0-9a-f]{64}$/); expect(envelope.ok && envelope.value.envelopeHash).not.toBe(bundle.value.bundleId); });
  test("binds publication time without changing bundle identity", () => { const bundle = createEvidenceBundle(input()); if (!bundle.ok) throw new Error("setup"); const coordinates = { expectedRunnerHead: null, expectedStoreHead: null, runnerSequence: 0, storeSequence: 0 }; const a = createEvidenceEnvelope(bundle.value, coordinates, "2026-07-20T00:00:02Z"); const b = createEvidenceEnvelope(bundle.value, coordinates, "2026-07-20T00:00:03Z"); expect(a.ok && b.ok && a.value.envelopeHash).not.toBe(b.ok && b.value.envelopeHash); expect(bundle.value.bundleId).toMatch(/^[0-9a-f]{64}$/); });
  test("rejects invalid envelope metadata", () => { const bundle = createEvidenceBundle(input()); if (!bundle.ok) throw new Error("setup"); expect(createEvidenceEnvelope(bundle.value, { expectedRunnerHead: null, expectedStoreHead: null, runnerSequence: -1, storeSequence: 0 }, "not-a-date").ok).toBe(false); });
});
