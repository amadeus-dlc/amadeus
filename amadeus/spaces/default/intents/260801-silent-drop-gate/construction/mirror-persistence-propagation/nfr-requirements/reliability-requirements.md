# Reliability Requirements — mirror-persistence-propagation

## 適用範囲と品質属性

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、FR-10／SC-05、NFR-03／NFR-04／NFR-06／NFR-09を本Unitの信頼性契約へ具体化する。

常駐serviceのavailability SLOは非適用である。代わりに、各invocationのcorrectness、durability判別、audit at-most-once、outbox eventual convergence、再現可能なfailure injectionをSLIとする。

## SLIと合格目標

| ID | SLI | 目標 | 観測窓 |
|---|---|---|---|
| REL-MPP-01 | commit前failureの偽成功率 | 0% | 宣言済み全failure injection |
| REL-MPP-02 | commit前failureのbyte不変率 | 100% | lockからstate rename前までの全注入点 |
| REL-MPP-03 | durability-unknownのtyped分類率 | 100% | state rename後directory fsync fixture |
| REL-MPP-04 | transaction identityごとのaudit重複数 | 0件 | append／clear失敗と反復drain全経路 |
| REL-MPP-05 | recoverable outboxの最終収束率 | 100% | injected障害解除後の明示的な後続invocation |
| REL-MPP-06 | maintenance invocation内のcurrent transition評価 | 0回 | append失敗、clear失敗、clear成功 |
| REL-MPP-07 |公開union互換性 | variant追加・削除0件 | consumer／serialization regression全件 |

## Failure Mode契約

| Failure mode | 呼出結果 | 永続状態 | 回復 |
|---|---|---|---|
| lock〜rename前 | `stateFailure(not-started, retryable=false)` | 呼出前bytesと同一 | 原因是正後に新規invocation |
| rename後directory fsync | `stateFailure(outcome-unknown, retryable=false)` | old／newのいずれもあり得る | 次回read／recoveryで整合確認 |
| 今回commit後audit append失敗または成功 | business state committed、outbox pending | state block内に完全なoutboxを保持し、current invocationではclearしない | 次回maintenanceでappend／already-present確認後clear |
| maintenanceでaudit確認後のclear失敗 | business state／audit committed、outbox presentまたはclear済み | pre-rename failureはoutbox保持、directory fsync failureはclear結果unknown | 次回readでoutbox有無を判定し、存在時だけ再clear |
| prior outbox append／clear未完了 | `stateFailure(not-started, retryable=true)` | prior transactionの許可済み収束だけ進行可能 | 同じinvocationでcurrent transitionを開始しない |
| prior outbox clear完了 | `stateFailure(not-started, retryable=true)` | prior transactionだけ収束 | 明示的な次invocationでcurrent transition開始 |

## 一貫性と冪等性

`OperationPreparationResult` と `StateResult` は別の閉集合として保持する。maintenance結果をcurrent transitionの `ok(outbox-pending)` または `failed` へ変換してはならない。`persistBlocked` は全variantをexhaustiveに処理し、summaryやexception messageの文字列解析に依存しない。

auditの `already-present` はtransaction identity、digest、revision、operation identity、transition kindを含む正本fieldの完全一致時だけ成立する。不一致はfail-closedでoutboxを保持し、人間または後続診断が証跡喪失なしに調査できる状態を保つ。

## Recovery Objectives

時間ベースのRTO／RPOは常駐serviceがないため設定しない。操作ベースの回復目標を次とする。

- RPO：commit済みbusiness stateと対応outboxの損失0件
- Recovery bound：current invocationはclearせず、障害解除後のmaintenance invocation最大1回でaudit append／already-present確認とoutbox clearを試みる。clear結果unknown時だけ追加readを許容する
- Retry bound：同一invocation内0回。current transitionは明示的な後続invocationでのみ再要求する
- Verification bound：各回復後にstate、audit、outbox、call countを再読してpostconditionを確認する

## 検証戦略

strict TDDで、falling proofを先に固定する。pure mapping unit test、filesystem integration、failure-injection、consumer／serialization regressionを分ける。全failure点でResult、bytes、call count、audit件数、outbox内容を同時にassertし、単にexit codeが非0であるだけの検証劇場を禁止する。

Build and Testは `business-rules.md` の AR-01〜AR-11を一対一で証跡化し、revisionと実行コマンドを `requirements.md` の FR-15形式で残す。
