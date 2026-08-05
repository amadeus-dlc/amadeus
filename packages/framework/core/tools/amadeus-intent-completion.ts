// Credential-attested five-harness live verification (#2067).
//
// Core owns cohort/receipt verification invariants. Harness adapters own only
// credential authorization and native observation. No GitHub, PR, merge,
// deployment, runner, or supervisor semantics belong here.

import {
  canonicalContractValueDigest,
  canonicalTupleDigest,
  type ContractErrorCode,
  type ContractResult,
} from "./amadeus-autonomy-review.ts";
import {
  assertLegalAutonomyProjection,
  type AutonomyProjection,
  type IntentGrant,
  type WorkflowResult,
} from "./amadeus-intent-autonomy.ts";
import type { LiveAuthorizationPort } from "./amadeus-loop-monitor-runtime.ts";
import {
  HARNESS_REGISTRY,
  type HarnessDescriptor,
  type ValidatedHarnessRegistry,
} from "./amadeus-harness-registry.ts";
import type { ReviewIntentSeed } from "./amadeus-autonomy-review.ts";

export type StableId = string;
export type Sha256Digest = string;
export type CompletionHarnessId = HarnessDescriptor["id"];
// Live verification is optional evidence. The production workflow completion
// path must never import this module or wait for a receipt cohort.
export const CORE_INTENT_COMPLETION_REQUIRES_LIVE_RECEIPTS = false as const;

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;

function success<T>(value: T): ContractResult<T> {
  return { ok: true, value };
}

function failure(code: ContractErrorCode, locus: string, detail: string): ContractResult<never> {
  return { ok: false, error: { code, locus, detail } };
}

function compareUtf8(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function digest(schema: string, value: unknown): ContractResult<Sha256Digest> {
  return canonicalContractValueDigest(schema, value);
}

function stableId(prefix: string, domain: string, atoms: readonly { tag: string; value: string | null }[]): StableId {
  return `${prefix}-${canonicalTupleDigest(domain, atoms).slice("sha256:".length, "sha256:".length + 32)}`;
}

function sameRevision(left: LiveScenarioRevision, right: LiveScenarioRevision): boolean {
  return left.implementationRevision === right.implementationRevision &&
    left.packageDigest === right.packageDigest &&
    left.registryDigest === right.registryDigest &&
    left.scenarioDigest === right.scenarioDigest;
}

function validRevision(revision: LiveScenarioRevision): boolean {
  return SAFE_ID.test(revision.implementationRevision) && SHA256.test(revision.packageDigest) &&
    SHA256.test(revision.registryDigest) && SHA256.test(revision.scenarioDigest);
}

function exactlyKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const observed = Object.keys(value).sort(compareUtf8);
  const wanted = [...expected].sort(compareUtf8);
  return observed.length === wanted.length &&
    observed.every((field, index) => field === wanted[index]);
}

export interface AuditEventPlan {
  readonly eventType: string;
  readonly eventIdentity: StableId;
  readonly intentUuid: StableId;
  readonly fields: Readonly<Record<string, string>>;
  readonly payloadDigest: Sha256Digest;
}

export interface CanonicalAuditEvent extends AuditEventPlan {
  readonly transactionId: StableId;
  readonly auditRevision: number;
}

export interface AuditTransaction {
  readonly transactionId: StableId;
  readonly expectedRevision: number;
}

export interface AuditCommitReceipt {
  readonly transactionId: StableId;
  readonly committedEventIdentities: readonly StableId[];
  readonly auditRevision: number;
  readonly stateProjectionRevision: number;
}

export interface RevisionBinding {
  readonly implementationRevision: StableId;
  readonly packageDigest: Sha256Digest;
}

export interface LiveScenarioRevision extends RevisionBinding {
  readonly registryDigest: Sha256Digest;
  readonly scenarioDigest: Sha256Digest;
}

export interface RequiredCompletionCohort {
  readonly schemaVersion: "1";
  readonly cohortId: "intent-autonomy-live";
  readonly harnessIds: readonly CompletionHarnessId[];
  readonly registryDigest: Sha256Digest;
  readonly cohortDigest: Sha256Digest;
}

function registryRows(registry: ValidatedHarnessRegistry): readonly HarnessDescriptor[] {
  return [...registry.descriptors].sort((left, right) => compareUtf8(left.id, right.id));
}

export function validateHarnessRegistry(
  descriptors: readonly HarnessDescriptor[] = HARNESS_REGISTRY,
): ContractResult<ValidatedHarnessRegistry> {
  if (descriptors.length === 0) return failure("MALFORMED", "registry", "harness registry is empty");
  const ids = descriptors.map((descriptor) => descriptor.id);
  if (ids.some((id) => !SAFE_ID.test(id)) || new Set(ids).size !== ids.length) {
    return failure("MALFORMED", "registry", "harness ids must be safe and unique");
  }
  const sorted = [...descriptors].sort((left, right) => compareUtf8(left.id, right.id));
  const registryDigest = digest("harness-registry", sorted);
  return registryDigest.ok
    ? success({ descriptors: sorted, registryDigest: registryDigest.value })
    : registryDigest;
}

export function resolveRequiredCompletionCohort(
  registry: ValidatedHarnessRegistry,
): ContractResult<RequiredCompletionCohort> {
  if (!SHA256.test(registry.registryDigest)) return failure("MALFORMED", "registryDigest", "invalid registry digest");
  const eligible = registryRows(registry).filter((descriptor) => descriptor.packageFace &&
    descriptor.autonomyContract && descriptor.autonomyLive &&
    descriptor.native.liveAuthorization === "credential-attested" &&
    descriptor.native.judgeReplay === "invoke-once");
  const harnessIds = eligible.map((descriptor) => descriptor.id);
  if (harnessIds.length === 0 || new Set(harnessIds).size !== harnessIds.length) {
    return failure("MALFORMED", "cohort", "completion cohort must be non-empty and unique");
  }
  const cohortDigest = digest("completion-cohort", {
    schemaVersion: "1",
    cohortId: "intent-autonomy-live",
    registryDigest: registry.registryDigest,
    harnessIds,
  });
  return cohortDigest.ok ? success({
    schemaVersion: "1",
    cohortId: "intent-autonomy-live",
    harnessIds,
    registryDigest: registry.registryDigest,
    cohortDigest: cohortDigest.value,
  }) : cohortDigest;
}

export interface IntentLiveExecutionAuthorization {
  readonly schemaVersion: "1";
  readonly authorizationId: StableId;
  readonly providerAuthorizationId: StableId;
  readonly intentUuid: StableId;
  readonly harnessId: CompletionHarnessId;
  readonly cohortDigest: Sha256Digest;
  readonly revision: LiveScenarioRevision;
  readonly environmentId: StableId;
  readonly issuerPrincipalId: StableId;
  readonly actorId: StableId;
  readonly traceId: StableId;
  readonly spanId: StableId;
  readonly attestationDigest: Sha256Digest;
  readonly authorizationPayloadDigest: Sha256Digest;
}

export type IntentLiveAuthorizationEventPlan = AuditEventPlan & { readonly eventType: "LIVE_SMOKE_AUTHORIZED" };

export interface CommittedIntentLiveExecutionAuthorization extends IntentLiveExecutionAuthorization {
  readonly authorizationEventIdentity: StableId;
  readonly commitReceipt: AuditCommitReceipt;
}

function authorizationPayload(
  input: Omit<IntentLiveExecutionAuthorization, "authorizationPayloadDigest">,
): Record<string, unknown> {
  return {
    schemaVersion: input.schemaVersion,
    authorizationId: input.authorizationId,
    providerAuthorizationId: input.providerAuthorizationId,
    intentUuid: input.intentUuid,
    harnessId: input.harnessId,
    cohortDigest: input.cohortDigest,
    implementationRevision: input.revision.implementationRevision,
    packageDigest: input.revision.packageDigest,
    registryDigest: input.revision.registryDigest,
    scenarioDigest: input.revision.scenarioDigest,
    environmentId: input.environmentId,
    issuerPrincipalId: input.issuerPrincipalId,
    actorId: input.actorId,
    traceId: input.traceId,
    spanId: input.spanId,
    attestationDigest: input.attestationDigest,
  };
}

export interface IntentLiveAuthorizationService {
  authorize(input: {
    readonly intentUuid: StableId;
    readonly harnessId: CompletionHarnessId;
    readonly revision: LiveScenarioRevision;
    readonly cohort: RequiredCompletionCohort;
    readonly registry: ValidatedHarnessRegistry;
  }): Promise<ContractResult<{
    readonly authorization: IntentLiveExecutionAuthorization;
    readonly audit: readonly [IntentLiveAuthorizationEventPlan];
  }>>;
  bindCommit(input: {
    readonly authorization: IntentLiveExecutionAuthorization;
    readonly audit: readonly [IntentLiveAuthorizationEventPlan];
    readonly receipt: AuditCommitReceipt;
  }): ContractResult<CommittedIntentLiveExecutionAuthorization>;
}

export function createIntentLiveAuthorizationService(deps: {
  readonly port: LiveAuthorizationPort;
}): IntentLiveAuthorizationService {
  return {
    async authorize(input) {
      const descriptor = input.registry.descriptors.find((candidate) => candidate.id === input.harnessId);
      if (!SAFE_ID.test(input.intentUuid) || !validRevision(input.revision) ||
        input.revision.registryDigest !== input.registry.registryDigest ||
        input.cohort.registryDigest !== input.registry.registryDigest ||
        !input.cohort.harnessIds.includes(input.harnessId) || descriptor === undefined || !descriptor.autonomyLive) {
        return failure("MALFORMED", "authorization", "intent, revision, registry, or cohort binding is invalid");
      }
      const authorized = await deps.port.authorize({
        intentUuid: input.intentUuid,
        monitorId: `intent-completion:${input.harnessId}`,
        scopeDigest: input.cohort.cohortDigest,
        harnessId: input.harnessId,
        ...input.revision,
      });
      if (!authorized.authorized) return failure("PROVENANCE_REQUIRED", "credential", authorized.reason);
      const safeValues = [authorized.authorizationId, authorized.actorId, authorized.environmentId,
        authorized.issuerPrincipalId, authorized.traceId, authorized.spanId];
      if (safeValues.some((value) => value === undefined || !SAFE_ID.test(value)) ||
        authorized.attestationDigest === undefined || !SHA256.test(authorized.attestationDigest)) {
        return failure("PROVENANCE_REQUIRED", "attestation", "credential-attested authorization metadata is incomplete");
      }
      const authorizationId = stableId("live-authorization", "amadeus.live-authorization.v1", [
        { tag: "provider-authorization", value: authorized.authorizationId },
        { tag: "intent", value: input.intentUuid },
        { tag: "harness", value: input.harnessId },
        { tag: "cohort", value: input.cohort.cohortDigest },
        { tag: "implementation", value: input.revision.implementationRevision },
        { tag: "package", value: input.revision.packageDigest },
        { tag: "registry", value: input.revision.registryDigest },
        { tag: "scenario", value: input.revision.scenarioDigest },
        { tag: "environment", value: authorized.environmentId as string },
        { tag: "attestation", value: authorized.attestationDigest },
      ]);
      const base = {
        schemaVersion: "1" as const,
        authorizationId,
        providerAuthorizationId: authorized.authorizationId,
        intentUuid: input.intentUuid,
        harnessId: input.harnessId,
        cohortDigest: input.cohort.cohortDigest,
        revision: { ...input.revision },
        environmentId: authorized.environmentId as string,
        issuerPrincipalId: authorized.issuerPrincipalId as string,
        actorId: authorized.actorId,
        traceId: authorized.traceId as string,
        spanId: authorized.spanId as string,
        attestationDigest: authorized.attestationDigest,
      };
      const payloadDigest = digest("live-authorization-payload", authorizationPayload(base));
      if (!payloadDigest.ok) return payloadDigest;
      const authorization: IntentLiveExecutionAuthorization = {
        ...base,
        authorizationPayloadDigest: payloadDigest.value,
      };
      const eventIdentity = stableId("live-authorization-event", "amadeus.live-authorization-event.v1", [
        { tag: "authorization", value: authorization.authorizationId },
        { tag: "payload", value: authorization.authorizationPayloadDigest },
      ]);
      return success({ authorization, audit: [{
        eventType: "LIVE_SMOKE_AUTHORIZED",
        eventIdentity,
        intentUuid: input.intentUuid,
        fields: { payload_v1: JSON.stringify({ ...authorizationPayload(base), authorizationPayloadDigest: payloadDigest.value }) },
        payloadDigest: payloadDigest.value,
      }] });
    },
    bindCommit(input) {
      const event = input.audit[0];
      if (event.intentUuid !== input.authorization.intentUuid ||
        !input.receipt.committedEventIdentities.includes(event.eventIdentity) ||
        !SAFE_ID.test(input.receipt.transactionId)) {
        return failure("PROVENANCE_REQUIRED", "authorizationCommit", "authorization event is not committed");
      }
      return success({
        ...input.authorization,
        authorizationEventIdentity: event.eventIdentity,
        commitReceipt: input.receipt,
      });
    },
  };
}

export interface LiveObservation {
  readonly judgeInvocationId: StableId;
  readonly judgeObserved: true;
  readonly electionDecisionId: StableId;
  readonly electionOutcome: "elected" | "loud-degradation";
  readonly degradationReason: StableId | null;
}

export interface RawIntentLiveReceipt {
  readonly schemaVersion: "1";
  readonly receiptId: StableId;
  readonly intentUuid: StableId;
  readonly harnessId: CompletionHarnessId;
  readonly authorizationId: StableId;
  readonly authorizationEventIdentity: StableId;
  readonly authorizationCommitTransactionId: StableId;
  readonly revision: LiveScenarioRevision;
  readonly environmentId: StableId;
  readonly traceId: StableId;
  readonly spanId: StableId;
  readonly attestationDigest: Sha256Digest;
  readonly outcome: "passed" | "skipped" | "failed";
  readonly observation: LiveObservation | null;
}

export interface IntentLiveRunReservation {
  readonly schemaVersion: "1";
  readonly runId: StableId;
  readonly operationReference: StableId;
  readonly intentUuid: StableId;
  readonly harnessId: CompletionHarnessId;
  readonly authorizationId: StableId;
  readonly judgeInvocationId: StableId;
  readonly revision: LiveScenarioRevision;
  readonly maxDispatches: 2;
  readonly dispatchesAuthorized: 1 | 2;
  readonly status: "reserved" | "started" | "redispatch-authorized" | "dispatch-claimed" | "completed" | "incomplete";
}

export type IntentLiveRunStateEventPlan = AuditEventPlan & {
  readonly eventType:
    | "LIVE_SMOKE_RUN_RESERVED"
    | "LIVE_SMOKE_RUN_STARTED"
    | "LIVE_SMOKE_RUN_REDISPATCH_AUTHORIZED"
    | "LIVE_SMOKE_RUN_DISPATCH_CLAIMED"
    | "LIVE_SMOKE_RUN_COMPLETED"
    | "LIVE_SMOKE_RUN_INCOMPLETE";
};

export type NativeRunReconciliation =
  | { readonly kind: "completed"; readonly receipt: RawIntentLiveReceipt; readonly proofDigest: Sha256Digest }
  | { readonly kind: "attested-no-effect"; readonly proofDigest: Sha256Digest }
  | { readonly kind: "effect-possible" | "unknown"; readonly proofDigest: Sha256Digest | null };

export interface CommittedIntentLiveRunState extends IntentLiveRunReservation {
  readonly stateEventIdentity: StableId;
  readonly stateCommitReceipt: AuditCommitReceipt;
  readonly sourceAuditRevision: number;
  readonly sourceStateProjectionRevision: number;
}

export interface CanonicalLiveRunSnapshot {
  readonly intentUuid: StableId;
  readonly auditRevision: number;
  readonly stateProjectionRevision: number;
  readonly authorization: CommittedIntentLiveExecutionAuthorization;
  readonly run: CommittedIntentLiveRunState;
}

export interface CanonicalLiveRunStateReader {
  readRunSnapshot(input: {
    readonly intentUuid: StableId;
    readonly runId: StableId;
  }): ContractResult<CanonicalLiveRunSnapshot>;
}

export interface AttestedNoEffectProofVerifier {
  verify(input: {
    readonly snapshot: CanonicalLiveRunSnapshot;
    readonly reconciliation: Extract<NativeRunReconciliation, { kind: "attested-no-effect" }>;
  }): ContractResult<{ readonly proofDigest: Sha256Digest }>;
}

const RUN_DISPATCH_PERMIT = Symbol("RunDispatchPermit");
const CLAIMED_RUN_DISPATCH = Symbol("ClaimedRunDispatch");

export interface RunDispatchPermit {
  readonly schemaVersion: "1";
  readonly permitId: StableId;
  readonly runId: StableId;
  readonly intentUuid: StableId;
  readonly authorizationId: StableId;
  readonly operationReference: StableId;
  readonly judgeInvocationId: StableId;
  readonly attempt: 1 | 2;
  readonly authorizedStateEventIdentity: StableId;
  readonly authorizedCommitTransactionId: StableId;
  readonly sourceAuditRevision: number;
  readonly permitDigest: Sha256Digest;
  readonly [RUN_DISPATCH_PERMIT]: true;
}

export interface ClaimedRunDispatch extends RunDispatchPermit {
  readonly claimEventIdentity: StableId;
  readonly claimCommitTransactionId: StableId;
  readonly claimAuditRevision: number;
  readonly [CLAIMED_RUN_DISPATCH]: true;
}

export interface NativeDispatchReceipt {
  readonly schemaVersion: "1";
  readonly dispatchKeyDigest: Sha256Digest;
  readonly nativeOperationId: StableId;
  readonly outcome: "started" | "attached";
  readonly proofDigest: Sha256Digest;
}

export interface IntentNativeRunPort {
  reconcile(input: {
    readonly operationReference: StableId;
    readonly judgeInvocationId: StableId;
  }): Promise<ContractResult<NativeRunReconciliation>>;
  dispatch(claimed: ClaimedRunDispatch): Promise<ContractResult<NativeDispatchReceipt>>;
}

function runStateEvent(
  run: IntentLiveRunReservation,
  previousEventIdentity: StableId | null,
  proofDigest: Sha256Digest | null,
): ContractResult<IntentLiveRunStateEventPlan> {
  const eventTypeByStatus = {
    reserved: "LIVE_SMOKE_RUN_RESERVED",
    started: "LIVE_SMOKE_RUN_STARTED",
    "redispatch-authorized": "LIVE_SMOKE_RUN_REDISPATCH_AUTHORIZED",
    "dispatch-claimed": "LIVE_SMOKE_RUN_DISPATCH_CLAIMED",
    completed: "LIVE_SMOKE_RUN_COMPLETED",
    incomplete: "LIVE_SMOKE_RUN_INCOMPLETE",
  } as const;
  const payload = { ...run, previousEventIdentity, proofDigest };
  const payloadDigest = digest("intent-live-run-state", payload);
  if (!payloadDigest.ok) return payloadDigest;
  return success({
    eventType: eventTypeByStatus[run.status],
    eventIdentity: stableId("intent-live-run-event", "amadeus.intent-live-run-event.v1", [
      { tag: "run", value: run.runId },
      { tag: "status", value: run.status },
      { tag: "dispatches", value: String(run.dispatchesAuthorized) },
      { tag: "previous", value: previousEventIdentity },
      { tag: "payload", value: payloadDigest.value },
    ]),
    intentUuid: run.intentUuid,
    fields: { payload_v1: JSON.stringify(payload) },
    payloadDigest: payloadDigest.value,
  });
}

function bindRunCommit(
  planned: IntentLiveRunReservation,
  audit: readonly [IntentLiveRunStateEventPlan],
  receipt: AuditCommitReceipt,
): ContractResult<CommittedIntentLiveRunState> {
  if (!receipt.committedEventIdentities.includes(audit[0].eventIdentity)) {
    return failure("PROVENANCE_REQUIRED", "runStateCommit", "run state event is not committed");
  }
  return success({
    ...planned,
    stateEventIdentity: audit[0].eventIdentity,
    stateCommitReceipt: receipt,
    sourceAuditRevision: receipt.auditRevision,
    sourceStateProjectionRevision: receipt.stateProjectionRevision,
  });
}

function dispatchPermit(state: CommittedIntentLiveRunState): ContractResult<RunDispatchPermit | null> {
  if (state.status !== "started" && state.status !== "redispatch-authorized") return success(null);
  const attempt: 1 | 2 = state.status === "started" ? 1 : 2;
  const permitValue = {
    schemaVersion: "1" as const,
    runId: state.runId,
    intentUuid: state.intentUuid,
    authorizationId: state.authorizationId,
    operationReference: state.operationReference,
    judgeInvocationId: state.judgeInvocationId,
    attempt,
    authorizedStateEventIdentity: state.stateEventIdentity,
    authorizedCommitTransactionId: state.stateCommitReceipt.transactionId,
    sourceAuditRevision: state.sourceAuditRevision,
  };
  const permitDigest = digest("intent-live-run-dispatch-permit", permitValue);
  if (!permitDigest.ok) return permitDigest;
  return success({
    ...permitValue,
    permitId: stableId("run-dispatch-permit", "amadeus.intent-live-run-dispatch-permit.v1", [
      { tag: "run", value: state.runId },
      { tag: "attempt", value: String(attempt) },
      { tag: "state-event", value: state.stateEventIdentity },
      { tag: "commit", value: state.stateCommitReceipt.transactionId },
      { tag: "digest", value: permitDigest.value },
    ]),
    permitDigest: permitDigest.value,
    [RUN_DISPATCH_PERMIT]: true,
  });
}

function nextRunState(
  snapshot: CanonicalLiveRunSnapshot,
  reconciliation: NativeRunReconciliation,
  proofVerifier: AttestedNoEffectProofVerifier,
): ContractResult<{ readonly next: IntentLiveRunReservation; readonly receipt: RawIntentLiveReceipt | null; readonly proofDigest: Sha256Digest | null }> {
  const run = snapshot.run;
  if (reconciliation.kind === "completed") {
    return success({ next: { ...run, status: "completed" }, receipt: reconciliation.receipt,
      proofDigest: reconciliation.proofDigest });
  }
  if (reconciliation.kind !== "attested-no-effect") {
    return success({ next: { ...run, status: "incomplete" }, receipt: null,
      proofDigest: reconciliation.proofDigest });
  }
  const proof = proofVerifier.verify({ snapshot, reconciliation });
  if (!proof.ok) return proof;
  if (run.status === "reserved") {
    return success({ next: { ...run, status: "started", dispatchesAuthorized: 1 }, receipt: null,
      proofDigest: proof.value.proofDigest });
  }
  if (run.dispatchesAuthorized < run.maxDispatches && (run.status === "started" || run.status === "dispatch-claimed")) {
    const nextAuthorized = (run.dispatchesAuthorized + 1) as IntentLiveRunReservation["dispatchesAuthorized"];
    return success({ next: { ...run, status: "redispatch-authorized", dispatchesAuthorized: nextAuthorized }, receipt: null,
      proofDigest: proof.value.proofDigest });
  }
  return success({ next: { ...run, status: "incomplete" }, receipt: null, proofDigest: proof.value.proofDigest });
}

export interface IntentLiveRunCoordinator {
  reserve(input: { readonly authorization: CommittedIntentLiveExecutionAuthorization }): ContractResult<{
    readonly reservation: IntentLiveRunReservation;
    readonly audit: readonly [IntentLiveRunStateEventPlan];
  }>;
  bindStateCommit(input: {
    readonly planned: IntentLiveRunReservation;
    readonly audit: readonly [IntentLiveRunStateEventPlan];
    readonly receipt: AuditCommitReceipt;
  }): ContractResult<CommittedIntentLiveRunState>;
  planNext(input: { readonly intentUuid: StableId; readonly runId: StableId }): Promise<ContractResult<{
    readonly prior: CommittedIntentLiveRunState;
    readonly next: IntentLiveRunReservation;
    readonly audit: readonly [IntentLiveRunStateEventPlan];
    readonly receipt: RawIntentLiveReceipt | null;
  }>>;
  bindTransitionCommit(input: {
    readonly prior: CommittedIntentLiveRunState;
    readonly next: IntentLiveRunReservation;
    readonly audit: readonly [IntentLiveRunStateEventPlan];
    readonly receipt: AuditCommitReceipt;
  }): ContractResult<{ readonly state: CommittedIntentLiveRunState; readonly dispatchPermit: RunDispatchPermit | null }>;
  claimDispatch(permit: RunDispatchPermit): ContractResult<{
    readonly prior: CommittedIntentLiveRunState;
    readonly claimed: IntentLiveRunReservation;
    readonly audit: readonly [IntentLiveRunStateEventPlan];
  }>;
  bindDispatchClaimCommit(input: {
    readonly permit: RunDispatchPermit;
    readonly prior: CommittedIntentLiveRunState;
    readonly claimed: IntentLiveRunReservation;
    readonly audit: readonly [IntentLiveRunStateEventPlan];
    readonly receipt: AuditCommitReceipt;
  }): ContractResult<ClaimedRunDispatch>;
  dispatch(claimed: ClaimedRunDispatch): Promise<ContractResult<NativeDispatchReceipt>>;
}

export function createIntentLiveRunCoordinator(deps: {
  readonly runReader: CanonicalLiveRunStateReader;
  readonly proofVerifier: AttestedNoEffectProofVerifier;
  readonly nativePort: IntentNativeRunPort;
}): IntentLiveRunCoordinator {
  return {
    reserve({ authorization }) {
      const identityAtoms = [
        { tag: "intent", value: authorization.intentUuid },
        { tag: "harness", value: authorization.harnessId },
        { tag: "authorization", value: authorization.authorizationId },
        { tag: "scenario", value: authorization.revision.scenarioDigest },
      ];
      const reservation: IntentLiveRunReservation = {
        schemaVersion: "1",
        runId: stableId("intent-live-run", "amadeus.intent-live-run.v1", identityAtoms),
        operationReference: stableId("intent-live-operation", "amadeus.intent-live-operation.v1", identityAtoms),
        intentUuid: authorization.intentUuid,
        harnessId: authorization.harnessId,
        authorizationId: authorization.authorizationId,
        judgeInvocationId: stableId("intent-live-judge", "amadeus.intent-live-judge.v1", identityAtoms),
        revision: authorization.revision,
        maxDispatches: 2,
        dispatchesAuthorized: 1,
        status: "reserved",
      };
      const audit = runStateEvent(reservation, null, null);
      return audit.ok ? success({ reservation, audit: [audit.value] }) : audit;
    },
    bindStateCommit(input) {
      return bindRunCommit(input.planned, input.audit, input.receipt);
    },
    async planNext(input) {
      const snapshot = deps.runReader.readRunSnapshot(input);
      if (!snapshot.ok) return snapshot;
      const reconciliation = await deps.nativePort.reconcile({
        operationReference: snapshot.value.run.operationReference,
        judgeInvocationId: snapshot.value.run.judgeInvocationId,
      });
      if (!reconciliation.ok) return reconciliation;
      const planned = nextRunState(snapshot.value, reconciliation.value, deps.proofVerifier);
      if (!planned.ok) return planned;
      const audit = runStateEvent(planned.value.next, snapshot.value.run.stateEventIdentity, planned.value.proofDigest);
      return audit.ok ? success({
        prior: snapshot.value.run,
        next: planned.value.next,
        audit: [audit.value],
        receipt: planned.value.receipt,
      }) : audit;
    },
    bindTransitionCommit(input) {
      if (input.prior.runId !== input.next.runId || input.prior.stateEventIdentity === input.audit[0].eventIdentity) {
        return failure("CONFLICT", "runTransition", "run transition does not advance the canonical head");
      }
      const state = bindRunCommit(input.next, input.audit, input.receipt);
      if (!state.ok) return state;
      const permit = dispatchPermit(state.value);
      return permit.ok ? success({ state: state.value, dispatchPermit: permit.value }) : permit;
    },
    claimDispatch(permit) {
      if (permit[RUN_DISPATCH_PERMIT] !== true) return failure("PROVENANCE_REQUIRED", "dispatchPermit", "unbranded permit");
      const snapshot = deps.runReader.readRunSnapshot({ intentUuid: permit.intentUuid, runId: permit.runId });
      if (!snapshot.ok) return snapshot;
      const prior = snapshot.value.run;
      const expectedStatus = permit.attempt === 1 ? "started" : "redispatch-authorized";
      if (prior.stateEventIdentity !== permit.authorizedStateEventIdentity || prior.status !== expectedStatus ||
        prior.authorizationId !== permit.authorizationId || prior.operationReference !== permit.operationReference) {
        return failure("CONFLICT", "dispatchClaim", "permit is stale, forged, or already claimed");
      }
      const claimed: IntentLiveRunReservation = { ...prior, status: "dispatch-claimed" };
      const audit = runStateEvent(claimed, prior.stateEventIdentity, permit.permitDigest);
      return audit.ok ? success({ prior, claimed, audit: [audit.value] }) : audit;
    },
    bindDispatchClaimCommit(input) {
      const state = bindRunCommit(input.claimed, input.audit, input.receipt);
      if (!state.ok) return state;
      if (state.value.status !== "dispatch-claimed") {
        return failure("CONFLICT", "dispatchClaim", "claim event did not commit dispatch-claimed state");
      }
      return success({
        ...input.permit,
        claimEventIdentity: state.value.stateEventIdentity,
        claimCommitTransactionId: state.value.stateCommitReceipt.transactionId,
        claimAuditRevision: state.value.sourceAuditRevision,
        [CLAIMED_RUN_DISPATCH]: true,
      });
    },
    async dispatch(claimed) {
      if (claimed[CLAIMED_RUN_DISPATCH] !== true) {
        return failure("PROVENANCE_REQUIRED", "claimedDispatch", "dispatch requires committed claim");
      }
      const snapshot = deps.runReader.readRunSnapshot({ intentUuid: claimed.intentUuid, runId: claimed.runId });
      if (!snapshot.ok) return snapshot;
      if (snapshot.value.run.stateEventIdentity !== claimed.claimEventIdentity ||
        snapshot.value.run.status !== "dispatch-claimed") {
        return failure("CONFLICT", "claimedDispatch", "claim is not the canonical run head");
      }
      const result = await deps.nativePort.dispatch(claimed);
      if (!result.ok) return result;
      const expectedKey = digest("intent-live-native-dispatch", {
        operationReference: claimed.operationReference,
        attempt: claimed.attempt,
      });
      if (!expectedKey.ok) return expectedKey;
      return result.value.dispatchKeyDigest === expectedKey.value && SAFE_ID.test(result.value.nativeOperationId) &&
        SHA256.test(result.value.proofDigest)
        ? result
        : failure("CONFLICT", "nativeDispatchReceipt", "native idempotency receipt does not match claim");
    },
  };
}

export interface CanonicalLiveAuthorizationSnapshot {
  readonly intentUuid: StableId;
  readonly audit: readonly CanonicalAuditEvent[];
  readonly auditRevision: number;
  readonly stateProjectionRevision: number;
  readonly authorization: CommittedIntentLiveExecutionAuthorization;
}

export interface CanonicalLiveEvidenceReader {
  readAuthorizationSnapshot(input: {
    readonly intentUuid: StableId;
    readonly authorizationId: StableId;
  }): ContractResult<CanonicalLiveAuthorizationSnapshot>;
}

export interface ValidatedIntentLiveReceipt extends RawIntentLiveReceipt {
  readonly outcome: "passed";
  readonly observation: LiveObservation;
  readonly observationProofDigest: Sha256Digest;
  readonly validationDigest: Sha256Digest;
  readonly sourceAuditRevision: number;
}

export type LiveReceiptValidatedEventPlan = AuditEventPlan & { readonly eventType: "LIVE_SMOKE_RECEIPT_VALIDATED" };

export interface PlannedValidatedIntentLiveReceipt {
  readonly receipt: ValidatedIntentLiveReceipt;
  readonly audit: readonly [LiveReceiptValidatedEventPlan];
}

export interface CommittedValidatedIntentLiveReceipt extends ValidatedIntentLiveReceipt {
  readonly validationEventIdentity: StableId;
  readonly validationCommitReceipt: AuditCommitReceipt;
}

function observedEvent(snapshot: CanonicalLiveAuthorizationSnapshot, type: string, identity: string, traceId: string): boolean {
  return snapshot.audit.some((event) => event.eventType === type && event.eventIdentity === identity &&
    event.fields.trace_id === traceId);
}

function matchingReceiptAuthorization(
  receipt: RawIntentLiveReceipt,
  snapshot: CanonicalLiveAuthorizationSnapshot,
): boolean {
  const authorization = snapshot.authorization;
  return snapshot.intentUuid === receipt.intentUuid && authorization.intentUuid === receipt.intentUuid &&
    authorization.authorizationId === receipt.authorizationId &&
    authorization.authorizationEventIdentity === receipt.authorizationEventIdentity &&
    authorization.commitReceipt.transactionId === receipt.authorizationCommitTransactionId &&
    authorization.harnessId === receipt.harnessId && sameRevision(authorization.revision, receipt.revision) &&
    authorization.environmentId === receipt.environmentId && authorization.traceId === receipt.traceId &&
    authorization.spanId === receipt.spanId && authorization.attestationDigest === receipt.attestationDigest;
}

function validObservationShape(observation: LiveObservation): boolean {
  return (observation.electionOutcome === "elected" && observation.degradationReason === null) ||
    (observation.electionOutcome === "loud-degradation" && observation.degradationReason !== null &&
      SAFE_ID.test(observation.degradationReason));
}

function canonicalObservationExists(
  snapshot: CanonicalLiveAuthorizationSnapshot,
  receipt: RawIntentLiveReceipt & { readonly observation: LiveObservation },
): boolean {
  const observation = receipt.observation;
  // A loud degradation is still recorded as AUTO_DECIDED — the canonical
  // vocabulary carries no AUTO_DECISION_DEGRADED type; degradation lives in the
  // decision's degradedCapability metadata, so both election outcomes bind to
  // the same canonical decision row.
  return observedEvent(snapshot, "LOOP_JUDGE_STARTED", observation.judgeInvocationId, receipt.traceId) &&
    observedEvent(snapshot, "LOOP_JUDGE_RESULT_OBSERVED", observation.judgeInvocationId, receipt.traceId) &&
    observedEvent(snapshot, "AUTO_DECIDED", observation.electionDecisionId, receipt.traceId);
}

export interface IntentLiveReceiptValidator {
  validate(receipt: RawIntentLiveReceipt): ContractResult<PlannedValidatedIntentLiveReceipt>;
  bindCommit(input: {
    readonly planned: PlannedValidatedIntentLiveReceipt;
    readonly receipt: AuditCommitReceipt;
  }): ContractResult<CommittedValidatedIntentLiveReceipt>;
}

export function createIntentLiveReceiptValidator(deps: {
  readonly evidenceReader: CanonicalLiveEvidenceReader;
}): IntentLiveReceiptValidator {
  return {
    validate(receipt) {
      if (receipt.outcome !== "passed" || receipt.observation === null || !receipt.observation.judgeObserved) {
        return failure("PROVENANCE_REQUIRED", "liveReceipt", "only an observed passed receipt can be validated");
      }
      const snapshot = deps.evidenceReader.readAuthorizationSnapshot({
        intentUuid: receipt.intentUuid,
        authorizationId: receipt.authorizationId,
      });
      if (!snapshot.ok) return snapshot;
      if (!matchingReceiptAuthorization(receipt, snapshot.value)) {
        return failure("CONFLICT", "authorization", "receipt does not match canonical authorization");
      }
      const observation = receipt.observation;
      const passedReceipt = { ...receipt, outcome: "passed" as const, observation };
      if (!validObservationShape(observation) || !canonicalObservationExists(snapshot.value, passedReceipt)) {
        return failure("PROVENANCE_REQUIRED", "observation", "Judge and decision observation proof is incomplete");
      }
      const proof = digest("live-observation-proof", {
        judgeInvocationId: observation.judgeInvocationId,
        electionDecisionId: observation.electionDecisionId,
        electionOutcome: observation.electionOutcome,
        degradationReason: observation.degradationReason,
        traceId: receipt.traceId,
        sourceAuditRevision: snapshot.value.auditRevision,
      });
      if (!proof.ok) return proof;
      const validation = digest("validated-live-receipt", {
        receipt,
        authorizationPayloadDigest: snapshot.value.authorization.authorizationPayloadDigest,
        observationProofDigest: proof.value,
        sourceAuditRevision: snapshot.value.auditRevision,
      });
      if (!validation.ok) return validation;
      const validated: ValidatedIntentLiveReceipt = {
        ...receipt,
        outcome: "passed",
        observation,
        observationProofDigest: proof.value,
        validationDigest: validation.value,
        sourceAuditRevision: snapshot.value.auditRevision,
      };
      const eventIdentity = stableId("live-receipt-validated", "amadeus.validated-live-receipt-event.v1", [
        { tag: "receipt", value: receipt.receiptId },
        { tag: "validation", value: validation.value },
      ]);
      return success({ receipt: validated, audit: [{
        eventType: "LIVE_SMOKE_RECEIPT_VALIDATED",
        eventIdentity,
        intentUuid: receipt.intentUuid,
        fields: { payload_v1: JSON.stringify(validated) },
        payloadDigest: validation.value,
      }] });
    },
    bindCommit(input) {
      const event = input.planned.audit[0];
      if (!input.receipt.committedEventIdentities.includes(event.eventIdentity)) {
        return failure("PROVENANCE_REQUIRED", "validationCommit", "validation event is not committed");
      }
      return success({
        ...input.planned.receipt,
        validationEventIdentity: event.eventIdentity,
        validationCommitReceipt: input.receipt,
      });
    },
  };
}

export interface CanonicalValidatedReceiptSetSnapshot {
  readonly intentUuid: StableId;
  readonly auditRevision: number;
  readonly stateProjectionRevision: number;
  readonly receipts: readonly CommittedValidatedIntentLiveReceipt[];
}

export interface CanonicalValidatedReceiptReader {
  readValidationSet(input: {
    readonly intentUuid: StableId;
    readonly validationEventIdentities: readonly StableId[];
  }): ContractResult<CanonicalValidatedReceiptSetSnapshot>;
}

export interface IntentCompletionEvidence {
  readonly schemaVersion: "1";
  readonly evidenceId: StableId;
  readonly intentUuid: StableId;
  readonly cohort: RequiredCompletionCohort;
  readonly revision: LiveScenarioRevision;
  readonly receiptIds: readonly StableId[];
  readonly authorizationIds: readonly StableId[];
  readonly validationEventIdentities: readonly StableId[];
  readonly validationDigests: readonly Sha256Digest[];
  readonly observationProofDigests: readonly Sha256Digest[];
  readonly sourceAuditRevisions: readonly number[];
  readonly evidenceDigest: Sha256Digest;
}

export type CompletionEvidenceValidatedEventPlan = AuditEventPlan & {
  readonly eventType: "LIVE_COMPLETION_EVIDENCE_VALIDATED";
};

export type IntentCompletionCheck =
  | { readonly kind: "complete"; readonly evidence: IntentCompletionEvidence }
  | {
      readonly kind: "incomplete";
      readonly intentUuid: StableId;
      readonly cohort: RequiredCompletionCohort;
      readonly revision: LiveScenarioRevision;
      readonly missingHarnessIds: readonly CompletionHarnessId[];
      readonly rejectedReceiptIds: readonly StableId[];
    };

export type IntentCompletionEvaluation =
  | {
      readonly check: Extract<IntentCompletionCheck, { kind: "complete" }>;
      readonly audit: readonly [CompletionEvidenceValidatedEventPlan];
      readonly sourceAuditRevision: number;
      readonly sourceStateProjectionRevision: number;
    }
  | {
      readonly check: Extract<IntentCompletionCheck, { kind: "incomplete" }>;
      readonly audit: readonly [];
      readonly sourceAuditRevision: number;
      readonly sourceStateProjectionRevision: number;
    };

function receiptMatchesTarget(
  receipt: CommittedValidatedIntentLiveReceipt,
  intentUuid: string,
  cohort: RequiredCompletionCohort,
  revision: LiveScenarioRevision,
): boolean {
  return receipt.intentUuid === intentUuid && cohort.harnessIds.includes(receipt.harnessId) &&
    sameRevision(receipt.revision, revision) && receipt.outcome === "passed" &&
    receipt.validationCommitReceipt.committedEventIdentities.includes(receipt.validationEventIdentity);
}

interface ClassifiedReceiptSet {
  readonly byHarness: ReadonlyMap<string, readonly CommittedValidatedIntentLiveReceipt[]>;
  readonly missing: readonly CompletionHarnessId[];
  readonly rejected: readonly StableId[];
}

function classifyReceiptSet(
  receipts: readonly CommittedValidatedIntentLiveReceipt[],
  intentUuid: string,
  cohort: RequiredCompletionCohort,
  revision: LiveScenarioRevision,
): ClassifiedReceiptSet {
  const byHarness = new Map<string, CommittedValidatedIntentLiveReceipt[]>();
  const rejected: StableId[] = [];
  for (const receipt of receipts) {
    if (!receiptMatchesTarget(receipt, intentUuid, cohort, revision)) {
      rejected.push(receipt.receiptId);
      continue;
    }
    const values = byHarness.get(receipt.harnessId) ?? [];
    values.push(receipt);
    byHarness.set(receipt.harnessId, values);
  }
  const missing = cohort.harnessIds.filter((harnessId) => (byHarness.get(harnessId)?.length ?? 0) === 0);
  const duplicates = [...byHarness.values()]
    .filter((values) => values.length > 1)
    .flatMap((values) => values.map((receipt) => receipt.receiptId));
  return { byHarness, missing, rejected: [...new Set([...rejected, ...duplicates])].sort(compareUtf8) };
}

export interface IntentCompletionEvaluator {
  evaluate(input: {
    readonly intentUuid: StableId;
    readonly cohort: RequiredCompletionCohort;
    readonly revision: LiveScenarioRevision;
    readonly validationEventIdentities: readonly StableId[];
  }): ContractResult<IntentCompletionEvaluation>;
}

export function createIntentCompletionEvaluator(deps: {
  readonly receiptReader: CanonicalValidatedReceiptReader;
}): IntentCompletionEvaluator {
  return {
    evaluate(input) {
      if (!SAFE_ID.test(input.intentUuid) || !validRevision(input.revision) ||
        input.revision.registryDigest !== input.cohort.registryDigest) {
        return failure("MALFORMED", "completionInput", "invalid completion binding");
      }
      const snapshot = deps.receiptReader.readValidationSet({
        intentUuid: input.intentUuid,
        validationEventIdentities: input.validationEventIdentities,
      });
      if (!snapshot.ok) return snapshot;
      // The requested identity set BOUNDS the evidence: a reader that returns
      // receipts outside it cannot widen what the completion seal binds.
      const requested = new Set(input.validationEventIdentities);
      if (snapshot.value.receipts.some((receipt) => !requested.has(receipt.validationEventIdentity))) {
        return failure("CONFLICT", "validationSet", "reader returned a receipt outside the requested validation set");
      }
      const classified = classifyReceiptSet(snapshot.value.receipts, input.intentUuid, input.cohort, input.revision);
      if (classified.missing.length > 0 || classified.rejected.length > 0) return success({
        check: {
          kind: "incomplete",
          intentUuid: input.intentUuid,
          cohort: input.cohort,
          revision: input.revision,
          missingHarnessIds: classified.missing,
          rejectedReceiptIds: classified.rejected,
        },
        audit: [],
        sourceAuditRevision: snapshot.value.auditRevision,
        sourceStateProjectionRevision: snapshot.value.stateProjectionRevision,
      });
      const ordered: CommittedValidatedIntentLiveReceipt[] = [];
      for (const harnessId of input.cohort.harnessIds) {
        const receipt = classified.byHarness.get(harnessId)?.[0];
        if (receipt === undefined) {
          return failure("ILLEGAL_STATE", "completionEvidence", `classified set lost harness ${harnessId}`);
        }
        ordered.push(receipt);
      }
      const evidenceBase = {
        schemaVersion: "1" as const,
        intentUuid: input.intentUuid,
        cohort: input.cohort,
        revision: input.revision,
        receiptIds: ordered.map((receipt) => receipt.receiptId),
        authorizationIds: ordered.map((receipt) => receipt.authorizationId),
        validationEventIdentities: ordered.map((receipt) => receipt.validationEventIdentity),
        validationDigests: ordered.map((receipt) => receipt.validationDigest),
        observationProofDigests: ordered.map((receipt) => receipt.observationProofDigest),
        sourceAuditRevisions: ordered.map((receipt) => receipt.sourceAuditRevision),
      };
      const evidenceDigest = digest("intent-completion-evidence", evidenceBase);
      if (!evidenceDigest.ok) return evidenceDigest;
      const evidenceId = stableId("intent-completion-evidence", "amadeus.intent-completion-evidence.v1", [
        { tag: "intent", value: input.intentUuid },
        { tag: "cohort", value: input.cohort.cohortDigest },
        { tag: "evidence", value: evidenceDigest.value },
      ]);
      const evidence: IntentCompletionEvidence = { ...evidenceBase, evidenceId, evidenceDigest: evidenceDigest.value };
      const payload = {
        schemaVersion: "1",
        evidenceId,
        intentUuid: input.intentUuid,
        cohortId: input.cohort.cohortId,
        cohortDigest: input.cohort.cohortDigest,
        implementationRevision: input.revision.implementationRevision,
        packageDigest: input.revision.packageDigest,
        registryDigest: input.revision.registryDigest,
        scenarioDigest: input.revision.scenarioDigest,
        harnessIds: input.cohort.harnessIds,
        receiptIds: evidence.receiptIds,
        authorizationIds: evidence.authorizationIds,
        validationEventIdentities: evidence.validationEventIdentities,
        validationDigests: evidence.validationDigests,
        observationProofDigests: evidence.observationProofDigests,
        sourceAuditRevisions: evidence.sourceAuditRevisions,
        evidenceDigest: evidence.evidenceDigest,
        sourceAuditRevision: snapshot.value.auditRevision,
      };
      const payloadDigest = digest("completion-evidence-validated-payload", payload);
      if (!payloadDigest.ok) return payloadDigest;
      const eventIdentity = stableId("completion-evidence-validated", "amadeus.completion-evidence-validated-event.v1", [
        { tag: "intent", value: input.intentUuid },
        { tag: "evidence", value: evidence.evidenceId },
        { tag: "cohort", value: input.cohort.cohortDigest },
        { tag: "source-revision", value: String(snapshot.value.auditRevision) },
        { tag: "payload", value: payloadDigest.value },
      ]);
      return success({
        check: { kind: "complete", evidence },
        audit: [{
          eventType: "LIVE_COMPLETION_EVIDENCE_VALIDATED",
          eventIdentity,
          intentUuid: input.intentUuid,
          fields: { payload_v1: JSON.stringify(payload) },
          payloadDigest: payloadDigest.value,
        }],
        sourceAuditRevision: snapshot.value.auditRevision,
        sourceStateProjectionRevision: snapshot.value.stateProjectionRevision,
      });
    },
  };
}

export interface TerminalCommitPlan {
  readonly transaction: AuditTransaction;
  readonly orderedEvents: readonly AuditEventPlan[];
  readonly completionEvidence: IntentCompletionEvidence;
  readonly expectedEventIdentities: readonly StableId[];
  readonly expectedStateProjectionRevision: number;
  readonly terminalProjection: AutonomyProjection;
  readonly completionSealDigest: Sha256Digest;
  readonly result: WorkflowResult & { readonly outcome: "completed" };
}

export interface TerminalCommitReceipt {
  readonly evidenceId: StableId;
  readonly transactionId: StableId;
  readonly committedEventIdentities: readonly StableId[];
  readonly stateProjectionRevision: number;
  readonly completionSealDigest: Sha256Digest;
  readonly terminalProjection: AutonomyProjection;
  readonly result: WorkflowResult & { readonly outcome: "completed" };
}

export function terminalTransactionAuditFields(plan: TerminalCommitPlan): Record<string, string> {
  return {
    "Intent Uuid": plan.completionEvidence.intentUuid,
    "Transaction Id": plan.transaction.transactionId,
    "Evidence Id": plan.completionEvidence.evidenceId,
    "Evidence Digest": plan.completionEvidence.evidenceDigest,
    "Completion Seal Digest": plan.completionSealDigest,
    Transaction: JSON.stringify({
      eventType: "INTENT_COMPLETION_TRANSACTION_COMMITTED",
      transaction: plan.transaction,
      expectedEventIdentities: plan.expectedEventIdentities,
      expectedStateProjectionRevision: plan.expectedStateProjectionRevision,
    }),
  };
}

function terminalEvent(eventType: string, intentUuid: string, payload: unknown): ContractResult<AuditEventPlan> {
  const payloadDigest = digest(`intent-terminal-${eventType.toLowerCase()}`, payload);
  if (!payloadDigest.ok) return payloadDigest;
  return success({
    eventType,
    eventIdentity: stableId("intent-terminal-event", "amadeus.intent-terminal-event.v1", [
      { tag: "type", value: eventType },
      { tag: "intent", value: intentUuid },
      { tag: "payload", value: payloadDigest.value },
    ]),
    intentUuid,
    fields: { payload_v1: JSON.stringify(payload) },
    payloadDigest: payloadDigest.value,
  });
}

function completedGrant(current: AutonomyProjection): IntentGrant | null {
  return current.currentGrant === null ? null : { ...current.currentGrant, state: "completed" };
}

function canPlanTerminalCommit(input: {
  readonly current: AutonomyProjection;
  readonly evaluation: Extract<IntentCompletionEvaluation, { check: { kind: "complete" } }>;
}): boolean {
  const evidence = input.evaluation.check.evidence;
  return input.current.intentUuid === evidence.intentUuid &&
    input.current.workflowExecutionState === "running" &&
    input.current.pendingExercise === null &&
    input.current.parkEnvelope === null &&
    Number.isSafeInteger(input.evaluation.sourceAuditRevision) &&
    Number.isSafeInteger(input.evaluation.sourceStateProjectionRevision) &&
    input.evaluation.sourceStateProjectionRevision !== Number.MAX_SAFE_INTEGER;
}

export function planTerminalCommit(input: {
  readonly current: AutonomyProjection;
  readonly evaluation: Extract<IntentCompletionEvaluation, { check: { kind: "complete" } }>;
}): ContractResult<TerminalCommitPlan> {
  try {
    assertLegalAutonomyProjection(input.current);
  } catch (error) {
    return failure("ILLEGAL_STATE", "autonomy", error instanceof Error ? error.message : String(error));
  }
  const evidence = input.evaluation.check.evidence;
  if (!canPlanTerminalCommit(input)) {
    return failure("ILLEGAL_STATE", "terminalPlan", "only a stable running complete evaluation can terminate");
  }
  const grant = completedGrant(input.current);
  const terminalProjection: AutonomyProjection = {
    ...input.current,
    workflowExecutionState: null,
    currentGrant: null,
    terminalGrantHistory: grant === null
      ? input.current.terminalGrantHistory
      : [...input.current.terminalGrantHistory, grant],
    pendingExercise: null,
    parkEnvelope: null,
    projectionRevision: input.evaluation.sourceStateProjectionRevision + 1,
  };
  try {
    assertLegalAutonomyProjection(terminalProjection);
  } catch (error) {
    return failure("ILLEGAL_STATE", "terminalProjection", error instanceof Error ? error.message : String(error));
  }
  const result: WorkflowResult & { outcome: "completed" } = {
    outcome: "completed",
    reasonCode: null,
    retryable: false,
    intentUuid: input.current.intentUuid,
    autonomyMode: input.current.mode,
    grant: grant === null ? null : { id: grant.grantId, state: "completed" },
    evidenceFingerprint: null,
    resumeCondition: null,
    failureRef: null,
  };
  const eventResults = [
    ...(grant === null ? [] : [terminalEvent("INTENT_GRANT_COMPLETED", evidence.intentUuid, {
      grantId: grant.grantId,
      state: grant.state,
      evidenceId: evidence.evidenceId,
    })]),
    terminalEvent("WORKFLOW_STATE_CLEARED", evidence.intentUuid, {
      workflowExecutionState: null,
      evidenceId: evidence.evidenceId,
    }),
    terminalEvent("WORKFLOW_COMPLETED", evidence.intentUuid, {
      result,
      evidenceId: evidence.evidenceId,
      evidenceDigest: evidence.evidenceDigest,
    }),
  ];
  const terminalEvents: AuditEventPlan[] = [];
  for (const event of eventResults) {
    if (!event.ok) return event;
    terminalEvents.push(event.value);
  }
  const orderedEvents = [input.evaluation.audit[0], ...terminalEvents];
  const expectedEventIdentities = orderedEvents.map((event) => event.eventIdentity);
  const transactionId = stableId("intent-terminal-transaction", "amadeus.intent-terminal-transaction.v1", [
    { tag: "intent", value: evidence.intentUuid },
    { tag: "evidence-id", value: evidence.evidenceId },
    { tag: "evidence-digest", value: evidence.evidenceDigest },
    { tag: "cohort", value: evidence.cohort.cohortDigest },
    { tag: "events", value: expectedEventIdentities.join("\0") },
    { tag: "audit-revision", value: String(input.evaluation.sourceAuditRevision) },
    { tag: "projection-revision", value: String(input.evaluation.sourceStateProjectionRevision) },
  ]);
  const completionSeal = digest("intent-completion-seal", {
    transactionId,
    evidenceId: evidence.evidenceId,
    evidenceDigest: evidence.evidenceDigest,
    terminalProjection,
    result,
  });
  if (!completionSeal.ok) return completionSeal;
  return success({
    transaction: { transactionId, expectedRevision: input.evaluation.sourceAuditRevision },
    orderedEvents,
    completionEvidence: evidence,
    expectedEventIdentities,
    expectedStateProjectionRevision: input.evaluation.sourceStateProjectionRevision + 1,
    terminalProjection,
    completionSealDigest: completionSeal.value,
    result,
  });
}

export function acceptTerminalCommit(input: {
  readonly plan: TerminalCommitPlan;
  readonly receipt: AuditCommitReceipt;
}): ContractResult<TerminalCommitReceipt> {
  if (input.receipt.transactionId !== input.plan.transaction.transactionId ||
    input.receipt.stateProjectionRevision !== input.plan.expectedStateProjectionRevision ||
    input.receipt.committedEventIdentities.length !== input.plan.expectedEventIdentities.length ||
    input.receipt.committedEventIdentities.some((identity, index) => identity !== input.plan.expectedEventIdentities[index])) {
    return failure("CONFLICT", "terminalCommitReceipt", "terminal transaction receipt is partial or mismatched");
  }
  return success({
    evidenceId: input.plan.completionEvidence.evidenceId,
    transactionId: input.receipt.transactionId,
    committedEventIdentities: input.receipt.committedEventIdentities,
    stateProjectionRevision: input.receipt.stateProjectionRevision,
    completionSealDigest: input.plan.completionSealDigest,
    terminalProjection: input.plan.terminalProjection,
    result: input.plan.result,
  });
}

export interface IntentCompletionLedgerSnapshot {
  readonly schemaVersion: "1";
  readonly auditRevision: number;
  readonly stateProjectionRevision: number;
  readonly committedTransactions: readonly {
    readonly transactionId: StableId;
    readonly events: readonly AuditEventPlan[];
    readonly receipt: AuditCommitReceipt;
  }[];
  readonly digest: Sha256Digest;
}

export interface IntentCompletionLedger {
  commit(plan: TerminalCommitPlan): ContractResult<TerminalCommitReceipt>;
  exportSnapshot(): IntentCompletionLedgerSnapshot;
}

export function createMemoryIntentCompletionLedger(
  input: { readonly auditRevision: number; readonly stateProjectionRevision: number; readonly snapshot?: IntentCompletionLedgerSnapshot },
): IntentCompletionLedger {
  let auditRevision = input.auditRevision;
  let stateProjectionRevision = input.stateProjectionRevision;
  const transactions = new Map<string, { events: readonly AuditEventPlan[]; receipt: AuditCommitReceipt }>();
  if (input.snapshot !== undefined) {
    const { digest: snapshotDigest, ...value } = input.snapshot;
    const observed = digest("intent-completion-ledger", value);
    if (!observed.ok || observed.value !== snapshotDigest) throw new Error("invalid-intent-completion-ledger-snapshot");
    auditRevision = input.snapshot.auditRevision;
    stateProjectionRevision = input.snapshot.stateProjectionRevision;
    for (const transaction of input.snapshot.committedTransactions) {
      transactions.set(transaction.transactionId, { events: transaction.events, receipt: transaction.receipt });
    }
  }
  return {
    commit(plan) {
      const replay = transactions.get(plan.transaction.transactionId);
      if (replay !== undefined) return acceptTerminalCommit({ plan, receipt: replay.receipt });
      if (auditRevision !== plan.transaction.expectedRevision ||
        stateProjectionRevision + 1 !== plan.expectedStateProjectionRevision) {
        return failure("CONFLICT", "terminalCas", "audit or state projection revision changed");
      }
      const receipt: AuditCommitReceipt = {
        transactionId: plan.transaction.transactionId,
        committedEventIdentities: [...plan.expectedEventIdentities],
        auditRevision: auditRevision + plan.orderedEvents.length,
        stateProjectionRevision: plan.expectedStateProjectionRevision,
      };
      // Publish only after the complete receipt is constructed. A thrown
      // validation leaves every externally observable field unchanged.
      const accepted = acceptTerminalCommit({ plan, receipt });
      if (!accepted.ok) return accepted;
      transactions.set(plan.transaction.transactionId, { events: plan.orderedEvents, receipt });
      auditRevision = receipt.auditRevision;
      stateProjectionRevision = receipt.stateProjectionRevision;
      return accepted;
    },
    exportSnapshot() {
      const value = {
        schemaVersion: "1" as const,
        auditRevision,
        stateProjectionRevision,
        committedTransactions: [...transactions].sort(([left], [right]) => compareUtf8(left, right)).map(
          ([transactionId, transaction]) => ({ transactionId, ...transaction }),
        ),
      };
      const snapshotDigest = digest("intent-completion-ledger", value);
      if (!snapshotDigest.ok) throw new Error(snapshotDigest.error.detail);
      return { ...value, digest: snapshotDigest.value };
    },
  };
}

export function completedReviewSeed(plan: TerminalCommitPlan, auditRevision: number): ReviewIntentSeed {
  return {
    intentUuid: plan.completionEvidence.intentUuid,
    lifecycle: "completed",
    autonomy: plan.terminalProjection,
    auditRevision,
    completionSealDigest: plan.completionSealDigest,
  };
}

export interface AwaitingLiveCapability {
  readonly outcome: "AWAITING_HUMAN";
  readonly intentUuid: StableId;
  readonly missingHarnessIds: readonly CompletionHarnessId[];
  readonly resumeCondition: {
    readonly kind: "human-or-capability";
    readonly identity: StableId;
    readonly status: "pending";
    readonly evidenceFingerprint: Sha256Digest;
  };
}

export function awaitingLiveCapability(
  intentUuid: StableId,
  cohort: RequiredCompletionCohort,
  missingHarnessIds: readonly CompletionHarnessId[],
): ContractResult<AwaitingLiveCapability> {
  const uniqueMissing = [...new Set(missingHarnessIds)].sort(compareUtf8);
  if (!SAFE_ID.test(intentUuid) || uniqueMissing.length === 0 ||
    uniqueMissing.some((harnessId) => !cohort.harnessIds.includes(harnessId))) {
    return failure("MALFORMED", "missingHarnesses", "awaiting-human route requires missing cohort members");
  }
  const evidenceFingerprint = digest("missing-live-capability", {
    intentUuid,
    cohortDigest: cohort.cohortDigest,
    missingHarnessIds: uniqueMissing,
  });
  if (!evidenceFingerprint.ok) return evidenceFingerprint;
  return success({
    outcome: "AWAITING_HUMAN",
    intentUuid,
    missingHarnessIds: uniqueMissing,
    resumeCondition: {
      kind: "human-or-capability",
      identity: stableId("live-capability-resume", "amadeus.live-capability-resume.v1", [
        { tag: "intent", value: intentUuid },
        { tag: "cohort", value: cohort.cohortDigest },
        { tag: "missing", value: uniqueMissing.join("\0") },
      ]),
      status: "pending",
      evidenceFingerprint: evidenceFingerprint.value,
    },
  });
}

export function parseCompletionEvidencePayload(event: CompletionEvidenceValidatedEventPlan): ContractResult<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(event.fields.payload_v1 ?? "null") as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed) || !exactlyKeys(parsed as Record<string, unknown>, [
      "schemaVersion", "evidenceId", "intentUuid", "cohortId", "cohortDigest", "implementationRevision",
      "packageDigest", "registryDigest", "scenarioDigest", "harnessIds", "receiptIds", "authorizationIds",
      "validationEventIdentities", "validationDigests", "observationProofDigests", "sourceAuditRevisions",
      "evidenceDigest", "sourceAuditRevision",
    ])) return failure("MALFORMED", "completionEvidencePayload", "payload is not closed v1");
    const observed = digest("completion-evidence-validated-payload", parsed);
    return observed.ok && observed.value === event.payloadDigest
      ? success(parsed as Record<string, unknown>)
      : failure("CONFLICT", "completionEvidencePayload", "payload digest mismatch");
  } catch (error) {
    return failure("MALFORMED", "completionEvidencePayload", error instanceof Error ? error.message : String(error));
  }
}
