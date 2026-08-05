# Reliability Design — intent-autonomy-runtime

## 入力とfail-closed原則

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

unset / unknown / legacy modeは`none`、grant=nullへ閉じる。authorization fact欠落・不一致・stale revisionはauto進行ではなくhuman / conflict / abortへ送る。grantやmodeをcaller booleanから復元しない。

## Mode / grant transaction

mode遷移、old grant terminalization、new grant、human provenanceをM07の単一transactionへ入れる。`issue-full / replace-full`はmode=fullとactive grantを同時に可視化し、fullからdowngradeはold grant revokeとmode変更を同時に可視化する。

crash前後のreplayで、fullかつgrant=null、none / semiかつactive grantという不法組合せを公開しない。suspended中のrevoke / downgradeはworkflow stateを維持したままauthorizationだけを原子的に変更する。

## Grant exercise atomicity

M07はfull `DecisionCandidate`を`INTENT_GRANT_EXERCISE_RESERVED`として先にcommitする。resumeではauditからcandidateを再生し、grant、graph、scope、occurrence、option、effect registry / payload / classification、norm fingerprint、digestを再検証する。

validなら`INTENT_GRANT_EXERCISED + AUTO_DECIDED + workflow effect`を同一transactionでcommitし、invalidなら`INTENT_GRANT_EXERCISE_ABORTED`だけをcommitする。effectはcanonical eventからmaterializeされるため、audit外の半端な副作用を残さない。同じreservationの再送は同じterminal receiptを返す。

semi phase-internal gateはgrantなしの別variantとし、mode provenance再検証後に`AUTO_DECIDED + GATE_APPROVED`を原子commitする。grant eventを混入させない。

## Park / resume

park reasonごとにclosed resume conditionを持つ。same condition / fingerprintの再起動は同じparked resultを返す。`REPAIR_STALLED`だけMonitor latch clearを要求し、他reasonへ偽のlatch planを追加しない。

park開始時、M06は`ParkTransitionPlan`を生成する。planはIntent UUID、interaction / trigger occurrence、reason、closed resume condition全体とidentity / fingerprint、nullable Monitor latch plan、current mode / grant ID、expected projection revision、before projection digestを持つ。reasonとlatchの合法組合せは`REPAIR_STALLED`だけnon-null、`AWAITING_HUMAN / NORM_CONFLICT / USER_PARKED`はnullに固定する。

`parkTransactionId = H(intentUuid + triggerOccurrenceId + reason + resumeConditionFingerprint + nullableLatchIdentity + expectedProjectionRevision)`とする。M07は`WORKFLOW_PARKED`、reason / condition envelope、optional `LOOP_LATCH_SET`、`workflow_execution_state=suspended`、mode / grant不変のafter projectionをこの単一transactionでcommitする。全planが揃うまでvisibleにせず、crash中間transactionは再適用または破棄する。

replayの合法状態は`running + park envelopeなし`、または`suspended + exactly one WORKFLOW_PARKED envelope + reasonに合法なcondition / latch`だけである。reasonのみ、conditionなしsuspended、非Monitor reason + latch、REPAIR_STALLED + latchなしは`ILLEGAL_STATE`として自動decisionを呼ばない。same-fingerprint判定はこのcommit済みenvelopeから行う。

condition satisfaction、optional latch clear、`WORKFLOW_UNPARKED`を同一transactionでcommitする。park / quality failure / Request Changesはgrantを失効させず、human revoke / downgradeだけがauthorizationを変更する。

## Terminal invocation failure

terminal failed invocationはstate-changing planを破棄し、`INVOCATION_FAILED`、sanitized failure evidence、同一before / after projection digest、`retryable=false`、result failureRefを1 transactionへ束縛する。同一invocation / evidenceの再送は同じreceiptを返し、runner auto retryを行わない。

## Failure injection

mode / grant transaction、exercise reservation、revalidation、effect commit、abort、semi gate、park plan / `WORKFLOW_PARKED` / latch / suspended projection、latch clear、unpark、invocation failureの各境界へcrash / driftを注入する。不法mode-grant組合せ0、partial park envelope 0、partial effect 0、duplicate exercise 0、same parked fingerprintの外部decision 0、failed invocation後のprojection差分0を要求する。
