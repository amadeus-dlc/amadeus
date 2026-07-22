import { createHash } from "node:crypto";
import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, type Result } from "./contract.ts";
import {
  SKELETON_ARCHIVE_PATHS,
  SKELETON_MAX_CI_COMPRESSED_BYTES,
  SKELETON_MAX_CI_UNCOMPRESSED_BYTES,
  skeletonCiBundleIdentity,
  skeletonCiStructuredArchiveBytes,
  type SkeletonArchiveEntry,
  type SkeletonArchiveIndex,
  type SkeletonCiMetadata,
  type SkeletonCiObservation,
  type SkeletonCiReceipt,
  type SkeletonCiRow,
  type SkeletonExecutionManifest,
  type SkeletonFailureReason,
  type SkeletonPassDraft,
  type SkeletonVerificationFailure,
} from "./tla-skeleton-contract.ts";

const SHA256 = /^[0-9a-f]{64}$/;
const GITHUB_RUN = /^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+\/actions\/runs\/[1-9][0-9]*$/i;
const METADATA_KEYS = [
  "provider",
  "repository",
  "event",
  "workflowPath",
  "workflowBlobSha",
  "workflowRef",
  "runAttempt",
  "runId",
  "runUrl",
  "workflowConclusion",
  "jobConclusion",
  "permissions",
  "headSha",
  "checkoutSha",
  "commandIdentity",
  "startedAt",
  "finishedAt",
  "exitCode",
  "environmentKeys",
] as const;
const ARTIFACT_KEYS = [
  "schemaVersion",
  "executionManifestIdentity",
  "compositionHeadIdentity",
  "resultingCommitSha",
  "inputIdentity",
  "attempts",
  "artifactIdentity",
] as const;
const ROW_KEYS = [
  "runNo",
  "verdict",
  "counterexampleIdentity",
  "cellResultIdentity",
  "bundleId",
  "stdoutIdentity",
  "stderrIdentity",
  "commandIdentity",
  "processReceiptIdentity",
  "durationMs",
  "modelIdentity",
  "subjectIdentity",
  "toolIdentity",
  "rowIdentity",
] as const;
const ENTRY_KEYS = ["path", "kind", "compressedBytes", "uncompressedBytes", "contentSha256", "chunks"] as const;

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function exact(value: unknown, keys: readonly string[]): boolean {
  if (!plain(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function sha(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function integer(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function safePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return false;
  if (/^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(value)) return false;
  return !value.split(/[\\/]/).includes("..");
}

function immutable<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) immutable(child);
    Object.freeze(value);
  }
  return value;
}

function failure(reason: SkeletonFailureReason, message: string, partials: readonly string[] = []): SkeletonVerificationFailure {
  return { reason, message, partials };
}

function metadataValuesMatch(metadata: SkeletonCiMetadata, manifest: SkeletonExecutionManifest): boolean {
  const expectedUrl = `https://github.com/${metadata.repository}/actions/runs/${metadata.runId}`;
  return [
    metadata.provider === "github-actions",
    metadata.repository === manifest.ciTrust.repository,
    metadata.event === "workflow_dispatch",
    metadata.workflowPath === manifest.ciTrust.workflowPath,
    metadata.workflowBlobSha === manifest.ciTrust.workflowBlobSha,
    metadata.workflowRef === manifest.ciTrust.workflowRef,
    metadata.runAttempt === 1,
    metadata.runUrl === expectedUrl,
    metadata.workflowConclusion === "success",
    metadata.jobConclusion === "success",
    metadata.permissions.contents === "read",
    metadata.headSha === manifest.resultingCommitSha,
    metadata.checkoutSha === manifest.resultingCommitSha,
    metadata.commandIdentity === manifest.ciTrust.commandIdentity,
    metadata.exitCode === 0,
  ].every(Boolean);
}

function metadataRuntimeValid(metadata: SkeletonCiMetadata): boolean {
  if (!/^[1-9][0-9]*$/.test(metadata.runId) || !GITHUB_RUN.test(metadata.runUrl)) return false;
  if (!isUtcInstant(metadata.startedAt) || !isUtcInstant(metadata.finishedAt)) return false;
  if (Date.parse(metadata.finishedAt) < Date.parse(metadata.startedAt)) return false;
  return metadata.environmentKeys.length === 2 && metadata.environmentKeys[0] === "CI" && metadata.environmentKeys[1] === "GITHUB_ACTIONS";
}

function verifyMetadata(metadata: SkeletonCiMetadata, manifest: SkeletonExecutionManifest): Result<void, SkeletonVerificationFailure> {
  const partials = [manifest.executionManifestIdentity];
  if (!exact(metadata, METADATA_KEYS) || !exact(metadata.permissions, ["contents"])) {
    return { ok: false, error: failure("CI", "CI metadata schema or permissions are not closed", partials) };
  }
  if (!metadataValuesMatch(metadata, manifest) || !metadataRuntimeValid(metadata)) {
    return { ok: false, error: failure("CI", "CI metadata does not match the trusted baseline run", partials) };
  }
  return { ok: true, value: undefined };
}

function archiveEntryValid(entry: SkeletonArchiveEntry, expected: Set<string>, paths: Set<string>, folded: Set<string>): boolean {
  if (!exact(entry, ENTRY_KEYS) || !safePath(entry.path) || !expected.has(entry.path)) return false;
  if (entry.kind !== "FILE" || !integer(entry.compressedBytes) || !integer(entry.uncompressedBytes)) return false;
  if (!sha(entry.contentSha256) || paths.has(entry.path) || folded.has(entry.path.toLowerCase()) || !Array.isArray(entry.chunks)) return false;
  const digest = createHash("sha256");
  let bytes = 0;
  for (const chunk of entry.chunks) {
    if (!(chunk instanceof Uint8Array) || bytes + chunk.byteLength > SKELETON_MAX_CI_UNCOMPRESSED_BYTES) return false;
    bytes += chunk.byteLength;
    digest.update(chunk);
  }
  return bytes === entry.uncompressedBytes && digest.digest("hex") === entry.contentSha256;
}

function archiveRecord(archive: SkeletonArchiveIndex) {
  return { compressedBytes: archive.compressedBytes, uncompressedBytes: archive.uncompressedBytes, entries: archive.entries.map((entry) => ({ path: entry.path, kind: entry.kind, compressedBytes: entry.compressedBytes, uncompressedBytes: entry.uncompressedBytes, contentSha256: entry.contentSha256 })) };
}

function verifyArchive(archive: SkeletonArchiveIndex, artifact: SkeletonCiObservation["artifact"]): Result<void, SkeletonVerificationFailure> {
  if (!exact(archive, ["compressedBytes", "uncompressedBytes", "entries"]) || archive.entries.length !== SKELETON_ARCHIVE_PATHS.length) {
    return { ok: false, error: failure("CI", "CI archive shape is not closed") };
  }
  const expected = new Set<string>(SKELETON_ARCHIVE_PATHS);
  const paths = new Set<string>();
  const folded = new Set<string>();
  let compressed = 0;
  let uncompressed = 0;
  for (const entry of archive.entries) {
    if (!archiveEntryValid(entry, expected, paths, folded)) {
      return { ok: false, error: failure("CI", "CI archive contains an unsafe, duplicate, linked, or unknown entry") };
    }
    paths.add(entry.path);
    folded.add(entry.path.toLowerCase());
    compressed += entry.compressedBytes;
    uncompressed += entry.uncompressedBytes;
  }
  const complete = paths.size === expected.size && [...expected].every((path) => paths.has(path));
  const bounded = compressed <= SKELETON_MAX_CI_COMPRESSED_BYTES && uncompressed <= SKELETON_MAX_CI_UNCOMPRESSED_BYTES;
  const totalsMatch = archive.compressedBytes === compressed && archive.uncompressedBytes === uncompressed;
  const entries = new Map(archive.entries.map((entry) => [entry.path, entry]));
  const structured = SKELETON_ARCHIVE_PATHS.filter((path) => path.endsWith(".json"));
  const structuredMatch = structured.every((path) => {
    const entry = entries.get(path); const expectedBytes = skeletonCiStructuredArchiveBytes(artifact, path);
    return entry && expectedBytes && entry.uncompressedBytes === expectedBytes.byteLength && entry.contentSha256 === createHash("sha256").update(expectedBytes).digest("hex");
  });
  const streamsMatch = artifact.attempts.every((row) => entries.get(`attempts/${row.runNo}/stdout.bin`)?.contentSha256 === row.stdoutIdentity && entries.get(`attempts/${row.runNo}/stderr.bin`)?.contentSha256 === row.stderrIdentity);
  return complete && bounded && totalsMatch && structuredMatch && streamsMatch
    ? { ok: true, value: undefined }
    : { ok: false, error: failure("CI", "CI archive bytes do not bind every artifact row") };
}

function artifactHeaderValid(observation: SkeletonCiObservation, manifest: SkeletonExecutionManifest): boolean {
  const artifact = observation.artifact;
  const { artifactIdentity, ...body } = artifact;
  return [
    artifact.schemaVersion === 1,
    sha(artifactIdentity),
    canonicalIdentity(body, "amadeus.formal-verif.skeleton-ci-artifact.v1").sha256 === artifactIdentity,
    artifact.executionManifestIdentity === manifest.executionManifestIdentity,
    artifact.compositionHeadIdentity === manifest.compositionHeadIdentity,
    artifact.resultingCommitSha === manifest.resultingCommitSha,
    artifact.inputIdentity === manifest.inputIdentity,
    artifact.attempts.length === 2,
  ].every(Boolean);
}

interface RowIndex {
  runNumbers: Set<number>;
  rowIds: Set<string>;
  bundles: Set<string>;
}

function rowValuesMatch(row: SkeletonCiRow, manifest: SkeletonExecutionManifest): boolean {
  const local = manifest.localAttempts.find((attempt) => attempt.runNo === row.runNo);
  if (!local) return false;
  const { rowIdentity, ...body } = row;
  return [
    row.verdict === "DETECTED",
    sha(rowIdentity),
    canonicalIdentity(body, "amadeus.formal-verif.skeleton-ci-row.v1").sha256 === rowIdentity,
    row.counterexampleIdentity === local.counterexampleIdentity,
    row.cellResultIdentity === local.cellResultIdentity,
    row.commandIdentity === local.commandIdentity,
    row.processReceiptIdentity === local.processReceiptIdentity,
    integer(row.durationMs) && row.durationMs <= 120000,
    row.modelIdentity === local.modelIdentity,
    row.subjectIdentity === local.subjectIdentity,
    row.toolIdentity === local.toolIdentity,
  ].every(Boolean);
}

function verifyRow(row: SkeletonCiRow, manifest: SkeletonExecutionManifest, index: RowIndex): boolean {
  if (!exact(row, ROW_KEYS) || (row.runNo !== 1 && row.runNo !== 2)) return false;
  if (index.runNumbers.has(row.runNo) || index.rowIds.has(row.rowIdentity) || index.bundles.has(row.bundleId)) return false;
  const { rowIdentity: _rowIdentity, bundleId, ...bundleBody } = row;
  if (![bundleId, row.stdoutIdentity, row.stderrIdentity].every(sha) || bundleId !== skeletonCiBundleIdentity(bundleBody) || !rowValuesMatch(row, manifest)) return false;
  if (manifest.localAttempts.some((attempt) => attempt.bundleId === row.bundleId)) return false;
  index.runNumbers.add(row.runNo);
  index.rowIds.add(row.rowIdentity);
  index.bundles.add(row.bundleId);
  return true;
}

function createCiReceipt(observation: SkeletonCiObservation, manifest: SkeletonExecutionManifest): SkeletonCiReceipt {
  const artifactIdentity = observation.artifact.artifactIdentity;
  const providerReceiptIdentity = canonicalIdentity(
    { provider: observation.metadata.provider, runId: observation.metadata.runId, metadataIdentity: canonicalIdentity(observation.metadata, "amadeus.formal-verif.skeleton-ci-metadata.v1").sha256, artifactIdentity, archiveIdentity: canonicalIdentity(archiveRecord(observation.archive), "amadeus.formal-verif.skeleton-ci-archive.v1").sha256 },
    "amadeus.formal-verif.skeleton-provider-receipt.v1",
  ).sha256;
  const proofIdentity = canonicalIdentity(
    {
      artifactIdentity,
      archiveIdentity: canonicalIdentity(archiveRecord(observation.archive), "amadeus.formal-verif.skeleton-ci-archive.v1").sha256,
      metadataIdentity: canonicalIdentity(observation.metadata, "amadeus.formal-verif.skeleton-ci-metadata.v1").sha256,
      providerReceiptIdentity,
      executionManifestIdentity: manifest.executionManifestIdentity,
    },
    "amadeus.formal-verif.skeleton-verified-ci-proof.v1",
  ).sha256;
  const body = {
    provider: "github-actions" as const,
    providerReceiptIdentity,
    runId: observation.metadata.runId,
    runUrl: observation.metadata.runUrl,
    headSha: observation.metadata.headSha,
    commandIdentity: observation.metadata.commandIdentity,
    startedAt: observation.metadata.startedAt,
    finishedAt: observation.metadata.finishedAt,
    artifactIdentity,
    verifiedArtifactProofIdentity: proofIdentity,
    executionManifestIdentity: manifest.executionManifestIdentity,
  };
  return immutable({ ...body, ciReceiptIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-ci-receipt.v1").sha256 });
}

function createPassDraft(manifest: SkeletonExecutionManifest, receipt: SkeletonCiReceipt): SkeletonPassDraft {
  const summaryBody = {
    schemaVersion: 1 as const,
    executionManifestIdentity: manifest.executionManifestIdentity,
    localEvidenceIdentity: manifest.localEvidenceIdentity,
    ciReceiptIdentity: receipt.ciReceiptIdentity,
    artifactIdentity: receipt.artifactIdentity,
    compositionHeadIdentity: manifest.compositionHeadIdentity,
    inputIdentity: manifest.inputIdentity,
    semanticIdentity: manifest.semanticIdentity,
  };
  const summary = immutable({
    ...summaryBody,
    summaryIdentity: canonicalIdentity(summaryBody, "amadeus.formal-verif.skeleton-summary.v1").sha256,
  });
  const outcomeBody = {
    summaryIdentity: summary.summaryIdentity,
    evidenceBundleHash: manifest.localEvidenceIdentity,
    ciReceiptIdentity: receipt.ciReceiptIdentity,
  };
  return immutable({
    kind: "SkeletonPassDraft",
    manifest,
    ciReceipt: receipt,
    summary,
    evidenceBundleHash: manifest.localEvidenceIdentity,
    outcomeIdentity: canonicalIdentity(outcomeBody, "amadeus.formal-verif.skeleton-pass.v1").sha256,
  });
}

export function verifySkeletonCiAndClose(
  observation: SkeletonCiObservation,
  manifest: SkeletonExecutionManifest,
): Result<SkeletonPassDraft, SkeletonVerificationFailure> {
  const partials = [manifest.executionManifestIdentity];
  if (!exact(observation, ["metadata", "artifact", "archive"])) {
    return { ok: false, error: failure("CI", "CI observation schema is not closed", partials) };
  }
  const metadata = verifyMetadata(observation.metadata, manifest);
  if (!metadata.ok) return metadata;
  if (!exact(observation.artifact, ARTIFACT_KEYS)) {
    return { ok: false, error: failure("TRACE", "CI artifact schema permits no summary or extra field", partials) };
  }
  if (!artifactHeaderValid(observation, manifest)) {
    return { ok: false, error: failure("CI", "CI artifact identity or manifest binding failed", partials) };
  }
  const index: RowIndex = { runNumbers: new Set(), rowIds: new Set(), bundles: new Set() };
  for (const row of observation.artifact.attempts) {
    if (!verifyRow(row, manifest, index)) {
      return { ok: false, error: failure("CI", "CI rows do not form a fresh two-run semantic bijection", [observation.artifact.artifactIdentity]) };
    }
  }
  const archive = verifyArchive(observation.archive, observation.artifact);
  if (!archive.ok) return archive;
  return { ok: true, value: createPassDraft(manifest, createCiReceipt(observation, manifest)) };
}
