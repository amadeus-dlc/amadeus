import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, type Result } from "./contract.ts";
import { isVerifiedCapacityReservation, isVerifiedEvidenceProof, type VerifiedEvidenceProof } from "./fs-evidence-store.ts";
import { isVerifiedMaterializationReceipt } from "./fs-fixture-registry.ts";
import { isVerifiedProvenanceLedger } from "./fs-provenance-store.ts";
import {
  createTransaction,
  foldLedger,
  type CommitReceipt,
  type FoldedLedger,
  type ProvenanceError,
  type ProvenanceEvent,
  type ProvenanceStorePort,
} from "./provenance.ts";
import { validateFrozenTlaModelReceipt } from "./tla-arm.ts";
import {
  SKELETON_ARCHIVE_PATHS,
  SKELETON_REQUIRED_RESERVATION_BYTES,
  type SkeletonAttempt,
  type SkeletonAttemptObservation,
  type SkeletonAttemptPort,
  type SkeletonAttemptRequest,
  type SkeletonCiObservation,
  type SkeletonCiPort,
  type SkeletonCommitContext,
  type SkeletonCommitReceipt,
  type SkeletonCiTrustInput,
  type SkeletonExecutionManifest,
  type SkeletonExternalError,
  type SkeletonFailureDraft,
  type SkeletonFailureReason,
  type SkeletonOutcomeDraft,
  type SkeletonPortError,
  type SkeletonPostFailureActivity,
  type SkeletonPostFailureSourcePort,
  type SkeletonPreconditionInput,
  type SkeletonPreconditionSourcePort,
  type SkeletonReadyPrecondition,
  type SkeletonStopReceipt,
  type WorktreeExecutionReceipt,
} from "./tla-skeleton-contract.ts";
import { verifySkeletonCiAndClose } from "./tla-skeleton-outcome.ts";
import { FIXED_JDK_RUN_PROFILE_IDENTITY, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, FIXED_TLC_PROFILE_IDENTITY } from "./tlc-toolchain.ts";

export * from "./tla-skeleton-contract.ts";

const SHA256 = /^[0-9a-f]{64}$/;
const REPOSITORY = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;
const ISSUED_OUTCOMES = new WeakSet<object>();
const ISSUED_COMMITS = new WeakSet<object>();
const ISSUED_PRECONDITIONS = new WeakMap<object, VerifiedSkeletonPreconditions>();
interface VerifiedSkeletonPreconditions {
  revisionIdentity: string;
  ledgerHead: string;
  tFrozenEventId: string;
  disclosureGrantIdentity: string;
  materializationReceiptIdentity: string;
  compositionHeadIdentity: string;
  resultingCommitSha: string;
  resultingTreeHash: string;
  baselineSha: string;
  armFreezeSha: string;
  inputIdentity: string;
  modelIdentity: string;
  subjectIdentity: string;
  toolIdentity: string;
  preconditionSnapshotIdentity: string;
  ciTrust: Readonly<SkeletonCiTrustInput>;
}
interface DomainFailure {
  reason: SkeletonFailureReason;
  message: string;
  partials: readonly string[];
}
const PRECONDITION_KEYS = [
  "revisionIdentity",
  "provenance",
  "materialization",
  "model",
  "reservation",
  "jarIdentity",
  "jdkIdentity",
  "profileIdentity",
  "composition",
  "ciTrust",
] as const;
const COMPOSITION_KEYS = [
  "baseSha",
  "armFreezeSha",
  "armOwnedDiffIdentity",
  "injectionSha",
  "injectionPatchIdentity",
  "applicationOrder",
  "armOverlayTree",
  "injectionOverlayTree",
  "resultingTreeHash",
  "resultingCommitSha",
  "parentCount",
  "clean",
  "dedicated",
] as const;
const CI_TRUST_KEYS = ["repository", "workflowPath", "workflowBlobSha", "workflowRef", "commandIdentity"] as const;
const WORKTREE_KEYS = [
  "compositionHeadIdentity",
  "expectedCommitSha",
  "actualHeadSha",
  "expectedTreeHash",
  "actualTreeHash",
  "clean",
  "verifiedImmediatelyBefore",
  "receiptIdentity",
] as const;
const ATTEMPT_OBSERVATION_KEYS = [
  "requestIdentity",
  "runNo",
  "purpose",
  "worktree",
  "proof",
  "violatedInvariant",
  "traceComplete",
  "commandIdentity",
  "processReceiptIdentity",
  "stdoutIdentity",
  "stderrIdentity",
  "durationMs",
  "modelIdentity",
  "subjectIdentity",
  "toolIdentity",
  "inputIdentity",
] as const;
const ARTIFACT_SCHEMA_IDENTITY = canonicalIdentity(
  { schemaVersion: 1, attempts: [1, 2], paths: SKELETON_ARCHIVE_PATHS },
  "amadeus.formal-verif.skeleton-ci-schema.v1",
).sha256;
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
function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
function safeRepositoryPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.includes("\0") &&
    !/^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(value) &&
    !value.split(/[\\/]/).includes("..")
  );
}
function immutable<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) immutable(child);
    Object.freeze(value);
  }
  return value;
}
function domainFailure(reason: SkeletonFailureReason, message: string, partials: readonly string[] = []): DomainFailure {
  return { reason, message, partials };
}

function failureDraft(value: DomainFailure): SkeletonFailureDraft {
  const verifiedPartialIdentities = Object.freeze([...new Set(value.partials.filter(sha))]);
  const evidenceBundleHash = canonicalIdentity(
    verifiedPartialIdentities,
    "amadeus.formal-verif.skeleton-partial-evidence.v1",
  ).sha256;
  const body = { reason: value.reason, verifiedPartialIdentities, evidenceBundleHash };
  const draft: SkeletonFailureDraft = {
    kind: "SkeletonFailureDraft",
    ...body,
    failureIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-failure.v1").sha256,
  };
  ISSUED_OUTCOMES.add(draft);
  return immutable(draft);
}

function external(operation: SkeletonExternalError["operation"], error: SkeletonPortError): SkeletonExternalError {
  return {
    kind: "SkeletonCommitError",
    operation,
    message: error.message,
    causeIdentity: error.causeIdentity ?? canonicalIdentity({ kind: error.kind, message: error.message }, "amadeus.formal-verif.skeleton-external-error.v1").sha256,
  };
}

function thrown(operation: SkeletonExternalError["operation"], cause: unknown): SkeletonExternalError {
  const name = cause instanceof Error ? cause.name : "UnknownError";
  const message = cause instanceof Error ? cause.message : String(cause);
  return {
    kind: "SkeletonCommitError",
    operation,
    message: `${operation.toLowerCase()} port threw`,
    causeIdentity: canonicalIdentity({ name, message }, "amadeus.formal-verif.skeleton-thrown-error.v1").sha256,
  };
}

function preconditionSchemaValid(input: SkeletonPreconditionInput): boolean {
  return exact(input, PRECONDITION_KEYS) && exact(input.composition, COMPOSITION_KEYS) && exact(input.ciTrust, CI_TRUST_KEYS);
}

function ciTrustValid(input: SkeletonPreconditionInput): boolean {
  const path = input.ciTrust.workflowPath;
  return REPOSITORY.test(input.ciTrust.repository) && safeRepositoryPath(path) && path.startsWith(".github/workflows/") && /\.ya?ml$/.test(path) && input.ciTrust.workflowRef === input.composition.baseSha;
}

interface VerifiedPreconditionProofs {
  ledger: FoldedLedger;
  freeze: Extract<ProvenanceEvent, { kind: "ARM_FROZEN" }>;
  modelIdentity: string;
}

function verifyPreconditionProofs(input: SkeletonPreconditionInput): Result<VerifiedPreconditionProofs, DomainFailure> {
  const partials = [input.revisionIdentity];
  if (!isVerifiedProvenanceLedger(input.provenance) || !isVerifiedMaterializationReceipt(input.materialization) || !isVerifiedCapacityReservation(input.reservation)) {
    return { ok: false, error: domainFailure("PRECONDITION", "preconditions require store-issued provenance, materialization, and capacity proofs", partials) };
  }
  const ledger = input.provenance.ledger;
  const freeze = ledger.events.find((event): event is Extract<ProvenanceEvent, { kind: "ARM_FROZEN" }> => event.kind === "ARM_FROZEN" && event.arm === "tla");
  const reveal = ledger.events.at(-1);
  const model = validateFrozenTlaModelReceipt(input.model);
  if (ledger.state !== "SKELETON_REVEALED" || !sha(ledger.head) || !sha(input.provenance.storeHead) || !freeze || reveal?.kind !== "FIXTURE_REVEALED" || !model.ok) {
    return { ok: false, error: domainFailure("PRECONDITION", "issued upstream proof graph is incomplete or invalid", partials) };
  }
  const identities = [input.revisionIdentity, input.jarIdentity, input.jdkIdentity, input.profileIdentity, input.materialization.receiptIdentity, input.reservation.reservationIdentity, input.reservation.evidenceRootIdentity, input.ciTrust.workflowBlobSha, input.ciTrust.workflowRef, input.ciTrust.commandIdentity, ...Object.values(input.composition).filter((value): value is string => typeof value === "string" && value !== "ARM_T_OWNED_DIFF_THEN_1252_PATCH")];
  const continuity = [
    identities.every(sha),
    input.materialization.fixtureAlias === "fx-1252",
    input.materialization.frozenEventId === freeze.eventId,
    reveal.arm === "tla" && reveal.frozenEventId === freeze.eventId && reveal.disclosureHash === input.materialization.materializedIdentity,
    input.composition.baseSha === input.materialization.baselineSha && input.composition.baseSha === freeze.baseSha,
    input.composition.armFreezeSha === freeze.proof.freezeSha,
    input.composition.injectionSha === input.materialization.injectionSha,
    input.composition.injectionPatchIdentity === input.materialization.injectionPatchIdentity,
    input.composition.applicationOrder === "ARM_T_OWNED_DIFF_THEN_1252_PATCH" && input.composition.parentCount === 1 && input.composition.clean === true && input.composition.dedicated === true,
    input.reservation.revisionIdentity === input.revisionIdentity && input.reservation.reservedBytes === SKELETON_REQUIRED_RESERVATION_BYTES,
    input.model.publicContractIdentity === freeze.publicInputHash,
    input.jarIdentity === FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY && input.jdkIdentity === FIXED_JDK_RUN_PROFILE_IDENTITY && input.profileIdentity === FIXED_TLC_PROFILE_IDENTITY,
  ].every(Boolean);
  return continuity
    ? { ok: true, value: { ledger, freeze, modelIdentity: model.value.modelIdentity } }
    : { ok: false, error: domainFailure("DISCLOSURE", "issued upstream proof continuity drifted", partials) };
}

function buildVerifiedPreconditions(input: SkeletonPreconditionInput, proofs: VerifiedPreconditionProofs): VerifiedSkeletonPreconditions {
  const compositionHeadIdentity = canonicalIdentity(input.composition, "amadeus.formal-verif.skeleton-composition-head.v1").sha256;
  const subjectIdentity = canonicalIdentity(
    {
      fixtureAlias: input.materialization.fixtureAlias,
      sealIdentity: input.materialization.sealIdentity,
      injectionSha: input.materialization.injectionSha,
      materializedIdentity: input.materialization.materializedIdentity,
    },
    "amadeus.formal-verif.skeleton-subject.v1",
  ).sha256;
  const toolIdentity = canonicalIdentity(
    { jarIdentity: input.jarIdentity, jdkIdentity: input.jdkIdentity, profileIdentity: input.profileIdentity },
    "amadeus.formal-verif.skeleton-tool.v1",
  ).sha256;
  const inputIdentity = canonicalIdentity(
    {
      publicInputHash: proofs.freeze.publicInputHash,
      modelIdentity: proofs.modelIdentity,
      subjectIdentity,
      toolIdentity,
      compositionHeadIdentity,
    },
    "amadeus.formal-verif.skeleton-input.v1",
  ).sha256;
  const preconditionBody = {
    revisionIdentity: input.revisionIdentity,
    ledgerHead: proofs.ledger.head,
    tFrozenEventId: proofs.freeze.eventId,
    tFreezeSha: proofs.freeze.proof.freezeSha,
    disclosureGrantIdentity: input.materialization.grantIdentity,
    materializationReceiptIdentity: input.materialization.receiptIdentity,
    evidenceRootIdentity: input.reservation.evidenceRootIdentity,
    reservationIdentity: input.reservation.reservationIdentity,
    compositionHeadIdentity,
    inputIdentity,
  };
  return immutable({
    revisionIdentity: input.revisionIdentity,
    ledgerHead: proofs.ledger.head!,
    tFrozenEventId: proofs.freeze.eventId,
    disclosureGrantIdentity: input.materialization.grantIdentity,
    materializationReceiptIdentity: input.materialization.receiptIdentity,
    compositionHeadIdentity,
    resultingCommitSha: input.composition.resultingCommitSha,
    resultingTreeHash: input.composition.resultingTreeHash,
    baselineSha: input.composition.baseSha,
    armFreezeSha: proofs.freeze.proof.freezeSha,
    inputIdentity,
    modelIdentity: proofs.modelIdentity,
    subjectIdentity,
    toolIdentity,
    preconditionSnapshotIdentity: canonicalIdentity(preconditionBody, "amadeus.formal-verif.skeleton-preconditions.v1").sha256,
    ciTrust: immutable({ ...input.ciTrust }),
  });
}

function verifyPreconditions(input: SkeletonPreconditionInput): Result<VerifiedSkeletonPreconditions, DomainFailure> {
  if (!preconditionSchemaValid(input)) return { ok: false, error: domainFailure("PRECONDITION", "precondition schema is not closed") };
  if (!ciTrustValid(input)) return { ok: false, error: domainFailure("PRECONDITION", "CI trust root is not baseline-bound", [input.revisionIdentity]) };
  const proofs = verifyPreconditionProofs(input);
  return proofs.ok ? { ok: true, value: buildVerifiedPreconditions(input, proofs.value) } : proofs;
}

function attemptRequest(preconditions: VerifiedSkeletonPreconditions, runNo: 1 | 2): SkeletonAttemptRequest {
  const body = {
    revisionIdentity: preconditions.revisionIdentity,
    runNo,
    purpose: "SKELETON" as const,
    fixtureAlias: "fx-1252" as const,
    preconditionSnapshotIdentity: preconditions.preconditionSnapshotIdentity,
    compositionHeadIdentity: preconditions.compositionHeadIdentity,
    resultingCommitSha: preconditions.resultingCommitSha,
    resultingTreeHash: preconditions.resultingTreeHash,
    baselineSha: preconditions.baselineSha,
    armFreezeSha: preconditions.armFreezeSha,
    inputIdentity: preconditions.inputIdentity,
    modelIdentity: preconditions.modelIdentity,
    subjectIdentity: preconditions.subjectIdentity,
    toolIdentity: preconditions.toolIdentity,
    deadlineMs: 120000 as const,
  };
  return immutable({ ...body, requestIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-attempt-request.v1").sha256 });
}

function verifyWorktree(receipt: WorktreeExecutionReceipt, request: SkeletonAttemptRequest): Result<void, DomainFailure> {
  if (!exact(receipt, WORKTREE_KEYS)) return { ok: false, error: domainFailure("PRECONDITION", "worktree receipt schema is not closed") };
  const { receiptIdentity, ...body } = receipt;
  if (
    !sha(receiptIdentity) ||
    canonicalIdentity(body, "amadeus.formal-verif.skeleton-worktree-receipt.v1").sha256 !== receiptIdentity ||
    receipt.compositionHeadIdentity !== request.compositionHeadIdentity ||
    receipt.expectedCommitSha !== request.resultingCommitSha ||
    receipt.actualHeadSha !== request.resultingCommitSha ||
    receipt.expectedTreeHash !== request.resultingTreeHash ||
    receipt.actualTreeHash !== request.resultingTreeHash ||
    receipt.clean !== true ||
    !isUtcInstant(receipt.verifiedImmediatelyBefore)
  ) {
    return { ok: false, error: domainFailure("PRECONDITION", "worktree HEAD, tree, clean, or receipt identity drifted", [request.preconditionSnapshotIdentity]) };
  }
  return { ok: true, value: undefined };
}

function observationBindingValid(observation: SkeletonAttemptObservation, request: SkeletonAttemptRequest): boolean {
  return [
    observation.requestIdentity === request.requestIdentity,
    observation.runNo === request.runNo,
    observation.purpose === "SKELETON",
    observation.modelIdentity === request.modelIdentity,
    observation.subjectIdentity === request.subjectIdentity,
    observation.toolIdentity === request.toolIdentity,
    observation.inputIdentity === request.inputIdentity,
  ].every(Boolean);
}

function proofCellBindingValid(proof: VerifiedEvidenceProof, request: SkeletonAttemptRequest): boolean {
  return [
    proof.cellKey.arm === "tla",
    proof.cellKey.subject === "fx-1252",
    proof.cellKey.sample.kind === "MEASURED",
    proof.cellKey.sample.runNo === request.runNo,
    proof.inputSetHash === request.inputIdentity,
    proof.result.arm === "tla",
    proof.result.fixtureId === "fx-1252",
    proof.result.baselineSha === request.baselineSha,
    proof.result.armSha === request.armFreezeSha,
  ].every(Boolean);
}

function verdictFailure(proof: VerifiedEvidenceProof): DomainFailure | null {
  if (proof.result.verdict === "NOT_DETECTED") return domainFailure("NOT_DETECTED", "risk-first defect was not detected", [proof.bundleId]);
  if (proof.result.verdict === "HARNESS_ERROR") return domainFailure("HARNESS_ERROR", "risk-first execution produced a harness error", [proof.bundleId]);
  return null;
}

function traceValid(observation: SkeletonAttemptObservation, proof: VerifiedEvidenceProof): boolean {
  return observation.violatedInvariant === "InvalidTimestampRejected" && observation.traceComplete === true && proof.result.exitCode === 12 && sha(proof.result.counterexampleId);
}

function proofMetadataValid(proof: VerifiedEvidenceProof, request: SkeletonAttemptRequest): boolean {
  return (
    exact(proof.result.toolVersions, ["identity"]) &&
    proof.result.toolVersions.identity === request.toolIdentity &&
    exact(proof.result.seedOrBound, ["modelIdentity"]) &&
    proof.result.seedOrBound.modelIdentity === request.modelIdentity
  );
}

function attemptReceiptValid(observation: SkeletonAttemptObservation, proof: VerifiedEvidenceProof): boolean {
  const identities = [
    observation.commandIdentity,
    observation.processReceiptIdentity,
    observation.stdoutIdentity,
    observation.stderrIdentity,
    proof.bundleId,
    proof.receipt.envelopeHash,
    proof.receipt.runnerHead,
    proof.receipt.storeHead,
  ];
  return identities.every(sha) && nonNegativeInteger(observation.durationMs) && observation.durationMs <= 120000;
}

function buildAttempt(observation: SkeletonAttemptObservation, request: SkeletonAttemptRequest, proof: VerifiedEvidenceProof): SkeletonAttempt {
  const counterexampleIdentity = proof.result.counterexampleId as string;
  const cellResultIdentity = canonicalIdentity(proof.result, "amadeus.formal-verif.cell-result.v1").sha256;
  const evidenceReceiptIdentity = canonicalIdentity(proof.receipt, "amadeus.formal-verif.verified-execution-receipt.v1").sha256;
  const semanticIdentity = canonicalIdentity(
    {
      counterexampleIdentity,
      modelIdentity: request.modelIdentity,
      subjectIdentity: request.subjectIdentity,
      toolIdentity: request.toolIdentity,
      inputIdentity: request.inputIdentity,
    },
    "amadeus.formal-verif.skeleton-semantic-tuple.v1",
  ).sha256;
  const body = {
    runNo: request.runNo,
    purpose: "SKELETON" as const,
    requestIdentity: request.requestIdentity,
    preconditionSnapshotIdentity: request.preconditionSnapshotIdentity,
    compositionHeadIdentity: request.compositionHeadIdentity,
    resultingCommitSha: request.resultingCommitSha,
    worktreeReceiptIdentity: observation.worktree.receiptIdentity,
    inputIdentity: request.inputIdentity,
    commandIdentity: observation.commandIdentity,
    processReceiptIdentity: observation.processReceiptIdentity,
    cellResultIdentity,
    bundleId: proof.bundleId,
    evidenceReceiptIdentity,
    counterexampleIdentity,
    stdoutIdentity: observation.stdoutIdentity,
    stderrIdentity: observation.stderrIdentity,
    modelIdentity: request.modelIdentity,
    subjectIdentity: request.subjectIdentity,
    toolIdentity: request.toolIdentity,
    semanticIdentity,
    durationMs: observation.durationMs,
  };
  return immutable({ ...body, attemptIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-attempt.v1").sha256 });
}

function verifyAttempt(observation: SkeletonAttemptObservation, request: SkeletonAttemptRequest): Result<SkeletonAttempt, DomainFailure> {
  const requestPartial = [request.requestIdentity];
  if (!exact(observation, ATTEMPT_OBSERVATION_KEYS)) return { ok: false, error: domainFailure("EVIDENCE", "attempt observation schema is not closed", requestPartial) };
  if (!observationBindingValid(observation, request)) return { ok: false, error: domainFailure("EVIDENCE", "attempt identity binding drifted", requestPartial) };
  const worktree = verifyWorktree(observation.worktree, request);
  if (!worktree.ok) return worktree;
  if (!isVerifiedEvidenceProof(observation.proof)) return { ok: false, error: domainFailure("EVIDENCE", "attempt lacks a store-issued evidence proof", requestPartial) };
  const proof = observation.proof;
  if (!proofCellBindingValid(proof, request)) return { ok: false, error: domainFailure("EVIDENCE", "evidence proof does not bind the requested cell", requestPartial) };
  const verdict = verdictFailure(proof);
  if (verdict) return { ok: false, error: verdict };
  if (!traceValid(observation, proof)) return { ok: false, error: domainFailure("TRACE", "DETECTED result lacks the named complete counterexample", [proof.bundleId]) };
  if (!proofMetadataValid(proof, request)) return { ok: false, error: domainFailure("EVIDENCE", "model or tool metadata drifted", [proof.bundleId]) };
  if (!attemptReceiptValid(observation, proof)) return { ok: false, error: domainFailure("EVIDENCE", "attempt receipt identity or duration is invalid", [proof.bundleId]) };
  return { ok: true, value: buildAttempt(observation, request, proof) };
}

function replayBindingsMatch(first: SkeletonAttempt, second: SkeletonAttempt): boolean {
  return [
    first.semanticIdentity === second.semanticIdentity,
    first.counterexampleIdentity === second.counterexampleIdentity,
    first.preconditionSnapshotIdentity === second.preconditionSnapshotIdentity,
    first.compositionHeadIdentity === second.compositionHeadIdentity,
    first.inputIdentity === second.inputIdentity,
    first.modelIdentity === second.modelIdentity,
    first.subjectIdentity === second.subjectIdentity,
    first.toolIdentity === second.toolIdentity,
  ].every(Boolean);
}

function verifyReplay(attempts: readonly SkeletonAttempt[]): Result<{ attempts: readonly SkeletonAttempt[]; evidenceIdentity: string; semanticIdentity: string }, DomainFailure> {
  if (attempts.length !== 2 || attempts[0]?.runNo !== 1 || attempts[1]?.runNo !== 2) {
    return { ok: false, error: domainFailure("NON_DETERMINISTIC", "local replay must contain attempts 1 and 2 exactly once") };
  }
  const [first, second] = attempts as readonly [SkeletonAttempt, SkeletonAttempt];
  if (first.bundleId === second.bundleId || first.attemptIdentity === second.attemptIdentity) {
    return { ok: false, error: domainFailure("EVIDENCE", "local attempts must have distinct evidence identities", [first.bundleId, second.bundleId]) };
  }
  if (!replayBindingsMatch(first, second)) {
    return { ok: false, error: domainFailure("NON_DETERMINISTIC", "local attempts do not share one semantic tuple", [first.attemptIdentity, second.attemptIdentity]) };
  }
  const evidenceIdentity = canonicalIdentity(
    { attemptIdentities: attempts.map((attempt) => attempt.attemptIdentity), semanticIdentity: first.semanticIdentity },
    "amadeus.formal-verif.skeleton-local-evidence.v1",
  ).sha256;
  return { ok: true, value: { attempts: Object.freeze([...attempts]), evidenceIdentity, semanticIdentity: first.semanticIdentity } };
}

function executionManifest(
  preconditions: VerifiedSkeletonPreconditions,
  replay: { attempts: readonly SkeletonAttempt[]; evidenceIdentity: string; semanticIdentity: string },
): SkeletonExecutionManifest {
  const body = {
    schemaVersion: 1 as const,
    revisionIdentity: preconditions.revisionIdentity,
    preconditionSnapshotIdentity: preconditions.preconditionSnapshotIdentity,
    tFrozenEventId: preconditions.tFrozenEventId,
    disclosureGrantIdentity: preconditions.disclosureGrantIdentity,
    materializationReceiptIdentity: preconditions.materializationReceiptIdentity,
    compositionHeadIdentity: preconditions.compositionHeadIdentity,
    resultingCommitSha: preconditions.resultingCommitSha,
    inputIdentity: preconditions.inputIdentity,
    localEvidenceIdentity: replay.evidenceIdentity,
    localAttempts: replay.attempts,
    semanticIdentity: replay.semanticIdentity,
    expectedCiAttemptKeys: Object.freeze([1, 2]) as readonly [1, 2],
    artifactSchemaIdentity: ARTIFACT_SCHEMA_IDENTITY,
    ciTrust: preconditions.ciTrust,
    nonBenchmark: true as const,
  };
  return immutable({
    ...body,
    executionManifestIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-execution-manifest.v1").sha256,
  });
}

export class TlaSkeletonCoordinator {
  constructor(
    private readonly attempts: SkeletonAttemptPort,
    private readonly ci: SkeletonCiPort,
    private readonly preconditions: SkeletonPreconditionSourcePort,
  ) {}

  async prepare(revisionIdentity: string): Promise<Result<SkeletonReadyPrecondition | SkeletonFailureDraft, SkeletonExternalError>> {
    if (!sha(revisionIdentity)) return { ok: true, value: failureDraft(domainFailure("PRECONDITION", "revision identity is not SHA-256")) };
    let source: Result<SkeletonPreconditionInput, SkeletonPortError>;
    try {
      source = await this.preconditions.read(revisionIdentity);
    } catch (cause) {
      return { ok: false, error: thrown("PRECONDITION", cause) };
    }
    if (!source.ok) return { ok: false, error: external("PRECONDITION", source.error) };
    if (source.value.revisionIdentity !== revisionIdentity) return { ok: true, value: failureDraft(domainFailure("PRECONDITION", "precondition source returned a different revision")) };
    const checked = verifyPreconditions(source.value);
    if (!checked.ok) return { ok: true, value: failureDraft(checked.error) };
    const ready = immutable({ kind: "SkeletonReadyPrecondition" as const, preconditionSnapshotIdentity: checked.value.preconditionSnapshotIdentity });
    ISSUED_PRECONDITIONS.set(ready, checked.value);
    return { ok: true, value: ready };
  }

  async run(ready: SkeletonReadyPrecondition): Promise<Result<SkeletonOutcomeDraft, SkeletonExternalError>> {
    const checked = typeof ready === "object" && ready !== null ? ISSUED_PRECONDITIONS.get(ready) : undefined;
    if (!checked) return { ok: true, value: failureDraft(domainFailure("PRECONDITION", "precondition capability was not issued by this module")) };
    ISSUED_PRECONDITIONS.delete(ready);
    const completed: SkeletonAttempt[] = [];
    for (const runNo of [1, 2] as const) {
      const request = attemptRequest(checked, runNo);
      let observed: Result<SkeletonAttemptObservation, SkeletonPortError>;
      try {
        observed = await this.attempts.execute(request);
      } catch (cause) {
        return { ok: false, error: thrown("ATTEMPT", cause) };
      }
      if (!observed.ok) return { ok: false, error: external("ATTEMPT", observed.error) };
      const verified = verifyAttempt(observed.value, request);
      if (!verified.ok) return { ok: true, value: failureDraft(verified.error) };
      completed.push(verified.value);
    }
    const replay = verifyReplay(completed);
    if (!replay.ok) return { ok: true, value: failureDraft(replay.error) };
    const manifest = executionManifest(checked, replay.value);
    let observedCi: Result<SkeletonCiObservation, SkeletonPortError>;
    try {
      observedCi = await this.ci.collect(manifest);
    } catch (cause) {
      return { ok: false, error: thrown("CI", cause) };
    }
    if (!observedCi.ok) return { ok: false, error: external("CI", observedCi.error) };
    const closed = verifySkeletonCiAndClose(observedCi.value, manifest);
    if (!closed.ok) return { ok: true, value: failureDraft(closed.error) };
    ISSUED_OUTCOMES.add(closed.value);
    return { ok: true, value: closed.value };
  }
}

function provenanceError(operation: SkeletonExternalError["operation"], error: ProvenanceError): SkeletonExternalError {
  return {
    kind: "SkeletonCommitError",
    operation,
    message: error.message,
    causeIdentity: canonicalIdentity(error, "amadeus.formal-verif.skeleton-provenance-error.v1").sha256,
  };
}

function commitContextLedger(context: SkeletonCommitContext): Result<FoldedLedger, SkeletonExternalError> {
  const folded = foldLedger(context.ledger.events);
  if (!folded.ok) return { ok: false, error: provenanceError("PROVENANCE_APPEND", folded.error) };
  const ledgerMatches = folded.value.state === "SKELETON_REVEALED" && folded.value.head !== null && folded.value.head === context.ledger.head;
  const scalarsValid = [
    sha(context.expectedStoreHead),
    sha(context.publicInputHash),
    sha(context.baseSha),
    isUtcInstant(context.at),
    nonNegativeInteger(context.sequence),
    context.sequence > (folded.value.events.at(-1)?.sequence ?? -1),
    context.actorId.length > 0,
    context.sessionId.length > 0,
    context.worktree.length > 0,
  ].every(Boolean);
  return ledgerMatches && scalarsValid
    ? { ok: true, value: folded.value }
    : { ok: false, error: { kind: "SkeletonCommitError", operation: "PROVENANCE_APPEND", message: "skeleton outcome context is not bound to the revealed ledger and store heads" } };
}

function outcomePayload(outcome: SkeletonOutcomeDraft, context: SkeletonCommitContext) {
  const eventBody = {
    kind: outcome.kind === "SkeletonPassDraft" ? "SKELETON_PASSED" : "SKELETON_FAILED",
    expectedStoreHead: context.expectedStoreHead,
    ledgerHead: context.ledger.head,
    outcomeIdentity: outcome.kind === "SkeletonPassDraft" ? outcome.outcomeIdentity : outcome.failureIdentity,
    evidenceBundleHash: outcome.evidenceBundleHash,
    at: context.at,
    sequence: context.sequence,
    actorId: context.actorId,
    sessionId: context.sessionId,
    worktree: context.worktree,
    baseSha: context.baseSha,
    publicInputHash: context.publicInputHash,
  };
  const base = {
    eventId: canonicalIdentity(eventBody, "amadeus.formal-verif.skeleton-outcome-event.v1").sha256,
    at: context.at,
    sequence: context.sequence,
    actorId: context.actorId,
    sessionId: context.sessionId,
    worktree: context.worktree,
    baseSha: context.baseSha,
    publicInputHash: context.publicInputHash,
  };
  return outcome.kind === "SkeletonPassDraft"
    ? ({ ...base, kind: "SKELETON_PASSED", cellResultIdentity: outcome.summary.summaryIdentity, evidenceBundleHash: outcome.evidenceBundleHash } as const)
    : ({ ...base, kind: "SKELETON_FAILED", reason: outcome.reason, evidenceBundleHash: outcome.evidenceBundleHash } as const);
}

async function appendOutcome(store: ProvenanceStorePort, head: string, transactionId: string, events: readonly ProvenanceEvent[]): Promise<Result<CommitReceipt, ProvenanceError | SkeletonExternalError>> {
  try {
    return await store.appendBatch(head, transactionId, events);
  } catch (cause) {
    return { ok: false, error: thrown("PROVENANCE_APPEND", cause) };
  }
}

export async function commitSkeletonOutcome(
  outcome: SkeletonOutcomeDraft,
  context: SkeletonCommitContext,
  store: ProvenanceStorePort,
): Promise<Result<SkeletonCommitReceipt, SkeletonExternalError>> {
  if (!ISSUED_OUTCOMES.has(outcome)) return { ok: false, error: { kind: "SkeletonCommitError", operation: "PROVENANCE_APPEND", message: "skeleton outcome was not issued by this coordinator module" } };
  const checked = commitContextLedger(context);
  if (!checked.ok) return checked;
  const payload = outcomePayload(outcome, context);
  const transaction = createTransaction(context.expectedStoreHead, [payload]);
  const wrap = (commit: CommitReceipt, recovered: boolean): Result<SkeletonCommitReceipt, SkeletonExternalError> => {
    const value = immutable({ outcome: outcome.kind === "SkeletonPassDraft" ? "pass" as const : "fail" as const, eventId: payload.eventId, transactionId: transaction.transactionId, commit, recovered });
    ISSUED_COMMITS.add(value);
    return { ok: true, value };
  };
  const first = await appendOutcome(store, context.expectedStoreHead, transaction.transactionId, transaction.events);
  if (first.ok) return wrap(first.value, false);
  if (first.error.kind === "SkeletonCommitError") return { ok: false, error: first.error };
  if (first.error.kind !== "CommitUnknownError") return { ok: false, error: provenanceError("PROVENANCE_APPEND", first.error) };
  let found: Result<CommitReceipt | null, ProvenanceError>;
  try {
    found = await store.findTransaction(transaction.transactionId);
  } catch (cause) {
    return { ok: false, error: thrown("PROVENANCE_LOOKUP", cause) };
  }
  if (!found.ok) return { ok: false, error: provenanceError("PROVENANCE_LOOKUP", found.error) };
  if (found.value) return wrap(found.value, true);
  const retried = await appendOutcome(store, context.expectedStoreHead, transaction.transactionId, transaction.events);
  if (retried.ok) return wrap(retried.value, true);
  return { ok: false, error: retried.error.kind === "SkeletonCommitError" ? retried.error : provenanceError("PROVENANCE_APPEND", retried.error) };
}

export async function verifySkeletonStop(
  receipt: SkeletonCommitReceipt,
  source: SkeletonPostFailureSourcePort,
): Promise<Result<SkeletonStopReceipt, SkeletonExternalError | { kind: "StopError"; message: string }>> {
  if (!ISSUED_COMMITS.has(receipt) || receipt.outcome !== "fail" || receipt.commit.transactionId !== receipt.transactionId || receipt.commit.eventIds.length !== 1 || receipt.commit.eventIds[0] !== receipt.eventId) return { ok: false, error: { kind: "StopError", message: "stop proof requires an issued failure commit receipt" } };
  let suffix: Result<readonly SkeletonPostFailureActivity[], SkeletonPortError>;
  try {
    suffix = await source.readSuffix(receipt.eventId, receipt.commit.head);
  } catch (cause) {
    return { ok: false, error: thrown("PROVENANCE_LOOKUP", cause) };
  }
  if (!suffix.ok) return { ok: false, error: external("PROVENANCE_LOOKUP", suffix.error) };
  const malformed = suffix.value.some((activity) => !exact(activity, ["kind", "afterEventId", "activityIdentity"]) || !sha(activity.afterEventId) || !sha(activity.activityIdentity) || !["ARM_S_STARTED", "FIXTURE_REVEALED", "PROMOTION_REQUESTED", "BENCHMARK_STARTED"].includes(activity.kind));
  if (malformed) return { ok: false, error: { kind: "StopError", message: "stop evidence schema is invalid" } };
  if (suffix.value.length > 0) return { ok: false, error: { kind: "StopError", message: "forbidden fan-out occurred after skeleton failure" } };
  const failureEventId = receipt.eventId;
  const inspectedSuffixIdentity = canonicalIdentity({ failureEventId, committedHead: receipt.commit.head, activities: suffix.value }, "amadeus.formal-verif.skeleton-post-failure-activities.v1").sha256;
  const body = { failureEventId, inspectedSuffixIdentity, forbiddenCount: 0 as const };
  return { ok: true, value: immutable({ ...body, stopReceiptIdentity: canonicalIdentity(body, "amadeus.formal-verif.skeleton-stop-receipt.v1").sha256 }) };
}
