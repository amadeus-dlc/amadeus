import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifySuite } from "../../../scripts/formal-verif/evidence-completeness.ts";
import { executeCell, type CellNormalizer, type MonotonicClock, type ProcessPort } from "../../../scripts/formal-verif/execution-evidence.ts";
import { authorizeExecution } from "../../../scripts/formal-verif/execution-policy.ts";
import { FsEvidenceStoreAdapter } from "../../../scripts/formal-verif/fs-evidence-store.ts";

export async function runExecutionEvidenceScenario(root: string, scenario: "happy" | "timeout" = "happy") {
  let monotonic = 0;
  const clock: MonotonicClock = { nowMs: () => monotonic++, utcNow: () => "2026-07-20T00:00:00Z" };
  const repositoryRoot = join(root, "repository"); mkdirSync(join(repositoryRoot, "bin"), { recursive: true }); writeFileSync(join(repositoryRoot, "bin/fake"), "fake"); writeFileSync(join(repositoryRoot, "public.json"), "{}\n");
  const executableHash = createHash("sha256").update("fake").digest("hex");
  const authorized = authorizeExecution({ repositoryRoot, snapshotRoot: join(root, "snapshots"), executable: { path: "bin/fake", version: "1", sha256: executableHash }, allowedEnvironmentKeys: [], allowedPathPrefixes: ["bin", "public.json"] }, { revisionIdentity: "9".repeat(64), argv: ["bin/fake"], cwd: ".", environment: {}, inputPaths: ["public.json"], outputPath: "out", arm: "tla", subject: "HEALTHY_BASELINE", armSha: "a".repeat(64), baselineSha: "b".repeat(64), inputSetHash: "c".repeat(64) });
  if (!authorized.ok) return authorized;
  const request = authorized.value;
  const process: ProcessPort = { execute: async () => ({ exitCode: scenario === "happy" ? 0 : null, signal: null, stdout: new Uint8Array([0, 10, 255]), stderr: new Uint8Array([13, 10]), timedOut: scenario === "timeout", completedExploration: scenario === "happy", toolVersions: { fake: "1" } }) };
  const normalizer: CellNormalizer = { normalize: (outcome, value, startedAt, finishedAt) => ({ ok: true, value: { schemaVersion: 1, arm: value.arm, fixtureId: value.subject, baselineSha: value.baselineSha, armSha: value.armSha, verdict: outcome.exitCode === 0 ? "NOT_DETECTED" : "HARNESS_ERROR", exitCode: outcome.exitCode, toolVersions: { ...outcome.toolVersions }, seedOrBound: { bound: 1 }, startedAt, finishedAt, counterexampleId: null, evidencePaths: [] } }) };
  const store = new FsEvidenceStoreAdapter(join(root, "store"), clock);
  const reserved = store.reserveCapacity(request.revisionIdentity, 64 * 1024);
  if (!reserved.ok) return reserved;
  const executed = await executeCell(request, { arm: "tla", subject: request.subject, sample: { kind: "MEASURED", runNo: 1 } }, 0, 120, { clock, process, normalizer, store });
  if (!executed.ok) return executed;
  const read = store.readCell(executed.receipt.bundleId);
  if (!read.ok) return read;
  const proof = verifySuite([request.subject], { arm: "tla", sample: { kind: "MEASURED", runNo: 1 }, inputSetHash: request.inputSetHash, baselineSha: request.baselineSha, armSha: request.armSha, runnerClass: "test", orderedSubjects: [request.subject], durationMs: 1, cells: [{ proof: read.value.proof }] });
  return { ok: true as const, value: { verdict: executed.result.verdict, bundleId: executed.receipt.bundleId, rawStdout: [...read.value.payloads["stdout.bin"]], proof: proof.kind } };
}

if (import.meta.main) {
  const root = mkdtempSync(join(tmpdir(), "fv-execution-e2e-"));
  try {
    const scenario = process.argv[2] === "timeout" ? "timeout" : "happy";
    process.stdout.write(`${JSON.stringify(await runExecutionEvidenceScenario(root, scenario))}\n`);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
