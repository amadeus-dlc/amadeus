# モジュール・インターフェース

## 上流入力と型所有

本書は`requirements-analysis/requirements.md`、`codekb/amadeus/architecture.md`、`codekb/amadeus/component-inventory.md`を入力とし、`components.md`のM00〜M09を実装可能なインターフェースへ落とす。

- M00 `amadeus-workflow-contract.ts`は複数module / harnessを跨ぐwire valueだけを所有する。
- Monitor、Quality、Grant、Decision、Harnessのdomain型は各owner moduleが所有する。
- M07はreadonly表示・query用にdomain projection型を一方向importできるが、domain moduleはM07をimportせず、M00の`AuditEventPlan`だけを返す。
- M06だけが各domain moduleを組み合わせる。domain moduleからM06への逆importは禁止する。

## M00 Canonical Workflow Contract

```ts
type StableId = string;
type Sha256Digest = `sha256:${string}`;
type AutonomyMode = "none" | "semi" | "full";
type WorkflowExecutionState = "running" | "suspended" | null;
type GrantState = "active" | "revoked" | "completed";
type QualityRoute = "repair" | "replan" | "repair-stalled";

type Principal = { principalId: StableId; kind: "human" };
type VerifiedHumanTurn = {
  turnId: StableId;
  intentUuid: StableId;
  principal: Principal;
  occurredAt: string;
};

type IdempotentWorkflowEffect = {
  effectId: StableId;
  kind: "approve-gate" | "answer-question" | "apply-route";
  targetId: StableId;
  payloadFingerprint: Sha256Digest;
};

type CanonicalDirective = {
  kind: StableId;
  payload: Readonly<Record<string, string>>;
};

type ContractError = {
  code:
    | "MALFORMED"
    | "UNKNOWN_FIELD"
    | "ILLEGAL_STATE"
    | "UNKNOWN_EVENT"
    | "UNKNOWN_ROUTE"
    | "UNTRUSTED_CONTRIBUTION"
    | "PROVENANCE_REQUIRED"
    | "CONFLICT"
    | "INCOMPLETE";
  locus: string;
  detail: string;
};

type ContractResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ContractError };

type ResumeCondition = {
  kind: "human-action" | "evidence-change" | "norm-change" | "user-unpark" | "external-capability";
  status: "pending" | "satisfied";
  identity: StableId;
  evidenceFingerprint: Sha256Digest | null;
};

type AuditEventPlan = {
  eventType: StableId;
  eventIdentity: StableId;
  intentUuid: StableId;
  fields: Readonly<Record<string, string>>;
};

type CanonicalAuditEvent = AuditEventPlan & {
  shardId: StableId;
  shardSeq: number;
  occurredAt: string;
};

type AuditCommitReceipt = {
  transactionId: StableId;
  committedEventIdentities: readonly StableId[];
  stateProjectionRevision: number;
};

type GrantProjection = {
  grantId: StableId;
  state: GrantState;
  intentUuid: StableId;
  scopeFingerprint: Sha256Digest;
};

type WorkflowResult = {
  outcome: "completed" | "parked" | "failed";
  reasonCode: null | "AWAITING_HUMAN" | "REPAIR_STALLED" | "NORM_CONFLICT" | "USER_PARKED";
  retryable: boolean;
  intentUuid: StableId;
  autonomyMode: AutonomyMode;
  workflowExecutionState: WorkflowExecutionState;
  grant: null | GrantProjection;
  evidenceFingerprint: Sha256Digest | null;
  resumeCondition: ResumeCondition | null;
};
```

M00はbehaviorを持たず、strict parser / serializerとexact schemaだけを提供する。domain固有fieldを集積する巨大`types.ts`にはしない。

## M01 Workflow Graph Compiler

```ts
type GraphStageSource = {
  slug: StableId;
  transitions: readonly StableId[];
  produces: readonly StableId[];
  verificationIds: readonly StableId[];
};

type CoreGraphSource = { stages: readonly GraphStageSource[] };

type PluginContributionSource = {
  pluginId: StableId;
  contentDigest: Sha256Digest;
  trusted: boolean;
  bytes: Uint8Array;
};

type NormalizedContribution = {
  pluginId: StableId;
  contentDigest: Sha256Digest;
  monitors: readonly MonitorManifest[];
  evidenceProviders: readonly StableId[];
  routeRules: readonly StableId[];
  requiredOutputs: readonly StableId[];
};

type RuntimeGraph = {
  stages: readonly GraphStageSource[];
  contributions: readonly NormalizedContribution[];
};

type CanonicalWorkflowControlView = {
  stages: readonly GraphStageSource[];
  monitors: readonly MonitorManifest[];
  contributionDigests: readonly Sha256Digest[];
};

type CompiledWorkflow = {
  graph: RuntimeGraph;
  monitors: CompiledMonitorSet;
  graphRevision: Sha256Digest;
};

function compileWorkflow(input: {
  coreGraph: CoreGraphSource;
  activeContributions: readonly NormalizedContribution[];
}): ContractResult<CompiledWorkflow>;

function canonicalWorkflowRevision(input: CanonicalWorkflowControlView): Sha256Digest;
```

`compileWorkflow`は信頼検証・source正規化済みのactive contributionを受け、stage、route、Monitor、required outputを同じcompile transactionで検証する。duplicate / empty cycle、invalid threshold、unknown event / route、cycleとignoreの重複では部分graphを返さない。未信頼digestやsource破損はM03 activation preflightで先に拒否する。

## M02 Loop Monitor Core

```ts
type MonitorManifest = {
  monitorId: StableId;
  cycleEventIds: readonly StableId[];
  ignoreEventIds: readonly StableId[];
  threshold: number;
  routes: readonly MonitorRouteManifest[];
};

type MonitorRouteManifest = {
  routeId: StableId;
  disposition: "continue" | "latch";
};

type CompiledMonitor = MonitorManifest & { graphRevision: Sha256Digest };
type CompiledMonitorSet = ReadonlyMap<StableId, CompiledMonitor>;

type MonitorEvent = {
  eventId: StableId;
  deliveryId: StableId;
  intentUuid: StableId;
  stageInstanceId: StableId;
  graphRevision: Sha256Digest;
  occurredAt: string;
};

type MonitorProjection = {
  monitorId: StableId;
  epochId: StableId;
  matchedPrefix: number;
  thresholdCount: number;
  recentDeliveries: readonly StableId[];
  pendingJudge: JudgeReservation | null;
  latch: MonitorLatch | null;
};

type MonitorLatch = {
  monitorId: StableId;
  epochId: StableId;
  fingerprint: Sha256Digest;
  judgeInvocationId: StableId;
  selectedRoute: StableId;
  resumeCondition: ResumeCondition;
};

type JudgeRequest = {
  invocationId: StableId;
  monitorId: StableId;
  epochId: StableId;
  evidenceFingerprint: Sha256Digest;
  allowedRoutes: readonly StableId[];
  instructionId: StableId;
};

type JudgeReservation = {
  invocationId: StableId;
  triggerDeliveryId: StableId;
  request: JudgeRequest;
};

type JudgeRouteConstraint = {
  allowedRoutes: readonly [StableId, ...StableId[]];
  instructionId: StableId;
  constraintFingerprint: Sha256Digest;
};

type JudgeResult = {
  invocationId: StableId;
  selectedRoute: StableId;
  basisFingerprint: Sha256Digest;
};

type JudgePort = {
  invokeOnce(request: JudgeRequest): Promise<ContractResult<JudgeResult>>;
};

type MonitorEffect =
  | { kind: "ignored"; projection: MonitorProjection; audit: readonly AuditEventPlan[] }
  | { kind: "advanced"; projection: MonitorProjection; audit: readonly AuditEventPlan[] }
  | { kind: "judge-required"; projection: MonitorProjection; reservation: JudgeReservation; audit: readonly AuditEventPlan[] }
  | { kind: "routed"; projection: MonitorProjection; selectedRoute: StableId; audit: readonly AuditEventPlan[] }
  | { kind: "latched"; projection: MonitorProjection; latch: MonitorLatch; audit: readonly AuditEventPlan[] };

function advanceMonitor(
  monitor: CompiledMonitor,
  previous: MonitorProjection,
  event: MonitorEvent,
  judgeConstraint: JudgeRouteConstraint | null,
): ContractResult<MonitorEffect>;

function replayMonitor(
  monitor: CompiledMonitor,
  audit: readonly CanonicalAuditEvent[],
): ContractResult<MonitorProjection>;

function recoverPendingJudge(
  projection: MonitorProjection,
): ContractResult<JudgeRequest | null>;

function applyJudgeResult(
  monitor: CompiledMonitor,
  projection: MonitorProjection,
  result: JudgeResult,
): ContractResult<MonitorEffect>;

function planMonitorResume(
  monitor: CompiledMonitor,
  projection: MonitorProjection,
  satisfiedCondition: ResumeCondition,
): ContractResult<{ projection: MonitorProjection; audit: readonly AuditEventPlan[] }>;
```

threshold未満では`judgeConstraint=null`だけを許可する。threshold到達時は非null constraintを必須にし、そのroute集合がmanifest routesの非空subsetであることを検証してからJudgeRequestへ固定する。`judge-required`はconstraintを含む完全なrequestを`pendingJudge`へ格納し、同じ内容を`LOOP_JUDGE_STARTED`へ記録する。`replayMonitor → recoverPendingJudge`はcrash後も同じinvocation IDとrequestを返す。S01 `JudgePort.invokeOnce`はinvocation IDをidempotency keyとして同一結果を返し、M06はpendingがある間に新しいJudgeを予約しない。

`applyJudgeResult`はroute metadataの`disposition`で分岐し、`continue`ならselectedRoute付き`routed`、`latch`ならselectedRoute付きgeneric `MonitorLatch`を返す。全routeは`LOOP_JUDGE_COMPLETED`とbasis fingerprintを返し、latchはさらに`LOOP_LATCH_SET`を含む。M02はroute IDの品質意味論、autonomy mode、grant、`WorkflowResult`を生成しない。M06がselectedRouteをM03の閉じたroute ruleへ照合し、M04 projectionと組み合わせる。

`pendingJudge`と`latch`は同時に非nullにならない。pending中のdeliveryは履歴を進めず同じ`judge-required`を返し、latched中は同じ`latched`を返す。Judge resultのinvocation / routeがpending requestと一致しない場合はfail-closedする。

## M03 Quality Repair Loop Plugin

```ts
type QualityObligation = {
  obligationId: StableId;
  category: "reviewer" | "sensor" | "produce" | "verification" | "completion";
  stageInstanceId: StableId;
  artifactId: StableId | null;
  verifierId: StableId;
  failureFingerprint: Sha256Digest;
};

type QualityEvidenceInput = {
  intentUuid: StableId;
  monitorId: StableId;
  stageInstanceId: StableId;
  graphRevision: Sha256Digest;
  reviewer: readonly CanonicalAuditEvent[];
  sensors: readonly CanonicalAuditEvent[];
  requiredProduces: readonly StableId[];
  verificationIds: readonly StableId[];
  completionIds: readonly StableId[];
};

type QualityEvidenceSnapshot = {
  intentUuid: StableId;
  monitorId: StableId;
  qualityEpochId: StableId;
  stageInstanceId: StableId;
  graphRevision: Sha256Digest;
  obligations: readonly QualityObligation[];
  fingerprint: Sha256Digest;
  delta: {
    resolved: readonly StableId[];
    added: readonly StableId[];
    maintained: readonly StableId[];
  };
};

type QualityPattern = "fixed-point" | "churn" | "regression-cycle" | "undetermined";

type QualityProgress =
  | { kind: "initial"; observed: 1; threshold: number; remaining: number }
  | { kind: "collecting"; consecutiveNonProgress: number; threshold: number; remaining: number }
  | { kind: "strict-progress"; resolved: readonly StableId[]; threshold: number }
  | {
      kind: "threshold";
      consecutiveNonProgress: number;
      threshold: number;
      pattern: QualityPattern;
      requiredRoute: "replan" | "repair-stalled";
    };

type QualityConvergenceProjection = {
  qualityEpochId: StableId;
  threshold: number;
  replanSinceLastProgress: boolean;
  consecutiveNonProgress: number;
  recentSnapshots: readonly QualityEvidenceSnapshot[];
};

type QualityPluginSetting =
  | { mode: "none"; optedIn: false; provenance: null }
  | { mode: "none"; optedIn: true; provenance: VerifiedHumanTurn }
  | { mode: "semi" | "full"; optedIn: true; provenance: "mode-required" };

type QualityPluginActivation =
  | { kind: "active"; contribution: NormalizedContribution }
  | { kind: "disabled"; reason: "none-default-off" }
  | { kind: "error"; error: ContractError };

type QualityPluginProjection = {
  intentUuid: StableId;
  noneModeOptedIn: boolean;
  provenanceTurnId: StableId | null;
};

type QualityDeliveryInput = {
  projection: QualityConvergenceProjection;
  snapshot: QualityEvidenceSnapshot;
  deliveryId: StableId;
  occurredAt: string;
};

type QualityDeliveryPlan = {
  projection: QualityConvergenceProjection;
  progress: QualityProgress;
  monitorEvent: MonitorEvent;
  judgeConstraint: JudgeRouteConstraint | null;
  audit: readonly AuditEventPlan[];
};

function resolveQualityPluginActivation(input: {
  setting: QualityPluginSetting;
  composition: readonly PluginContributionSource[];
}): QualityPluginActivation;

function replayQualityPluginProjection(
  intentUuid: StableId,
  audit: readonly CanonicalAuditEvent[],
): ContractResult<QualityPluginProjection>;

function deriveQualityPluginSetting(
  mode: AutonomyMode,
  projection: QualityPluginProjection,
  audit: readonly CanonicalAuditEvent[],
): ContractResult<QualityPluginSetting>;

function planNoneModeQualitySetting(input: {
  projection: QualityPluginProjection;
  enabled: boolean;
  human: VerifiedHumanTurn;
}): ContractResult<{ projection: QualityPluginProjection; audit: readonly AuditEventPlan[] }>;

function normalizeQualityEvidence(input: QualityEvidenceInput): ContractResult<QualityEvidenceSnapshot>;
function replayQualityConvergence(input: {
  qualityEpochId: StableId;
  monitor: CompiledMonitor;
  audit: readonly CanonicalAuditEvent[];
}): ContractResult<QualityConvergenceProjection>;
function planQualityDelivery(input: QualityDeliveryInput): ContractResult<QualityDeliveryPlan>;
function applyQualityJudgeRoute(input: {
  projection: QualityConvergenceProjection;
  selectedRoute: "replan" | "repair-stalled";
}): ContractResult<{ projection: QualityConvergenceProjection; audit: readonly AuditEventPlan[] }>;
function normalizeContribution(source: PluginContributionSource): ContractResult<NormalizedContribution>;
```

M06はauditから`replayQualityPluginProjection`し、現在modeと組み合わせたsettingでstage開始前に`resolveQualityPluginActivation`を必ず呼ぶ。`semi / full`でPlugin欠落・未信頼・破損なら開始前error、`none`は既定disabled、人間opt-in済みだけactiveとする。opt-in / out eventは`QUALITY_REPAIR_OPTED_IN / OUT`で、別session / cloneでもcanonical auditから復元する。`none` opt-inはgate / question認可へ一切渡さない。

`normalizeQualityEvidence`は`intentUuid / monitorId / stageInstanceId / graphRevision`のtupleから`qualityEpochId`を決定的に生成する。projectionとsnapshotのtupleが異なれば`CONFLICT`とし、cross-intent / cross-revision evidenceを混ぜない。`recentSnapshots`は最大`T + 1`、event deliveryはこのbounded projectionだけを更新する。

`planQualityDelivery`はTをprojectionから取得し、progress分類・bounded projection更新・MonitorEvent・Judge constraint・audit planを一度に返す深いinterfaceである。初回かつT未満は`initial`、連続non-progressがT未満は`collecting`、真部分集合かつ追加なしは`strict-progress`としてcountと`replanSinceLastProgress`をresetする。T到達時はfixed point / churn / regression / undeterminedを分類し、`replanSinceLastProgress=false`ならrequiredRoute=`replan`、trueなら`repair-stalled`とする。不正・不足evidenceは正規化済み`evidence-incomplete` obligationとしてnon-progressに数える。

initial / collectingには`QUALITY_NON_PROGRESS`とconstraint=null、strict progressには自然退出`QUALITY_STRICT_PROGRESS`とconstraint=null、thresholdには`QUALITY_NON_PROGRESS`と`allowedRoutes=[requiredRoute]`のsingleton constraintを返す。M06は同じplanのevent / constraintを分離せずM02へ渡すため、T-1でJudgeは発火せず、初回Tでreplan以外、replan後Tでrepair-stalled以外をJudgeが返せない。`applyQualityJudgeRoute(replan)`がreplan stateをauditへ記録し、`repair-stalled`だけを`REPAIR_STALLED`へ写像する。

## M04 Intent Grant

```ts
type DecisionPolicy = { policyId: StableId; selector: StableId; normalizedText: string };

type AutonomyProjection = {
  intentUuid: StableId;
  mode: AutonomyMode;
  workflowExecutionState: WorkflowExecutionState;
  currentGrant: GrantProjection | null;
  legacyStandingGrantIds: readonly StableId[];
};

type HumanAutonomyCommand =
  | { kind: "set-mode"; intentUuid: StableId; target: "none" | "semi" }
  | { kind: "issue-full"; intentUuid: StableId; policies: readonly DecisionPolicy[] }
  | { kind: "replace-full"; intentUuid: StableId; policies: readonly DecisionPolicy[] }
  | { kind: "revoke-full"; intentUuid: StableId; target: "none" | "semi" };

type SystemGrantCommand = {
  kind: "complete-intent";
  intentUuid: StableId;
  completionIdentity: StableId;
};

type GrantTransition = {
  before: AutonomyProjection;
  after: AutonomyProjection;
  events: readonly AuditEventPlan[];
};

type DecisionCandidate = {
  candidateId: StableId;
  intentUuid: StableId;
  questionId: StableId;
  occurrenceId: StableId;
  selectedOptionId: StableId;
  graphRevision: Sha256Digest;
  scopeFingerprint: Sha256Digest;
  effect: IdempotentWorkflowEffect;
};

type DecisionOccurrenceAuthorization = {
  intentUuid: StableId;
  grantId: StableId;
  questionId: StableId;
  occurrenceId: StableId;
  optionIds: readonly StableId[];
  optionSetFingerprint: Sha256Digest;
};

type DecisionOptionEffect = {
  optionId: StableId;
  scopeFingerprint: Sha256Digest;
  effect: IdempotentWorkflowEffect;
};

type ReservedGrantExercise = {
  exerciseId: StableId;
  grantId: StableId;
  candidate: DecisionCandidate;
  candidateDigest: Sha256Digest;
  reservedProjectionRevision: number;
  status: "reserved" | "committed" | "aborted";
};

type GrantExerciseValidation =
  | { kind: "valid"; candidate: DecisionCandidate }
  | {
      kind: "invalid";
      reason: "grant-changed" | "graph-changed" | "scope-mismatch" | "candidate-tampered";
    };

function replayAutonomy(audit: readonly CanonicalAuditEvent[]): ContractResult<AutonomyProjection>;

function planHumanAutonomyTransition(
  current: AutonomyProjection,
  command: HumanAutonomyCommand,
  human: VerifiedHumanTurn,
): ContractResult<GrantTransition>;

function planIntentCompletion(
  current: AutonomyProjection,
  command: SystemGrantCommand,
): ContractResult<GrantTransition>;

function authorizeDecisionOccurrence(input: {
  current: AutonomyProjection;
  questionId: StableId;
  occurrenceId: StableId;
  optionIds: readonly StableId[];
}): ContractResult<DecisionOccurrenceAuthorization>;

function planDecisionCandidate(input: {
  current: AutonomyProjection;
  authorization: DecisionOccurrenceAuthorization;
  questionId: StableId;
  occurrenceId: StableId;
  selected: DecisionOptionEffect;
  graphRevision: Sha256Digest;
}): ContractResult<DecisionCandidate>;

function reserveGrantExercise(
  current: AutonomyProjection,
  candidate: DecisionCandidate,
): ContractResult<{ reservation: ReservedGrantExercise; audit: readonly AuditEventPlan[] }>;

function revalidateGrantExercise(input: {
  current: AutonomyProjection;
  currentGraphRevision: Sha256Digest;
  reservation: ReservedGrantExercise;
}): ContractResult<GrantExerciseValidation>;

function planGrantExerciseResolution(input: {
  reservation: ReservedGrantExercise;
  validation: GrantExerciseValidation;
}): ContractResult<{ exercise: ReservedGrantExercise; audit: readonly AuditEventPlan[] }>;

function replayGrantExercises(
  audit: readonly CanonicalAuditEvent[],
): ContractResult<readonly ReservedGrantExercise[]>;
```

`set-mode`が`none ↔ semi`を表現する。`issue-full / replace-full`はmode=`full`とactive grantを同一transitionへ含める。`complete-intent`は人間turnを要求せずIntent completion identityを要求し、`full`ではactive grantをcompletedへ、全modeでworkflow execution stateをnullへ同一transitionで移す。`none / semi`のgrantはnullのままにする。`revoke-full`は人間turnと遷移先modeを必須にする。

M06はM04の`authorizeDecisionOccurrence`でfull grantとcanonical option ID集合を読み取り専用検証してからM05を呼ぶ。M05は入力optionsがauthorizationの集合・fingerprintと一致しなければ拒否する。回答選択後、M06は既存gate / question contractの`DecisionOptionEffect`をselected IDでexact lookupし、M04はselected IDが認可集合に含まれることを確認して`planDecisionCandidate`する。

reservation eventはgraph revisionを含むcandidate全体、candidate digest、grant ID、projection revisionを保存する。`replayGrantExercises`はこの完全なcandidateを復元し、`revalidateGrantExercise`自身が現在grant / graph revision、Intent、question / occurrence、selected option、scope、effect ID / payload fingerprint、candidate digestを比較する。caller提供のbooleanでcommit可否を決めない。validだけが`INTENT_GRANT_EXERCISED`、invalidは`INTENT_GRANT_EXERCISE_ABORTED`となる。

## M05 Auto Decision

```ts
type AutoDecisionRecord = {
  decisionId: StableId;
  intentUuid: StableId;
  questionId: StableId;
  occurrenceId: StableId;
  question: string;
  options: readonly { optionId: StableId; label: string }[];
  selectedOptionId: StableId;
  decider: "confirmed-policy" | "norm-history" | "solo-election" | "agent-recommendation";
  basis: string;
  grantId: StableId | null;
  evidenceFingerprint: Sha256Digest;
  degradedCapability: string | null;
  reviewState: "not-applicable" | "unreviewed" | "accepted" | "flagged";
};

type AutoDecisionInput = {
  intent: AutonomyProjection;
  authorization: DecisionOccurrenceAuthorization;
  questionId: StableId;
  occurrenceId: StableId;
  question: string;
  options: readonly { optionId: StableId; label: string }[];
  graphRevision: Sha256Digest;
  policies: readonly DecisionPolicy[];
  normCandidates: readonly DecisionCandidateEvidence[];
  historyCandidates: readonly DecisionCandidateEvidence[];
  capabilities: NativeHarnessCapabilities;
};

type DecisionCandidateEvidence = {
  optionId: StableId;
  selector: StableId;
  scopeLineage: StableId;
  normFingerprint: Sha256Digest;
  evidenceFingerprint: Sha256Digest;
};

type AutoDecisionOutcome =
  | { kind: "decided"; decision: AutoDecisionRecord }
  | {
      kind: "park";
      reason: "NORM_CONFLICT" | "AWAITING_HUMAN";
      basisFingerprint: Sha256Digest;
      resumeCondition: ResumeCondition;
    };

function resolveAutoDecision(input: AutoDecisionInput): ContractResult<AutoDecisionOutcome>;
function deterministicDecisionId(input: {
  intentUuid: StableId;
  questionId: StableId;
  occurrenceId: StableId;
  graphRevision: Sha256Digest;
}): StableId;
function planAutoDecisionCommit(input: {
  decision: AutoDecisionRecord;
  exercise: ReservedGrantExercise;
}): ContractResult<AuditEventPlan>;
function planDecisionReview(
  decision: AutoDecisionRecord,
  choice: "accept" | "flag",
  human: VerifiedHumanTurn,
): ContractResult<AuditEventPlan>;
```

解決順はconfirmed policy → unique norm / history → solo election → recommendationで固定し、1回の`resolveAutoDecision`がchain全体を走査する。出力はまだauditへappendしないdecision draftである。M06が選択肢専用candidateをM04でvalidate / reserve / revalidateした後だけ`planAutoDecisionCommit`を呼ぶ。同関数はdecisionのIntent / question / occurrence / selected optionが`exercise.candidate`と一致する場合だけ`AUTO_DECIDED` planを返す。election capability欠落はrecommendationへloud degradationし、`degradedCapability`へ記録する。新権限・不可逆・scope外・waiver、または一意に解けないnorm conflictではreservation前にparkする。

## M06 Workflow Coordinator

```ts
type WorkflowAdvanceInput = {
  intent: AutonomyProjection;
  compiled: CompiledWorkflow;
  audit: readonly CanonicalAuditEvent[];
  harness: HarnessRuntimeAdapter;
  requestedEffect: IdempotentWorkflowEffect | null;
  completion: CompletionEvaluation | null;
};

type WorkflowAdvanceEffect =
  | { kind: "directive"; directive: CanonicalDirective; audit: readonly AuditEventPlan[] }
  | { kind: "transaction"; audit: readonly AuditEventPlan[] }
  | { kind: "result"; result: WorkflowResult; audit: readonly AuditEventPlan[] };

type ReviewCycleHandoff = {
  qualityEpochId: StableId;
  reviewCycleId: StableId;
  previousReviewCycleId: StableId | null;
  judgeInvocationId: StableId | null;
  unresolvedBlockers: QualityEvidenceSnapshot;
};

type ResumeEvidence =
  | { kind: "human-retry"; human: VerifiedHumanTurn; conditionIdentity: StableId }
  | { kind: "evidence-change"; oldFingerprint: Sha256Digest; newFingerprint: Sha256Digest }
  | { kind: "norm-change"; oldFingerprint: Sha256Digest; newFingerprint: Sha256Digest }
  | { kind: "external-capability"; receiptId: StableId }
  | { kind: "user-unpark"; human: VerifiedHumanTurn; conditionIdentity: StableId };

type ResumePlan = {
  before: WorkflowResult;
  after: { workflowExecutionState: "running"; resumeCondition: null };
  audit: readonly AuditEventPlan[];
};

type MonitorResumePlan = {
  monitorId: StableId;
  audit: readonly AuditEventPlan[];
};

type TerminalInvocationState =
  | {
      kind: "park";
      intent: AutonomyProjection;
      reasonCode: Exclude<WorkflowResult["reasonCode"], null>;
      evidenceFingerprint: Sha256Digest;
      resumeCondition: ResumeCondition;
    }
  | { kind: "fail-invocation"; intent: AutonomyProjection; evidenceFingerprint: Sha256Digest };

type IntentCompletionPlan =
  | {
      kind: "completed";
      transition: GrantTransition;
      result: WorkflowResult & { outcome: "completed" };
      audit: readonly AuditEventPlan[];
    }
  | {
      kind: "parked";
      result: WorkflowResult & { outcome: "parked"; reasonCode: "AWAITING_HUMAN" };
      audit: readonly AuditEventPlan[];
    };

function advanceWorkflow(input: WorkflowAdvanceInput): ContractResult<WorkflowAdvanceEffect>;
function handoffLocalReviewCycle(input: ReviewCycleHandoff): ContractResult<QualityEvidenceSnapshot>;
function evaluateResumeCondition(condition: ResumeCondition, evidence: ResumeEvidence): ContractResult<ResumeCondition>;
function planWorkflowResume(input: {
  parked: WorkflowResult;
  satisfiedCondition: ResumeCondition;
  monitorResume: MonitorResumePlan | null;
}): ContractResult<ResumePlan>;
function projectNonCompletionWorkflowResult(input: TerminalInvocationState): ContractResult<WorkflowResult>;
function planIntentTerminal(input: {
  current: AutonomyProjection;
  command: SystemGrantCommand;
  completion: CompletionEvaluation;
}): ContractResult<IntentCompletionPlan>;

function planIdempotentWorkflowEffect(input: {
  exercise: ReservedGrantExercise;
  effect: IdempotentWorkflowEffect;
  audit: readonly CanonicalAuditEvent[];
}): ContractResult<AuditEventPlan>;
```

`REPAIR_STALLED`のresumeは`evaluateResumeCondition → M02 planMonitorResume → planWorkflowResume → M07 append transaction`の順で行い、`WORKFLOW_UNPARKED`と`LOOP_LATCH_CLEARED`を同一transactionへ含める。`AWAITING_HUMAN / NORM_CONFLICT / USER_PARKED`はMonitorを生成しないため、condition検証後に`monitorResume=null`で`WORKFLOW_UNPARKED`だけをappendする。reasonとmonitor planの組合せが逆なら`ILLEGAL_STATE`とする。

grant exerciseはreservationをappend後に再検証する。裁定成功時はM04の`INTENT_GRANT_EXERCISED`、M05の`AUTO_DECIDED`、`planIdempotentWorkflowEffect`が返す既存workflow eventを、順序付きの単一M07 transactionで原子的にappendする。effectはevent replayからmaterializeされるためaudit外の後続副作用を持たない。crashはtransaction前なら3eventとも未commit、後なら3eventともcommit済みとなり、effectId / event identityの再送は同じreceiptを返す。abort時は`INTENT_GRANT_EXERCISE_ABORTED`だけをappendする。

`planIntentTerminal`だけがcompletedを生成できる。M08のcheckが`complete`で、`command.completionIdentity`がevidence IDと一致する場合、M08の`LIVE_COMPLETION_EVIDENCE_VALIDATED`、M04 `planIntentCompletion`のgrant completed / workflow null event、M06の`WORKFLOW_COMPLETED`を1つのM07 transactionへ集約し、そのcommit後にcompleted resultを返す。checkが`incomplete`ならgrant / workflowを完了させず、不足harness集合をidentityへ含む`parked / AWAITING_HUMAN`と`external-capability` resume conditionを返す。`projectNonCompletionWorkflowResult`にはcompleted入力がない。

## M07 Audit / Status Projection

```ts
type AuditTransaction = { transactionId: StableId; expectedRevision: number };
type AppendResult = { receipt: AuditCommitReceipt };
type IntentProjection = {
  intentUuid: StableId;
  autonomy: AutonomyProjection;
  workflowResult: WorkflowResult | null;
  decisionCount: number;
  unreviewedDecisionCount: number;
};

type MachineStatus = {
  intentUuid: StableId;
  autonomyMode: AutonomyMode;
  workflowExecutionState: WorkflowExecutionState;
  grant: GrantProjection | null;
  suspendedReason: WorkflowResult["reasonCode"];
  resumeCondition: ResumeCondition | null;
  decisionPolicyCount: number;
  unreviewedDecisionCount: number;
};

type DecisionQuery = {
  intentUuid: StableId;
  lifecycle: "active" | "completed" | "either";
  reviewState?: AutoDecisionRecord["reviewState"];
};

type CompletedReviewAppend = {
  intentUuid: StableId;
  decisionId: StableId;
  choice: "accept" | "flag";
  human: VerifiedHumanTurn;
};

function appendProtectedEvents(
  tx: AuditTransaction,
  events: readonly AuditEventPlan[],
): ContractResult<AppendResult>;
function readCanonicalAudit(intentUuid: StableId): ContractResult<readonly CanonicalAuditEvent[]>;
function projectHumanStatus(state: IntentProjection): string;
function projectMachineStatus(state: IntentProjection): MachineStatus;
function listAutoDecisions(query: DecisionQuery): ContractResult<readonly AutoDecisionRecord[]>;
function getAutoDecision(intentUuid: StableId, decisionId: StableId): ContractResult<AutoDecisionRecord>;
function appendCompletedDecisionReview(input: CompletedReviewAppend): ContractResult<AppendResult>;
```

M07はeventを保存・取得するだけで、Monitor / Grant / Decision projectionのreducerは各owner moduleにある。completed Intentでは明示されたtarget `intentUuid`のsealed shard内にdecision IDが実在し、`VerifiedHumanTurn.intentUuid`のcanonical auditにturnが実在することを確認した場合だけ、turn reference付き`AUTO_DECISION_REVIEWED`をtargetへ専用validator経由で追記できる。decision IDからIntentを逆引きせず、target以外の成果物・lifecycle eventは変更しない。

## M08 Harness Descriptor Registry

```ts
type NativeHarnessCapabilities = {
  judgeInvocation: "native" | "unavailable";
  judgeReplay: "invoke-once" | "unavailable";
  soloElection: "native" | "unavailable";
  liveAuthorization: "credential-attested" | "unavailable";
  sessionHook: "native" | "manual" | "unavailable";
  compactionHook: "native" | "unavailable";
};

type NativeFacts = Readonly<Record<string, string | undefined>>;

type HarnessDescriptor = {
  id: "claude" | "codex" | "cursor" | "opencode" | "kimi" | "kiro" | "kiro-ide";
  hostDir: ".claude" | ".codex" | ".cursor" | ".opencode" | ".kimi-code" | ".kiro";
  packageFace: boolean;
  selfInstall: boolean;
  autonomyContract: boolean;
  autonomyLive: boolean;
  native: NativeHarnessCapabilities;
};

type ValidatedHarnessRegistry = { rows: readonly HarnessDescriptor[]; digest: Sha256Digest };
type HarnessRuntimeAdapter = { descriptor: HarnessDescriptor; observed: NativeHarnessCapabilities };
type RevisionBinding = { implementationRevision: StableId; packageDigest: Sha256Digest };
type LiveExecutionAuthorization = {
  authorizationId: StableId;
  intentUuid: StableId;
  harnessId: HarnessDescriptor["id"];
  revision: RevisionBinding;
  environmentId: StableId;
  issuerPrincipalId: StableId;
  traceId: StableId;
  spanId: StableId;
  attestationDigest: Sha256Digest;
  authorizationEventIdentity: StableId;
};
type CommittedLiveExecutionAuthorization = LiveExecutionAuthorization & {
  commitReceipt: AuditCommitReceipt;
};
type LiveAuthorizationPort = {
  authorize(input: {
    intentUuid: StableId;
    harnessId: HarnessDescriptor["id"];
    revision: RevisionBinding;
  }): Promise<ContractResult<Omit<LiveExecutionAuthorization, "authorizationEventIdentity">>>;
};
type LiveReceipt = RevisionBinding & {
  receiptId: StableId;
  intentUuid: StableId;
  harnessId: HarnessDescriptor["id"];
  authorizationId: StableId;
  environmentId: StableId;
  traceId: StableId;
  attestationDigest: Sha256Digest;
  outcome: "passed" | "skipped" | "failed";
  judgeObserved: boolean;
  electionOutcome: "elected" | "loud-degradation" | "not-observed";
};
type ValidatedLiveReceipt = LiveReceipt & {
  outcome: "passed";
  judgeObserved: true;
  electionOutcome: "elected" | "loud-degradation";
};
type CompletionEvidence = {
  evidenceId: StableId;
  intentUuid: StableId;
  registryDigest: Sha256Digest;
  revision: RevisionBinding;
  requiredHarnessIds: readonly ["claude", "codex", "cursor", "opencode", "kimi"];
  receiptIds: readonly StableId[];
  authorizationIds: readonly StableId[];
};
type CompletionCheck =
  | { kind: "complete"; evidence: CompletionEvidence }
  | {
      kind: "incomplete";
      intentUuid: StableId;
      registryDigest: Sha256Digest;
      revision: RevisionBinding;
      missingHarnessIds: readonly HarnessDescriptor["id"][];
    };
type CompletionEvaluation = {
  check: CompletionCheck;
  audit: readonly AuditEventPlan[];
};

function harnessDescriptor(id: HarnessDescriptor["id"]): HarnessDescriptor;
function validateHarnessRegistry(rows: readonly HarnessDescriptor[]): ContractResult<ValidatedHarnessRegistry>;
function captureHarnessRuntime(descriptor: HarnessDescriptor, native: NativeFacts): ContractResult<HarnessRuntimeAdapter>;
function planLiveExecutionAuthorization(input: {
  authorization: Omit<LiveExecutionAuthorization, "authorizationEventIdentity">;
  registry: ValidatedHarnessRegistry;
}): ContractResult<{ authorization: LiveExecutionAuthorization; audit: readonly AuditEventPlan[] }>;
function bindLiveAuthorizationCommit(input: {
  authorization: LiveExecutionAuthorization;
  receipt: AuditCommitReceipt;
}): ContractResult<CommittedLiveExecutionAuthorization>;
function validateLiveReceipt(
  receipt: LiveReceipt,
  expected: RevisionBinding,
  registry: ValidatedHarnessRegistry,
  authorization: CommittedLiveExecutionAuthorization,
  audit: readonly CanonicalAuditEvent[],
): ContractResult<ValidatedLiveReceipt>;
function evaluateIntentLiveCompletion(input: {
  intentUuid: StableId;
  receipts: readonly ValidatedLiveReceipt[];
  expected: RevisionBinding;
  registry: ValidatedHarnessRegistry;
}): ContractResult<CompletionEvaluation>;
```

registryは7行を正本とし、初期5harnessだけ`autonomyContract / autonomyLive=true`、`judgeReplay="invoke-once"`、`liveAuthorization="credential-attested"`とする。future harnessがこのcapabilityを持たない場合はadapter preflightでloudに未対応とし、Core algorithmをforkしない。

S02の`LiveAuthorizationPort`はcredentialを持つ認可済み環境だけが実装できるpreflight seamであり、secret自体を返さない。M08はsafe metadataをregistry / Intent / revisionへ束縛してprotected `LIVE_SMOKE_AUTHORIZED` eventを計画し、M07 commit receiptにそのevent identityが含まれる場合だけ`CommittedLiveExecutionAuthorization`を作る。M09はこのcommitted authorizationなしにlive invocationを開始しない。

`validateLiveReceipt`はreceiptとauthorizationのIntent、harness、revision、environment、trace、attestation digestがexact matchし、canonical auditにprotected authorization eventが存在すること、`outcome=passed`、`judgeObserved=true`、`electionOutcome=elected | loud-degradation`を必須にする。構造的に作ったpassed objectだけでは`ValidatedLiveReceipt`にならない。`evaluateIntentLiveCompletion`は必須5harnessの検証済みreceiptだけからCompletionEvidenceを作る。

## M09 Verification Kit

```ts
type HarnessContractFixture = { fixtureId: StableId; graphRevision: Sha256Digest; expected: WorkflowResult };
type ContractReceipt = { harnessId: HarnessDescriptor["id"]; fixtureId: StableId; passed: boolean };

function runHarnessContract(fixture: HarnessContractFixture, adapter: HarnessRuntimeAdapter): ContractReceipt;
function runOptInLiveSmoke(input: {
  authorization: CommittedLiveExecutionAuthorization;
  adapter: HarnessRuntimeAdapter;
}): LiveReceipt;
```

M09はcontract / live実行とraw receipt生成を所有するが、production完了判定を所有しない。skip receiptはM08の`ValidatedLiveReceipt`にならない。M06はM08の`CompletionCheck`なしに完了候補を処理できず、検証済み`CompletionEvidence`なしにcompletedを生成できない。

## Errorとtransactionの共通契約

1. parser / reducer / plannerはthrowせず`ContractResult`を返す。
2. M07 append失敗時はstate projectionと既存effectを変更しない。
3. M06は複数moduleの`AuditEventPlan`を1つのtransactionへ結合し、event identity重複を拒否する。
4. 未知event、未知route、未知reason code、illegal state combinationはfail-closedする。
5. 同じtransaction / delivery / judge invocation / exercise / effect identityの再送は同じreceiptまたはno-opを返す。
