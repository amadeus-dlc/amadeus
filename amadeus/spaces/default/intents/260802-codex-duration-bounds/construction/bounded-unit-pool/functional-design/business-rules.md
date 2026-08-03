# Business Rules — bounded-unit-pool

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 適用根拠

`unit-of-work`／`unit-of-work-story-map` の #1919 scopeとDAG、`requirements` FR-05／FR-04A、`components` C2／C5、`component-methods` のpool transition、`services` のbounded swarmを規則化する。

## Queue と Capacity 規則

- BR-UP-01: queue順はC2がcommitした単調sequenceによるFIFOである。
- BR-UP-02: `queueEntryId`と`unitId`を分離し、retryは同じUnitの新queue entryとする。
- BR-UP-03: queued Unitはactive countへ含めない。
- BR-UP-04: acquire可能条件は依存充足、queued状態、`activeCount < activeCap`、unit-attempt reserve可能のすべてである。
- BR-UP-05: active countは常に0以上active cap以下である。
- BR-UP-06: dynamic priorityまたはLLM判断でFIFOを変更しない。
- BR-UP-06A: initial順はKahn法のtopological layer順、同一layerは既存`unitId`のUTF-8 unsigned bytewise昇順で決め、列挙順へfallbackしない。
- BR-UP-06B: Unit重複、dependency欠落、self-edge、cycleは`invalid-unit-plan`でenqueue前に拒否する。追加のplanOrder入力は要求しない。

## Attempt と Slot 規則

- BR-UP-07: 同じUnitのretryは同じBudgetSubjectのattemptを消費する。
- BR-UP-08: session、worker、queue entryを変更してUnit attemptをresetしない。
- BR-UP-09: attempt ID、slot ID、budget、active遷移はC2が同じtransactionで確定する。
- BR-UP-10: slotは完了、失敗、取消時に一度だけ解放する。
- BR-UP-11: settleとreleaseを分割commitせず、replayで二重releaseしない。
- BR-UP-12: active／attempt capの具体値はNFR Requirementsから受け取り、C5へ定数として埋め込まない。
- BR-UP-12A: `claimed`はworker開始証明ではなく、native handle取得後の`dispatch-confirmed`を別にcommitする。
- BR-UP-12B: claim crashのeffect unknownは新規dispatchを止め、no-effect-confirmedだけをretry候補とする。

## Ownership と Purity 規則

- BR-UP-13: C5は渡されたimmutable projection、cap、DAG、outcomeだけを読む純粋decision ownerである。
- BR-UP-14: C5はauditを読まず、ID／sequenceをmintせず、eventを書かない。
- BR-UP-15: C2だけがidempotency照合、audit fold、ID mint、event batch append、receipt返却を行う。
- BR-UP-16: swarm toolとharness adapterはC2以外のmutation経路を持たない。
- BR-UP-16A: C2のpool commandは`initial-enqueue | acquire | record-reconciliation | settle-release | settle-release-requeue | settle-release-cancel-dependents | terminate-batch | late-result-observed`だけとし、dispatch受付は共通`confirmDispatch`を使う。
- BR-UP-16B: C7はattempt相関付きdispatch effect照会、取消要求、取消結果照会を公開し、unknownを成功やno-effectへ推測しない。

## Failure 継続規則

- BR-UP-17: local terminal failureではtransitive dependentだけを取消し、独立UnitをFIFOで継続する。
- BR-UP-18: retryableかつbudget残ありの失敗はterminal扱いせず、release後にFIFO末尾へrequeueする。
- BR-UP-19: unknown effect、state不整合、canonical write、auth／config failureでは新規dispatchを停止する。
- BR-UP-20: human cancelはqueuedをcancelし、activeは取消要求後の実結果まで記録する。
- BR-UP-21: batch resultは全Unit terminal時に`completed | partial-failure | terminated | cancelled`の1値へ確定する。
- BR-UP-22: batch lifecycle phaseとfinal resultを別fieldにし、local failure中の継続を`open + hasLocalFailure`で表す。
- BR-UP-23: final result優先順位は`terminated > cancelled > partial-failure > completed`である。
- BR-UP-24: worker／cancel無応答はversioned reconciliation budget内だけ照会し、exhaustion時はsynthetic terminal outcomeとslot releaseを同じtransactionでcommitする。
- BR-UP-25: synthetic terminal後のlate resultは観測eventだけを追加し、Unit、slot、counter、batch resultを変更しない。
- BR-UP-26: canonical Unit outcomeは`succeeded | failed | cancelled | dependency-unsatisfied | batch-unsafe | dispatch-not-started | dispatch-effect-unknown | worker-unresponsive | cancel-unconfirmed`のclosed unionだけを使う。

## 検証規則

cap超過なし、DAG拒否、Kahn layer＋unitId tie-break、FIFO、retry末尾投入、same Unit attempt消費、claim crash、worker／cancel無応答、late result、exactly-once release、dependent cancellation、独立Unit継続、systemic termination、replayをproperty／integration testで確認する。#1602/#1998のcanonical IDとbudgetを利用する。

## Revision 1 Reconciliation

BR-UP-06A/06B/16A/16B/26で順序入力、mutation、capability、outcome closureをApplication Designと統一した。
