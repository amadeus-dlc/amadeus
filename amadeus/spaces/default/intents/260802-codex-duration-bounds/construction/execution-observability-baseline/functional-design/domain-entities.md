# Domain Entities — execution-observability-baseline

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## モデル根拠

`unit-of-work`／`unit-of-work-story-map` の #1602 scope、`requirements` FR-01、`components` のpublic contract、`component-methods` のC1／C2 method、`services` のprojection flowを正準入力とする。

## Aggregate と Entity

### ExecutionAggregate

stage instance単位のaggregate root。`rootOperationId`、`stageInstanceId`、`revision`、`origin`、`status`、`lastDurableProgress`を持つ。statusは`pending | active | approved | completed | rejected | parked | safely-stopped`の単方向遷移を基本とし、Redoは同じaggregateを書き戻さず新aggregateを作る。

### LogicalOperation

root、agent、toolの論理実行を表す。`operationId`、`rootOperationId`、任意の`parentOperationId`／`supersedesOperationId`、`kind`、`origin: ExecutionOrigin`、`status`を持つ。statusは`proposed | active | terminal`。parent chainは同じroot内で閉じ、循環を許さない。`ExecutionOrigin`はstage slug/instance、任意のagent role、任意のtool nameをそれぞれ`Fact`として持つ。

### ExecutionReservation

実開始前のdurable予約。`reservationId`、`operationId`、`idempotencyKey`、`payloadFingerprint`、`dispatchState`、`consumedAt`、任意の`attemptId`／`slotId`／`nativeHandle`／`claimAcquiredAt`／`nativeAcceptedAt`／`startedAt: Fact<Instant>`を持つ。`dispatchState`は`reserved | claimed | dispatch-confirmed | terminal`で逆遷移しない。`claimed`は権利取得、`dispatch-confirmed`はnative受付証拠であり、実開始可否は`startedAt`のavailabilityで表す。

### ExecutionAttempt

1回の実開始予約を表す。`attemptId`、`operationId`、`ordinal`、`origin`、`dispatchEvidence`、`startedAtFact`、`finishedAtFact`、`outcome`、`terminationReason`、`measurement`を持つ。outcomeは`succeeded | failed | cancelled | dispatch-not-started | dispatch-effect-unknown`。同じoperation内でordinalはC2がlock内で単調採番し、budget拒否ではentityを生成しないが、commit済みreservationはnative未開始でも消費する。

### StartPermit

native開始に必要なvalue object。`reservationId`、`canonicalCommitReceiptId`、`stateProjectionReceiptId`、`runtimeProjectionReceiptId`を持つ。4項目が同じevent setへ結び付く場合だけvalidで、OTel receiptは含めない。

### DurationMeasurement

`clockSource`、`measurementQuality`、任意の`durationMs`／`measurementError`を持つvalue object。qualityは`monotonic | wall-fallback | invalid`。invalid時にdurationは存在しない。

### Fact

native値のavailabilityを表すvalue object。状態は`available | unavailable | legacy-unknown | incomplete`。`incomplete`はmissing field集合を持ち、利用可能な部分値を保持できる。

### ProjectionReceipt

`eventSetDigest`、`projectedRevision`、`sink`、`status`、任意の`dropReason`を持つ。sinkは`state | runtime-graph | otel`、statusは`projected | pending-rebuild | dropped`。state/runtimeの同一event set receiptだけがStartPermitへ参加し、canonical event自体の成功とは分離する。

### BaselineRun

固定比較workloadのaggregate。`baselineRunId`、`rootOperationId`、`workloadId`、`workloadVersion`、`inputDigest`、`observedGitSha: Fact<string>`、`startCriteria: Fact<Criteria>`、`expectedEndCriteria: Fact<Criteria>`、`actualEndCriteria: Fact<Criteria>`、`status`を持つ。statusは`planned | running | complete | complete-with-gaps | invalid`。

### ExecutionEnvironmentSnapshot

`baselineRunId`、harness名／version、model名／version、capability snapshot、clock availabilityをすべて`Fact`として保持する。native値を取得できない場合もsnapshot自体は存在する。

### BaselineManifest

BaselineRun、ExecutionEnvironmentSnapshot、root／child／attemptごとのidentity・ExecutionOrigin・environment fact・duration・outcome・termination reasonを機械可読に投影するvalue object。canonical auditから再構築でき、projected pathは`<record>/construction/execution-observability-baseline/evidence/baseline-manifest.json`である。

## Baseline Status 決定表

`invalid`: workload/input digest不一致、非terminal attempt、またはroot/workload/input digest/observed SHA/開始・終了条件の欠測。`complete`: それらがavailableで全attempt terminalかつ環境factもavailable。`complete-with-gaps`: 必須条件を満たし、欠測がmodel名/version、harness native version、capability、clock availabilityだけ。その他の状態は存在しない。

## Revision 1 Reconciliation

ExecutionOrigin、Fact化したbaseline field、required projection receipt、時刻の責務分離、status決定表を追加し、Application Designの改訂公開契約と一致させた。

## 関係

| Parent | Relation | Child | Constraint |
|---|---|---|---|
| ExecutionAggregate | 1:N | LogicalOperation | root operationはちょうど1つ |
| LogicalOperation | 1:N | LogicalOperation | parent/root chainを維持 |
| LogicalOperation | 1:N | ExecutionAttempt | retryでもoperation不変 |
| ExecutionAttempt | 1:1 | ExecutionReservation | claim済みreservationだけ開始可能 |
| ExecutionAttempt | 1:1 | DurationMeasurement | invalidを0へ変換しない |
| canonical event | 1:N | ProjectionReceipt | sinkごとに独立結果 |
| BaselineRun | 1:1 | ExecutionAggregate | root operationで相関 |
| BaselineRun | 1:1 | ExecutionEnvironmentSnapshot | 欠測もFactで保持 |
| BaselineRun | 1:1 | BaselineManifest | auditからのprojection |

## Identity と Lifecycle 不変条件

- C2だけがcanonical IDを生成し、C1とadapterはproposal／factを返す。
- 同一idempotency keyは同じentity identityへ解決する。
- 同一keyでもpayload fingerprintが異なる場合はconflictで拒否する。
- terminal entityは再開せず、必要ならsupersedes付き新entityを作る。
- resumeは既存の非terminal entityを復元する。
- native harness identityはFactとして関連付けるが主キーにしない。
- root／child／reserve／claim／confirm／finishはversion付きcanonical key tupleを使い、caller独自の文字列生成を許さない。

## 後続Unitへの公開境界

`convergence-budgets`はExecutionReservation／ExecutionAttempt、`interaction-budgets`はLogicalOperationとreservation、`bounded-unit-pool`はattempt／slot identityを参照する。全Unitで同じ語彙を使い、Codex adapter固有entityをdomain modelへ追加しない。
