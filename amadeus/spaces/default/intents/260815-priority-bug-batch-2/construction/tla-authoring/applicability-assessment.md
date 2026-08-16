# TLA+ Authoring — Applicability Assessment(terminal: impl-only)

- Intent: 260815-priority-bug-batch-2 / 実施: 2026-08-17(inline, architect persona)
- 入力: `inception/requirements-analysis/requirements.md`(FR-1〜FR-4 / NFR-1 を全数検査)

## 判定

- FR-1(#3077 選挙 preservedResultDigest): 変更ファイル `packages/framework/core/tools/amadeus-election.ts` は registered model **FormalElection** の implPath(model-map.json entries で実測)。ただしモデルの `preserved` は question ID の集合として抽象化されており(FormalElection.tla:14,24,57 — `preserved' = preserved ∪ EstablishedQuestions(...)`)、digest 概念はモデルに存在しない(.tla 全文に "digest" 0 hit)。#3077 の修正は「再 tally が全 question を覆うとき digest 表現を null にする」という実装レベルの直列化整合であり、モデルが検査する到達可能挙動(preserved/targets/phase の状態機械)の意味論は不変。分類: **impl-only**
- FR-2(#3074 recompose ガード): 変更ファイル `amadeus-lib.ts` / `amadeus-utility.ts` はいずれの registered model の implPath でもない(model-map 全 entries への grep 0 hit・exit 1 で実測)。recompose ガードは単一 writer の逐次述語であり、並行・再開可能アクター共有状態 + 無音の安全性違反というモデル化基準を満たさない。分類: **non-target**
- FR-3(#3075 壁時計アサーション)/ FR-4(#3079 t224 timeout): テストファイルのみの変更で本番挙動なし。分類: **non-target**
- route は terminal(**impl-only**)で step 2 以降(authoring)へ進まない

## 実測エビデンス

- implPath resync: commit `cfd8c72f2`(`updateModelMap --impl-only`、コミットメッセージ逐語「The model and configuration are unchanged; only the implementation bytes moved」)で FormalElection の amadeus-election.ts ピンを `40ea32060aa9…` → `29a030d4d7a8…` へ更新済み(PR #3101 に同梱、マージ済み)
- モデル再検査: 本セッション(2026-08-17)で spec-change advisory 起点の single-run により TLC 完全探索を実行 — **NOT_DETECTED**(exit 0)、completion marker `complete:true`、5922 states generated / 2266 distinct / 0 states left on queue(fail-closed 条件充足)。plugin-activation record 後の advisory 評価は no-hold

## 却下 subject の記録

- FR-2(recompose 認可ガード): 逐次述語・並行プロトコル非該当
- FR-3 / FR-4(テストアサーション・timeout 宣言): 本番挙動を持たない

## Terminal route の承認

- 裁定: full 梯子 AUTO_DECIDED `auto-decision-ae6d1e30b5d9f5de6defba4d494edc50`(approve-impl-only)
