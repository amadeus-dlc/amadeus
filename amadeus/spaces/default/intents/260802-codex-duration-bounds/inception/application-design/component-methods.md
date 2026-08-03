# コンポーネント公開メソッド — Codex Duration Bounds

## Upstream Inputs

`requirements.md` のFR-01〜FR-08、`architecture.md` のone-core-many-harnesses、`component-inventory.md` の既存責務、`team-practices.md` のTDD・生成物同期・harness中立coreを入力とする。

## Execution Contract

```ts
interface ExecutionContract {
  beginRootProposal(input: BeginRootInput, clock: Clock): OperationProposal;
  beginChildProposal(parent: ExecutionIdentity, input: BeginChildInput, clock: Clock): OperationProposal;
  attemptFromConfirmation(confirmation: DispatchConfirmation, clock: Clock): AttemptStart;
  finishAttempt(start: AttemptStart, outcome: AttemptOutcome, clock: Clock): AttemptFinished;
  finishOperation(start: ExecutionStart, outcome: OperationOutcome, clock: Clock): OperationFinished;
  normalizeNativeFacts(input: NativeExecutionFacts): NormalizedExecutionFacts;
}
```

- `beginRootProposal`／`beginChildProposal`: identity chainとmint要求を純粋に検証する。実IDのmintとcommitはC2だけが行う。
- `attemptFromConfirmation`: C2がlock内で `claimed→dispatch-confirmed` をcommitした `attemptId`、`nativeAcceptedAt`、`startedAt: Fact<Instant>`からAttemptStartを構築する。claim時刻を実開始時刻へ流用せず、C1は採番もdurable消費判定もしない。
- `finishAttempt`／`finishOperation`: durationとmeasurement qualityを確定する。負のwall durationは0へ丸めずinvalid。
- `normalizeNativeFacts`: adapter factをavailability付き共有形へ変換する。adapter自身は合否判定しない。

Error: invalid identity chain、non-monotonic core clock、duplicate finishはtyped error。canonical writerはこれらをfail-closedで扱う。

## Execution Lifecycle Coordinator

```ts
interface ExecutionLifecycleCoordinator {
  startOperation(request: StartOperationRequest): Result<ExecutionStarted, ExecutionRefusal>;
  reserveExecution(request: AtomicReserveRequest): Result<ExecutionReservation, ExecutionRefusal>;
  reserveInteraction(request: InteractionReserveRequest): InteractionReserveResult;
  claimDispatch(reservationId: string, idempotencyKey: string): DispatchClaimResult;
  confirmDispatch(request: ConfirmDispatchRequest): Result<DispatchConfirmation, ExecutionRefusal>;
  issueStartPermit(request: StartPermitRequest): Result<StartPermit, ExecutionRefusal>;
  commitInteractionTransition(command: InteractionTransitionCommand): Result<InteractionCommitReceipt, ExecutionRefusal>;
  commitPoolTransition(command: PoolTransitionCommand): Result<PoolCommitReceipt, ExecutionRefusal>;
  finishAttempt(request: FinishAttemptRequest): Result<AttemptFinished, ExecutionRefusal>;
  finishOperation(request: FinishOperationRequest): Result<OperationFinished, ExecutionRefusal>;
  readProjection(query: ExecutionQuery): ExecutionProjection;
}
```

すべてのmutation、canonical ID、semantic ordinalの採番はC2だけが行う。`reserveExecution` は既存per-intent audit lock内で `projection読取 → idempotency照合 → C3/C5純粋decision → operation/attempt/slot ID mint → budget/attempt/slotを含む単一reserve event append → reservation返却` の順に処理する。`reserveInteraction` はpre-minted IDではなく`InteractionKeyMaterial`を受け、同じlock内で既存instanceをresolveまたはmintしてbudget reserveと一緒にcommitする。

`issueStartPermit`はcanonical commit receiptと、同じevent setを反映したC6のstate/runtime必須projection receiptを照合して開始許可を発行する。OTel receiptは要求しない。`claimDispatch` はpermit取得済みreservationを `reserved→claimed` に一度だけ遷移させ、dispatch所有権と`claimAcquiredAt`をcommitするが実開始時刻はcommitしない。C7がnative requestを受理した直後に`confirmDispatch`がnative handle、`nativeAcceptedAt`、利用可能なら`startedAt`をcommitする。claim後crashではC7の`queryDispatchEffect`を使い、`no-effect-confirmed`だけを`dispatch-not-started`へ閉じる。`effect-possible | unknown`は`dispatch-effect-unknown`へ安全終端し、新規dispatchしない。C1はconfirmationからAttemptStartを構築する。

`commitInteractionTransition`と`commitPoolTransition`はtyped decisionを1 event batchとしてcommitする。同じidempotency key・同じcanonical payload fingerprintの再送は既存receiptを返し、異なるfingerprintは拒否する。fingerprintは意味入力、outcome、reasonを含み、観測時刻と計算済みdurationを除外する。最初にcommitされたmeasurementが再送時にも正準値となる。canonical write自体が失敗した場合は、その失敗を同じjournalへ記録しようとせず、process boundaryから`ExecutionRefusal{kind:"canonical-write-failed", persisted:false}`を返す。C3、C4、C5はaudit writerを持たない。

## Convergence Policy

```ts
interface ConvergencePolicy {
  evaluateBudget(current: number, request: BudgetReserveRequest): Result<BudgetDecision, BudgetExhausted>;
  classifyRetry(facts: RetryFacts): RetryClassification;
  terminationForBudget(exhausted: BudgetExhausted): TerminationRecord;
}

interface RetryFacts {
  retryClass: "recoverable-transient" | "non-retryable" | "unknown";
  effectStatus: "no-effect-confirmed" | "effect-possible" | "unknown";
  causeCode: "worker-spawn-unavailable" | "read-only-probe-timeout" | string;
  sourceSurface: "stop-continuation" | "swarm-dispatch" | "swarm-worker-start" | "swarm-result-collection";
}

type RetryClassification =
  | { kind: "retryable"; ruleId: "RR-V1-WSU-DISPATCH" | "RR-V1-WSU-WORKER-START" | "RR-V1-ROPT-STOP" | "RR-V1-ROPT-RESULT"; version: 1 }
  | { kind: "non-retryable"; reasonCode: "retry-not-allowlisted" }
  | { kind: "unsafe-unknown"; reasonCode: "retry-policy-version-unknown" | "retry-effect-unknown" };
```

- `evaluateBudget`: 純粋関数。`current < cap` の場合だけreserve decisionを返す。audit foldとappendはC2が同じlock内で行う。
- `classifyRetry`: versioned allowlistへ4fieldをそのまま入力し、許可行のstable rule IDを返す。`RR-V1-WSU-DISPATCH`はworker spawn unavailable、`RR-V1-WSU-WORKER-START`はworker start確認、`RR-V1-ROPT-STOP`はStop continuation、`RR-V1-ROPT-RESULT`はread-only result収集だけに対応する。未知cause、effect-possible/unknown、auth/permission、validation/config、canonical writeは非対象。
- `terminationForBudget`: `TerminationReasonV1`を返す。`budget`は`Fact<{consumed,cap}>`、reason code、last durable progress、推奨action、root operation IDを同じrecordへ持つ。

## Interaction Budget Adapter

```ts
interface InteractionBudgetAdapter {
  reserveQuestion(input: QuestionKeyMaterial): InteractionReserveResult;
  reserveFollowUp(input: FollowUpKeyMaterial): InteractionReserveResult;
  reserveReview(input: ReviewKeyMaterial): InteractionReserveResult;
}
```

question表示、follow-up表示、reviewer dispatchの直前に呼び、C2の`reserveInteraction`へcanonical key materialを渡す。question keyは`intentUuid/stageInstanceId/stageRevision/questionCatalogId`、follow-up keyは`parentInteractionId/ambiguityKey/ordinal`、review keyは`stageInstanceId/stageRevision/artifactSetId/ordinal`である。C2がresolve-or-createとreserveを同じlockで行うため、instance IDの事前mintはない。

`InteractionTransitionCommand`は`mark-delivered | record-answer | record-review-result | fail | unavailable | cancel | exhaust`のclosed unionである。reserved resultはinstance IDとreservation receiptを返し、exhausted/refused resultは`summaryId`と`TerminationReasonV1`を返す。summaryはexhausted、failed、unavailableの各terminal interactionにつきちょうど1件生成する。question/follow-upのartifact参照はoptional、reviewは`artifactSetId`必須とし、同じsummaryを既存approval boundaryへ渡す。

## Bounded Unit Pool

```ts
interface BoundedUnitPool {
  decideInitialEnqueue(input: InitialEnqueueContext): PoolTransitionProposal;
  decideAcquire(input: AcquireContext): PoolReservationProposal;
  decideAfterAttempt(input: AfterAttemptContext): PoolTransitionProposal;
  foldProjection(events: readonly PoolEvent[]): PoolProjection;
}
```

- `InitialEnqueueContext`: immutable `projection`、`unitId`、`dependencyDag`、`batchState`を持つ。`decideInitialEnqueue`は「新queue entryが必要」とそのUnitをproposalするだけで、IDやsequenceをmintしない。
- `AcquireContext`: immutable `projection`、`activeCap`、`dependencyDag`、`budgetDecision`を持つ。`decideAcquire`はactive < capかつbudgetがreserve可能な場合だけ最小sequenceのqueued Unitをproposalする。
- `AfterAttemptContext`: immutable `projection`、`activeCap`、`dependencyDag`、`attemptOutcome`、`retryDecision`を持つ。`decideAfterAttempt`は `settle+slot release` と、必要なretry entry要求、dependent cancellation集合、batch resultを同じproposalに含める。
- `foldProjection`: 渡されたimmutable event列からqueued/active/terminal/max-activeを純粋にfoldする。auditを読むI/OはC2の責務であり、C5にhidden readerはない。

`PoolTransitionCommand` は `initial-enqueue | acquire | record-reconciliation | settle-release | settle-release-requeue | settle-release-cancel-dependents | terminate-batch | late-result-observed` のdiscriminated unionである。dispatch confirmationは共通`confirmDispatch`を使う。C2はlock内で `idempotency照合 → audit読取/fold → C5 proposal → canonical ID/sequence mint → event batch append → receipt` を行う。`queueEntryId` と `unitId` は別fieldで、initial enqueueのkeyはUnitごとに安定、retry requeueのkeyはUnit attempt ordinalごとに安定する。同じkeyの再送は純粋decisionを再評価せず既存receiptと同じC2-minted IDを返すため、二重enqueue/releaseしない。

initial enqueueはKahn法でdependency count 0のlayerを順に確定し、同一layerを`unitId`のUTF-8 bytewise昇順で並べる。存在しない`planOrder`を要求しない。canonical `UnitOutcome`は`succeeded | failed | cancelled | dependency-unsatisfied | batch-unsafe | dispatch-not-started | dispatch-effect-unknown | worker-unresponsive | cancel-unconfirmed`のclosed unionである。

### Unit terminal failure continuation table

| Failure class | Canonical state | Remaining Unit relation | Batch result | Queue action |
|---|---|---|---|---|
| local Unit failure / attempt exhausted | healthy | failed Unitへtransitive依存 | `partial-failure` | dependent Unitを`dependency-unsatisfied`で取消 |
| local Unit failure / attempt exhausted | healthy | failed Unitと独立 | `partial-failure` | FIFOを維持して継続 |
| unknown effect、state inconsistency、canonical write failure、auth/config failure | unsafe/unknown | すべて | `terminated` | 新規dispatchを停止。queuedを`batch-unsafe`で終端し、activeは結果回収だけ行う |
| human cancel/abort | healthy | すべて | `cancelled` | queuedをcancelし、activeは取消要求後の実結果を記録 |

retry可能でbudgetが残る場合はterminal failureではなく、slot release後に同じUnitを新しいenqueue sequenceでFIFO末尾へ再投入する。batch-level resultは全Unitがterminalになった時点で `completed | partial-failure | terminated | cancelled` のいずれかに一意に決まる。

## Projection Interfaces

```ts
interface ExecutionProjectionSink {
  projectRequired(eventSet: ExecutionEventSet): RequiredProjectionReceipt;
  rebuildRequired(rootOperationId: string): RequiredProjectionReceipt;
  projectTelemetry(event: ExecutionEvent): TelemetryProjectionReceipt;
}
```

`RequiredProjectionReceipt`はstateとruntime graphの両方についてevent-set digest、projected revision、成功状態を持ち、C2の`issueStartPermit`が検証する。projection失敗はcanonical eventを巻き戻さない。C2は故障sinkを通さず`projection-blocked`をauditへ直接記録し、`rebuildRequired`成功後にpermitを再評価する。OTelはmachine-localで再送不能を許すがdrop reasonを残し、開始barrierには含めない。すべてのsinkは `Fact<T>.state`、`clockSource`、`measurementQuality`、`measurementError` を独立fieldとして保持し、unavailable/legacy-unknown/incompleteを成功値や0へ潰さない。prompt/answer本文はprojectしない。

## Harness Capability Port

```ts
interface HarnessCapabilityPort {
  harness: "claude" | "codex" | "cursor" | "kiro" | "kiro-ide" | "opencode" | "kimi";
  normalize(payload: unknown): NativeExecutionFacts;
  capabilities(): HarnessCapabilities;
  dispatch(request: AuthorizedDispatch): DispatchResult;
  queryDispatchEffect(query: DispatchEffectQuery): "no-effect-confirmed" | "effect-possible" | "unknown";
  deliverInteraction(request: AuthorizedInteractionDelivery): InteractionDeliveryResult;
  queryInteractionEffect(query: InteractionEffectQuery): "no-effect-confirmed" | "effect-possible" | "unknown";
  requestCancellation(request: AuthorizedCancellation): CancellationRequestResult;
  queryCancellation(query: CancellationQuery): CancellationQueryResult;
}
```

`capabilities()` はsession end、compact、stop recursion flag、tool ID、worker lifecycle、model/version、native monotonic clock、dispatch/interaction/cancellationのidempotency・effect照会availabilityを返す。各side effect methodは既存認可後だけ実行し、policy判断を行わない。照会不能は`unknown`であり、成功やno-effectへ推測しない。

## Error Contract

| Error class | Retry | Mutation | User-visible result |
|---|---|---|---|
| allowlisted transient + no-effect-confirmed | budget内のみ | reserve後に新attempt | attempt/remainingを短く通知 |
| budget exhausted | しない | termination eventのみ | reason、value/cap、last progress、next action |
| unknown/effect possible | しない | safe termination | 安全停止理由 |
| auth/permission/config/validation | しない | 既存境界に従う | corrective action |
| canonical audit/state write failure | しない | fail-closed | state inconsistency |
| advisory adapter payload invalid | しない | canonical state不変 | capability/drop reason |

## Method Traceability

各methodは `components.md` のC1〜C7に対応し、services orchestrationは `services.md`、依存方向は `component-dependency.md`、選択理由は `decisions.md` を正とする。
