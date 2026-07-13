# Swarm Execution Lifecycle Scalability Design

## 入力契約とscale model

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。U-02はlocal CLI processであり、service replica、database、load balancer、queue、distributed lockを持たない。scale dimensionはexpected Unit数`n`、normalized event数`e`、checkpoint transition数`t`、referee primitive数`p`である。

## State and work partitioning

| Concern | Design | Bound |
|---|---|---|
| batch state | checkpoint正本1件、active attempt 1件 | `O(1)` owner |
| Unit manifest | Unit key index + canonical sort + exact bijection | `O(n log n)` / `O(n)` |
| native evidence | wave/source/child index、single-pass validation | `O(n+e)`主体 / `O(n+e)` |
| transitions | transition/event IDでdedupe/reconcile | `O(t)` |
| finalize | claim owner 1件、slug順serial Unit operation | active operation `O(1)`、全体`O(p)` |
| history | audit shard + attempt-local record | checkpointへ重複保持しない |

Unit executionのpartition、wave、同時数はselected driver planの責務である。U-02はplanを検証・束縛・superviseするが、独自worker pool、adaptive concurrency、hidden limit、wave再分割を追加しない。

## Concurrency and isolation

- 同一batchの同時callerは`AttemptLeaseGuard`で1 active writerへ閉じ、live owner競合のloserは副作用0でtyped conflictを返す。
- lease期限だけではtakeoverせず、host/PID/start token、wrapper/child identity、arm状態を実測し、旧group停止または未起動を証明してからfencing tokenを1増やす。
- finalizeはrequest digestごとに1 claim ownerとし、Unit mergeをslug順にserial実行する。同一targetへの並列Git mutationを許可しない。
- 別batchは別checkpoint/attempt-local pathを持ち、immutable framework table以外のmutable stateを共有しない。
- raw stream、probe result、process handle、arm materialはattempt-localであり、終了後にcross-batch cacheへ残さない。

## Load and capacity behavior

valid inputをdrop、sample、truncate、partial success化しない。既存swarm上限超過、duplicate/missing/extra Unit、event binding不一致はID、probe、worktree、provider、referee副作用前にrejectする。

capacity競合時のbehaviorは次のclosed setである。

| Condition | Result | Work retained |
|---|---|---|
| invalid/over-limit input | terminal typed input error | 0 |
| live attempt/finalize owner | conflict、loser副作用0 | active ownerのみ |
| identity/liveness unknown | fail-closed / resumable | durable checkpointのみ |
| partial native evidence | `failed-resumable` | referee確定前の自己申告は再利用しない |
| partial finalize | marker/postcondition reconciliation |確定済みcanonical Unit prefix |

## Closed-set growth policy

driver、harness、event version、state edge、failure code、merge strategy、Unit上限の変更は別contract changeとして、schema、exhaustive table、failure injection、release closureを同時更新する。unknown driver/event/state/resultをbest-effort successへ変換しない。

remote coordinator、複数repo同時finalize、Unit上限拡張、parallel target mergeが必要になった場合だけ、database/queue/distributed lockを別Intentで再評価する。現scopeでは将来用interfaceを追加しない。

## Scalability verification

- generated Unit/event size ladderで`O(n log n)`、`O(n+e)`、memory `O(n+e+t+p)`をoperation/object countにより検証する。
- input order、event order、duplicate変形に対しcanonical digestと全単射結果が不変であることをproperty testする。
- 2 process concurrent invocationでactive attempt、finalize claim、target Git writerが各exactly 1であることを確認する。
- driver planとdispatch traceのUnit/wave/concurrency equalityを検証する。
- architecture testでqueue、daemon、socket、database、cloud SDK、cross-attempt cache依存が0件であることを確認する。
