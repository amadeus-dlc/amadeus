# Reliability Design — quality-repair-runtime

## 入力と停止原則

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

原則はfail-closed activation、canonical snapshot、reservation-before-effect、bounded non-progress、atomic stall / resumeである。品質が健全でない状態を成功へ丸めず、未知または不完全なevidenceはrepair対象かtyped haltへ閉じる。

## Activationとepoch atomicity

`semi / full`でcontribution欠落・破損・dangling referenceがあればstage work前に停止する。`QUALITY_EPOCH_STARTED`のcommit前はactive epochを公開しない。genesisとresumeは同じ`qualityEpochId = H(qualityScopeId + epochStartEventIdentity)`を使う。

resume transactionは`LOOP_LATCH_CLEARED`、新`QUALITY_EPOCH_STARTED`、`WORKFLOW_UNPARKED`を同時commitし、window=[]、count=0、replan flag=false、review cycle=nullから開始する。部分commit時は旧latchをauthorityとして再開しない。

## Replan effect recovery

M03はquality epoch、trigger snapshot、Judge invocation、constraintへ束縛したcontent-addressed base reservation IDとclosed `attemptNo: 0 | 1`を持つ`ReplanReservation`を生成し、M07 commit後だけagentを呼ぶ。attempt identityは`H(baseReservationId + attemptNo + priorNoEffectReceiptDigest)`である。agent portはlogical base reservation IDとattempt identityを受け、`completed(RepairPlanReceipt) | accepted(OperationRef) | no-effect-confirmed | effect-possible | unknown`のclosed result / reconciliationを返す。

initial handoffはattempt 0 reservationのcommit receiptからpermitを生成する。attempt 0のattested no-effect後、M06はObservationReceiptのoperation、trace、scope、attestationを検証し、M07の単一transactionでattempt 1 successor reservationをcommitする。このcanonical reservation factがredispatch permit発行とbudget消費を兼ね、別のmutable counterを使わない。

resume時にreservationがあり`QUALITY_REPLAN_RECORDED`がなければ新規agent呼出しより先にそのattemptをreconcileする。attempt 1 commit後・agent call前にcrashしてもattempt 1を再発行せず、同じattempt identityをreconcileする。completedはreceiptを一度だけ記録する。attempt 1のno-effect、またはどのattemptでもeffect-possible / unknownならclosed `terminal-uncertain`へ遷移し、新planを生成せずworkflowをsuspendして人間判断へ渡す。

replay projectionはbase reservationごとに`not-started | attempt-0-pending | attempt-1-pending | completed | terminal-uncertain`のexactly oneを再構築する。attempt 1が存在するbase reservationへsuccessorを追加しないため、crash回数にかかわらずagent dispatch admissionは最大2回、redispatch admissionは最大1回となる。plan本文ではなくdigest、agent/context identity、basis snapshotだけをcanonical factにする。

## Local reviewとnon-progress

local `reviewer_max_iterations`到達時は同cycleのiterationを増やさず、validated unresolved BLOCKERを次のquality snapshotへ渡す。replan commit後の新cycleだけがiteration=1から開始し、quality epochとT+1 historyを引き継ぐ。

strict progressなしの連続区間はTで必ずreplanまたはstalledへ到達する。strict progress時だけcountをresetする。plan変更、文面変更、review cycle変更をprogressとして扱わず、見かけ上のworkで停止を回避しない。

## Stallとreplay

`repair-stalled`はgeneric latchとworkflow suspendedを同一transactionでcommitする。同一fingerprint再起動は同じparked resultを返す。resume conditionは`any-of[evidence-change, human-retry]`のexactly two alternativesとし、1つのsatisfaction receiptで新epochを開始する。

replayはevent identityを畳み込み、scope / graph revision mismatch、malformed snapshot、undeclared route、矛盾するcycle successorを成功扱いしない。T+1 window、replan flag、review cycle、latchはsession / cloneに依存せず同じdigestへ収束する。

## Failure injection

activation、epoch start、snapshot commit、Judge route、replan reservation / accepted / receipt、local review handoff、stalled transaction、resume transactionの各境界へcrashを注入する。duplicate replan plan / cycle / unparkが0、部分resumeが0、T-1 Judge 0、stalled fingerprint再起動のexternal effect 0を要求する。

replan attempt 0 / 1のreservation commit前後、agent accepted後、no-effect receipt後にもcrashを注入し、attempt 2が0件、attempt 1後の追加dispatchが0件、同じevent setから同じattempt projection / terminal stateへ収束することを要求する。
