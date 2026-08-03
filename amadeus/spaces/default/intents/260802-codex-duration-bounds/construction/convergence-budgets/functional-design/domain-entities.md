# Domain Entities — convergence-budgets

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## モデル根拠

`unit-of-work`／`unit-of-work-story-map` の #1998 scope、`requirements` FR-02／FR-03／FR-04A、`components` C2／C3、`component-methods` のReserveResult／RetryFacts、`services` のretry flowを正とする。

## Entity と Value Object

### BudgetSubject

durable counterの集約単位。`rootOperationId`、`kind`、`subjectId`を複合identityとし、初回reserveで`policySnapshot`を固定する。kindは`stop-continuation | recoverable-retry | question | follow-up | review | unit-attempt`。sessionやadapterはidentityに含めない。

### BudgetPolicySnapshot

`effectiveCap`、`configVersion`、`configDigest`、`capturedAtEventId`を持つimmutable value object。同じBudgetSubjectの後続requestは完全一致を必須とし、config reloadで差し替えない。

### BudgetProjection

canonical eventからfoldした現在値。`subject`、`value`、`cap`、`lastReceiptId`を持つ。valueは0以上cap以下で単調増加する。

### ExecutionReservation

#1602で定義した開始許可を再利用する。`reservationId`、`operationId`、`idempotencyKey`、`dispatchState`、任意の`attemptId`／`slotId`／`nativeHandle`を持つ。dispatchStateは`reserved | claimed | dispatch-confirmed | terminal`。budget消費とattempt／slot確保は同じreceiptへ束ねられる。

### BudgetExhausted

新規開始を拒否するvalue object。`kind`、`subjectId`、`value`、`cap`、`termination: TerminationReasonV1`を持つ。entityではなく決定結果であり、counterを変更しない。

### RetryFacts

`retryClass`、`effectStatus`、`causeCode`、`sourceSurface`の4fieldからなるadapter入力。自由記述の例外本文では判定しない。

### RetryClassification

closed discriminated union。retryableは`{kind:"retryable", ruleId, version:1}`で、ruleIdは`RR-V1-WSU-DISPATCH | RR-V1-WSU-WORKER-START | RR-V1-ROPT-STOP | RR-V1-ROPT-RESULT`。非許可は`{kind:"non-retryable", reasonCode:"retry-not-allowlisted"}`。unknownは`{kind:"unsafe-unknown", reasonCode:"retry-policy-version-unknown" | "retry-effect-unknown"}`であり、retryableへ変換しない。

### TerminationReasonV1

`schemaVersion: 1`、closed `reasonCode`、`budget: Fact<{consumed:number;cap:number}>`、`lastDurableProgress`、`recommendedNextAction`、`rootOperationId`を持つ。未知codeはdecoder境界でraw値を保持したsafe-stop errorへ落とすが、V1 entityへ混入させない。全harness rendererの共通入力である。

## Lifecycle

BudgetSubject自体はworkflow中にpolicy snapshotとともに維持される。各新規reserveでBudgetProjectionが単調に進む。同じidempotency keyでは同じExecutionReservationを返す。policy mismatchはcounter不変のtyped refusal、cap到達後はBudgetExhaustedを返し、TerminationReasonV1をcommitしてterminalとなる。canonical write失敗だけはcommitできないため`persisted:false`のrefusalとしてprocess boundaryから返す。明示Redoで新rootになった場合のみ別BudgetSubjectとなる。

## 関係と不変条件

| Relation | Constraint |
|---|---|
| BudgetSubject 1:N ExecutionReservation | receipt数ではなく一意reserve数がvalueに一致 |
| BudgetSubject 1:1 BudgetPolicySnapshot | 初回reserve後はimmutable |
| ExecutionReservation 0..1:1 ExecutionAttempt | claim前拒否ではattemptなし |
| RetryFacts 1:1 RetryClassification | allowlist versionを記録 |
| BudgetExhausted 1:1 TerminationReasonV1 | availableなbudget factのconsumedはcapと一致 |

- counterはcanonical auditから再構築できる。
- adapter名、session ID、worker IDの変更でsubjectを分割しない。
- retry budgetとstop budgetは別subjectだが、C2が同じatomic reserve機構で管理する。
- 具体的capはentity shapeに埋め込まず、検証済み設定から受け取る。

## Revision 1 Reconciliation

`RetryClassification`と`TerminationReasonV1`をApplication Designと同じclosed unionへ統一し、ReserveResultから直接参照できる形にした。
