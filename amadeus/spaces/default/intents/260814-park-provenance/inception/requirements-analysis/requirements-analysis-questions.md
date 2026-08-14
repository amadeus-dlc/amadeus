# Requirements Analysis — 明確化質問

Intent: `260814-park-provenance`(scope self-fix, depth Minimal)。対象: [#3016](https://github.com/amadeus-dlc/amadeus/issues/3016)(クロスレビュー2名成立、収束 ESTABLISHED_WITH_REFINEMENTS)

質問は矛盾・実装を阻む要件欠落に限る(`cid:requirements-analysis:c5`)。既決: grant は park を跨いで**保持**(前 intent 260814-autonomy-stop-fixes の承認済み requirements FR-PARK-3 と現行実装意味論 `amadeus-stop.ts:943-946` / `docs/reference/12-state-machine.md:139` が一致 — 再質問しない)。前提実測は `codekb/amadeus/re-scans/260814-park-provenance.md`。

承認エビデンス(E-OC1): 2026-08-14T10:56:40Z — Q1〜Q4 すべて semi 梯子 AUTO_DECIDED(決定 Id は各 Answer 行)。ゲート承認は semi の autonomy_auto_approve による(Intent autonomy 宣言はユーザーの実 HUMAN_TURN 由来)。

## Q1: 修正方式(provenance 検証の置き所)

A. state 層の暗黙 fail-closed 判定 — `handlePark`(`amadeus-state.ts:1583-1587`)のガードを「autonomous のとき、本 intent ledger の未消費 fresh HUMAN_TURN が存在すれば受理(park が consume)、なければ従来拒否」へ置換。変更が `:1583-1587` 近傍に閉じ、coverage allowlist 非接触。fail-closed 述語(`outstandingHumanTurns` 系)を使い、`humanActedSinceGate` の active-scope fail-open は使わない
B. engine 層で provenance 引数を明示 — orchestrate `park` が presence 実測して識別子を渡す。#3011 後の `handlePark` 型契約変更により subArgs parse + `spawnState` 転送の新設が必要で変更範囲が広い
C. 判定入力を Intent 監査の authorization へ全面付替 — A1(派生投影を認可に使う規範不整合)も閉じるが self-fix の surgical 原則と緊張
X. Other (please specify)

[Answer]: A — AUTO_DECIDED `auto-decision-4549b7f1f89a9265702c04c1e3ef115d`。state 層の暗黙 fail-closed 判定(park が consume する未消費 fresh HUMAN_TURN)。

## Q2: fresh の基準(基準時刻 T の定義)

A. 「本 intent の presence ledger 上の**未消費** HUMAN_TURN が存在すること」を fresh とする(壁時計窓なし)。park 受理はその turn を消費し(WORKFLOW_PARKED を resolution として記録)、同一 turn の使い回しを構造的に排除。既存の consume-once 先例(`selectLifecycleHumanTurn`)の意味論に整合
B. 直近 gate 以後の壁時計窓で判定(時間依存でテストが脆い)
X. Other (please specify)

[Answer]: A — AUTO_DECIDED `auto-decision-bf07686047e17518dd35b163a06bc73c`。未消費 HUMAN_TURN の存在 + park による consume(壁時計窓なし)。

## Q3: テスト隔離シーム(`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` の扱い)

A. park ガードには env バイパスを**通さない** — テストは fixture の `mintHumanPresence` で実 turn を植えて検証する(fail-closed 維持。mint 自体が fail-open である設計前提は変更しない)
B. 既存 env シームを park にも適用(バイパス面が増え fail-open 化)
X. Other (please specify)

[Answer]: A — AUTO_DECIDED `auto-decision-751aa684e17f609e269227d20370a029`。env バイパスは通さない(fixture の実 mint で検証)。

## Q4: directive 由来 park のマーカー非対称(クロスレビュー A3)

A. 本 intent のスコープ外とする — #3016 の完了条件は明示 park verb の受理であり、`parkedDirective` 5 発行点(REPAIR_STALLED 等)の意味論は変えない(Out of scope へ明記、必要なら別 Issue)
B. 本 intent で併せて統一(スコープ拡大)
X. Other (please specify)

[Answer]: A — AUTO_DECIDED `auto-decision-c39c874d36a5b07c4b43def27b2dd3f7`。directive 由来 park はスコープ外(Out of scope へ明記)。
