// run-skeleton-ci.ts — walking-skeleton CI runner (FR-8: TLA arm × D4 invalid-timestamp).
//
// Runs the real TLC toolchain TWICE against the tree it is executed from and
// writes a two-row artifact. The workflow applies the D4 arm-T face patch
// (tests/formal-verif/fixtures/arm-t/d4-invalid-timestamp.patch) BEFORE calling
// this runner, so generateFrozenTlaModel() here yields the defective model and
// the frozen-receipt regeneration check passes inside the composed tree — the
// same injection mechanism measured locally on 2026-07-22 (issue #1359).
//
// Exit 0 only when BOTH runs normalize to DETECTED with the SAME counterexample
// identity (run1/run2 determinism). Every other outcome — NOT_DETECTED,
// HARNESS_ERROR, drift between runs — exits non-zero with the full rows on
// stdout so the workflow log carries the evidence.
//
// Requires: JAVA_HOME → OpenJDK 26.0.1 (FIXED_JDK_RUN_PROFILE), macOS
// (DarwinSandboxExecProvider), network for the sha-pinned TLC fetch (cached
// after the first acquire under <output>/cache).
//
// Usage: bun scripts/formal-verif/run-skeleton-ci.ts <output-directory>

import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join, resolve } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import {
  DarwinSandboxExecProvider,
  FsTlcToolchain,
  NodeArtifactNetworkPort,
  NodeFileDigestPort,
  NodeJavaVersionPort,
  NodePhysicalReservationPort,
  NodeTlcProcessPort,
} from "./fs-tlc-toolchain.ts";
import { createFrozenTlaModelReceipt, generateFrozenTlaModel } from "./tla-arm.ts";

const configuredJdkRoot = process.env.JAVA_HOME;
if (!configuredJdkRoot) throw new Error("JAVA_HOME is required and must point to OpenJDK 26.0.1");
const JDK_ROOT = realpathSync(configuredJdkRoot);

const outputRoot = process.argv[2];
if (!outputRoot) throw new Error("usage: bun scripts/formal-verif/run-skeleton-ci.ts <output-directory>");
const root = resolve(outputRoot);
mkdirSync(root, { recursive: true });

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function joinChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

interface SkeletonRunRow {
  runNo: 1 | 2;
  verdict: string;
  counterexampleId: string | null;
  runIdentity: string;
  jdkSnapshotIdentity: string;
  sandboxReceiptIdentity: string;
  stdoutSha256: string;
  stderrSha256: string;
  exitCode: number | null;
  timedOut: boolean;
  startedAt: string;
  finishedAt: string;
  cellResultIdentity: string;
}

async function runOnce(runNo: 1 | 2): Promise<SkeletonRunRow> {
  const runRoot = join(root, `run-${runNo}`);
  const workspaceRoot = join(runRoot, "workspace");
  mkdirSync(workspaceRoot, { recursive: true });
  const model = generateFrozenTlaModel({ publicContractIdentity: "a".repeat(64) });
  const modelReceipt = createFrozenTlaModelReceipt(model);
  const modulePath = join(workspaceRoot, "FormalElection.tla");
  const cfgPath = join(workspaceRoot, "FormalElection.cfg");
  writeFileSync(modulePath, model.moduleBytes);
  writeFileSync(cfgPath, model.cfgBytes);

  const processes = new NodeTlcProcessPort();
  const toolchain = new FsTlcToolchain(join(root, "cache"), {
    network: new NodeArtifactNetworkPort(),
    digest: new NodeFileDigestPort(),
    reservation: new NodePhysicalReservationPort(),
    clock: { nowMs: Date.now, utcNow: () => new Date().toISOString() },
    owner: { host: hostname(), pid: process.pid, processStartedAt: new Date(Date.now() - process.uptime() * 1_000).toISOString() },
    liveness: () => "unknown",
    randomUuid: randomUUID,
    jdkVersion: "OpenJDK 26.0.1",
    workspaceRoot,
    jdkDistributionRoot: JDK_ROOT,
    jdkSnapshotRoot: join(runRoot, "jdk-snapshot"),
    sandboxProvider: new DarwinSandboxExecProvider(processes, process.execPath),
    javaVersion: new NodeJavaVersionPort(),
    process: processes,
    suiteRemainingMs: () => 150_000,
    evidencePublishReserveMs: 5_000,
  });

  const acquired = await toolchain.acquire();
  if (!acquired.ok) throw new Error(`acquire failed: ${JSON.stringify(acquired.error)}`);
  const offline = toolchain.verifyOffline();
  if (!offline.ok) throw new Error(`offline verify failed: ${JSON.stringify(offline.error)}`);
  const prepared = await toolchain.prepare({
    artifact: offline.value,
    modelReceipt,
    modulePath,
    cfgPath,
    subjectAlias: "fx-1252",
    deadlineMs: 120_000,
  });
  if (!prepared.ok) throw new Error(`prepare failed: ${JSON.stringify(prepared.error)}`);
  const startedAt = new Date().toISOString();
  const outcome = await toolchain.run(prepared.value);
  if (!outcome.ok) throw new Error(`run failed: ${JSON.stringify(outcome.error)}`);
  const finishedAt = new Date().toISOString();
  const stdout = joinChunks(outcome.value.stdoutChunks);
  const stderr = joinChunks(outcome.value.stderrChunks);
  writeFileSync(join(runRoot, "tlc-stdout.bin"), stdout);
  writeFileSync(join(runRoot, "tlc-stderr.bin"), stderr);
  const normalized = toolchain.normalize({
    prepared: prepared.value,
    outcome: outcome.value,
    binding: {
      fixtureId: "fx-1252",
      baselineSha: model.publicContractIdentity,
      armSha: model.modelIdentity,
      startedAt,
      finishedAt,
      evidencePaths: [`run-${runNo}/tlc-stdout.bin`, `run-${runNo}/tlc-stderr.bin`],
    },
  });
  if (!normalized.ok) throw new Error(`normalize failed: ${JSON.stringify(normalized.error)}`);
  return {
    runNo,
    verdict: normalized.value.verdict,
    counterexampleId: normalized.value.counterexampleId,
    runIdentity: prepared.value.manifest.runIdentity,
    jdkSnapshotIdentity: prepared.value.jdk.snapshotIdentity,
    sandboxReceiptIdentity: prepared.value.sandbox.receiptIdentity,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    exitCode: outcome.value.exitCode,
    timedOut: outcome.value.timedOut,
    startedAt,
    finishedAt,
    cellResultIdentity: canonicalIdentity(normalized.value, "amadeus.formal-verif.skeleton-ci.cell-result.v1").sha256,
  };
}

const model = generateFrozenTlaModel({ publicContractIdentity: "a".repeat(64) });
const rows: SkeletonRunRow[] = [await runOnce(1), await runOnce(2)];
const deterministic = rows[0]!.verdict === "DETECTED"
  && rows[1]!.verdict === "DETECTED"
  && rows[0]!.counterexampleId !== null
  && rows[0]!.counterexampleId === rows[1]!.counterexampleId;
const artifact = {
  schemaVersion: 1,
  schema: "amadeus.formal-verif.skeleton-ci-run.v1",
  fixtureAlias: "fx-1252",
  mutation: "d4-invalid-timestamp",
  modelIdentity: model.modelIdentity,
  moduleSha256: sha256(model.moduleBytes),
  attempts: rows,
  deterministic,
};
writeFileSync(join(root, "skeleton-artifact.json"), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify(artifact));
if (!deterministic) {
  console.error("SKELETON FAILED: runs did not both DETECT with an identical counterexample identity");
  process.exit(1);
}
