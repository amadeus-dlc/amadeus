import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyMatrix, verifySuite, type SuiteEvidence } from "../../scripts/formal-verif/evidence-completeness.ts";
import type { CellEvidenceInput, SampleKey } from "../../scripts/formal-verif/execution-evidence.ts";
import { FsEvidenceStoreAdapter, type VerifiedEvidenceProof } from "../../scripts/formal-verif/fs-evidence-store.ts";

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));
const result = (subject: string, verdict: "DETECTED" | "NOT_DETECTED" | "HARNESS_ERROR" = subject === "HEALTHY_BASELINE" ? "NOT_DETECTED" : "DETECTED") => ({ schemaVersion: 1 as const, arm: "tla" as const, fixtureId: subject, baselineSha: "b".repeat(64), armSha: "a".repeat(64), verdict, exitCode: 0, toolVersions: {}, seedOrBound: {}, startedAt: "2026-07-20T00:00:00Z", finishedAt: "2026-07-20T00:00:01Z", counterexampleId: verdict === "DETECTED" ? "c" : null, evidencePaths: [] });

async function proof(subject: string, sample: SampleKey, verdict?: "DETECTED" | "NOT_DETECTED" | "HARNESS_ERROR"): Promise<VerifiedEvidenceProof> {
  const root = mkdtempSync(join(tmpdir(), "fv-proof-")); roots.push(root);
  const store = new FsEvidenceStoreAdapter(root, { nowMs: () => 0, utcNow: () => "2026-07-20T00:00:02Z" });
  const input: CellEvidenceInput = { revisionIdentity: "9".repeat(64), key: { arm: "tla", subject, sample }, inputSetHash: "c".repeat(64), command: { argv: ["bin/tool", `${sample.kind}-${sample.runNo}`], cwd: ".", environmentKeys: [], snapshotIdentity: "d".repeat(64) }, result: result(subject, verdict), stdout: new Uint8Array([sample.runNo]), stderr: new Uint8Array(), timing: { processDurationMs: 1, cellElapsedMs: 2, suiteElapsedMs: sample.runNo + 3 } };
  const reserved = store.reserveCapacity(input.revisionIdentity, 64 * 1024); if (!reserved.ok) throw new Error(reserved.error.message);
  const published = await store.publishCell(input, 100); if (!published.ok) throw new Error(published.error.message);
  const read = store.readCell(published.value.bundleId); if (!read.ok) throw new Error(read.error.message);
  return read.value.proof;
}

async function suite(runNo: 0 | 1 | 2 | 3 | 4 | 5 = 1, subjects = ["HEALTHY_BASELINE", "D1"]): Promise<SuiteEvidence> {
  const sample: SampleKey = runNo === 0 ? { kind: "WARMUP", runNo: 0 } : { kind: "MEASURED", runNo };
  return { arm: "tla", sample, inputSetHash: "c".repeat(64), baselineSha: "b".repeat(64), armSha: "a".repeat(64), runnerClass: "macos-arm64", orderedSubjects: subjects, durationMs: 10, cells: await Promise.all(subjects.map(async (subject) => ({ proof: await proof(subject, sample) }))) };
}

describe("formal verification evidence completeness", () => {
  test("accepts store-verified proof for each canonical subject", async () => expect(verifySuite(["HEALTHY_BASELINE", "D1"], await suite()).kind).toBe("CompleteSuiteProof"));
  test("rejects a missing cell", async () => { const value = await suite(); expect(verifySuite(value.orderedSubjects, { ...value, cells: value.cells.slice(0, 1) }).kind).toBe("IncompleteSuiteProof"); });
  test("rejects a duplicate cell", async () => { const value = await suite(); expect(verifySuite(value.orderedSubjects, { ...value, cells: [...value.cells, value.cells[1]!] }).kind).toBe("IncompleteSuiteProof"); });
  test("rejects a genuine store proof outside the expected subject set", async () => { const value = await suite(); const outsider = await proof("OUTSIDE", value.sample); expect(verifySuite(value.orderedSubjects, { ...value, cells: [...value.cells, { proof: outsider }] }).kind).toBe("IncompleteSuiteProof"); });
  test("rejects a structurally forged proof", async () => { const value = await suite(); expect(verifySuite(value.orderedSubjects, { ...value, cells: [{ proof: { ...value.cells[0]!.proof } as never }, value.cells[1]!] }).kind).toBe("IncompleteSuiteProof"); });
  test("rejects subject order drift", async () => expect(verifySuite(["HEALTHY_BASELINE", "D1"], await suite(1, ["D1", "HEALTHY_BASELINE"])).kind).toBe("IncompleteSuiteProof"));
  test("rejects input set hash drift", async () => { const value = await suite(); expect(verifySuite(value.orderedSubjects, { ...value, inputSetHash: "f".repeat(64) }).kind).toBe("IncompleteSuiteProof"); });
  test("keeps HARNESS_ERROR as an incomplete finding", async () => { const value = await suite(); value.cells[1] = { proof: await proof("D1", value.sample, "HARNESS_ERROR") }; expect(verifySuite(value.orderedSubjects, value).findings.some((finding) => finding.kind === "HARNESS_ERROR_CELL")).toBe(true); });
  test("accepts one warmup and five agreeing measured suites", async () => expect(verifyMatrix({ arms: ["tla"], canonicalSubjects: ["HEALTHY_BASELINE", "D1"], suites: await Promise.all([suite(0), suite(1), suite(2), suite(3), suite(4), suite(5)]) }).kind).toBe("CompleteMatrix"));
  test("does not accept warmup as a measured run", async () => expect(verifyMatrix({ arms: ["tla"], canonicalSubjects: ["HEALTHY_BASELINE", "D1"], suites: await Promise.all([suite(0), suite(1), suite(2), suite(3), suite(4)]) }).kind).toBe("IncompleteMatrix"));
  test("rejects disagreement across measured verdicts", async () => { const values = await Promise.all([suite(0), suite(1), suite(2), suite(3), suite(4), suite(5)]); values[5]!.cells[1] = { proof: await proof("D1", { kind: "MEASURED", runNo: 5 }, "NOT_DETECTED") }; expect(verifyMatrix({ arms: ["tla"], canonicalSubjects: ["HEALTHY_BASELINE", "D1"], suites: values }).kind).toBe("IncompleteMatrix"); });
  test("only counts store-read proofs", async () => expect(verifySuite(["HEALTHY_BASELINE", "D1"], await suite()).verifiedBundles).toHaveLength(2));
});
