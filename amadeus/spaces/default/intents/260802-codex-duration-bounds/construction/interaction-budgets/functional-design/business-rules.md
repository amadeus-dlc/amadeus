# Business Rules — interaction-budgets

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 適用根拠

`unit-of-work`／`unit-of-work-story-map` の #1999 scope、`requirements` FR-04／FR-04A、`components` C2／C4、`component-methods` のinteraction wrapper、`services` のtyped communicationを規則化する。

## Instance と消費規則

- BR-IB-01: question、follow-up、reviewは別々のBudgetSubjectを持つ。
- BR-IB-02: 意味上同じinteractionのresume、compact、再描画、crash replayは同じinstance IDを使う。
- BR-IB-03: harness native message ID、session ID、表示時刻をinstance identityに使わない。
- BR-IB-04: 新しい意味上のquestion、follow-up、review iterationだけが新しい消費となる。
- BR-IB-05: 表示またはreview dispatchの直前にreserveし、開始後のrender／reviewer失敗も1回を消費する。
- BR-IB-06: reserve前拒否は消費しない。
- BR-IB-06A: question／follow-upのdeliveryはat-least-onceで、同じinteraction IDの重複表示を新しい消費にしない。
- BR-IB-06B: review dispatchはstable delivery keyでidempotentにし、effect unknownかつdedupe不能なら再dispatchせず`unavailable`へ終端する。

## Ownership 規則

- BR-IB-07: C4はtyped adapterであり、counterやpre-minted instance IDを保存せず、canonical key materialをC2の`reserveInteraction`へ委譲する。
- BR-IB-08: C2だけがinteractionのresolve-or-create、counter、receipt、delivery/result/terminal transitionをcanonical commitする。
- BR-IB-09: harness adapterやprompt rendererは独自cap、独自counter、独自retryを持たない。
- BR-IB-10: 具体的なdefault／hard capはNFR Requirementsのversioned設定から受け取る。
- BR-IB-10A: C4はrootOperationId、kind、`InteractionKeyMaterial`、idempotencyKey、cap、config version／digestをfield-by-fieldでC2へ写像する。
- BR-IB-10B: hard cap超過または進行中subjectのpolicy mismatchはmutation前に拒否する。

## Exhaustion と Approval 規則

- BR-IB-11: exhausted後は新しいinteractionを開始しない。
- BR-IB-12: review cap到達時は無限再reviewせず、未解決findingを既存approval boundaryへ渡す。
- BR-IB-13: question／follow-up cap到達時は、未解決事項、消費値／cap、last durable progress、next actionを提示する。
- BR-IB-14: budget exhaustionは人間承認を自動成立させず、既存gateの判断権を維持する。
- BR-IB-15: Codexのprose入力差はrenderer／capabilityで扱い、Codex専用の意味論gateを追加しない。
- BR-IB-15A: exhausted、failed、unavailableのterminal interactionごとにsummaryをちょうど1件生成し、ReserveResultまたはtransition receiptの`summaryId`で既存approval boundaryへ渡す。question/follow-upのartifact参照はoptional、reviewのartifact setは必須とする。

## Ambiguity と Follow-up 規則

- BR-IB-16: 曖昧回答がartifact生成を妨げる場合のみ新follow-upを作る。
- BR-IB-17: 同じ曖昧点の言い換え再表示は既存instanceを使い、別質問へ偽装しない。
- BR-IB-18: capが尽きた場合は曖昧さを隠さず、未解決としてapproval boundaryへ明示する。

## Delivery State 規則

- BR-IB-19: interactionは`planned→reserved→claimed→delivered|dispatched→resolved`を通常経路とする。
- BR-IB-20: render／reviewer失敗は`failed`、capability欠落やeffect unknownは`unavailable`、人間取消は`cancelled`としてterminalにする。
- BR-IB-21: question／follow-upのclaimed recoveryは同じdeliveryKeyで再描画できるが、answerは1 fingerprintだけを受理する。
- BR-IB-22: reviewのclaimed recoveryは同じkeyをdedupeできる場合だけ再送し、それ以外はunavailableとする。
- BR-IB-23: terminal interactionへ新しいreservationを付けず、新しい意味判断／iterationだけを新instanceにする。
- BR-IB-24: canonical identity tupleとsemanticKeyのownerはC2で、C4／renderer／reviewerは独自IDをmintしない。
- BR-IB-25: durable transitionは`mark-delivered | record-answer | record-review-result | fail | unavailable | cancel | exhaust`のclosed commandだけを受理する。
- BR-IB-26: C7はinteraction delivery／review dispatchのidempotency availabilityとeffect照会を公開し、照会不能を成功へ推測しない。

## Revision 1 Reconciliation

BR-IB-07/08/10A/15A/25/26でidentity、mutation、capability、summaryの公開境界をApplication Designと統一した。

## 検証規則

初回、同一replay、新しいfollow-up、review NOT-READY反復、cap+1拒否、policy mismatch、claim後crash、重複表示、answer conflict、review effect unknown、resume、renderer失敗をtest matrixに含める。#1602/#1998のIDとreceiptを利用し、独自predicateがないことをconformanceで確認する。
