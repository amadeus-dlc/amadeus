# Domain Entities — bounded-unit-pool

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## モデル根拠

`unit-of-work`／`unit-of-work-story-map` の #1919 scopeとdependency DAG、`requirements` FR-05、`components` C2／C5、`component-methods` のPoolTransitionCommand、`services` のbounded swarm flowを正とする。

## Aggregate と Entity

### UnitPoolAggregate

swarm batch単位のaggregate root。`batchId`、`phase`、任意の`finalResult`、`activeCap`、`nextSequence`、`maxActiveObserved`、`hasLocalFailure`、`cancelRequested`、`systemicFailure`を持つ。phaseは`open | draining | terminal`、finalResultはterminal時だけ`completed | partial-failure | terminated | cancelled`を持つ。

### Unit

delivery対象の安定identity。`unitId`、`dependencies`、`status`を持つ。statusは`pending | queued | active`またはcanonical `UnitOutcome`。`UnitOutcome`は`succeeded | failed | cancelled | dependency-unsatisfied | batch-unsafe | dispatch-not-started | dispatch-effect-unknown | worker-unresponsive | cancel-unconfirmed`のclosed unionである。sessionやworkerが変わっても同じUnitである。

### QueueEntry

待ち行列上の1回の位置。`queueEntryId`、`unitId`、`sequence`、`kind`、`status`を持つ。kindは`initial | retry`、statusは`queued | acquired | removed`。同じUnitが複数世代のQueueEntryを持てるが、同時にqueuedなのは1つまでとする。

### UnitAttempt

Unitの1回の実行。`attemptId`、`unitId`、`ordinal`、`operationId`、`slotId`、`outcome`を持つ。#1602のExecutionAttemptと同じattempt IDを参照し、#1998のBudgetSubjectでordinalを消費する。

### ActiveSlot

`slotId`、`unitId`、`attemptId`、`state`、任意の`nativeHandle`を持つcapacity lease。stateは`reserved | claimed | dispatch-confirmed | released`で、releasedから逆遷移しない。

### ReconciliationRecord

`attemptId`、`kind`、`ordinal`、`policyVersion`、`cap`、`nativeEffectStatus`、`outcome`を持つ。kindは`dispatch-check | worker-result-check | cancel-check`。同じattemptのordinalは単調で、cap到達後は新規照会を行わない。

### PoolProjection

event列から導出するimmutable value。ordered queue、active map、terminal map、max active、batch statusを持つ。C5の唯一の状態入力である。

### PoolTransitionProposal

C5が返すID非保有value object。`kind`、対象Unit、settle outcome、release要求、retry要求、dependent cancellation集合、batch result候補を持つ。C2が採番・commitするまで状態変更ではない。

### PoolCommitReceipt

`receiptId`、`idempotencyKey`、mint済みidentity、committed event IDs、resulting batch statusを持つ。replayは同じreceiptを返す。

### LateResultObservation

synthetic terminal後に到着したnative resultの観測record。`attemptId`、`nativeHandle`、`observedOutcome`、`observedAtEventId`を持つが、authoritative Unit outcomeやslot stateを変更しない。

## 関係

| Parent | Relation | Child | Constraint |
|---|---|---|---|
| UnitPoolAggregate | 1:N | Unit | DAGはcycle-free |
| Unit | 1:N | QueueEntry | retryごとに新entry |
| Unit | 1:N | UnitAttempt | ordinalは単調増加 |
| UnitAttempt | 1:1 | ActiveSlot | active時だけ未release |
| UnitAttempt | 0:N | ReconciliationRecord | versioned cap内で単調 |
| UnitPoolAggregate | 1:1 | PoolProjection | canonical eventから再構築 |
| PoolTransitionProposal | 1:1 | PoolCommitReceipt | C2 commit成功時だけ成立 |
| UnitAttempt | 0:N | LateResultObservation | terminal stateを再遷移しない |

## Lifecycle 不変条件

- acquireは`queued→active`とslot／attempt reserveを原子的に行う。
- settleは`active→terminal`または`active→queued(retry)`とslot releaseを原子的に行う。
- active countは未release slot数と一致する。
- sequenceはbatch内で一意かつ単調である。
- terminal Unitを再queueしない。ただしretryable failureはterminal commit前にrequeue proposalへ変換する。
- systemic failure後はdrainingとなり、新しいacquireを禁止する。
- Unit planはunique ID、closed dependency set、acyclic graphを満たさなければaggregateを開始しない。initial orderはKahn layer＋unitId UTF-8 bytewise順から導出し、別のplanOrder fieldを持たない。
- phaseがterminalになるまでfinalResultは未設定で、terminal時は優先順位により1値へ固定する。
- reconciliation exhaustionはsynthetic terminalとslot releaseを同じcommitに含める。
- no-effect-confirmedでretry不可／budget exhaustedの場合も`dispatch-not-started`でterminal化し、dependent cancellationとfinal resultへ寄与させる。

## Revision 1 Reconciliation

Unitから未供給のplanOrderを除去し、closed UnitOutcome、reconciliation／late-result command、C7 effect/cancel capabilityへentity lifecycleを接続した。

## Harness 中立性

worker native IDとharness名は追加factであり、Unit／attempt／slot identityを決めない。Codex subagent、Claude task等は同じdomain entityへ正規化し、harness別poolや専用gateを作らない。
