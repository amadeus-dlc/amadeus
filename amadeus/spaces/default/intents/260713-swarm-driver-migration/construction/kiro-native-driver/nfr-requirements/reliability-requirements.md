# Kiro Native Driver Reliability Requirements

## 上流とreliability model

本成果物はU-05の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-05はKiro serviceのuptimeを保証せず、balanced wave、least-trust runtime role、versioned session evidence、serial wave gate、referee handoffでfalse native successとUnit dropを0件にする。

## SLI and objectives

| ID | SLI | Objective | Window/Test |
|---|---|---:|---|
| U05-REL-01 | split後のUnit drop/duplicate/reorder | exactly 0件 |全`n>=2` property |
| U05-REL-02 | 1件/5件以上wave、wave差2以上 | exactly 0件 | boundary/property test |
| U05-REL-03 | session file/summary/default agent/自己申告だけのnative success | exactly 0件 | negative matrix |
| U05-REL-04 | Unit-role-childの欠落・余分・重複・wrong parent success | exactly 0件 | generated session cases |
| U05-REL-05 | 前waveのC-08/C-11 green前の次wave arm | exactly 0件 | 5+ Unit conductor trace |
| U05-REL-06 | arm後のfloor/別driver fallback | exactly 0件 | process/session/check failure |
| U05-REL-07 | credential/prompt/message/summary/tool I/O/raw session漏えい | exactly 0件 | canary scan |
| U05-REL-08 | macOS live proof | CLI/IDE各2・5 Unit、全wave/check/finalize green | opt-in release evidence |

provider runtimeのavailability/latency SLA、backup、multi-regionはN/Aである。probeは総45秒deadlineを守る。recoveryはU-02のfresh attemptで最初の未確定waveから進み、旧process/session/configは再利用しない。

## Failure behavior and recovery

| Failure | Required result | Recovery |
|---|---|---|
| CLI/auth/V2/trust/session surface unavailable | explicit hard error、`auto`だけpre-dispatch floor | fresh probe |
| parent relation/completed fieldまたはstdin ingestionをprofile化不能 | U-05 park、floor alias禁止 | Intent scopeへ戻す |
| runtime config collision/symlink | provider process 0 | fresh role/path |
| process/approval/session/child/capture failure | native success 0、fallbackなし | failed-resumable |
| config cleanup failure | check envelope/次wave/success 0、scratch隔離 | owner/fencing reconciliation |
| wave evidence green、C-11 check red | 次wave arm 0 | failed-resumable |
| old process live/capture unjoined | takeover 0 | liveness確定待ち |
| finalize failure | batch/Intent success 0 | U-02/C-11 recovery |

確定済みwaveを再利用するにはfenced C-08 resultとconductor-recorded C-11 green resultの両方を要求する。fresh attemptはnew nonce/role/inventory/sessionを使い、旧raw sessionやsummaryをevidenceへ再投入しない。

## Evidence durability and consistency

- balanced wave digestをexecution/attempt/plan/index/ordered Unitへ束縛し、flatten exactを検証する。
- provider arm前にbaseline inventory、role/config digest、capture/nonce/plan/wave、process identityをcheckpointする。
- new parent metadataはwaveごとexactly 1件、childはparent ID/worker role/terminal completedでUnitへ全単射にする。
- process exit 0、parent turn terminal、session evidence、capture join/sealを同じwaveへAND束縛する。
- conductorだけがC-08 evidenceをC-11 checkへ渡し、check resultをC-01へ記録する。両green後だけ次wave、最後は二相finalizeへ進む。

## Observability and supportability

診断はCLI/profile、execution/attempt/wave/role/session digest、expected/observed Unit/parent/child count、closed terminal/failure、unknown schema countを持つ。auth detail、prompt、message、summary、tool I/O、raw session、生pathを持たない。

live evidenceは2 Unitの1 parent/2 child、5 Unitの3+2・2 parent/5 child、wave gate、Unit file digest、C-08/C-11/finalize digestを記録する。browser/API-key classだけ、skip、unknown profile、approval failure、fake/floorをlive passにしない。

## Regression gate and review

次をmerge blockerにする。

1. wave property/fake CLI-session/trust/security/resume suite、macOS CLI/IDE live proofの失敗またはskip。
2. 2〜4 balanced wave、serial gate、Unit-role-child全単射、terminal session evidenceの破壊。
3. least-tool/path trust、no trust-all、capture-before-arm、config owner cleanupの破壊。
4. V3/default child/floor/summary自己申告をnativeへ代替、unknown profileを推測。
5. C-08/C-11 direct dependencyまたはnative evidenceだけの次wave/batch success。

### Review

必須のarchitecture reviewerが本節へ結果を追記する。

#### Iteration 1

- Verdict: **NOT-READY**
- Blocking findings: **1**

1. **[Blocking] 未知session profile／stdin ingestion surfaceの失敗時方針が、parkと`auto` floorに分岐している。** 本成果物のFailure behavior、`tech-stack-decisions.md`、上流`business-logic-model.md`／`business-rules.md`は、parent relation、terminal completed field、またはstdin ingestionをversioned profileとして機械判定できない場合にU-05をparkし、floor aliasを禁止する。一方、`scalability-requirements.md`のDegradation policyは「trust/profile/agent materialization失敗」を一括してpre-dispatch hard error／`auto` floorとしており、未知・未確定profileを通常のknown-unavailable capabilityと同じfallback対象へできる。このままではV2 native証拠を確定できない状態で後続floorへ進むか、Intentを停止してscopeへ戻すかを一意に実装できない。

   **必須修正:** `scalability-requirements.md`でknown profile上のCLI／auth／trust／agent materialization unavailableと、profile自体を確定できない状態を分離すること。前者だけを明示hard error／`auto` pre-dispatch floorの対象とし、parent relation、terminal status、stdin ingestion、V2 session schemaのいずれかをprofile化不能または未知versionの場合は、常にU-05 park、同名native success／floor alias禁止へ揃えること。該当するdegradation fixtureもknown-unavailableとunknown-profileの2系統に分けること。

#### Iteration 2

- Verdict: **READY**
- Blocking findings: **0**

Iteration 1のblocking findingは解消された。`scalability-requirements.md`のDegradation policyは、既知profile上のauth／trust／agent materialization unavailableだけを明示driverのpre-dispatch hard error、`auto`だけのfloor対象としている。parent relation、completed terminal、stdin ingestionをversioned profileとして機械取得できないsurface、V3-only、unknown schemaはdriver選択にかかわらずU-05 parkとし、floorへ変換しない。provider arm後のprocess／session／child／cleanup／check失敗はfailed-resumableとして別に閉じている。

この三分割は、本成果物のFailure behavior、`tech-stack-decisions.md`のV2／stdin／session profile方針、上流`business-logic-model.md`の未知profile park、`business-rules.md`のKXR-07／KXR-27／KXR-42と一致する。unknown profileをknown-unavailable capabilityとしてfallbackできる曖昧さは残っていない。
