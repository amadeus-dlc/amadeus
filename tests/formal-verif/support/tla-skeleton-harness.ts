import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../../scripts/formal-verif/canonical.ts";
import type { CellResult } from "../../../scripts/formal-verif/contract.ts";
import { FsEvidenceStoreAdapter } from "../../../scripts/formal-verif/fs-evidence-store.ts";
import { FsProvenanceStoreAdapter } from "../../../scripts/formal-verif/fs-provenance-store.ts";
import { createTransaction, foldLedger, type FreezeProof, type ProvenanceEvent } from "../../../scripts/formal-verif/provenance.ts";
import {
  SKELETON_ARCHIVE_PATHS,
  TlaSkeletonCoordinator,
  commitSkeletonOutcome,
  skeletonCiBundleIdentity,
  type SkeletonAttemptObservation,
  type SkeletonAttemptPort,
  type SkeletonAttemptRequest,
  type SkeletonCiArtifact,
  type SkeletonCiObservation,
  type SkeletonCiPort,
  type SkeletonExecutionManifest,
} from "../../../scripts/formal-verif/tla-skeleton.ts";
import { createIssuedSkeletonPrecondition } from "./tla-skeleton-preconditions.ts";
import { driveSyntheticTlcToolchain } from "./tla-toolchain-harness.ts";

const sha = (value: unknown, label = "value") => canonicalIdentity(value, `test.formal-verif.tla-skeleton.${label}.v1`).sha256;
const at = (second: number) => `2026-07-20T00:00:0${second}Z`;

function eventBase(sequence: number) {
  return { eventId: sha(sequence, "event"), at: at(sequence), sequence, actorId: "e2e-actor", sessionId: "e2e-session", worktree: "dedicated-tla-skeleton", baseSha: sha("baseline"), publicInputHash: sha("public-input") };
}

// Independent SKELETON_REVEALED ledger used only for the terminal outcome commit; commitSkeletonOutcome binds to
// context.ledger, not to the precondition's provenance graph, so this stays decoupled from the issued precondition.
function seedTransaction() {
  const startProof = { publicInputHash: sha("public-input"), actualInputManifestIdentity: sha("public-input"), actualInputManifestRef: "inputs/public.json", forbiddenScanReceiptIdentity: sha("scan"), forbiddenMatchCount: 0 as const, clean: true as const };
  const freezeProof: FreezeProof = { ...startProof, testsGreen: true, freezeSha: sha("t-freeze"), ownedPathsHash: sha("owned"), testsReceiptIdentity: sha("tests"), freezeCommitVerified: true };
  const start: Omit<Extract<ProvenanceEvent, { kind: "ARM_AUTHORING_STARTED" }>, "transactionId"> = { ...eventBase(0), kind: "ARM_AUTHORING_STARTED", arm: "tla", proof: startProof };
  const freeze: Omit<Extract<ProvenanceEvent, { kind: "ARM_FROZEN" }>, "transactionId"> = { ...eventBase(1), kind: "ARM_FROZEN", arm: "tla", proof: freezeProof };
  const reveal: Omit<Extract<ProvenanceEvent, { kind: "FIXTURE_REVEALED" }>, "transactionId"> = { ...eventBase(2), kind: "FIXTURE_REVEALED", arm: "tla", frozenEventId: freeze.eventId, disclosureHash: sha("materialized") };
  return createTransaction(null, [start, freeze, reveal]);
}

function worktreeReceipt(request: SkeletonAttemptRequest) {
  const body = {
    compositionHeadIdentity: request.compositionHeadIdentity,
    expectedCommitSha: request.resultingCommitSha,
    actualHeadSha: request.resultingCommitSha,
    expectedTreeHash: request.resultingTreeHash,
    actualTreeHash: request.resultingTreeHash,
    clean: true,
    verifiedImmediatelyBefore: at(3),
  };
  return { ...body, receiptIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-worktree-receipt.v1").sha256 };
}

function attemptPort(store: FsEvidenceStoreAdapter, calls: string[][]): SkeletonAttemptPort {
  return {
    execute: async (request) => {
      const driven = await driveSyntheticTlcToolchain("counterexample");
      calls.push(driven.callOrder);
      if (!driven.result.ok || driven.result.value.verdict !== "DETECTED" || driven.exploration?.kind !== "COUNTEREXAMPLE") {
        return { ok: false, error: { kind: "CorruptionError", message: "U4 did not produce a verified counterexample" } };
      }
      if (!("stdoutIdentity" in driven.raw) || !("stderrIdentity" in driven.raw)) {
        return { ok: false, error: { kind: "CorruptionError", message: "U4 raw stream identities are absent" } };
      }
      const result: CellResult = {
        ...driven.result.value,
        fixtureId: "fx-1252",
        baselineSha: request.baselineSha,
        armSha: request.armFreezeSha,
        toolVersions: { identity: request.toolIdentity },
        seedOrBound: { modelIdentity: request.modelIdentity },
        evidencePaths: [`evidence/skeleton-${request.runNo}.json`],
      };
      const input = {
        revisionIdentity: request.revisionIdentity,
        key: { arm: "tla" as const, subject: "fx-1252", sample: { kind: "MEASURED" as const, runNo: request.runNo } },
        inputSetHash: request.inputIdentity,
        command: { argv: ["tlc", "-tool", `attempt-${request.runNo}`], cwd: ".", environmentKeys: [], snapshotIdentity: request.compositionHeadIdentity },
        result,
        stdout: new Uint8Array(driven.raw.stdoutBytes),
        stderr: new Uint8Array(driven.raw.stderrBytes),
        timing: { processDurationMs: 311, cellElapsedMs: 312, suiteElapsedMs: 313 },
      };
      const published = await store.publishCell(input, 1000);
      if (!published.ok) return { ok: false, error: { kind: "CorruptionError", message: published.error.message } };
      const read = store.readCell(published.value.bundleId);
      if (!read.ok) return { ok: false, error: { kind: "CorruptionError", message: read.error.message } };
      const value: SkeletonAttemptObservation = {
        requestIdentity: request.requestIdentity,
        runNo: request.runNo,
        purpose: "SKELETON",
        worktree: worktreeReceipt(request),
        proof: read.value.proof,
        violatedInvariant: "InvalidTimestampRejected",
        traceComplete: true,
        commandIdentity: sha({ command: "tlc", runNo: request.runNo }, "command"),
        processReceiptIdentity: sha({ process: "tlc", runNo: request.runNo }, "process"),
        stdoutIdentity: driven.raw.stdoutIdentity,
        stderrIdentity: driven.raw.stderrIdentity,
        durationMs: 311,
        modelIdentity: request.modelIdentity,
        subjectIdentity: request.subjectIdentity,
        toolIdentity: request.toolIdentity,
        inputIdentity: request.inputIdentity,
      };
      return { ok: true, value };
    },
  };
}

// CI archive stdout/stderr bytes per run; their sha256 is what the CI row binds through the outcome verifier's
// streamsMatch, so the row stream identities are derived from these exact bytes.
function ciStreamBytes(runNo: 1 | 2, stream: "stdout" | "stderr") {
  return new TextEncoder().encode(`ci-${stream}-run-${runNo}`);
}

function ciRow(manifest: SkeletonExecutionManifest, runNo: 1 | 2) {
  const local = manifest.localAttempts.find((attempt) => attempt.runNo === runNo)!;
  const bundleBody = {
    runNo,
    verdict: "DETECTED" as const,
    counterexampleIdentity: local.counterexampleIdentity,
    cellResultIdentity: local.cellResultIdentity,
    stdoutIdentity: createHash("sha256").update(ciStreamBytes(runNo, "stdout")).digest("hex"),
    stderrIdentity: createHash("sha256").update(ciStreamBytes(runNo, "stderr")).digest("hex"),
    commandIdentity: local.commandIdentity,
    processReceiptIdentity: local.processReceiptIdentity,
    durationMs: local.durationMs,
    modelIdentity: local.modelIdentity,
    subjectIdentity: local.subjectIdentity,
    toolIdentity: local.toolIdentity,
  };
  const rowBody = { ...bundleBody, bundleId: skeletonCiBundleIdentity(bundleBody) };
  return { ...rowBody, rowIdentity: canonicalIdentity(rowBody, "amadeus.formal-verif.skeleton-ci-row.v1").sha256 };
}

function archiveEntry(path: string, bytes: Uint8Array) {
  return { path, kind: "FILE" as const, compressedBytes: bytes.byteLength, uncompressedBytes: bytes.byteLength, contentSha256: createHash("sha256").update(bytes).digest("hex"), chunks: [bytes] };
}

function ciObservation(manifest: SkeletonExecutionManifest): SkeletonCiObservation {
  const body = {
    schemaVersion: 1 as const,
    executionManifestIdentity: manifest.executionManifestIdentity,
    compositionHeadIdentity: manifest.compositionHeadIdentity,
    resultingCommitSha: manifest.resultingCommitSha,
    inputIdentity: manifest.inputIdentity,
    attempts: [ciRow(manifest, 1), ciRow(manifest, 2)],
  };
  const artifact: SkeletonCiArtifact = { ...body, artifactIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-ci-artifact.v1").sha256 };
  const entries = SKELETON_ARCHIVE_PATHS.map((path) => {
    if (path === "ci-manifest.json") return archiveEntry(path, canonicalIdentity(artifact, "amadeus.formal-verif.skeleton-ci-artifact-bytes.v1").bytes);
    const stream = /^attempts\/([12])\/(stdout|stderr)\.bin$/.exec(path);
    if (stream) return archiveEntry(path, ciStreamBytes(Number(stream[1]) as 1 | 2, stream[2] as "stdout" | "stderr"));
    const structured = /^attempts\/([12])\/(envelope|result|command|timing)\.json$/.exec(path);
    const row = artifact.attempts.find((candidate) => candidate.runNo === Number(structured![1]))!;
    const payload = structured![2] === "envelope"
      ? { executionManifestIdentity: artifact.executionManifestIdentity, runNo: row.runNo, bundleId: row.bundleId, rowIdentity: row.rowIdentity }
      : structured![2] === "result"
        ? { verdict: row.verdict, counterexampleIdentity: row.counterexampleIdentity, cellResultIdentity: row.cellResultIdentity }
        : structured![2] === "command"
          ? { commandIdentity: row.commandIdentity, toolIdentity: row.toolIdentity, modelIdentity: row.modelIdentity }
          : { processReceiptIdentity: row.processReceiptIdentity, durationMs: row.durationMs };
    return archiveEntry(path, canonicalIdentity(payload, `amadeus.formal-verif.skeleton-ci-${structured![2]}-bytes.v1`).bytes);
  });
  const total = entries.reduce((sum, entry) => sum + entry.uncompressedBytes, 0);
  return {
    metadata: {
      provider: "github-actions",
      repository: manifest.ciTrust.repository,
      event: "workflow_dispatch",
      workflowPath: manifest.ciTrust.workflowPath,
      workflowBlobSha: manifest.ciTrust.workflowBlobSha,
      workflowRef: manifest.ciTrust.workflowRef,
      runAttempt: 1,
      runId: "1252",
      runUrl: "https://github.com/amadeus-dlc/amadeus/actions/runs/1252",
      workflowConclusion: "success",
      jobConclusion: "success",
      permissions: { contents: "read" },
      headSha: manifest.resultingCommitSha,
      checkoutSha: manifest.resultingCommitSha,
      commandIdentity: manifest.ciTrust.commandIdentity,
      startedAt: at(3),
      finishedAt: at(5),
      exitCode: 0,
      environmentKeys: ["CI", "GITHUB_ACTIONS"],
    },
    artifact,
    archive: { compressedBytes: total, uncompressedBytes: total, entries },
  };
}

export async function driveTlaSkeletonHarness() {
  const root = mkdtempSync(join(tmpdir(), "fv-tla-skeleton-e2e-"));
  const precondition = await createIssuedSkeletonPrecondition();
  try {
    const seed = seedTransaction();
    const provenance = new FsProvenanceStoreAdapter(join(root, "provenance"));
    const seeded = await provenance.appendBatch(null, seed.transactionId, seed.events);
    if (!seeded.ok) throw new Error(seeded.error.message);
    const ledger = foldLedger(seed.events);
    if (!ledger.ok) throw new Error(ledger.error.message);
    const evidence = new FsEvidenceStoreAdapter(join(root, "evidence"), { nowMs: () => 0, utcNow: () => at(5) });
    const reserved = evidence.reserveCapacity(precondition.input.revisionIdentity, 2 * 1024 * 1024);
    if (!reserved.ok) throw new Error(reserved.error.message);
    const calls: string[][] = [];
    const ci: SkeletonCiPort = { collect: async (manifest) => ({ ok: true, value: ciObservation(manifest) }) };
    const coordinator = new TlaSkeletonCoordinator(attemptPort(evidence, calls), ci, { read: async () => ({ ok: true, value: precondition.input }) });
    const prepared = await coordinator.prepare(precondition.input.revisionIdentity);
    if (!prepared.ok) throw new Error(prepared.error.message);
    if (prepared.value.kind === "SkeletonFailureDraft") throw new Error(prepared.value.reason);
    const run = await coordinator.run(prepared.value);
    if (!run.ok || run.value.kind !== "SkeletonPassDraft") throw new Error(run.ok ? run.value.kind : run.error.message);
    const committed = await commitSkeletonOutcome(run.value, {
      ledger: ledger.value,
      expectedStoreHead: seeded.value.head,
      actorId: "e2e-actor",
      sessionId: "e2e-session",
      worktree: "dedicated-tla-skeleton",
      baseSha: sha("baseline"),
      publicInputHash: sha("public-input"),
      at: at(3),
      sequence: 3,
    }, provenance);
    if (!committed.ok) throw new Error(committed.error.message);
    return {
      kind: run.value.kind,
      attempts: run.value.manifest.localAttempts.map((attempt) => ({ runNo: attempt.runNo, bundleId: attempt.bundleId, counterexampleIdentity: attempt.counterexampleIdentity })),
      u4CallOrders: calls,
      executionManifestIdentity: run.value.manifest.executionManifestIdentity,
      summaryIdentity: run.value.summary.summaryIdentity,
      ciReceiptIdentity: run.value.ciReceipt.ciReceiptIdentity,
      transactionId: committed.value.transactionId,
      terminalOutcome: committed.value.outcome,
      recovered: committed.value.recovered,
    };
  } finally {
    precondition.dispose();
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.main) process.stdout.write(`${JSON.stringify(await driveTlaSkeletonHarness())}\n`);
