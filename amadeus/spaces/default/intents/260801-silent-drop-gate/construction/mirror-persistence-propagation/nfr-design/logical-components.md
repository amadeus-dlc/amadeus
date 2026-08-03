# Logical Components — mirror-persistence-propagation

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、NFRを実装可能な論理境界へ割り当てる。全componentは同一Bun process内で動き、filesystem以外の外部resourceを持たない。

## コンポーネント一覧

| ID | コンポーネント | 責務 | 所有しないもの |
|---|---|---|---|
| LC-MPP-01 | `PersistBlockedOrchestrator` | preparationとcurrent transitionを排他的に順序付け、公開結果を返す | filesystem詳細、audit照合規則 |
| LC-MPP-02 | `OperationPreparationCoordinator` | lock下で再読したsnapshotとembedded outboxの判定、maintenance-only終端 | 公開lock handle、commit capability |
| LC-MPP-03 | `PriorOutboxMaintainer` | 一回のpassでcanonical audit照合、append最大1回、成功時clear最大1回を実行 | business success判定 |
| LC-MPP-04 | `TransitionEvaluator` | `ready` snapshotからtransitionを最大1回評価 | prior outbox maintenance |
| LC-MPP-05 | `AtomicStatePort` | `executeExclusive` 内でlock取得、再読、maintenance、pure factory呼出、state＋outbox atomic write、解放まで所有 | policy／public mapping、公開lock handle |
| LC-MPP-06 | `AuditPort` | transaction identityとcanonical fieldによるat-most-once append | outbox clear順序 |
| LC-MPP-07 | `EmbeddedOutboxCodec` | Mirror state block内の完全なpending recordをrender／parseし、revision-invariant clear documentを作る | 独立file I/O、audit一致判定 |
| LC-MPP-08 | `PublicResultMapper` | 内部閉集合を既存公開unionへexhaustiveに写像 | I/O、retry、文字列解析 |
| LC-MPP-09 | `FailureInjectionHarness` | port failureとcall countのtest-only制御 | production decision |

## Interface契約

```text
AtomicStatePort.executeExclusive(operation, expectedRevision, transitionFactory):
  lock取得 -> state再読／parse ->
  outbox有: maintenance結果／outbox無: pure factory(snapshot)同期1回＋commit ->
  finally lock解放

TransactionExecutionResult:
  maintenance-blocked(audit-pending | clear-pending | clear-unknown)
  | maintenance-completed(snapshot)
  | failed(pre-commit | durability-unknown)
  | ok(clean | outbox-pending)

PriorOutboxMaintainer.maintain(snapshot):
  maintenance-blocked(audit-pending | clear-pending | clear-unknown) | maintenance-completed(snapshot)

PublicResultMapper.map(preparation-or-state-result):
  existing MirrorOperationOutcome
```

`transitionFactory` が受け取るのは不変snapshotだけであり、lock／commit capabilityを持たない。lock ownershipとfactoryの同期呼出は `AtomicStatePort` 内へ隠す。interfaceはsummary、exception message、path文字列から状態を再導出しない。新しいpublic variantを追加せず、内部Resultだけを閉じて深い境界を作る。

## 依存方向

```text
PersistBlockedOrchestrator
  -> AtomicStatePort.executeExclusive
       -> OperationPreparationCoordinator
       -> PriorOutboxMaintainer
            -> AuditPort
            -> EmbeddedOutboxCodec
       -> TransitionEvaluator
            -> EmbeddedOutboxCodec
            -> AuditPort
       -> PublicResultMapper

FailureInjectionHarness -> port implementations（test only）
```

domain側はport interfaceへ依存し、filesystem adapterはdomain policyを再実装しない。`PriorOutboxMaintainer` と `TransitionEvaluator` は相互依存せず、`AtomicStatePort` 内のexclusive executionだけが順序を決める。current transition invocationはstate＋outbox commitとaudit appendまでlockを保持し、outbox clearは行わない。次のmaintenance invocationが自身のlock下でclearを行う。

## Failure domainとblast radius

| Failure domain | 影響範囲 | 封じ込め |
|---|---|---|
| state read／parse | 当該invocation | transition未開始、全bytes不変 |
| state＋embedded outbox rename前write | 当該invocation | typed pre-commit failure、両者とも旧document |
| directory fsync | 当該operationのdurability判定 | outcome-unknown、偽成功禁止 |
| audit append | 当該transaction | committed state＋同一document内の完全outboxを保持 |
| embedded outbox clear | 当該transaction | rename前failureはaudit＋stale outbox、rename後directory fsync failureはoutbox有無を未確定として次回再読 |
| canonical field mismatch | 当該transaction | outbox保持、他transactionへ波及させない |
| generated projection drift | release全体 | drift guardでmerge／releaseを停止 |

## 共有resourceと分離方針

共有resourceはembedded outboxを含むcanonical Mirror state file、audit shard、既存lockである。outboxは独立した第三fileではない。全書込みを同じatomic adapter／lock境界へ集約し、componentごとの別lock、cache、queue、databaseを作らない。AWS resource、network、Herdr／tmux等のterminal multiplexerはruntime dependencyではない。

## Infrastructure Designへの引渡し

本Unitにはprovision対象のcloud infrastructureがない。後続Infrastructure Designは「新規resourceなし」を明示し、必要な実装面をBun runtime、filesystem permissions、CI failure-injection環境、package／promotion drift guardに限定する。
