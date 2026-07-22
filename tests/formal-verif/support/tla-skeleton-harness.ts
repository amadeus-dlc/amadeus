import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../../scripts/formal-verif/canonical.ts";
import type { CellResult } from "../../../scripts/formal-verif/contract.ts";
import { FsEvidenceStoreAdapter } from "../../../scripts/formal-verif/fs-evidence-store.ts";
import { FsProvenanceStoreAdapter } from "../../../scripts/formal-verif/fs-provenance-store.ts";
import { createTransaction, foldLedger, type FoldedLedger, type FreezeProof, type ProvenanceEvent } from "../../../scripts/formal-verif/provenance.ts";
import {
  SKELETON_ARCHIVE_PATHS,
  SKELETON_REQUIRED_RESERVATION_BYTES,
  TlaSkeletonCoordinator,
  commitSkeletonOutcome,
  type SkeletonAttemptObservation,
  type SkeletonAttemptPort,
  type SkeletonAttemptRequest,
  type SkeletonCiArtifact,
  type SkeletonCiObservation,
  type SkeletonCiPort,
  type SkeletonExecutionManifest,
  type SkeletonPreconditionInput,
} from "../../../scripts/formal-verif/tla-skeleton.ts";
import { FIXED_JDK_RUN_PROFILE_IDENTITY, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, FIXED_TLC_PROFILE_IDENTITY } from "../../../scripts/formal-verif/tlc-toolchain.ts";
import { driveSyntheticTlcToolchain } from "./tla-toolchain-harness.ts";

const sha = (value: unknown, label = "value") => canonicalIdentity(value, `test.formal-verif.tla-skeleton.${label}.v1`).sha256;
const at = (second: number) => `2026-07-20T00:00:0${second}Z`;

function eventBase(sequence: number) {
  return { eventId: sha(sequence, "event"), at: at(sequence), sequence, actorId: "e2e-actor", sessionId: "e2e-session", worktree: "dedicated-tla-skeleton", baseSha: sha("baseline"), publicInputHash: sha("public-input") };
}

function seedTransaction() {
  const startProof = { publicInputHash: sha("public-input"), actualInputManifestIdentity: sha("public-input"), actualInputManifestRef: "inputs/public.json", forbiddenScanReceiptIdentity: sha("scan"), forbiddenMatchCount: 0 as const, clean: true as const };
  const freezeProof: FreezeProof = { ...startProof, testsGreen: true, freezeSha: sha("t-freeze"), ownedPathsHash: sha("owned"), testsReceiptIdentity: sha("tests"), freezeCommitVerified: true };
  const start: Omit<Extract<ProvenanceEvent, { kind: "ARM_AUTHORING_STARTED" }>, "transactionId"> = { ...eventBase(0), kind: "ARM_AUTHORING_STARTED", arm: "tla", proof: startProof };
  const freeze: Omit<Extract<ProvenanceEvent, { kind: "ARM_FROZEN" }>, "transactionId"> = { ...eventBase(1), kind: "ARM_FROZEN", arm: "tla", proof: freezeProof };
  const reveal: Omit<Extract<ProvenanceEvent, { kind: "FIXTURE_REVEALED" }>, "transactionId"> = { ...eventBase(2), kind: "FIXTURE_REVEALED", arm: "tla", frozenEventId: freeze.eventId, disclosureHash: sha("materialized") };
  return createTransaction(null, [start, freeze, reveal]);
}

function preconditions(ledger: FoldedLedger, modelIdentity: string): SkeletonPreconditionInput {
  return {
    revisionIdentity: sha("revision"),
    ledger,
    fixtureAlias: "fx-1252",
    tFrozenEventId: sha(1, "event"),
    tFreezeSha: sha("t-freeze"),
    publicInputHash: sha("public-input"),
    injectionSha: sha("injection"),
    sealIdentity: sha("seal"),
    disclosureGrantIdentity: sha("grant"),
    materializationReceiptIdentity: sha("materialization-receipt"),
    materializedIdentity: sha("materialized"),
    modelIdentity,
    jarIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    jdkIdentity: FIXED_JDK_RUN_PROFILE_IDENTITY,
    profileIdentity: FIXED_TLC_PROFILE_IDENTITY,
    evidenceRootIdentity: sha("evidence-root"),
    reservationIdentity: sha("reservation"),
    reservedBytes: SKELETON_REQUIRED_RESERVATION_BYTES,
    composition: {
      baseSha: sha("baseline"),
      armFreezeSha: sha("t-freeze"),
      armOwnedDiffIdentity: sha("arm-diff"),
      injectionSha: sha("injection"),
      injectionPatchIdentity: sha("patch"),
      applicationOrder: "ARM_T_OWNED_DIFF_THEN_1252_PATCH",
      armOverlayTree: sha("arm-tree"),
      injectionOverlayTree: sha("injection-tree"),
      resultingTreeHash: sha("resulting-tree"),
      resultingCommitSha: sha("resulting-commit"),
      parentCount: 1,
      clean: true,
      dedicated: true,
    },
    ciTrust: {
      repository: "amadeus-dlc/amadeus",
      workflowPath: ".github/workflows/formal-verification.yml",
      workflowBlobSha: sha("workflow"),
      workflowRef: sha("baseline"),
      commandIdentity: sha("ci-command"),
    },
  };
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

function ciRow(manifest: SkeletonExecutionManifest, runNo: 1 | 2) {
  const local = manifest.localAttempts.find((attempt) => attempt.runNo === runNo)!;
  const body = {
    runNo,
    verdict: "DETECTED" as const,
    counterexampleIdentity: local.counterexampleIdentity,
    cellResultIdentity: local.cellResultIdentity,
    bundleId: sha({ ci: "bundle", runNo }, "ci-bundle"),
    stdoutIdentity: sha({ ci: "stdout", runNo }, "ci-stdout"),
    stderrIdentity: sha({ ci: "stderr", runNo }, "ci-stderr"),
    commandIdentity: local.commandIdentity,
    processReceiptIdentity: local.processReceiptIdentity,
    modelIdentity: local.modelIdentity,
    subjectIdentity: local.subjectIdentity,
    toolIdentity: local.toolIdentity,
  };
  return { ...body, rowIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-ci-row.v1").sha256 };
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
  const entries = SKELETON_ARCHIVE_PATHS.map((path, index) => {
    const bytes = path === "ci-manifest.json" ? canonicalIdentity(artifact, "amadeus.formal-verif.skeleton-ci-artifact-bytes.v1").bytes : new TextEncoder().encode(`${path}:${index}`);
    return { path, kind: "FILE" as const, compressedBytes: bytes.byteLength, uncompressedBytes: bytes.byteLength, contentSha256: createHash("sha256").update(bytes).digest("hex"), chunks: [bytes] };
  });
  const total = entries.reduce((sum, entry) => sum + entry.uncompressedBytes, 0);
  return {
    providerReceiptIdentity: sha("github-actions", "provider-receipt"),
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
  try {
    const seed = seedTransaction();
    const provenance = new FsProvenanceStoreAdapter(join(root, "provenance"));
    const seeded = await provenance.appendBatch(null, seed.transactionId, seed.events);
    if (!seeded.ok) throw new Error(seeded.error.message);
    const ledger = foldLedger(seed.events);
    if (!ledger.ok) throw new Error(ledger.error.message);
    const modelProbe = await driveSyntheticTlcToolchain("counterexample");
    const evidence = new FsEvidenceStoreAdapter(join(root, "evidence"), { nowMs: () => 0, utcNow: () => at(5) });
    const revisionIdentity = sha("revision");
    const reserved = evidence.reserveCapacity(revisionIdentity, 2 * 1024 * 1024);
    if (!reserved.ok) throw new Error(reserved.error.message);
    const calls: string[][] = [];
    const ci: SkeletonCiPort = { collect: async (manifest) => ({ ok: true, value: ciObservation(manifest) }) };
    const input = preconditions(ledger.value, modelProbe.model.modelIdentity);
    const coordinator = new TlaSkeletonCoordinator(attemptPort(evidence, calls), ci, { read: async () => ({ ok: true, value: input }) });
    const prepared = await coordinator.prepare(input.revisionIdentity);
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
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.main) process.stdout.write(`${JSON.stringify(await driveTlaSkeletonHarness())}\n`);
