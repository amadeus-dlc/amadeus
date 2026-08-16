# 回復適用計画 — intent 260814-open-bug-batch-6(FR-5 record 面)

> 一般手順の正本: `docs/guide/15-troubleshooting.md` §「Construction Finished but the Next Stage Refuses (producer-outcome-pending)」(+ `.ja.md`)。本書はその手順を停止中の実 intent へ適用する計画(リカバリ計画ステップ 4 の実行手順)。pool イベントの後付け生成(捏造)は一切行わない。

## 対象

- intent: `260814-open-bug-batch-6`(record は main へ着地済み — PR #3100 / #3103)
- 状態: `Current Stage: build-and-test` / `Parked: 2026-08-15T05:15:17Z` / 5 unit すべて着地・approve 済み(PR #3080 #3081 #3086 #3089 #3092 MERGED)
- 症状: `next` が `producer-outcome-pending: landed-finalization, sensor-declaration, docs-sensors-sync, worktree-gc-determinism, audit-sink-investigation`(監査シャード `j5ik2o-mac-studio-lan-1ce2b3e7876b.jsonl:476-477` 実測)

## 適用手順(本 PR #3105 の main 着地後)

1. 作業ツリー(bugfix-0815-2 worktree または新 worktree)を修正入りの main へ前進させ、`bun install` + `bun run build` で self-install 面を再生成する
2. active intent を `260814-open-bug-batch-6` に設定し、`/amadeus --resume` で park を解除する
3. `/amadeus --stage code-generation` でカーソルを code-generation へ戻す(**`--single` は不可** — isolated 契約により per-unit ループへ入らず settle されないことをテストで実測固定済み)
4. `/amadeus` を実行 — engine が record の成果物断面から各 unit の coverage を再導出し、per-unit ループ内で `UNIT_OUTCOME_SETTLED` を**前向きに**発行する(now-only・冪等鍵 `<stage> <unit> <batch>`)
5. code-generation の承認ゲートを通過後、`next` が build-and-test の directive を返すことを確認する(受け入れ基準が名指す `next` 経路そのもので実測)
6. 以降はリカバリ計画ステップ 4(build-and-test 完走 → Issue 着地検証・クローズ)へ引き継ぐ

## 検証点

- 手順 4 の後、監査シャードに settle 行が unit ごとに **1 行だけ**存在すること(冪等)
- `next` 再実行で行数が増えないこと
- pool イベント(`UNIT_POOL_EVENT_SET_COMMITTED`)が **0 件のまま**であること(捏造なしの機械確認)

## 既知の限界

- 手順 3 のカーソル巻き戻し(`amadeus-jump.ts execute`)自体はテスト内で実駆動しておらず(state への効果 = カーソル pivot は直接再現で固定)、本適用が最初の実測になる。失敗時は手順を中断し、記録のうえ裁定へ戻す
- cancelled unit を含む batch は本修正の射程外(対象 intent の 5 unit はすべて成功着地のため本適用には影響しない)
