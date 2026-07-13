# Swarm Execution Lifecycle Scalability Requirements

## 上流と適用範囲

本成果物はU-02の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-02はlocal CLI lifecycleであり、service replica、database、message queue、load balancerを持たない。scale dimensionは既存swarm範囲内のUnit、wave、normalized event、checkpoint transition、referee operationである。

## Capacity dimensions

| Dimension | Symbol | Current contract | Target behavior |
|---|---:|---|---|
| expected Unit | n | 2件以上、既存swarm上限 | drop/duplicate 0、canonical全単射 |
| normalized event | e | driver/wave出力 | source/childを一度indexし`O(n+e)`主体 |
| state transition | t | closed state graph | transition IDごとにdedupe/reconcile |
| claimed Unit operations | p | expected Unit以下 | slug順serial finalize、canonical prefix |
| active attempt per batch | a | 1 | exactly 1、staleだけでtakeoverしない |
| finalize owner per invocation | f | 1 | CASによりexactly 1 |

## Scalability requirements

| ID | Requirement | Verification |
|---|---|---|
| U02-SCALE-01 | Unit数増加でもmanifest/result/child bindingをdrop、sample、duplicateせず全単射検証する | generated set equality |
| U02-SCALE-02 | canonical sortを含むUnit処理は`O(n log n)`以下、event処理は`O(n+e)`主体でquadratic pair scanを使わない | operation count/property test |
| U02-SCALE-03 | active memoryは`O(n+e+t+p)`以下で、batch/attempt横断のunbounded cacheを持たない | heap/object fixture |
| U02-SCALE-04 | Unit execution concurrency/wave分割はselected driverのplanに従い、coordinatorが独自worker poolや隠れた上限を追加しない | plan/dispatch equality test |
| U02-SCALE-05 | batchごとのcheckpoint正本、active attempt、finalize claimを各1件に保ち、同時callerを直列化またはtyped conflictにする | concurrent invocation test |
| U02-SCALE-06 | referee finalizeはUnitをslug順にserial mergeし、同一targetへの並列Git mutationを0件にする | merge supervisor trace |
| U02-SCALE-07 | 既存swarm上限超過または不正manifestはID/audit/probe/worktree生成前にrejectする | boundary no-call fixture |

## Capacity and growth policy

Unit数の上限変更、driver追加、複数repo同時merge、remote coordinator化は別Intentでschema/locking/operational modelを再評価する。現scopeでは次を行わない。

- input pressure時のUnit/event drop、sampling、best-effort success。
- queue、daemon、database、distributed lock、remote cacheの追加。
- finalize Unitの並列mergeまたは複数claim owner。
- coordinatorによるprovider固有wave再分割。

## Degradation policy

capacity不足や競合をnative成功へ読み替えない。invalid/over-limit inputは副作用前typed error、live owner競合はloser副作用0、identity/liveness不明はfail-closed、partial child/evidenceは`failed-resumable`とする。確定済みreferee-converged Unitだけを再利用し、未完了Unitを捨てて部分成功にしない。
