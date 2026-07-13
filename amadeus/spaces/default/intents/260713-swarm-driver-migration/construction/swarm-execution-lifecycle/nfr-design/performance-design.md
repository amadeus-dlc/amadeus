# Swarm Execution Lifecycle Performance Design

## 入力契約と測定境界

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。U-02の最適化対象はcoordinator自身のresolve、canonicalization、checkpoint/audit transition、native evidence検証、reconciliation、referee request/result bindingである。provider、Unit作業、check command、Git mergeのwall-clock時間とtoken消費は対象外である。

`n`をexpected Unit数、`e`をnormalized event数、`t`をcheckpoint transition数、`p`をreferee primitive数とする。

## Processing and storage pipeline

| Component | Processing | Time | Additional memory | External wait under audit lock |
|---|---|---:|---:|---:|
| `AttemptResolver` | input snapshot、candidate probeをattempt-localに1回 | policy `O(1)` + probe | `O(1)` | 0 |
| `ManifestBinder` | Unit key index、canonical sort、全単射検証 | `O(n log n)` | `O(n)` | 0 |
| `TransitionStore` | checkpoint再読、CAS、audit append、atomic replace | transitionごとにbounded I/O | post image 1件 | 0 |
| `NativeEvidenceValidator` | wave/source/child index、closed event検証 | `O(n+e)`主体 | `O(n+e)` | 0 |
| `AttemptReconciler` | transition/event/operation key lookup | `O(t+p)`以下 | `O(t+p)` | 0 |
| `FinalizeRequestBinder` | canonical Unit/target/spec digest構築 | `O(n log n)` | `O(n)` | 0 |
| `FinalizeCoordinator` | Unitをslug順に逐次dispatch | `O(p)` orchestration | active operation `O(1)` | 0 |

`TransitionStore`のaudit lockは同期callbackだけを受ける。probe、identity待機、provider、check、merge、process終了待機はlock外で実行し、その前後で短いCAS sectionを取る。

## Streaming and allocation decisions

- provider stdout/stderrはadapter normalizerへ逐次渡し、生stream全体を共通runtimeへ蓄積しない。
- normalized eventは`source + child + sequence`で一度indexし、Unit/eventのcross-productを作らない。
- checkpointはbatchごとに1正本、active attemptは1件とし、attempt全履歴を複製しない。履歴は既存audit shardとattempt-local referee recordへ置く。
- canonical Unit collectionはvalidate後に一度sort/indexし、manifest、evidence、finalize bindingで必要なimmutable projectionを共有する。attempt横断cacheにはしない。
- heartbeatはsemantic post imageをcloneせず、5秒ごとの短いCASでmetadataだけを更新する。
- native waveとmerge operationはplanned itemごとにwrapper最大1件、armed child最大1件とする。

active memory budgetは`O(n+e+t+p)`である。attempt完了またはabandon後にprobe result、生stream、process handle、arm materialを保持しない。

## Contention and concurrency design

| Shared resource | Serialization owner | Contention behavior |
|---|---|---|
| batch checkpoint/audit | `TransitionStore` | 1 writer、loserはtyped conflictまたは再読 |
| active attempt lease | `AttemptLeaseGuard` |期限切れだけで奪取せず、owner非生存と旧group停止後にtoken+1 |
| finalize request/claim | `FinalizeClaimStore` | create-if-absent + CAS、live owner競合は副作用0 |
| target Git state | existing referee/worktree primitive | Unit slug順serial、同一target並列mutation 0 |

coordinatorはworker pool、queue、daemon、socket、portを追加せず、driverが返したwave/concurrencyをそのままsuperviseする。

## Performance verification seams

| Requirement | Seam | Verification |
|---|---|---|
| U02-PERF-01/02 | `BehaviorProbePort` attempt scope | candidate/attempt spy、static cache scan |
| U02-PERF-03 | audit-lock owner instrumentation |外部wait call count exactly 0 |
| U02-PERF-04/05 | index/comparator/event counters | generated size ladder、property test |
| U02-PERF-06/07 | transition/operation ID counter |各crash pointでappend/write/primitive回数 |
| U02-PERF-08 | supervisor identity/arm receipt | wrapper/armed child count |
| U02-PERF-09 | lifecycle object registry | attempt終了後のlive object/cache count 0 |

## 非適用patternと回帰gate

cache service、connection pool、database query、CDN、queue、autoscaling、speculative retryは構成要素がないため非適用である。次をmerge blockerにする。

1. audit lock中のprocess/probe/check/merge waitが1回以上。
2. same attempt/candidateのprobe、same operationのprimitive、same transition/eventのauditが2回以上。
3. Unit/event処理のquadratic cross-productまたはunbounded raw stream buffer。
4. wrapper identityのdurable記録前にarm/childを起動する経路。
5. coordinator独自のwave再分割、worker pool、cross-attempt cache。
