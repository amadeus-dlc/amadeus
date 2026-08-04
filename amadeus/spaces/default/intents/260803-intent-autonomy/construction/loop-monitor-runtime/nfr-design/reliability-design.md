# Reliability Design — loop-monitor-runtime

## 入力とfailure philosophy

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

基本方針はfail-closed、reservation-first、canonical exactly-once、effect uncertaintyでのhaltである。Amadeusはcanonical invocation、canonical result、canonical Eventへの一度だけの適用を保証し、外部providerの物理的exactly-onceは主張しない。

## Atomic commit boundaries

M07はMonitor deliveryとdedupe lookup entry、Judge / latch / workflow state plansをtransaction IDとWALへ束縛し、必要な全rowが揃うまでvisibleにしない。crash中間transactionはresume時に再適用または破棄し、部分成功を公開しない。

Judgeは`LOOP_JUDGE_STARTED`のcommit receiptから生成した`CommittedJudgeDispatchPermit`取得後だけdispatchする。provider resultはresult-observed factを保存してからprojectionへ適用する。latch clearとworkflow unparkも同一transactionにする。

## Judge reconciliation

pending reservationかつcompletionなしのresumeでは新規dispatchより先に`JudgePort.reconcile`を呼ぶ。

| Reconciliation | Reliability action |
| --- | --- |
| `completed(result)` | receiptを検証し、同じreservationへ一度だけ適用 |
| `no-effect-confirmed` | attested observation確認後、同じinvocation IDで1回だけ再dispatch可能 |
| `effect-possible` | 再dispatchせず`AWAITING_HUMAN`へpark |
| `unknown` | 再dispatchせず`AWAITING_HUMAN`へpark |

timeout、404、process disappearanceだけを`no-effect-confirmed`へ昇格しない。trace / invocation / route / evidence不一致は`CONFLICT`であり、resultを成功扱いしない。

### 1回限りのredispatch state

`JudgeReservation`はlogical `invocationId`に加えてclosed `attemptNo: 0 | 1`を持つ。`LOOP_JUDGE_STARTED` payloadはattempt No、nullable `priorNoEffectObservationReceiptId`、request / trace / evidence fingerprintを含み、event identityを`H(invocationId + attemptNo + priorReceiptDigest)`で決める。providerへ渡すlogical invocation IDは両attemptで同じままとする。

initial dispatchはattempt 0のstarted event commit receiptからpermitを生成する。attempt 0の`no-effect-confirmed`を受けたM06はObservationReceiptのprovider observation ID、observedAt、attestation digest、invocation / trace一致を検証し、M07の単一transactionでattempt 1の`LOOP_JUDGE_STARTED`をappendする。このeventがattested observationを参照し、attempt 1の許可発行とbudget消費を同時に表すため、別のmutable counterや一時ファイルを使わない。

`CommittedJudgeDispatchPermit`はstarted event identityと`attemptNo`を持ち、attempt 1のcommit receiptからだけredispatch permitへ昇格する。replay projectionは同一invocationのstarted eventをreduceして`not-started | attempt-0-pending | attempt-1-pending | completed | terminal-uncertain`のexactly oneへ収束する。attempt 1が既に存在する場合、追加のno-effect receiptはattempt 2を生成せず`terminal-uncertain`として`AWAITING_HUMAN`へparkする。

attempt 1 commit後・provider call前にcrashした場合も、resumeはattempt 1を再発行せず同じattemptを`reconcile`する。これにより、crash回数に関係なくexternal dispatch admissionは最大2回、redispatch admissionは最大1回に固定される。

## Replay、latch、repair

replayはcheckpointまたはgenesisのchain headから到達可能な1本のcausal chainだけをreduceする。missing predecessorは`INCOMPLETE`、forkは`CONFLICT`でparkし、どちらもJudgeを発火しない。index破損はnormal resumeで全audit scanへ黙ってfallbackせず、明示的repair / doctorへ移す。

同じevidence fingerprintのlatchは同じreason / resume conditionを返し、Judge、LLM、修復を再起動しない。解除は`evidence-change`またはverified human retryだけに限定する。

## Failure injectionとacceptance

commit前後、Judge accepted直後、result-observed前後、latch / unpark transaction、checkpoint削除、index欠落、clone fork、pending overflowへcrash / corruptionを注入する。

宣言済みの各crash境界とclone merge順序を網羅してreplayし、projection、Judge invocation ID、attempt state、Judge count、park reasonが一致すること、duplicate canonical applicationが0件であること、attempt 1後およびpossible / unknown effectで追加redispatchが0件であること、部分transactionが可視化されないことを要求する。固定replay回数を出荷要件にはしない。
