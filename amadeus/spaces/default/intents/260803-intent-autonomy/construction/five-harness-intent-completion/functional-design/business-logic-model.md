# Business Logic Model — five-harness-intent-completion

## 上流入力と設計範囲

本設計は`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`を正本とする。対象はU5 `five-harness-intent-completion`、FR-HAR-001〜007、2067-AC22〜26、およびU5へ割り当てられたterminal persistence / privacy / drift contractである。

U1のgeneric `LiveAuthorizationPort`とprotected authorization eventを再利用し、M08 receipt validation / cohort evaluation、M09 native live scenario、M06 / M04 / M07 terminal transactionを閉じる。PR / merge、外部runner、Kiro / Kiro IDE live対応、credential保存、harness固有Core algorithmは所有しない。

## Closed public contract

`StableId`、`Sha256Digest`、`AuditEventPlan`、`CanonicalAuditEvent`、`AuditCommitReceipt`、`AuditTransaction`、`ContractResult<T>`、`HarnessDescriptor`、`ValidatedHarnessRegistry`、`RevisionBinding`、`LiveAuthorizationPort`、`LiveExecutionAuthorization`、`WorkflowResult`、`AutonomyProjection`は上流M00 / M04 / M06 / M08の定義を使う。

```ts
type CompletionHarnessId = HarnessDescriptor["id"];
type RequiredCompletionCohort = {
  schemaVersion: "1";
  cohortId: "intent-autonomy-live";
  harnessIds: readonly CompletionHarnessId[];
  registryDigest: Sha256Digest;
  cohortDigest: Sha256Digest;
};
type LiveScenarioRevision = RevisionBinding & {
  registryDigest: Sha256Digest;
  scenarioDigest: Sha256Digest;
};
type IntentLiveExecutionAuthorization = Omit<LiveExecutionAuthorization, "revision"> & {
  schemaVersion: "1";
  cohortDigest: Sha256Digest;
  revision: LiveScenarioRevision;
  authorizationPayloadDigest: Sha256Digest;
};
type IntentLiveAuthorizationEventPlan = AuditEventPlan & {
  eventType: "LIVE_SMOKE_AUTHORIZED";
  eventIdentity: StableId;
  fields: { payload_v1: string };
};
type CommittedIntentLiveExecutionAuthorization = IntentLiveExecutionAuthorization & {
  commitReceipt: AuditCommitReceipt;
};
type LiveObservation = {
  judgeInvocationId: StableId;
  judgeObserved: true;
  electionDecisionId: StableId;
  electionOutcome: "elected" | "loud-degradation";
  degradationReason: StableId | null;
};
type IntentLiveRunReservation = {
  schemaVersion: "1";
  runId: StableId;
  operationReference: StableId;
  intentUuid: StableId;
  harnessId: CompletionHarnessId;
  authorizationId: StableId;
  judgeInvocationId: StableId;
  revision: LiveScenarioRevision;
  maxDispatches: 2;
  dispatchesAuthorized: 1 | 2;
  status:
    | "reserved"
    | "started"
    | "redispatch-authorized"
    | "dispatch-claimed"
    | "completed"
    | "incomplete";
};
type IntentLiveRunStateEventPlan = AuditEventPlan & {
  eventType:
    | "LIVE_SMOKE_RUN_RESERVED"
    | "LIVE_SMOKE_RUN_STARTED"
    | "LIVE_SMOKE_RUN_REDISPATCH_AUTHORIZED"
    | "LIVE_SMOKE_RUN_DISPATCH_CLAIMED"
    | "LIVE_SMOKE_RUN_COMPLETED"
    | "LIVE_SMOKE_RUN_INCOMPLETE";
  eventIdentity: StableId;
  fields: { payload_v1: string };
};
type NativeRunReconciliation =
  | { kind: "completed"; receipt: RawIntentLiveReceipt; proofDigest: Sha256Digest }
  | { kind: "attested-no-effect"; proofDigest: Sha256Digest }
  | { kind: "effect-possible" | "unknown"; proofDigest: Sha256Digest | null };
type CommittedIntentLiveRunState = IntentLiveRunReservation & {
  stateEventIdentity: StableId;
  stateCommitReceipt: AuditCommitReceipt;
  sourceAuditRevision: number;
  sourceStateProjectionRevision: number;
};
type CanonicalLiveRunSnapshot = {
  intentUuid: StableId;
  auditRevision: number;
  stateProjectionRevision: number;
  authorization: CommittedIntentLiveExecutionAuthorization;
  run: CommittedIntentLiveRunState;
};
type CanonicalLiveRunStateReader = {
  readRunSnapshot(input: {
    intentUuid: StableId;
    runId: StableId;
  }): ContractResult<CanonicalLiveRunSnapshot>;
};
type AttestedNoEffectProofVerifier = {
  verify(input: {
    snapshot: CanonicalLiveRunSnapshot;
    reconciliation: Extract<NativeRunReconciliation, { kind: "attested-no-effect" }>;
  }): ContractResult<{ proofDigest: Sha256Digest }>;
};
declare const runDispatchPermitBrand: unique symbol;
type RunDispatchPermit = {
  schemaVersion: "1";
  permitId: StableId;
  runId: StableId;
  authorizationId: StableId;
  operationReference: StableId;
  judgeInvocationId: StableId;
  attempt: 1 | 2;
  authorizedStateEventIdentity: StableId;
  authorizedCommitTransactionId: StableId;
  sourceAuditRevision: number;
  permitDigest: Sha256Digest;
  readonly [runDispatchPermitBrand]: true;
};
declare const claimedRunDispatchBrand: unique symbol;
type ClaimedRunDispatch = RunDispatchPermit & {
  claimEventIdentity: StableId;
  claimCommitTransactionId: StableId;
  claimAuditRevision: number;
  readonly [claimedRunDispatchBrand]: true;
};
type NativeDispatchReceipt = {
  schemaVersion: "1";
  dispatchKeyDigest: Sha256Digest;
  nativeOperationId: StableId;
  outcome: "started" | "attached";
  proofDigest: Sha256Digest;
};
type RawIntentLiveReceipt = {
  schemaVersion: "1";
  receiptId: StableId;
  intentUuid: StableId;
  harnessId: CompletionHarnessId;
  authorizationId: StableId;
  authorizationEventIdentity: StableId;
  authorizationCommitTransactionId: StableId;
  revision: LiveScenarioRevision;
  environmentId: StableId;
  traceId: StableId;
  spanId: StableId;
  attestationDigest: Sha256Digest;
  outcome: "passed" | "skipped" | "failed";
  observation: LiveObservation | null;
};
type CanonicalLiveAuthorizationSnapshot = {
  intentUuid: StableId;
  audit: readonly CanonicalAuditEvent[];
  auditRevision: number;
  stateProjectionRevision: number;
  authorization: CommittedIntentLiveExecutionAuthorization;
};
type CanonicalLiveEvidenceReader = {
  readAuthorizationSnapshot(input: {
    intentUuid: StableId;
    authorizationId: StableId;
  }): ContractResult<CanonicalLiveAuthorizationSnapshot>;
};
type ValidatedIntentLiveReceipt = RawIntentLiveReceipt & {
  outcome: "passed";
  observation: LiveObservation;
  observationProofDigest: Sha256Digest;
  validationDigest: Sha256Digest;
};
type LiveReceiptValidatedEventPlan = AuditEventPlan & {
  eventType: "LIVE_SMOKE_RECEIPT_VALIDATED";
  eventIdentity: StableId;
  fields: { payload_v1: string };
};
type PlannedValidatedIntentLiveReceipt = {
  receipt: ValidatedIntentLiveReceipt;
  audit: readonly [LiveReceiptValidatedEventPlan];
};
type CommittedValidatedIntentLiveReceipt = ValidatedIntentLiveReceipt & {
  validationEventIdentity: StableId;
  validationCommitReceipt: AuditCommitReceipt;
};
type CanonicalValidatedReceiptSetSnapshot = {
  intentUuid: StableId;
  auditRevision: number;
  stateProjectionRevision: number;
  receipts: readonly CommittedValidatedIntentLiveReceipt[];
};
type CanonicalValidatedReceiptReader = {
  readValidationSet(input: {
    intentUuid: StableId;
    validationEventIdentities: readonly StableId[];
  }): ContractResult<CanonicalValidatedReceiptSetSnapshot>;
};
type IntentCompletionEvidence = {
  schemaVersion: "1";
  evidenceId: StableId;
  intentUuid: StableId;
  cohort: RequiredCompletionCohort;
  revision: LiveScenarioRevision;
  receiptIds: readonly StableId[];
  authorizationIds: readonly StableId[];
  validationEventIdentities: readonly StableId[];
  validationDigests: readonly Sha256Digest[];
  observationProofDigests: readonly Sha256Digest[];
  sourceAuditRevisions: readonly number[];
  evidenceDigest: Sha256Digest;
};
type CompletionEvidenceValidatedPayloadV1 = {
  schemaVersion: "1";
  evidenceId: StableId;
  intentUuid: StableId;
  cohortId: RequiredCompletionCohort["cohortId"];
  cohortDigest: Sha256Digest;
  implementationRevision: StableId;
  packageDigest: Sha256Digest;
  registryDigest: Sha256Digest;
  scenarioDigest: Sha256Digest;
  harnessIds: readonly CompletionHarnessId[];
  receiptIds: readonly StableId[];
  authorizationIds: readonly StableId[];
  validationEventIdentities: readonly StableId[];
  validationDigests: readonly Sha256Digest[];
  observationProofDigests: readonly Sha256Digest[];
  sourceAuditRevisions: readonly number[];
  evidenceDigest: Sha256Digest;
  sourceAuditRevision: number;
};
type CompletionEvidenceValidatedEventPlan = AuditEventPlan & {
  eventType: "LIVE_COMPLETION_EVIDENCE_VALIDATED";
  eventIdentity: StableId;
  intentUuid: StableId;
  fields: { payload_v1: string };
  payloadDigest: Sha256Digest;
};
type IntentCompletionCheck =
  | { kind: "complete"; evidence: IntentCompletionEvidence }
  | {
      kind: "incomplete";
      intentUuid: StableId;
      cohort: RequiredCompletionCohort;
      revision: LiveScenarioRevision;
      missingHarnessIds: readonly CompletionHarnessId[];
      rejectedReceiptIds: readonly StableId[];
    };
type IntentCompletionEvaluation =
  | {
      check: Extract<IntentCompletionCheck, { kind: "complete" }>;
      audit: readonly [CompletionEvidenceValidatedEventPlan];
      sourceAuditRevision: number;
      sourceStateProjectionRevision: number;
    }
  | {
      check: Extract<IntentCompletionCheck, { kind: "incomplete" }>;
      audit: readonly [];
      sourceAuditRevision: number;
      sourceStateProjectionRevision: number;
    };
type TerminalCommitPlan = {
  transaction: AuditTransaction;
  orderedEvents: readonly AuditEventPlan[];
  completionEvidence: IntentCompletionEvidence;
  expectedEventIdentities: readonly StableId[];
  expectedStateProjectionRevision: number;
};
type TerminalCommitReceipt = {
  evidenceId: StableId;
  transactionId: StableId;
  committedEventIdentities: readonly StableId[];
  stateProjectionRevision: number;
  result: WorkflowResult & { outcome: "completed" };
};

type IntentLiveReceiptValidator = {
  validate(receipt: RawIntentLiveReceipt): ContractResult<PlannedValidatedIntentLiveReceipt>;
  bindCommit(input: {
    planned: PlannedValidatedIntentLiveReceipt;
    receipt: AuditCommitReceipt;
  }): ContractResult<CommittedValidatedIntentLiveReceipt>;
};
type IntentLiveAuthorizationService = {
  authorize(input: {
    intentUuid: StableId;
    harnessId: CompletionHarnessId;
    revision: LiveScenarioRevision;
    cohort: RequiredCompletionCohort;
    registry: ValidatedHarnessRegistry;
  }): Promise<ContractResult<{
    authorization: IntentLiveExecutionAuthorization;
    audit: readonly [IntentLiveAuthorizationEventPlan];
  }>>;
  bindCommit(input: {
    authorization: IntentLiveExecutionAuthorization;
    audit: readonly [IntentLiveAuthorizationEventPlan];
    receipt: AuditCommitReceipt;
  }): ContractResult<CommittedIntentLiveExecutionAuthorization>;
};
function resolveRequiredCompletionCohort(
  registry: ValidatedHarnessRegistry,
): ContractResult<RequiredCompletionCohort>;
function createIntentLiveReceiptValidator(deps: {
  evidenceReader: CanonicalLiveEvidenceReader;
}): IntentLiveReceiptValidator;
function createIntentLiveAuthorizationService(deps: {
  port: LiveAuthorizationPort;
}): IntentLiveAuthorizationService;
type IntentCompletionEvaluator = {
  evaluate(input: {
    intentUuid: StableId;
    cohort: RequiredCompletionCohort;
    revision: LiveScenarioRevision;
    validationEventIdentities: readonly StableId[];
  }): ContractResult<IntentCompletionEvaluation>;
};
type IntentLiveRunCoordinator = {
  reserve(input: {
    authorization: CommittedIntentLiveExecutionAuthorization;
  }): ContractResult<{
    reservation: IntentLiveRunReservation;
    audit: readonly [IntentLiveRunStateEventPlan];
  }>;
  bindStateCommit(input: {
    planned: IntentLiveRunReservation;
    audit: readonly [IntentLiveRunStateEventPlan];
    receipt: AuditCommitReceipt;
  }): ContractResult<CommittedIntentLiveRunState>;
  planNext(input: {
    intentUuid: StableId;
    runId: StableId;
  }): Promise<ContractResult<{
    prior: CommittedIntentLiveRunState;
    next: IntentLiveRunReservation;
    audit: readonly [IntentLiveRunStateEventPlan];
    receipt: RawIntentLiveReceipt | null;
  }>>;
  bindTransitionCommit(input: {
    prior: CommittedIntentLiveRunState;
    next: IntentLiveRunReservation;
    audit: readonly [IntentLiveRunStateEventPlan];
    receipt: AuditCommitReceipt;
  }): ContractResult<{
    state: CommittedIntentLiveRunState;
    dispatchPermit: RunDispatchPermit | null;
  }>;
  claimDispatch(permit: RunDispatchPermit): ContractResult<{
    prior: CommittedIntentLiveRunState;
    claimed: IntentLiveRunReservation;
    audit: readonly [IntentLiveRunStateEventPlan];
  }>;
  bindDispatchClaimCommit(input: {
    permit: RunDispatchPermit;
    prior: CommittedIntentLiveRunState;
    claimed: IntentLiveRunReservation;
    audit: readonly [IntentLiveRunStateEventPlan];
    receipt: AuditCommitReceipt;
  }): ContractResult<ClaimedRunDispatch>;
  dispatch(claimed: ClaimedRunDispatch): Promise<ContractResult<NativeDispatchReceipt>>;
};
type IntentNativeRunPort = {
  reconcile(input: {
    operationReference: StableId;
    judgeInvocationId: StableId;
  }): Promise<ContractResult<NativeRunReconciliation>>;
  dispatch(claimed: ClaimedRunDispatch): Promise<ContractResult<NativeDispatchReceipt>>;
};
function createIntentCompletionEvaluator(deps: {
  receiptReader: CanonicalValidatedReceiptReader;
}): IntentCompletionEvaluator;
function createIntentLiveRunCoordinator(deps: {
  runReader: CanonicalLiveRunStateReader;
  proofVerifier: AttestedNoEffectProofVerifier;
  nativePort: IntentNativeRunPort;
}): IntentLiveRunCoordinator;
function planTerminalCommit(input: {
  current: AutonomyProjection;
  evaluation: Extract<IntentCompletionEvaluation, { check: { kind: "complete" } }>;
}): ContractResult<TerminalCommitPlan>;
function acceptTerminalCommit(input: {
  plan: TerminalCommitPlan;
  receipt: AuditCommitReceipt;
}): ContractResult<TerminalCommitReceipt>;
```

## 1. Completion cohort resolution

M08 registryを唯一のauthoring sourceとする。cohort resolverはdescriptor順を使わずharness ID昇順へ正規化し、次をすべて満たすrowだけを`intent-autonomy-live` cohortへ含める。

- `packageFace=true`
- `autonomyContract=true`
- `autonomyLive=true`
- `native.liveAuthorization=credential-attested`
- `native.judgeReplay=invoke-once`

GA registryでは結果がexactly `claude / codex / cursor / opencode / kimi`であることをdrift fixtureが検証する。Kiro / Kiro IDEはfalseのため除外する。`CompletionHarnessId`は手書きunionではなくregistryから生成される`HarnessDescriptor["id"]`を参照し、membershipはcohortが決める。Core evaluatorは5という数やharness名を分岐へ埋め込まず、validated cohortの全memberを要求する。将来harnessはregistry rowとnative adapterを追加して同cohortへ参加でき、M04〜M07のalgorithm変更や手書きcontract union編集を要求しない。schema v1の現行contract fixtureだけが上記5件をexact oracleとして固定する。

cohort digestは`amadeus.completion-cohort.v1` domainでschema / cohort ID / registry digest / sorted harness IDsから作る。empty、duplicate、unknown ID、capability不一致を`MALFORMED`で拒否する。

## 2. Credential-attested authorization

各harnessのlive runは次の順序だけを許可する。

1. M06がtarget Intentと`LiveScenarioRevision`を固定し、U5-owned `IntentLiveAuthorizationService.authorize`を呼ぶ。
2. serviceがU1の`LiveAuthorizationPort.authorize`へbase `RevisionBinding`を渡し、credential-attested environment adapterからsafe environment ID、issuer principal、trace / span、attestation digestを得る。credential値は返さない。
3. serviceがvalidated registry / cohortを照合し、base authorizationをregistry / scenario digestまで含むclosed `IntentLiveExecutionAuthorization`へ拡張する。型宣言順fixed-key JSONをexactly one `payload_v1` fieldへ保存した`LIVE_SMOKE_AUTHORIZED` eventを計画する。
4. M07がprotected appendし、`bindCommit`がcommit receipt内のtransaction / authorization event identityを確認した場合だけ`CommittedIntentLiveExecutionAuthorization`を作る。
5. M09はそのcommitted authorizationを受けた場合だけnative scenarioを開始する。

authorization payload digestはIntent、harness、cohort、implementation / package / registry / scenario、environment、trace / span、attestationへ束縛する。authorization IDは`amadeus.live-authorization.v1`、event IDは`amadeus.live-authorization-event.v1`のcanonical tupleから作る。再送は同じcommit receiptを返し、異なるenvironment / revision / scenario / attestationで同じIDを使えない。

## 3. Native live scenario

M09 scenarioは認可された一時workspaceだけで、不可逆な外部effectを持たない。全harnessで同じscenario digestとassertion setを使い、native差はadapterがcommand / hook / skill surfaceへ写像する。

1. M06はcommitted authorizationごとに`amadeus.intent-live-run.v1`からrun ID、operation reference、Judge invocation IDを決定し、`LIVE_SMOKE_RUN_RESERVED`をprotected appendする。`bindStateCommit`がevent containment、transaction ID、projection revisionを検証して`CommittedIntentLiveRunState`を返すまで次の操作を許可しない。
2. 初回またはresumeのcoordinatorはcallerからrun state / reconciliationを受けず、`CanonicalLiveRunStateReader`でcurrent committed runを再読してから`IntentNativeRunPort.reconcile`を同じoperation reference / Judge invocation IDで呼ぶ。`completed`ならdispatchせずreceiptを採用する。
3. reservation直後の`attested-no-effect`は`AttestedNoEffectProofVerifier`がcanonical run / authorization / environment operation logへexact matchした場合だけ受理する。coordinatorは`LIVE_SMOKE_RUN_STARTED(attempt=1)`を計画し、M07 commit後の`bindTransitionCommit`だけがbranded `RunDispatchPermit`を発行する。permitはnative effectを直接許可せず、`claimDispatch`がcurrent headへ`LIVE_SMOKE_RUN_DISPATCH_CLAIMED`をCAS appendし、`bindDispatchClaimCommit`がcommit receiptを検証して返す`ClaimedRunDispatch`だけがnative portを呼べる。attempt 1 claim後も同じ検証済みno-effectに限り`LIVE_SMOKE_RUN_REDISPATCH_AUTHORIZED(attempt=2)`を計画し、同じclaim手順で最大1回再dispatchする。
4. `effect-possible / unknown`、またはattempt 2後もreceiptを回収できない場合は`LIVE_SMOKE_RUN_INCOMPLETE`をcommitし、以後dispatchしない。このrunはfailedとしてcohortをincompleteに保つ。
5. 対象revisionのpackageを一時workspaceへinstallし、synthetic workflowを起動する。Judgeはstable invocation IDのpending eventから`invokeOnce`され、adapterは同じoperationへのattach / reconcileを別runとして扱わない。
6. 自動裁定がsolo electionを使用できる場合はelection decisionを観測する。native electionが使えない場合はrecommendationへのloud degradation eventとreasonを観測する。
7. workflowが期待resultへ到達し、audit / status / replayが同じdecision、latch、grant、queueを返すことを確認する。safe raw receiptとreconciliation proofを`LIVE_SMOKE_RUN_COMPLETED`へcommitした後、M08 validationへ渡す。

`judgeObserved=true`はJudge request / result event identityとtraceが一致した場合だけ、`electionOutcome`はcanonical decision / degradation eventが同じtraceに存在する場合だけ設定する。adapterの自己申告booleanをvalidatorが信用しない。

run state eventはexactly one `payload_v1` fieldを持ち、Intent、harness、authorization、revision、run / operation / invocation、attempt budget、status、nullable reconciliation proof digestをclosed型宣言順JSONで保存する。run event identityは`amadeus.intent-live-run-event.v1`でrun ID、status、dispatches authorized、previous event identity、payload digestへ束縛する。M07はdense state transitionと同一runのfork不在を検証し、unknown field、budget超過、別operation / invocationを拒否する。

dispatch permitは`amadeus.intent-live-run-dispatch-permit.v1`でrun / authorization / operation / invocation / attempt、authorized state event、commit transaction、source audit revisionへ束縛する。`bindTransitionCommit`はcommit receiptを検証した後、canonical current stateが同じauthorized eventである場合だけpermitを生成する。`dispatch`は直前にrun readerを再読してpermit digest、current state、attempt budgetを再検証し、stale / forged / reused permitを拒否してからnative portへ渡す。native portはplain reservation、authorization、operation IDを受けるoverloadを持たない。

dispatch claim eventはpermit ID、operation reference、attempt、authorized state eventを`amadeus.intent-live-run-dispatch-claim.v1`へ束縛し、M07がcurrent headとattempt未claimを同じlockでCASする。競合claimはeventをappendせず`CONFLICT(dispatchClaim)`となり、callerはcanonical runをreconcileする。`ClaimedRunDispatch`はclaim event / commit transaction / audit revisionを含み、claim commit前には生成できない。

native portは`dispatchKeyDigest = sha256(amadeus.intent-live-native-dispatch.v1, operationReference, attempt)`をauthoritative idempotency keyとして、同じkeyの並行・再送をexactly one native operationへ線形化する。winnerは`outcome=started`、競合callerは同じ`nativeOperationId` / proof digestを持つ`outcome=attached` receiptを得て新しいJudgeを起動しない。coordinatorはdispatch直前にclaim headを再読し、native receiptのkey / operation / proofを検証する。これにより同じclaimed tokenが再構築されてもnative effectは増えず、以後は同じoperationをreconcileする。

## 4. Receipt validation

M08-owned validatorはcaller提供auditやauthorization commit receiptを受け取らない。M08-owned `CanonicalLiveEvidenceReader` portをM07 adapterが実装し、closed U5 authorization payload、commit receipt、canonical audit、authoritative audit revision、state projection revisionを同一snapshotで返す。

validationは次をexact matchする。

- target Intent / harness / authorization ID / event identity
- implementation revision / package / registry / scenario digest
- environment / trace / span / attestation digest
- authorization commit transactionとevent containment
- registry cohort membershipとnative capability
- `outcome=passed`
- Judge request / resultの同一invocation・trace観測
- electionまたはloud degradationのdecision・trace観測

`skipped / failed`、null observation、duplicate event、unknown field、redaction failure、canonical source mismatchを拒否する。validatorはJudge request / resultとelection / degradation proofのcanonical digestを`observationProofDigest`へまとめる。validation digestは`amadeus.validated-live-receipt.v1`でraw receipt digest、authorization payload / event identity、observation proof、source audit revisionへ束縛する。

validation成功はまだterminal evidenceではない。validatorはclosed validation payloadをexactly one `payload_v1` fieldに持つprotected `LIVE_SMOKE_RECEIPT_VALIDATED` eventを計画する。payloadは`ValidatedIntentLiveReceipt`の全closed field（Intent、harness、receipt / authorization / authorization event / transaction、完全revision、environment / trace / span / attestation、passed outcome、Judge / election observation）、validation digest、observation proof digest、authorization source revisionを持つ。M07 commit後、`bindCommit`がtransactionとvalidation event identityを確認した場合だけ`CommittedValidatedIntentLiveReceipt`になる。

## 5. Five-harness evaluation

evaluatorはcaller提供validated receipt配列を受け取らない。validation event identitiesだけを受け、M08-owned `CanonicalValidatedReceiptReader` portのM07 adapterから、protected validation events / commit receipts / canonical audit / authoritative revisionを同一snapshotで読む。closed payloadとcommit containmentを再検証し、全receiptが同じIntent / cohort / revisionを持つこと、harness IDごとexactly oneであることを確認する。receipt入力順を無視し、cohort順へ正規化する。cohort外、duplicate、missing、別revisionはcompleteへ寄与しない。

全memberが揃った場合だけ`IntentCompletionEvidence`とclosed `CompletionEvidenceValidatedEventPlan`を作る。evidence IDは`amadeus.intent-completion-evidence.v1`でIntent、cohort digest、revision、sorted receipt / authorization IDs、validation event IDs / digests、observation proof digests、source audit revisionsへ束縛する。evaluationはreader snapshotのauthoritative audit revisionとstate projection revisionを`sourceAuditRevision / sourceStateProjectionRevision`として返す。不足時も同じsnapshot revisions、`incomplete`、empty audit tuple、missing / rejected集合を返し、success eventを作らない。

event payloadは`CompletionEvidenceValidatedPayloadV1`の型宣言順fixed-key JSONであり、`AuditEventPlan.fields`はexactly one key `payload_v1`だけを持つ。全nullableなし、unknown / missing keyを拒否し、各配列はcohort順かつ長さ=cohort member数とする。payload digestは`canonical-value-v1(completion-evidence-validated-payload)`で再計算する。event identityは`amadeus.completion-evidence-validated-event.v1` tupleのIntent、evidence ID / digest、cohort digest、source audit revision、payload digestから作る。

M07 parserはlock内でpayloadをclosed decodeし、registry / scenarioを含むrevision、validation event IDs / digests、observation proof digests、source revisions、evidence / payload digest、event identityをcanonical validation eventsから再計算する。一つでも不一致ならterminal transaction全体を拒否する。このevent identityが`TerminalCommitPlan.expectedEventIdentities`の先頭となる。

## 6. Atomic terminal transition

M06はcomplete evaluationだけを`planTerminalCommit`へ渡す。M04 `planIntentCompletion`とM06 completion planを組み合わせ、event順を次に固定する。

1. `LIVE_COMPLETION_EVIDENCE_VALIDATED`
2. full modeならactive grantをcompletedへするM04 event。none / semiではgrant eventなし。
3. workflow execution stateをnullへするM04 event
4. `WORKFLOW_COMPLETED`

transactionは`evaluation.sourceAuditRevision`をそのまま`expectedRevision`に持ち、caller指定revisionを受けない。全event planを確定した後、transaction IDを`amadeus.intent-terminal-transaction.v1` canonical tupleのIntent、completion evidence ID / digest、cohort digest、順序付きevent identities、expected audit revision、source state projection revisionから決定する。random ID、時刻、event count、先頭event IDの流用を禁止する。

M07は1 lock内でtransaction IDを同じtupleから再計算し、validation eventsが同じcanonical auditに存在すること、evidence digest、current mode / grant / workflow、event identity重複、expected revisionを再検証して、全件appendまたは全件拒否する。CAS成功はevaluatorが読んだvalidation snapshotから1 eventも変わっていないことを保証する。M07のstate projection revisionはevent件数ではなく成功したaudit transactionごとにexactly 1進むため、planは`expectedStateProjectionRevision = evaluation.sourceStateProjectionRevision + 1`を固定する。overflow / non-safe integerを拒否する。artifact digest / completion sealは同transaction結果から作る。

`acceptTerminalCommit`はplanからtransaction IDを再計算し、commit receiptのtransaction ID、expected event identities、`expectedStateProjectionRevision`をexact matchして、全eventがcommitされた場合だけcompleted resultを返す。部分commit、未知event、missing grant event、receipt mismatchではcompletedを返さない。同じplan / transaction IDのreplayはM07 idempotency indexから同じcommit receiptとterminal receiptを返し、revisionを再度進めない。

## 7. Persistenceとcompleted review

canonical auditはauthorization、raw receipt validation evidence、completion evidence、terminal transactionを復元できる。session / process / compaction / clone後に次を同値比較する。

- cohort / revision / receipt / authorization集合
- grant completedまたはnull
- workflow execution state=null
- completion evidence / seal / result identity
- U4 decision queue / review extension head

runtime scratchや一時workspaceが消えてもterminal stateは変わらない。completed後の`AUTO_DECISION_REVIEWED`はU4の専用post-seal extension chainへ追記できるが、U5 completion evidence、seal、grant、workflow resultを変更しない。

## 8. Harness-neutral packaging

`packages/framework/harness/registry.ts`を単一authoring sourceとし、package/setup/promote/self-install projection、`HarnessDescriptor["id"]` union、contract adapter unionをpackage生成時に再生成する。Application Designに記載した7件unionはこのcompile projectionのschema例であり、U5実装では手編集する正本にしない。future harness追加はregistry rowとnative adapterを追加し、`bun scripts/package.ts`で生成型 / distributionを更新する。drift guardは生成差分を拒否する。harness adapterはnative invocation / observation抽出だけを所有し、authorization、receipt validation、cohort evaluation、terminal algorithmを複製しない。

contract fixtureは現行5harnessのexact tuple、同じcanonical byte vectors、pass / skip / mismatch / forged authorization / replay casesを持つ。opt-in liveはcredentialがなければ理由付きskipとして報告するが、skipをCI pass evidenceやIntent completion evidenceへ変換しない。

## 要件追跡

| Design | Requirement / AC |
|---|---|
| cohort / registry / packaging | FR-HAR-001、005〜007、2067-AC22、26 |
| authorization / live scenario | FR-HAR-003、2067-AC23〜24 |
| receipt validation / exact five | FR-HAR-002〜004、2067-AC22〜25 |
| terminal transaction / persistence | FR-AUT-006、FR-GRT-009、FR-STP-007、NFR-DET-002、NFR-REL-003 |
| privacy / completed review | NFR-PRV-001〜002、FR-OBS-004 |

## 非目標

- PR / merge / GitHub reviewをcompletionへ入力すること。
- Kiro / Kiro IDEを今回のlive cohortへ追加すること。
- credential / token / raw provider payloadを保存すること。
- 常駐runner / supervisor /新stageを追加すること。
- harness別にCore algorithmをforkすること。


## Historical Review Cycle 1 — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:53:26Z
- **Iteration:** 1
- **Scope decision:** none

cohort評価とterminal event順は明確だが、U5固有revisionをauthorizationへ束縛する経路と、validated receiptをcanonical evidenceとして永続化・lock内再検証する経路が閉じていない。

### Findings

- BLOCKER | U5はauthorizationをimplementation/package/registry/scenarioへ束縛すると規定するが、再利用する上流`LiveAuthorizationPort`の入力と`LiveExecutionAuthorization.revision`は`RevisionBinding(implementationRevision, packageDigest)`だけであり、`CommittedLiveExecutionAuthorization`にも`registryDigest / scenarioDigest`がない。U5には`LiveScenarioRevision`全体を受けてprotected authorization eventへ保存するrefined planner/APIやclosed event schemaもないため、M08 validatorはraw receiptのregistry/scenarioをcanonical authorizationとexact matchできず、同じimplementation/package上の別scenarioを区別できない。U1 authorizationを安全に拡張するU5-owned authorization refinementと、その全revision fieldを保持するcommitted snapshotを定義する必要がある。
- BLOCKER | `ValidatedIntentLiveReceipt`はvalidatorが返すtransientな構造型だが、per-harness validation結果をcanonical auditへappendするevent/APIがなく、`evaluateIntentCompletion`はcanonical evidence readerを持たずに同型の配列を信用する。さらに`IntentCompletionEvidence`はreceipt/authorization IDとsource revisionだけで、validation digest、passed observation、Judge/election proofを保持しない。このためprocess/clone再開時にvalidated receipt集合をauditから復元できず、M07 terminal lock内でも5件のpassed・authorization・observationを再検証できないため、CASはstate競合だけを防いで偽造またはstale evidenceによる完了を防げない。各receiptのclosed validation eventをprotected appendしてevidenceへdigestを束縛するか、evaluator/terminal validatorがraw receiptとcanonical snapshotをlock内で再検証する必要がある。
- FOLLOW-UP | `CompletionHarnessId`が現行5件のclosed unionで、cohort・raw receiptもこの型へ固定されているため、future harness参加にはregistry rowとadapter以外にCore contract型の編集が必要になる。FR-HAR-006はalgorithm fork禁止としては満たせるが、「registry rowとnative adapter追加だけ」という設計主張を厳密に保つなら、registry生成型へ寄せるか現行5件unionが生成物であることを明記するとよい。

## Historical Review Cycle 1 — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:58:20Z
- **Iteration:** 2
- **Scope decision:** none

前回2 BLOCKERは解消された。full revision authorizationとper-harness validation persistence/evaluationは接続済みだが、terminal lock内検証の正本となるcompletion evidence eventのwire・identity契約が未定義である。

### Findings

- BLOCKER | `LIVE_COMPLETION_EVIDENCE_VALIDATED`はterminal transactionの先頭eventであり、M07がlock内でvalidation event集合とevidence digestを再検証する正本だが、対応するclosed EventPlan型、`payload_v1` schema、canonical serialization、event identity生成規則がない。`IntentCompletionEvaluation.audit`は汎用`AuditEventPlan[]`に留まり、authorization/receipt validation eventで定義されたexactly-one-field規則も適用されていない。このままではM06/M07がevidenceの全field、validation IDs/digests、observation proof、source revisionsを同じwire表現へ実装できず、replay時のevent identityと`acceptTerminalCommit.expectedEventIdentities`も一意にならない。`CompletionEvidenceValidatedEventPlan`相当のclosed schema、canonical payload/event identity、M07 parser検証規則を定義する必要がある。
- FOLLOW-UP | `CompletionHarnessId = HarnessDescriptor["id"]`への変更でU5内の現行5件unionは除去されたが、authoritativeな`component-methods.md`の`HarnessDescriptor.id`自体は7件の手書きunionであり、設計が主張する「registryから生成され、future harness追加時に手書きcontract union編集不要」は現状の上流契約からは導けない。algorithm forkは不要なのでREADYを単独では妨げないが、型生成元とregeneration手順を明記するか主張を「registry row・adapter・生成型更新」に修正するとよい。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:01:06Z
- **Iteration:** 1
- **Scope decision:** none

completion evidenceのclosed wire、lock内再計算、registry由来ID型生成は解消済み。ただしterminal transaction自体の決定的identityとcommit後revision oracleが未定義で、同一plan replayとreceipt受理を一意に実装できない。

### Findings

- BLOCKER | `TerminalCommitPlan`は`AuditTransaction.transactionId`を必須とし、同じplanのreplayで同じterminal receiptを返すと規定するが、transaction IDのcanonical domain・入力tuple・生成規則がない。上流`AuditTransaction`も単なる`{transactionId, expectedRevision}`でgeneratorを提供しない。また`acceptTerminalCommit`は`AuditCommitReceipt.stateProjectionRevision`をexact matchするとする一方、planにexpected post-commit revisionがなく、terminal transactionでrevisionが何段進むかのoracleも定義されていない。このため実装者ごとにrandom ID、event ID流用、revision増分解釈が分かれ、crash replayでsame receiptを保証できない。completion evidence ID/digest、ordered event identities、expected audit revisionを束縛したterminal transaction identityと、成功時のexpected state projection revisionを`TerminalCommitPlan`へ固定し、M07 lock・`acceptTerminalCommit`で再計算する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:04:12Z
- **Iteration:** 2
- **Scope decision:** none

最新修正は要求・設計・ルール・エンティティ間で整合している。terminal transaction IDはcompletion evidence、順序付きevent identities、audit/projection revisionへ決定的に束縛され、M07 lock内で再計算される。post-commit projection revisionはtransaction単位でsource+1に固定され、receipt受理とidempotent replayも閉じている。未解決BLOCKERはない。

### Findings

- None
