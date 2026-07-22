import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import {
  DarwinSandboxExecProvider,
  FsTlcToolchain,
  NodeArtifactNetworkPort,
  NodeFileDigestPort,
  NodeJavaVersionPort,
  NodePhysicalReservationPort,
  NodeTlcProcessPort,
} from "../../../scripts/formal-verif/fs-tlc-toolchain.ts";
import {
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
} from "../../../scripts/formal-verif/tla-arm.ts";

const configuredJdkRoot = process.env.JAVA_HOME;
if (!configuredJdkRoot) {
  throw new Error("JAVA_HOME is required and must point to OpenJDK 26.0.1");
}
const JDK_ROOT = realpathSync(configuredJdkRoot);

function joinChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const root = process.argv[2] ?? mkdtempSync(join(tmpdir(), "amadeus-u4-real-facade-"));
const workspaceRoot = join(root, "workspace");
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
  owner: {
    host: hostname(),
    pid: process.pid,
    processStartedAt: new Date(Date.now() - process.uptime() * 1_000).toISOString(),
  },
  liveness: () => "unknown",
  randomUuid: randomUUID,
  jdkVersion: "OpenJDK 26.0.1",
  workspaceRoot,
  jdkDistributionRoot: JDK_ROOT,
  jdkSnapshotRoot: join(root, "jdk-snapshot"),
  sandboxProvider: new DarwinSandboxExecProvider(processes, process.execPath),
  javaVersion: new NodeJavaVersionPort(),
  process: processes,
  suiteRemainingMs: () => 150_000,
  evidencePublishReserveMs: 5_000,
});

const acquired = await toolchain.acquire();
if (!acquired.ok) throw new Error(JSON.stringify(acquired.error));
const offline = toolchain.verifyOffline();
if (!offline.ok) throw new Error(JSON.stringify(offline.error));
const prepared = await toolchain.prepare({
  artifact: offline.value,
  modelReceipt,
  modulePath,
  cfgPath,
  subjectAlias: "formal-election-bounded",
  deadlineMs: 120_000,
});
if (!prepared.ok) throw new Error(JSON.stringify(prepared.error));
const startedAt = new Date().toISOString();
const outcome = await toolchain.run(prepared.value);
if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
const finishedAt = new Date().toISOString();
const stdout = joinChunks(outcome.value.stdoutChunks);
const stderr = joinChunks(outcome.value.stderrChunks);
const stdoutPath = join(root, "tlc-stdout.bin");
const stderrPath = join(root, "tlc-stderr.bin");
writeFileSync(stdoutPath, stdout);
writeFileSync(stderrPath, stderr);
const normalized = toolchain.normalize({
  prepared: prepared.value,
  outcome: outcome.value,
  binding: {
    fixtureId: "FORMAL_ELECTION_BOUNDED",
    baselineSha: model.publicContractIdentity,
    armSha: model.modelIdentity,
    startedAt,
    finishedAt,
    evidencePaths: ["tlc-stdout.bin", "tlc-stderr.bin"],
  },
});
if (!normalized.ok) throw new Error(JSON.stringify(normalized.error));
if (outcome.value.exitCode !== 0 || outcome.value.signal !== null || stderr.byteLength !== 0 || normalized.value.verdict !== "NOT_DETECTED") {
  throw new Error(JSON.stringify({ outcome: outcome.value, normalized: normalized.value, stderr: new TextDecoder().decode(stderr) }));
}

console.log(JSON.stringify({
  root,
  artifact: {
    descriptorIdentity: offline.value.descriptorIdentity,
    sha256: offline.value.actualSha256,
    byteLength: offline.value.byteLength,
    receiptIdentity: offline.value.receiptIdentity,
  },
  modelIdentity: model.modelIdentity,
  runIdentity: prepared.value.manifest.runIdentity,
  jdkSnapshotIdentity: prepared.value.jdk.snapshotIdentity,
  sandboxReceiptIdentity: prepared.value.sandbox.receiptIdentity,
  outcome: {
    exitCode: outcome.value.exitCode,
    signal: outcome.value.signal,
    timedOut: outcome.value.timedOut,
    outputLimitExceeded: outcome.value.outputLimitExceeded,
    stdoutPath,
    stdoutSha256: sha256(stdout),
    stderrPath,
    stderrSha256: sha256(stderr),
  },
  normalized: normalized.value,
}));
