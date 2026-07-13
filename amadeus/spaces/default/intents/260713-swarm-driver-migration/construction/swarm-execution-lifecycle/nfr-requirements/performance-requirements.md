# Swarm Execution Lifecycle Performance Requirements

## 上流と測定境界

本成果物はU-02の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。測定対象はcoordinatorのresolve、checkpoint/audit、prepared binding、dispatch supervision、normalized evidence検証、resume、referee request/result bindingである。provider、Unit作業、referee check command、Git mergeのwall-clock時間とtoken消費には数値SLOを設定しない。

`n`をexpected Unit数、`e`をnormalized event数、`t`をcheckpoint transition数、`p`をclaimed Unitのreferee primitive数とする。

## Quantified requirements

| ID | Metric | Target | 条件 | 検証 |
|---|---|---:|---|---|
| U02-PERF-01 | behavior probe | relevant native candidateごとに1 attemptでexactly 1回 | materialized `probing`後 | probe spy + crash fixture |
| U02-PERF-02 | batch外probe cache | exactly 0件 | 全resolve/resume | cache/static-state scan |
| U02-PERF-03 | audit lock中のprocess/probe/check/merge wait | exactly 0回 | 全transition/finalize | lock-owner instrumentation |
| U02-PERF-04 | manifest canonicalization/全単射検証 | time `O(n log n)`以下、追加memory `O(n)`以下 | 順序変更・重複・欠落fixture | operation count |
| U02-PERF-05 | native evidence検証 | time `O(n + e)`またはcanonical sortを含め`O((n+e) log(n+e))`以下、追加memory `O(n + e)`以下 | multi-wave event | counter/property test |
| U02-PERF-06 | checkpoint/audit transition | 1 logical transitionにつきaudit intent最大1件、atomic checkpoint write最大1件 | retry/reconciliationを除く | injected port count |
| U02-PERF-07 | reconciliation | transition/event/operation keyごとに不可逆substep追加実行最大1回 | 任意の永続化境界で停止 | failure injection |
| U02-PERF-08 | supervisor spawn | planned native waveまたはmerge operationにつきwrapper最大1件、armed child最大1件 | normal path | identity/arm receipt count |
| U02-PERF-09 | active memory | `O(n + e + t + p)`以下、attempt終了後にcross-batch cache 0件 | 最大既存swarm fixture | heap/object count |

固定30秒leaseと5秒heartbeatはliveness/fencing protocolの期限であり、処理完了latencyの保証ではない。

## Resource and contention constraints

- audit lockはcheckpoint再読、CAS、audit append、atomic writeの同期区間だけに限定する。
- provider streamはadapter normalizerへ逐次渡し、生stdout/stderr全体をmemoryへ蓄積しない。
- canonical collectionはUnit/event keyで一度indexし、Unit同士またはevent同士の全組合せ走査を行わない。
- checkpointはbatchごとに1正本とし、attempt履歴を無制限に複製しない。履歴正本は既存audit shardとattempt-local referee recordである。
- 常駐daemon、socket、port、database、queue、worker poolを追加しない。

## Regression gate

次をmerge blockerにする。

1. 同一candidateのprobeが1 attemptで2回以上実行される。
2. process wait中にaudit lockを保持する。
3. Unit/event処理がquadratic cross-productになる。
4. armなしでprovider/merge primitiveが1件以上起動する。
5. retryにより同じaudit event、merge primitive、Unit mergeが二重実行される。
6. raw provider streamまたはattempt間cacheが入力に比例せず残留する。

## 非目標

driver固有wave並列度、provider throughput、model latency/token、Git性能、Unit作業時間の最適化はU-02のperformance requirementではない。性能のためにaudit-first、exact binding、referee re-verifyを省略しない。
