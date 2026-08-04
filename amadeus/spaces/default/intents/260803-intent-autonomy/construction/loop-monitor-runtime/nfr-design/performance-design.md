# Performance Design — loop-monitor-runtime

## 入力と性能オラクル

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はself-featureスコープ上のexpected absenceであり、数値SLOを推測しない。

性能オラクルは、通常deliveryが対象Monitor数とbounded projectionに比例すること、cold replayがMonitor関連event数にだけ線形であること、audit noise数がnormal resumeのread setへ入らないこと、古い重複の完全判定をM07のcontent-addressed indexが担うことである。

## Hot path

M06はruntime graphで解決済みのworkflow control eventだけをMonitorへ配送し、全audit rowのfilter scanを行わない。M07は`monitor scope + upstreamEventIdentity`のdedupe lookupと`deliveryId` lookupをpartition-local indexで解決し、既存identityなら保存済みcommit receiptを返す。

M02のprojectionは`chainHeadDeliveryId`、`matchedPrefix`、`thresholdCount`、T+1の照合履歴、`runtimeLimits.maxPendingDeliveries`以下のfull pending payload、pending Judge / latchだけを保持する。delivery総数に比例するprocessed-ID setや全履歴arrayを持たない。

Judge attempt projectionは同一invocationにつきclosed `attemptNo: 0 | 1`とterminal stateだけを保持する。attempt履歴の無制限listやcrash回数counterを持たず、attempt 1 started eventの存在を耐久redispatch-budget消費オラクルとする。

1 eventのreduceは、対象Monitorごとのtransition-table lookup、fingerprint比較、bounded pending操作で完了する。Judgeはthreshold到達時だけ予約し、pending reservationまたは同一fingerprint latchがある間は新規LLM呼出しを0件にする。

## Replayとcheckpoint

`readMonitorReplaySlice`はIntent / Monitor / stage instance / graph revisionのpartitionからnewest valid checkpoint以後のMonitor delivery、Judge、latch factだけをstreamingで読む。物理shard順やwall clockでsortせず、content identityの畳み込みとcausal predecessor graphでreduce順を決める。

checkpointは性能最適化でありbusiness truthではない。削除後も耐久`MonitorReplayIndex`から同じprojectionを再構築できる。index欠落・破損時はnormal pathでcanonical audit全走査へfallbackせず、`INCOMPLETE`でparkし、明示的repair / doctorだけが一度の再index scanを行う。

## Backpressureと検証

predecessor未到着payloadが`maxPendingDeliveries`へ達したら追加reduceとJudge dispatchを止め、payloadを捨てず`INCOMPLETE`へ移す。これによりmemoryをboundedに保ちつつ、負荷時の誤った成功や無限再試行を防ぐ。

検証は、audit noiseを増やしてもnormal resume read件数が不変、古いduplicateでprojection / Judge count不変、pending上限超過で追加dispatch 0、checkpoint有無で同一projection、same-latch fingerprintでJudge / LLM 0を要求する。数値レイテンシ閾値はIssueにないため受入条件に追加しない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:17:45Z
- **Iteration:** 1
- **Scope decision:** none

性能・セキュリティ・partition/replay・failure isolationはbusiness-logic-modelと概ね整合しているが、Judgeのno-effect後再dispatchを1回へ制限するcanonical stateがなく、crash replay時のretry boundを実装できない。NFR Requirements 5件のexpected absenceは問題として扱っていない。

### Findings

- BLOCKER | reliability-design.mdとbusiness-logic-model.mdは`no-effect-confirmed`後に同じinvocation IDで「1回だけ」再dispatch可能とし、logical-components.mdは無制限retryを禁止する。しかしMonitor projection、Judge reservation、canonical eventのいずれにもredispatch許可・消費状態やattempt identityがなく、ObservationReceiptを永続化してretry budgetを原子的に消費する契約もない。再dispatch後にprocessが落ち、再度`no-effect-confirmed`となるたびに同じ分岐へ入り続けられるため、crash replayで1回制限を再現できない。attested no-effect observation、redispatch authorization/attempt、consumed stateを同一canonical transactionへ記録し、replay projectionとdispatch permitが未消費時だけ再dispatchを許す契約が必要である。
- FOLLOW-UP | reliability-design.mdの「同一fixtureを100回replay」はIssueやbusiness-logic-modelに根拠のない固定回数であり、数値SLOを推測しないという各NFR成果物の方針とも不揃いである。100回を出荷要件ではなくテストヒューリスティックと明記するか、宣言済みcrash境界・merge順序の網羅をoracleにするとIssue外の目標追加を避けられる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:21:11Z
- **Iteration:** 2
- **Scope decision:** none

反復1の指摘は解消済み。attempt 0/1の閉じた永続状態、commit済みstarted eventによる再dispatch予算消費、crash後の同一attempt reconcileが定義され、redispatch上限1回を決定論的に保証する。固定100回replay要件も、宣言済みcrash境界とclone merge順序を対象とする妥当な検証要件へ修正された。logical Judge invocation IDはattempt間で不変であり、上流のcanonical identity規約とも整合する。

### Findings

- None
