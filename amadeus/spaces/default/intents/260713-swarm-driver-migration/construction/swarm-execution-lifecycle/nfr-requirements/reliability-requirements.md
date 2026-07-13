# Swarm Execution Lifecycle Reliability Requirements

## 上流とreliability model

本成果物はU-02の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-02はlocal CLI lifecycleであるためservice uptime SLA、backup、multi-AZ/multi-regionはN/Aである。信頼性はaudit-first durability、single-writer fencing、exact binding、crash reconciliation、referee-authoritative successで定義する。

## SLI and objectives

| ID | SLI | Objective | Window/Test |
|---|---|---:|---|
| U02-REL-01 | failure injectionにおけるfalse batch/Intent success | exactly 0件 | 全定義済み注入点 |
| U02-REL-02 | 同一transition/event/operation/Unitの不可逆副作用重複 | exactly 0件 | 各永続化境界crash + retry |
| U02-REL-03 | stale writer/primitiveによるcheckpoint/audit/git mutation | exactly 0件 | fencing/claim race |
| U02-REL-04 | manifest/result/native childの欠落・余分・重複をsuccess化 | exactly 0件 | generated bijection fixture |
| U02-REL-05 | execution IDからselection/probe/evidence/fallback/finalizeへの追跡欠落 | exactly 0件 | audit correlation test |
| U02-REL-06 | secret-like valueのcheckpoint/audit/stdout/stderr fixture漏えい | exactly 0件 | canary scan |
| U02-REL-07 | closed transition/failure mapping coverage | 100%のstate edge/code | exhaustive table test |
| U02-REL-08 | 同一canonical request/resultのdigest一致 | 100% | order/retry/property test |

RTOは次の明示resume呼出しでreconciliationを開始することとし、wall-clock目標は置かない。RPOはmaterialized checkpoint、audit intent、request/progress/resultに確定記録されたsubstepを0件失うこと、未確定substepを成功へ推測しないこととする。

## Fault tolerance and recovery

| Failure class | Required behavior | Recovery boundary |
|---|---|---|
| begin audit後・初回checkpoint前 | side effect不在を検証してorphan beginを1回abandon | 新execution |
| transition audit後・checkpoint前 | pre/post digest一致時だけ同transitionをreapply | 同attempt |
| wrapper identity前/arm前の親停止 | child起動0を証明し、旧group/期限を確認 | 新attempt |
| arm後/provider途中停止 | exact groupを停止しexit確認、旧probe/selectionを捨てる | 新attempt/pre-probe |
| evidence/check/merge/audit失敗 | terminal success 0 | `failed-resumable` |
| protected spec/lying conductor/binding/schema矛盾 | merge/success 0 | `failed-terminal` |
| finalize owner停止 | old operationの未起動または停止/postconditionを証明後token+1 | 同invocation |
| AIDLC/code/cleanup間の部分成功 | marker/digest/postcondition一致済みstepをskip | canonical Unit prefixの次step |
| unknown state/referee code | success/resumableを推測しない | parse拒否 |

確定済みreferee-converged Unitだけを再検証して再利用する。provider session、未完了child、自己申告、旧probe/selection/plan digestは再利用しない。

## Durability and consistency

- 通常transitionは同一audit lock内でaudit intentをappendしてからcheckpointをatomic replaceする。
- heartbeatはlease/fencing CASを通し、semantic state digestを変えない。
- finalize request record、claim、progress、resultはinvocation/request digestへexact bindする。
- `amadeus-bolt complete --merge`と`amadeus-worktree merge`は別primitiveの既存順序を維持し、coordinatorはmerge mechanicsを再実装しない。
- batch successは全expected Unitのevidence、referee再検証、AIDLC統合、code merge、cleanup、Unit audit、driver checkpoint materializationのANDとする。

## Observability and alertability

versioned audit/eventはexecution/attempt/run/operation/finalize invocation ID、closed state/reason、pre/post/request/result digest、Unit count/resultを持つ。raw credential/prompt/response/commandを含めない。

CLIは少なくとも、active owner、liveness unknown、binding mismatch、evidence failure、resumable/terminal failureをtyped codeで区別する。常駐monitor/alert serviceは追加せず、非zero exit、audit row、checkpoint stateを既存運用面へ渡す。

## Regression gate and review

次をmerge blockerにする。

1. failure injection、closed state/failure table、concurrency race、secret canaryの失敗またはskip。
2. armなしchild、同時finalize owner、二重merge/成功eventが1件以上。
3. stale writer mutation、未完了Unitのsuccess化、unknown codeの推測。
4. request/result/protected-spec/target identityの不一致を副作用前に拒否できない。
5. macOS/Linuxのprocess liveness fixtureの失敗。Windows成功の未検証表明。

### Review

必須のarchitecture reviewerが本節へ結果を追記する。

#### Iteration 1

- Verdict: **READY**
- Blocking findings: **0**

指定されたNFR境界は、上流U-02 lifecycleを測定可能なfail-closed contractへ変換しており、blockingな責務混在や未検証success経路はない。

- provider、Unit作業、referee check command、Git mergeのwall-clock時間とtoken消費には数値SLOを設定していない。固定30秒lease/5秒heartbeatはliveness/fencing期限として明確に分離され、latency保証へ読み替えていない。
- U-02はresolve、checkpoint/audit、prepared binding、dispatch supervision、normalized evidence、resume、referee request/result bindingを所有する。provider固有probe/parser/LaunchSpec/waveはU-03〜U-05、convergence・lying-conductor re-verify・Bolt/worktree/Git mechanicsはC-11/既存primitiveに残し、coordinatorで再実装しない。
- probe exactly-once/attempt、audit lock中の外部wait 0、transitionごとのaudit/checkpoint write上限、manifest/evidenceの`O(n log n)`・`O(n+e)`、active memory bound、wrapper/arm receipt数がspy・counter・property/failure injectionで測定可能である。checkpoint、active attempt、finalize ownerを各1件へ閉じ、競合loserの副作用0を要求する。
- identity-first/one-time-armはidentity materialization前のchild起動を禁止し、lease/fencingと各不可逆substep直前のclaim CASがstale writer/primitiveを排除する。takeoverは旧process groupの停止または未起動証明後だけtokenを進める。
- finalize requestはexpected/claimed/declined、check/protected spec、repo/target/strategy、全Unit identityへ束縛される。AIDLC統合、code merge、cleanup、Unit auditのpartial successはoperation marker・digest・strategy別postcondition・canonical Unit prefixから再調停し、land済みcodeを再mergeしない。
- credential、token、prompt、生stdout/stderr、生provider response、check command全文、生hostnameを共通runtime/checkpoint/audit/fixtureへ保存しない。child env allowlist、closed schema、normalizer、secret canaryで検証する。
- process livenessはmacOSとLinuxで実測し、Windowsは未保証のまま成功表明しない。TypeScript ESM、Bun、Git、既存Bolt/worktree primitive、`bun:test`、fast-check、現行quality gateを維持し、runtime package、database、queue、daemon、cloud SDKを追加しない。
