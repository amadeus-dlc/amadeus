# Swarm Execution Lifecycle Reliability Design

## 入力契約とreliability boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。U-02の信頼性はservice uptimeではなく、false success 0、不可逆副作用重複0、stale mutation 0、exact binding、crash後のdeterministic reconciliationで定義する。multi-AZ、backup service、remote failover、availability SLAは非適用である。

## Reliability patterns

| Pattern | Component | Behavior |
|---|---|---|
| audit-first state transition | `TransitionStore` | pre/post digestとtransition IDをappend後、checkpointをatomic replace |
| idempotent begin handling | `AttemptBeginReconciler` | `preDigest=ABSENT`のorphan beginをmaterialized/abandoned/conflictへ分類 |
| identity-first/one-time-arm | `ArmedProcessSupervisor` | durable identityとarmなしではprovider/primitive起動0 |
| lease/fencing | `AttemptLeaseGuard` / `FinalizeClaimGuard` | stale writerを各write/primitive直前に拒否 |
| exact request/result binding | `FinalizeRequestBinder` / `RefereeEnvelopeValidator` | invocation/request/result digestの全一致 |
| postcondition reconciliation | `MergeOperationReconciler` | marker、Git/filesystem状態から未実行/land済み/完了/conflictをclosed判定 |
| referee-authoritative success | existing referee + `SuccessProjector` |全Unit再検証・統合・merge・cleanup・audit・checkpointのANDだけsuccess |

無条件retry、exponential backoff、circuit breakerは使わない。再実行はtransition/event/operation ID、canonical digest、現claim、marker、postconditionが同じ場合に限る。

## State materialization and reconciliation

通常transitionはaudit lock内でcheckpointを再読し、lease/fencing/preDigest/edgeを検証し、同じtransition IDのaudit intentをdedupe appendしてpost imageをatomic replaceする。append後のwrite failureは次回resumeで次のclosed判定を行う。

| Durable observation | Action |
|---|---|
| checkpoint = pre、純粋再計算 = post |同transitionを1回だけreapply |
| checkpoint = post | `already-materialized` |
|正当な後続stateがtransitionを包含 | `already-materialized` |
| digest/edge/schema矛盾 | terminal stop、success推測0 |

最初のcheckpoint前は`AttemptBeginIntent`を使う。beginだけ存在し、checkpoint、後続transition、worker/provider side effectがすべて不在ならbegin ID単位で1回abandonし、新executionを開始する。不存在を通常transitionのpre imageへ偽装しない。

resumeは同一executionに新attempt ID、nonce、lease、token+1、必須`previousAttemptId`を与え、selection inputだけを引き継いでprobe前の`probing`へ戻す。旧probe、selection、plan digest、provider session、未完了childを再利用しない。

## Crash and takeover matrix

| Crash boundary | Durable fact | Recovery and side-effect bound |
|---|---|---|
| begin audit後・checkpoint前 | `AttemptBeginIntent`のみ | orphanを1回abandon、provider/worktree 0 |
| transition audit後・checkpoint前 | transition pre/post digest |同transition append重複0、write最大1 |
| wrapper spawn後・identity前 | arm不在、identity pending | deadlineまでprovider 0、wrapper終了確認後だけ再開 |
| identity後・arm前 | exact wrapper identity | exact group回収、provider 0 |
| arm後・provider途中 | checkpoint済みgroup identity | exact group停止/exit確認、新attemptでre-probe |
| finalize request後・claim前 | immutable request record |同digestだけ再利用、primitive 0 |
| claim後・operation identity/arm前 | claim + planned operation |未起動または旧wrapper終了証明後token+1 |
| Bolt/worktree primitive途中 | operation marker + postcondition |完了済みsubstepをskip、二重audit/merge 0 |
| result audit後・checkpoint前 | bound result envelope |同result transitionだけreapply、success重複0 |

takeoverはexpired ownerの非生存だけでは許可しない。旧wrapper/childのPID、PGID、start tokenを照合してgroup終了を確認するか、identity未出現かつarm不在・deadline超過からprimitive起動0を証明した後だけclaim/attempt fencingを進める。

## Success, degradation, and observability

batch successはexpected全Unitのnormalized evidence、referee再検証、AIDLC統合、code merge、cleanup、Unit audit、driver checkpoint materializationの論理ANDである。unknown state/code、partial child、自己申告、binding mismatch、protected-spec改変をsuccessやresumableへ推測しない。

CLI/audit/checkpointはexecution/attempt/run/operation/finalize invocation ID、closed state/reason、pre/post/request/result digest、redacted countを持つ。active owner、liveness unknown、binding mismatch、evidence failure、resumable/terminal failureをtyped codeで区別する。常駐monitor/alert serviceは追加しない。

## Reliability verification gate

- 全state edge/failure codeをexhaustive tableで100%検証する。
- 各永続化境界のcrash injectionで同一transition/event/operation/Unitの不可逆副作用重複を0件にする。
- 2 process race、PID reuse、stale fencing、claim takeoverでloser/stale mutationを0件にする。
- manifest/evidence/request/resultのorder、retry、field差替えに対しcanonical digestとexact bindingを検証する。
- macOSとLinuxでprocess liveness/group recovery fixtureを通す。Windows成功は表明しない。
- failure injection、secret canary、typecheck/lint/coverage ratchetの失敗またはskipをmerge blockerにする。
