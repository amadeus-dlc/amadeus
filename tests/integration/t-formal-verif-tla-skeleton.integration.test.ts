// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import type { CellResult } from "../../scripts/formal-verif/contract.ts";
import { FsEvidenceStoreAdapter, createFsEvidenceStoreForTesting, type VerifiedCapacityReservation, type VerifiedEvidenceProof } from "../../scripts/formal-verif/fs-evidence-store.ts";
import {
  SKELETON_ARCHIVE_PATHS,
  SKELETON_MAX_CI_COMPRESSED_BYTES,
  SKELETON_REQUIRED_RESERVATION_BYTES,
  TlaSkeletonCoordinator,
  skeletonCiBundleIdentity,
  type SkeletonAttemptObservation,
  type SkeletonAttemptPort,
  type SkeletonAttemptRequest,
  type SkeletonCiArtifact,
  type SkeletonCiMetadata,
  type SkeletonCiObservation,
  type SkeletonCiPort,
  type SkeletonExecutionManifest,
  type SkeletonPreconditionInput,
  type SkeletonPreconditionSourcePort,
} from "../../scripts/formal-verif/tla-skeleton.ts";
import { createIssuedSkeletonPrecondition } from "../formal-verif/support/tla-skeleton-preconditions.ts";

const roots: string[] = [];
const disposers: Array<() => void> = [];
const sha = (value: string) => canonicalIdentity(value, "test.formal-verif.skeleton.v1").sha256;
const rawSha = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const at = (second: number) => `2026-07-20T00:00:0${second}Z`;

afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); });
});

// Genuine store-issued precondition: preflight consumes U1/U2/U4 refs (domain-entities.md: SkeletonPreflight.verify),
// so every proof is branded by its issuing store and the coordinator re-verifies it before minting the ready value.
async function base(): Promise<SkeletonPreconditionInput> {
  const { input, dispose } = await createIssuedSkeletonPrecondition();
  disposers.push(dispose);
  return input;
}

// A genuinely store-issued capacity reservation with a drifted byte count, used to exercise BR-04 continuity fail-closed.
function issuedReservation(revisionIdentity: string, bytes: number): VerifiedCapacityReservation {
  const root = mkdtempSync(join(tmpdir(), "fv-skeleton-reservation-"));
  roots.push(root);
  const store = createFsEvidenceStoreForTesting(join(root, "evidence"), { nowMs: () => 0, utcNow: () => at(3) });
  const reserved = store.reserveCapacity(revisionIdentity, bytes);
  if (!reserved.ok) throw new Error(reserved.error.message);
  return reserved.value;
}

function preconditionSource(input: SkeletonPreconditionInput): SkeletonPreconditionSourcePort {
  return { read: async () => ({ ok: true, value: input }) };
}

async function runSkeleton(attempts: SkeletonAttemptPort, ci: SkeletonCiPort, input: SkeletonPreconditionInput) {
  const coordinator = new TlaSkeletonCoordinator(attempts, ci, preconditionSource(input));
  const prepared = await coordinator.prepare(input.revisionIdentity);
  return !prepared.ok || prepared.value.kind === "SkeletonFailureDraft" ? prepared : coordinator.run(prepared.value);
}

async function evidence(request: SkeletonAttemptRequest, verdict: CellResult["verdict"] = "DETECTED", counterexample = sha("c")): Promise<VerifiedEvidenceProof> {
  const root = mkdtempSync(join(tmpdir(), "fv-skeleton-proof-"));
  roots.push(root);
  const store = new FsEvidenceStoreAdapter(root, { nowMs: () => 0, utcNow: () => at(5) });
  const result: CellResult = {
    schemaVersion: 1,
    arm: "tla",
    fixtureId: "fx-1252",
    baselineSha: request.baselineSha,
    armSha: request.armFreezeSha,
    verdict,
    exitCode: verdict === "DETECTED" ? 12 : verdict === "NOT_DETECTED" ? 0 : null,
    toolVersions: { identity: request.toolIdentity },
    seedOrBound: { modelIdentity: request.modelIdentity },
    startedAt: at(3),
    finishedAt: at(4),
    counterexampleId: verdict === "DETECTED" ? counterexample : null,
    evidencePaths: [`evidence/skeleton-${request.runNo}.json`],
  };
  const input = {
    revisionIdentity: request.revisionIdentity,
    key: { arm: "tla" as const, subject: "fx-1252", sample: { kind: "MEASURED" as const, runNo: request.runNo } },
    inputSetHash: request.inputIdentity,
    command: { argv: ["tlc", String(request.runNo)], cwd: ".", environmentKeys: [], snapshotIdentity: request.compositionHeadIdentity },
    result,
    stdout: new Uint8Array([request.runNo]),
    stderr: new Uint8Array(),
    timing: { processDurationMs: 1, cellElapsedMs: 2, suiteElapsedMs: 3 },
  };
  const reserved = store.reserveCapacity(request.revisionIdentity, 64 * 1024);
  if (!reserved.ok) throw new Error(reserved.error.message);
  const published = await store.publishCell(input, 100);
  if (!published.ok) throw new Error(published.error.message);
  const read = store.readCell(published.value.bundleId);
  if (!read.ok) throw new Error(read.error.message);
  return read.value.proof;
}

function attemptReceipt(request: SkeletonAttemptRequest) {
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

function attemptPort(mutate?: (value: SkeletonAttemptObservation, request: SkeletonAttemptRequest) => SkeletonAttemptObservation): { port: SkeletonAttemptPort; calls: number[] } {
  const calls: number[] = [];
  return {
    calls,
    port: {
      execute: async (request) => {
        calls.push(request.runNo);
        const proof = await evidence(request);
        const value: SkeletonAttemptObservation = {
          requestIdentity: request.requestIdentity,
          runNo: request.runNo,
          purpose: "SKELETON",
          worktree: attemptReceipt(request),
          proof,
          violatedInvariant: "InvalidTimestampRejected",
          traceComplete: true,
          commandIdentity: canonicalIdentity({ command: "tlc", runNo: request.runNo }).sha256,
          processReceiptIdentity: sha(String(request.runNo + 4)),
          stdoutIdentity: sha(String(request.runNo + 6)),
          stderrIdentity: sha(String(request.runNo + 8)),
          durationMs: 10,
          modelIdentity: request.modelIdentity,
          subjectIdentity: request.subjectIdentity,
          toolIdentity: request.toolIdentity,
          inputIdentity: request.inputIdentity,
        };
        return { ok: true, value: mutate ? mutate(value, request) : value };
      },
    },
  };
}

// CI archive stdout/stderr bytes per run; their sha256 is what the CI row binds through the outcome verifier's
// streamsMatch, so the row stream identities are derived from these exact bytes (not caller-selected).
function ciStreamBytes(runNo: 1 | 2, stream: "stdout" | "stderr") {
  return new TextEncoder().encode(`ci-${stream}-run-${runNo}`);
}

function artifactRow(manifest: SkeletonExecutionManifest, runNo: 1 | 2) {
  const local = manifest.localAttempts.find((attempt) => attempt.runNo === runNo)!;
  const bundleBody = {
    runNo,
    verdict: "DETECTED" as const,
    counterexampleIdentity: local.counterexampleIdentity,
    cellResultIdentity: local.cellResultIdentity,
    stdoutIdentity: rawSha(ciStreamBytes(runNo, "stdout")),
    stderrIdentity: rawSha(ciStreamBytes(runNo, "stderr")),
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

function ciMetadata(manifest: SkeletonExecutionManifest): SkeletonCiMetadata {
  return {
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
  };
}

function archiveEntry(path: string, bytes: Uint8Array) {
  return { path, kind: "FILE" as const, compressedBytes: bytes.byteLength, uncompressedBytes: bytes.byteLength, contentSha256: rawSha(bytes), chunks: [bytes] };
}

function ciObservation(manifest: SkeletonExecutionManifest): SkeletonCiObservation {
  const body = {
    schemaVersion: 1 as const,
    executionManifestIdentity: manifest.executionManifestIdentity,
    compositionHeadIdentity: manifest.compositionHeadIdentity,
    resultingCommitSha: manifest.resultingCommitSha,
    inputIdentity: manifest.inputIdentity,
    attempts: [artifactRow(manifest, 1), artifactRow(manifest, 2)] as const,
  };
  const artifact: SkeletonCiArtifact = { ...body, artifactIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-ci-artifact.v1").sha256 };
  const entries = SKELETON_ARCHIVE_PATHS.map((path) => {
    if (path === "ci-manifest.json") return archiveEntry(path, canonicalIdentity(artifact, "amadeus.formal-verif.skeleton-ci-artifact-bytes.v1").bytes);
    const stream = /^attempts\/([12])\/(stdout|stderr)\.bin$/.exec(path);
    if (stream) return archiveEntry(path, ciStreamBytes(Number(stream[1]) as 1 | 2, stream[2] as "stdout" | "stderr"));
    const structured = /^attempts\/([12])\/(envelope|result|command|timing)\.json$/.exec(path)!;
    const row = artifact.attempts.find((candidate) => candidate.runNo === Number(structured[1]))!;
    const payload = structured[2] === "envelope"
      ? { executionManifestIdentity: artifact.executionManifestIdentity, runNo: row.runNo, bundleId: row.bundleId, rowIdentity: row.rowIdentity }
      : structured[2] === "result"
        ? { verdict: row.verdict, counterexampleIdentity: row.counterexampleIdentity, cellResultIdentity: row.cellResultIdentity }
        : structured[2] === "command"
          ? { commandIdentity: row.commandIdentity, toolIdentity: row.toolIdentity, modelIdentity: row.modelIdentity }
          : { processReceiptIdentity: row.processReceiptIdentity, durationMs: row.durationMs };
    return archiveEntry(path, canonicalIdentity(payload, `amadeus.formal-verif.skeleton-ci-${structured[2]}-bytes.v1`).bytes);
  });
  const total = entries.reduce((sum, entry) => sum + entry.uncompressedBytes, 0);
  return { metadata: ciMetadata(manifest), artifact, archive: { compressedBytes: total, uncompressedBytes: total, entries } };
}

function ciPort(mutate?: (value: SkeletonCiObservation, manifest: SkeletonExecutionManifest) => SkeletonCiObservation): SkeletonCiPort {
  return { collect: async (manifest) => { const value = ciObservation(manifest); return { ok: true, value: mutate ? mutate(value, manifest) : value }; } };
}

function resealArtifact(artifact: SkeletonCiArtifact, attempts: SkeletonCiArtifact["attempts"]): SkeletonCiArtifact {
  const { artifactIdentity: _artifactIdentity, ...header } = artifact;
  const body = { ...header, attempts };
  return { ...body, artifactIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-ci-artifact.v1").sha256 };
}

describe("TLA invalid-timestamp walking skeleton", () => {
  test("accepts exactly two local and two trusted CI detections", async () => {
    const attempts = attemptPort();
    const result = await runSkeleton(attempts.port, ciPort(), await base());
    expect(result.ok && result.value.kind).toBe("SkeletonPassDraft");
    expect(attempts.calls).toEqual([1, 2]);
    expect(result.ok && result.value.kind === "SkeletonPassDraft" && result.value.summary.summaryIdentity).toMatch(/^[0-9a-f]{64}$/);
  });

  test("stops after a first NOT_DETECTED result", async () => {
    const attempts = attemptPort((value) => ({ ...value, proof: value.proof }));
    attempts.port.execute = async (request) => {
      const base = await attemptPort().port.execute(request);
      if (!base.ok) return base;
      return { ok: true, value: { ...base.value, proof: await evidence(request, "NOT_DETECTED") } };
    };
    const result = await runSkeleton(attempts.port, ciPort(), await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("NOT_DETECTED");
  });

  test("rejects a structurally forged evidence proof", async () => {
    const result = await runSkeleton(attemptPort((value) => ({ ...value, proof: { ...value.proof } as never })).port, ciPort(), await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("EVIDENCE");
  });

  test("rejects a wrong invariant name", async () => {
    const result = await runSkeleton(attemptPort((value) => ({ ...value, violatedInvariant: "OtherInvariant" })).port, ciPort(), await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("TRACE");
  });

  test("rejects replay counterexample drift", async () => {
    const result = await runSkeleton(attemptPort((value, request) => request.runNo === 2 ? { ...value, proof: value.proof, stdoutIdentity: sha("x") } : value).port, ciPort(), await base());
    expect(result.ok && result.value.kind).toBe("SkeletonPassDraft");
    const drift = attemptPort();
    drift.port.execute = async (request) => {
      const base = await attemptPort().port.execute(request);
      if (!base.ok) return base;
      return { ok: true, value: { ...base.value, proof: await evidence(request, "DETECTED", request.runNo === 1 ? sha("c") : sha("d")) } };
    };
    const rejected = await runSkeleton(drift.port, ciPort(), await base());
    expect(rejected.ok && rejected.value.kind === "SkeletonFailureDraft" && rejected.value.reason).toBe("NON_DETERMINISTIC");
  });

  test("rejects a caller-forged fixture materialization before execution", async () => {
    const attempts = attemptPort();
    // A fixture claim not issued by the registry (a plain clone strips the store brand) is rejected before any run.
    const input = await base();
    const forged = { ...input, materialization: { ...input.materialization } as typeof input.materialization };
    const result = await runSkeleton(attempts.port, ciPort(), forged);
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("PRECONDITION");
    expect(attempts.calls).toEqual([]);
  });

  test("rejects a caller-copied precondition without an issuer proof", async () => {
    const attempts = attemptPort();
    const input = await base();
    const coordinator = new TlaSkeletonCoordinator(attempts.port, ciPort(), preconditionSource(input));
    const prepared = await coordinator.prepare(input.revisionIdentity);
    if (!prepared.ok || prepared.value.kind === "SkeletonFailureDraft") throw new Error("expected ready precondition");
    const result = await coordinator.run({ ...prepared.value });
    expect(result.ok && result.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "PRECONDITION" });
    expect(attempts.calls).toEqual([]);
  });

  test("rejects a source payload whose entire upstream proof graph is caller-cloned", async () => {
    const attempts = attemptPort();
    const result = await runSkeleton(attempts.port, ciPort(), structuredClone(await base()));
    expect(result.ok && result.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "PRECONDITION" });
    expect(attempts.calls).toEqual([]);
  });

  test("fails closed when the precondition source is unavailable or revision-bound incorrectly", async () => {
    const attempts = attemptPort();
    const unavailable = await new TlaSkeletonCoordinator(attempts.port, ciPort(), { read: async () => ({ ok: false, error: { kind: "TransportError", message: "source unavailable" } }) }).prepare(sha("v"));
    expect(!unavailable.ok && unavailable.error).toMatchObject({ operation: "PRECONDITION" });
    const exploded = await new TlaSkeletonCoordinator(attempts.port, ciPort(), { read: async () => { throw new Error("source exploded"); } }).prepare(sha("v"));
    expect(!exploded.ok && exploded.error).toMatchObject({ operation: "PRECONDITION", message: "precondition port threw" });
    const invalid = await new TlaSkeletonCoordinator(attempts.port, ciPort(), preconditionSource(await base())).prepare("not-a-sha");
    expect(invalid.ok && invalid.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "PRECONDITION" });
    const input = await base();
    const drifted = { ...input, revisionIdentity: sha("other-revision") };
    const drift = await new TlaSkeletonCoordinator(attempts.port, ciPort(), preconditionSource(drifted)).prepare(input.revisionIdentity);
    expect(drift.ok && drift.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "PRECONDITION" });
    expect(attempts.calls).toEqual([]);
  });

  test("rejects composition order and capacity drift", async () => {
    // Both are BR-04 identity-continuity drifts on genuinely store-issued proofs, so the coordinator reports DISCLOSURE
    // (issued upstream proof continuity drifted), the reason distinct from an unclosed-schema PRECONDITION.
    const orderInput = await base();
    const order = await runSkeleton(attemptPort().port, ciPort(), { ...orderInput, composition: { ...orderInput.composition, applicationOrder: "INJECTION_FIRST" as never } });
    const capacityInput = await base();
    const capacity = await runSkeleton(attemptPort().port, ciPort(), { ...capacityInput, reservation: issuedReservation(capacityInput.revisionIdentity, SKELETON_REQUIRED_RESERVATION_BYTES - 1) });
    expect(order.ok && order.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "DISCLOSURE" });
    expect(capacity.ok && capacity.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "DISCLOSURE" });
  });

  test("rejects dirty or stale worktree receipts", async () => {
    const result = await runSkeleton(attemptPort((value) => ({ ...value, worktree: { ...value.worktree, clean: false } })).port, ciPort(), await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("PRECONDITION");
  });

  test("rejects an untrusted CI event", async () => {
    const ci = ciPort((value) => ({ ...value, metadata: { ...value.metadata, event: "pull_request" as "workflow_dispatch" } }));
    const result = await runSkeleton(attemptPort().port, ci, await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("CI");
  });

  test("rejects a missing CI attempt row", async () => {
    const ci = ciPort((value) => ({ ...value, artifact: { ...value.artifact, attempts: value.artifact.attempts.slice(0, 1) as never } }));
    const result = await runSkeleton(attemptPort().port, ci, await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("CI");
  });

  test("rejects an unsafe archive entry", async () => {
    const ci = ciPort((value) => ({ ...value, archive: { ...value.archive, entries: value.archive.entries.map((entry, index) => index === 0 ? { ...entry, path: "../manifest.json" } : entry) } }));
    const result = await runSkeleton(attemptPort().port, ci, await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("CI");
  });

  test("rejects a self-signed archive hash without matching provider bytes", async () => {
    const ci = ciPort((value) => ({
      ...value,
      archive: { ...value.archive, entries: value.archive.entries.map((entry, index) => index === 0 ? { ...entry, contentSha256: sha("forged-content") } : entry) },
    }));
    const result = await runSkeleton(attemptPort().port, ci, await base());
    expect(result.ok && result.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });

    const rewritten = ciPort((value) => {
      const entries = value.archive.entries.map((entry, index) => {
        if (index !== 0) return entry;
        const bytes = new TextEncoder().encode("self-signed-manifest");
        return { ...entry, uncompressedBytes: bytes.byteLength, contentSha256: rawSha(bytes), chunks: [bytes] };
      });
      return { ...value, archive: { ...value.archive, uncompressedBytes: entries.reduce((sum, entry) => sum + entry.uncompressedBytes, 0), entries } };
    });
    const rewrittenResult = await runSkeleton(attemptPort().port, rewritten, await base());
    expect(rewrittenResult.ok && rewrittenResult.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
  });

  test("rejects an invalid provider receipt or non-byte archive stream", async () => {
    const receipt = await runSkeleton(attemptPort().port, ciPort((value) => ({ ...value, providerReceiptIdentity: "not-a-sha" } as never)), await base());
    expect(receipt.ok && receipt.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
    const stream = ciPort((value) => ({ ...value, archive: { ...value.archive, entries: value.archive.entries.map((entry, index) => index === 1 ? { ...entry, chunks: ["not-bytes"] as never } : entry) } }));
    const streamResult = await runSkeleton(attemptPort().port, stream, await base());
    expect(streamResult.ok && streamResult.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
  });

  test("rejects a linked or oversized archive entry", async () => {
    const linked = ciPort((value) => ({ ...value, archive: { ...value.archive, entries: value.archive.entries.map((entry, index) => index === 1 ? { ...entry, kind: "SYMLINK" } : entry) } }));
    const linkedResult = await runSkeleton(attemptPort().port, linked, await base());
    expect(linkedResult.ok && linkedResult.value.kind === "SkeletonFailureDraft" && linkedResult.value.reason).toBe("CI");

    const oversized = ciPort((value) => {
      const entries = value.archive.entries.map((entry, index) => index === 0 ? { ...entry, compressedBytes: SKELETON_MAX_CI_COMPRESSED_BYTES + 1 } : entry);
      return { ...value, archive: { ...value.archive, compressedBytes: entries.reduce((sum, entry) => sum + entry.compressedBytes, 0), entries } };
    });
    const oversizedResult = await runSkeleton(attemptPort().port, oversized, await base());
    expect(oversizedResult.ok && oversizedResult.value.kind === "SkeletonFailureDraft" && oversizedResult.value.reason).toBe("CI");
  });

  test("rejects CI checkout and permission drift", async () => {
    const checkout = ciPort((value) => ({ ...value, metadata: { ...value.metadata, checkoutSha: sha("other-checkout") } }));
    const checkoutResult = await runSkeleton(attemptPort().port, checkout, await base());
    expect(checkoutResult.ok && checkoutResult.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
    const permission = ciPort((value) => ({ ...value, metadata: { ...value.metadata, permissions: { contents: "write" } as never } }));
    const permissionResult = await runSkeleton(attemptPort().port, permission, await base());
    expect(permissionResult.ok && permissionResult.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
  });

  test("rejects open CI envelopes before trusting their contents", async () => {
    const metadata = ciPort((value) => ({ ...value, metadata: { ...value.metadata, actor: "attacker" } as never }));
    const metadataResult = await runSkeleton(attemptPort().port, metadata, await base());
    expect(metadataResult.ok && metadataResult.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });

    const archive = ciPort((value) => ({ ...value, archive: { ...value.archive, mode: "open" } as never }));
    const archiveResult = await runSkeleton(attemptPort().port, archive, await base());
    expect(archiveResult.ok && archiveResult.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });

    // An extra observation-level field (a caller-attached "summary") fails the closed {metadata, artifact, archive}
    // observation schema (CI); an extra field inside the artifact is the distinct TRACE case covered separately below.
    const observation = ciPort((value) => ({ ...value, summary: {} } as never));
    const observationResult = await runSkeleton(attemptPort().port, observation, await base());
    expect(observationResult.ok && observationResult.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
  });

  test("rejects an invalid row inside an otherwise sealed CI artifact", async () => {
    const ci = ciPort((value) => {
      const attempts = value.artifact.attempts.map((row, index) => index === 0 ? { ...row, bundleId: "not-a-sha256" } : row);
      return { ...value, artifact: resealArtifact(value.artifact, attempts) };
    });
    const result = await runSkeleton(attemptPort().port, ci, await base());
    expect(result.ok && result.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
  });

  test("rejects a non-manifest archive entry whose bytes and hash are replaced together", async () => {
    const result = await runSkeleton(attemptPort().port, ciPort((value) => {
      const entries = value.archive.entries.map((entry) => {
        if (entry.path !== "attempts/1/envelope.json") return entry;
        const bytes = new TextEncoder().encode("x".repeat(entry.uncompressedBytes));
        return { ...entry, contentSha256: rawSha(bytes), chunks: [bytes] };
      });
      return { ...value, archive: { ...value.archive, entries } };
    }), await base());
    expect(result.ok && result.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
  });

  test("rejects a caller-selected provider receipt identity", async () => {
    const result = await runSkeleton(attemptPort().port, ciPort((value) => ({
      ...value,
      providerReceiptIdentity: sha("caller-selected-provider-receipt"),
    } as never)), await base());
    expect(result.ok && result.value).toMatchObject({ kind: "SkeletonFailureDraft", reason: "CI" });
  });

  test("keeps transport failure outside the domain outcome", async () => {
    const attempts: SkeletonAttemptPort = { execute: async () => ({ ok: false, error: { kind: "TransportError", message: "runner unavailable" } }) };
    const result = await runSkeleton(attempts, ciPort(), await base());
    expect(!result.ok && result.error).toMatchObject({ kind: "SkeletonCommitError", operation: "ATTEMPT" });
  });

  test("maps thrown attempt and CI ports to external errors", async () => {
    const attempt = await runSkeleton(
      { execute: async () => { throw new Error("attempt exploded"); } },
      ciPort(),
      await base(),
    );
    expect(!attempt.ok && attempt.error).toMatchObject({ kind: "SkeletonCommitError", operation: "ATTEMPT", message: "attempt port threw" });

    const ci = await runSkeleton(
      attemptPort().port,
      { collect: async () => { throw "CI exploded"; } },
      await base(),
    );
    expect(!ci.ok && ci.error).toMatchObject({ kind: "SkeletonCommitError", operation: "CI", message: "ci port threw" });
  });

  test("rejects attempt three instead of extending the revision", async () => {
    const result = await runSkeleton(attemptPort((value) => ({ ...value, runNo: 3 as never })).port, ciPort(), await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("EVIDENCE");
  });

  test("rejects an identity cycle or extra artifact field", async () => {
    const ci = ciPort((value) => ({ ...value, artifact: { ...value.artifact, summaryIdentity: sha("s") } as never }));
    const result = await runSkeleton(attemptPort().port, ci, await base());
    expect(result.ok && result.value.kind === "SkeletonFailureDraft" && result.value.reason).toBe("TRACE");
  });
});
