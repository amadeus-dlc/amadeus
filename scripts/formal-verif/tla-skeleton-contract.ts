import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import type { VerifiedCapacityReservation, VerifiedEvidenceProof } from "./fs-evidence-store.ts";
import type { MaterializationReceipt } from "./fs-fixture-registry.ts";
import type { VerifiedProvenanceLedger } from "./fs-provenance-store.ts";
import type { CommitReceipt, FoldedLedger } from "./provenance.ts";
import type { FrozenTlaModelReceipt } from "./tla-arm.ts";

export const SKELETON_MAX_CI_COMPRESSED_BYTES = 128 * 1024 * 1024;
export const SKELETON_MAX_CI_UNCOMPRESSED_BYTES = 72 * 1024 * 1024;
const LOCAL_BUNDLE_RESERVATION_BYTES = 2 * 32 * 1024 * 1024;

export const SKELETON_REQUIRED_RESERVATION_BYTES =
  1024 * 1024 * 1024 +
  SKELETON_MAX_CI_COMPRESSED_BYTES +
  SKELETON_MAX_CI_UNCOMPRESSED_BYTES +
  LOCAL_BUNDLE_RESERVATION_BYTES;

export const SKELETON_ARCHIVE_PATHS = Object.freeze([
  "ci-manifest.json",
  "attempts/1/envelope.json",
  "attempts/1/result.json",
  "attempts/1/command.json",
  "attempts/1/stdout.bin",
  "attempts/1/stderr.bin",
  "attempts/1/timing.json",
  "attempts/2/envelope.json",
  "attempts/2/result.json",
  "attempts/2/command.json",
  "attempts/2/stdout.bin",
  "attempts/2/stderr.bin",
  "attempts/2/timing.json",
] as const);

export const TLA_SKELETON_COMMANDS = Object.freeze(["prepare", "run-local", "verify-ci", "record-outcome"] as const);

export type SkeletonFailureReason =
  | "PRECONDITION"
  | "DISCLOSURE"
  | "NOT_DETECTED"
  | "HARNESS_ERROR"
  | "NON_DETERMINISTIC"
  | "EVIDENCE"
  | "CI"
  | "TRACE";

export interface SkeletonVerificationFailure {
  reason: SkeletonFailureReason;
  message: string;
  partials: readonly string[];
}

export interface SkeletonPortError {
  kind: "TransportError" | "HeadConflictError" | "LookupError" | "CorruptionError";
  message: string;
  causeIdentity?: string;
}

export interface SkeletonExternalError {
  kind: "SkeletonCommitError";
  operation: "PRECONDITION" | "ATTEMPT" | "CI" | "PROVENANCE_APPEND" | "PROVENANCE_LOOKUP";
  message: string;
  causeIdentity?: string;
}

export interface SkeletonCompositionInput {
  baseSha: string;
  armFreezeSha: string;
  armOwnedDiffIdentity: string;
  injectionSha: string;
  injectionPatchIdentity: string;
  applicationOrder: "ARM_T_OWNED_DIFF_THEN_1252_PATCH";
  armOverlayTree: string;
  injectionOverlayTree: string;
  resultingTreeHash: string;
  resultingCommitSha: string;
  parentCount: 1;
  clean: true;
  dedicated: true;
}

export interface SkeletonCiTrustInput {
  repository: string;
  workflowPath: string;
  workflowBlobSha: string;
  workflowRef: string;
  commandIdentity: string;
}

export interface SkeletonPreconditionInput {
  revisionIdentity: string;
  provenance: VerifiedProvenanceLedger;
  materialization: MaterializationReceipt;
  model: FrozenTlaModelReceipt;
  reservation: VerifiedCapacityReservation;
  jarIdentity: string;
  jdkIdentity: string;
  profileIdentity: string;
  composition: SkeletonCompositionInput;
  ciTrust: SkeletonCiTrustInput;
}

export interface SkeletonReadyPrecondition {
  kind: "SkeletonReadyPrecondition";
  preconditionSnapshotIdentity: string;
}

export interface SkeletonPreconditionSourcePort {
  read(revisionIdentity: string): Promise<Result<SkeletonPreconditionInput, SkeletonPortError>>;
}

export interface SkeletonAttemptRequest {
  revisionIdentity: string;
  runNo: 1 | 2;
  purpose: "SKELETON";
  fixtureAlias: "fx-1252";
  preconditionSnapshotIdentity: string;
  compositionHeadIdentity: string;
  resultingCommitSha: string;
  resultingTreeHash: string;
  baselineSha: string;
  armFreezeSha: string;
  inputIdentity: string;
  modelIdentity: string;
  subjectIdentity: string;
  toolIdentity: string;
  deadlineMs: 120000;
  requestIdentity: string;
}

export interface WorktreeExecutionReceipt {
  compositionHeadIdentity: string;
  expectedCommitSha: string;
  actualHeadSha: string;
  expectedTreeHash: string;
  actualTreeHash: string;
  clean: boolean;
  verifiedImmediatelyBefore: string;
  receiptIdentity: string;
}

export interface SkeletonAttemptObservation {
  requestIdentity: string;
  runNo: 1 | 2;
  purpose: "SKELETON";
  worktree: WorktreeExecutionReceipt;
  proof: VerifiedEvidenceProof;
  violatedInvariant: string;
  traceComplete: boolean;
  commandIdentity: string;
  processReceiptIdentity: string;
  stdoutIdentity: string;
  stderrIdentity: string;
  durationMs: number;
  modelIdentity: string;
  subjectIdentity: string;
  toolIdentity: string;
  inputIdentity: string;
}

export interface SkeletonAttemptPort {
  execute(request: SkeletonAttemptRequest): Promise<Result<SkeletonAttemptObservation, SkeletonPortError>>;
}

export interface SkeletonAttempt {
  runNo: 1 | 2;
  purpose: "SKELETON";
  requestIdentity: string;
  preconditionSnapshotIdentity: string;
  compositionHeadIdentity: string;
  resultingCommitSha: string;
  worktreeReceiptIdentity: string;
  inputIdentity: string;
  commandIdentity: string;
  processReceiptIdentity: string;
  cellResultIdentity: string;
  bundleId: string;
  evidenceReceiptIdentity: string;
  counterexampleIdentity: string;
  stdoutIdentity: string;
  stderrIdentity: string;
  modelIdentity: string;
  subjectIdentity: string;
  toolIdentity: string;
  semanticIdentity: string;
  durationMs: number;
  attemptIdentity: string;
}

export interface SkeletonCiRow {
  runNo: 1 | 2;
  verdict: "DETECTED";
  counterexampleIdentity: string;
  cellResultIdentity: string;
  bundleId: string;
  stdoutIdentity: string;
  stderrIdentity: string;
  commandIdentity: string;
  processReceiptIdentity: string;
  durationMs: number;
  modelIdentity: string;
  subjectIdentity: string;
  toolIdentity: string;
  rowIdentity: string;
}

export interface SkeletonCiArtifact {
  schemaVersion: 1;
  executionManifestIdentity: string;
  compositionHeadIdentity: string;
  resultingCommitSha: string;
  inputIdentity: string;
  attempts: readonly SkeletonCiRow[];
  artifactIdentity: string;
}

export type SkeletonCiBundleBody = Omit<SkeletonCiRow, "bundleId" | "rowIdentity">;
export function skeletonCiBundleIdentity(body: SkeletonCiBundleBody): string {
  return canonicalIdentity(body, "amadeus.formal-verif.skeleton-ci-bundle.v1").sha256;
}

export function skeletonCiStructuredArchiveBytes(artifact: SkeletonCiArtifact, path: string): Uint8Array | null {
  if (path === "ci-manifest.json") return canonicalIdentity(artifact, "amadeus.formal-verif.skeleton-ci-artifact-bytes.v1").bytes;
  const matched = /^attempts\/([12])\/(envelope|result|command|timing)\.json$/.exec(path);
  if (!matched) return null;
  const row = artifact.attempts.find((candidate) => candidate.runNo === Number(matched[1]));
  if (!row) return null;
  const payload = matched[2] === "envelope"
    ? { executionManifestIdentity: artifact.executionManifestIdentity, runNo: row.runNo, bundleId: row.bundleId, rowIdentity: row.rowIdentity }
    : matched[2] === "result"
      ? { verdict: row.verdict, counterexampleIdentity: row.counterexampleIdentity, cellResultIdentity: row.cellResultIdentity }
      : matched[2] === "command"
        ? { commandIdentity: row.commandIdentity, toolIdentity: row.toolIdentity, modelIdentity: row.modelIdentity }
        : { processReceiptIdentity: row.processReceiptIdentity, durationMs: row.durationMs };
  return canonicalIdentity(payload, `amadeus.formal-verif.skeleton-ci-${matched[2]}-bytes.v1`).bytes;
}

export interface SkeletonCiMetadata {
  provider: "github-actions";
  repository: string;
  event: "workflow_dispatch";
  workflowPath: string;
  workflowBlobSha: string;
  workflowRef: string;
  runAttempt: 1;
  runId: string;
  runUrl: string;
  workflowConclusion: "success";
  jobConclusion: "success";
  permissions: Readonly<{ contents: "read" }>;
  headSha: string;
  checkoutSha: string;
  commandIdentity: string;
  startedAt: string;
  finishedAt: string;
  exitCode: 0;
  environmentKeys: readonly ["CI", "GITHUB_ACTIONS"];
}

export interface SkeletonArchiveEntry {
  path: string;
  kind: "FILE" | "DIRECTORY" | "SYMLINK" | "HARDLINK";
  compressedBytes: number;
  uncompressedBytes: number;
  contentSha256: string;
  chunks: readonly Uint8Array[];
}

export interface SkeletonArchiveIndex {
  compressedBytes: number;
  uncompressedBytes: number;
  entries: readonly SkeletonArchiveEntry[];
}

export interface SkeletonCiObservation {
  metadata: SkeletonCiMetadata;
  artifact: SkeletonCiArtifact;
  archive: SkeletonArchiveIndex;
}

export interface SkeletonCiPort {
  collect(manifest: SkeletonExecutionManifest): Promise<Result<SkeletonCiObservation, SkeletonPortError>>;
}

export interface SkeletonExecutionManifest {
  schemaVersion: 1;
  revisionIdentity: string;
  preconditionSnapshotIdentity: string;
  tFrozenEventId: string;
  disclosureGrantIdentity: string;
  materializationReceiptIdentity: string;
  compositionHeadIdentity: string;
  resultingCommitSha: string;
  inputIdentity: string;
  localEvidenceIdentity: string;
  localAttempts: readonly SkeletonAttempt[];
  semanticIdentity: string;
  expectedCiAttemptKeys: readonly [1, 2];
  artifactSchemaIdentity: string;
  ciTrust: Readonly<SkeletonCiTrustInput>;
  nonBenchmark: true;
  executionManifestIdentity: string;
}

export interface SkeletonCiReceipt {
  provider: "github-actions";
  providerReceiptIdentity: string;
  runId: string;
  runUrl: string;
  headSha: string;
  commandIdentity: string;
  startedAt: string;
  finishedAt: string;
  artifactIdentity: string;
  verifiedArtifactProofIdentity: string;
  executionManifestIdentity: string;
  ciReceiptIdentity: string;
}

export interface SkeletonSummary {
  schemaVersion: 1;
  executionManifestIdentity: string;
  localEvidenceIdentity: string;
  ciReceiptIdentity: string;
  artifactIdentity: string;
  compositionHeadIdentity: string;
  inputIdentity: string;
  semanticIdentity: string;
  summaryIdentity: string;
}

export interface SkeletonPassDraft {
  kind: "SkeletonPassDraft";
  manifest: SkeletonExecutionManifest;
  ciReceipt: SkeletonCiReceipt;
  summary: SkeletonSummary;
  evidenceBundleHash: string;
  outcomeIdentity: string;
}

export interface SkeletonFailureDraft {
  kind: "SkeletonFailureDraft";
  reason: SkeletonFailureReason;
  verifiedPartialIdentities: readonly string[];
  evidenceBundleHash: string;
  failureIdentity: string;
}

export type SkeletonOutcomeDraft = SkeletonPassDraft | SkeletonFailureDraft;

export interface SkeletonCommitContext {
  ledger: FoldedLedger;
  expectedStoreHead: string;
  actorId: string;
  sessionId: string;
  worktree: string;
  baseSha: string;
  publicInputHash: string;
  at: string;
  sequence: number;
}

export interface SkeletonCommitReceipt {
  outcome: "pass" | "fail";
  eventId: string;
  transactionId: string;
  commit: CommitReceipt;
  recovered: boolean;
}

export type SkeletonPostFailureActivityKind = "ARM_S_STARTED" | "FIXTURE_REVEALED" | "PROMOTION_REQUESTED" | "BENCHMARK_STARTED";

export interface SkeletonPostFailureActivity {
  kind: SkeletonPostFailureActivityKind;
  afterEventId: string;
  activityIdentity: string;
}

export interface SkeletonPostFailureSourcePort {
  readSuffix(failureEventId: string, committedHead: string): Promise<Result<readonly SkeletonPostFailureActivity[], SkeletonPortError>>;
}

export interface SkeletonStopReceipt {
  failureEventId: string;
  inspectedSuffixIdentity: string;
  forbiddenCount: 0;
  stopReceiptIdentity: string;
}
