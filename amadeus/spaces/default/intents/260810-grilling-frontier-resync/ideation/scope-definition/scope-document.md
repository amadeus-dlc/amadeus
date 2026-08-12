# Scope Document — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: scope-definition (1.4) / **Scope**: self-feature

上流入力(consumes 全数): `intent-statement.md`(必須 — 本書の In/Out 境界・成功指標・未決3点はすべて同文書から導出)。`feasibility-assessment` と `constraint-register` は本 scope(self-feature)で feasibility ステージが SKIP のため不存在(条件付き consumes の負方向解決 — 省略された上流は SKIP されたステージの成果物であり欠落ではない)。

## In 境界(能力目録 — 全件 SETTLED)

| # | 能力 | 出典 |
|---|---|---|
| 1 | `grilling-protocol.md` 全面書き直し(上流骨格 `1495d014` 逐語+Amadeus overlay の2層分離、帰属ヘッダへ取り込み SHA 記録) | #2785 採用方針 |
| 2 | depth = 枝刈りの materiality 閾値へ再定義(Minimal/Standard/Comprehensive 表) | #2785 |
| 3 | Free(枝刈りなし)— standalone `/amadeus-grilling` の既定。語彙上の実現形(depth 第4値 vs 別パラメータ)は要件段裁定 | #2785 |
| 4 | 回路遮断器(depth 指定時、目安の桁超過で「ツリー未完走」を明示開示して停止) | #2785 完了条件5 |
| 5 | 刈ったノードの合意サマリへの明示列挙 | #2785 完了条件4 |
| 6 | frontier ラウンド一括提示と質問ファイル書き戻し・1問1監査イベント契約の annex 写像 | #2785 完了条件6 |
| 7 | `stage-protocol.md` §3 Step 3d / §8 Depth-Level Contract / §3 depth 表の整合改訂 | #2785 対象範囲(REFRAME 反映) |
| 8 | `question-budget` センサー契約の改訂(閾値・適用除外・Free の扱い) | 同上 |
| 9 | `tests/integration/t415-interaction-budget-contract.test.ts` の明示改訂(仕様裁定とセット) | #2785 完了条件7 |
| 10 | `/amadeus-grilling` スキル改訂(standalone 既定 = Free) | #2785 |
| 11 | prose 消費者 sweep(「1問ずつ」8箇所)+ docs(hybrid 残存の自然消滅分のみ同梱) | #2785 対象範囲+intent-capture Q3 裁定 |
| 12 | dogfood 実走: Rust ナレッジ設計議論(10領域)を standalone Free で全分岐完走 | intent-capture Q2 裁定 |
| 13 | 着地後の #2683 への L2 変更反映報告 | intent-capture Q1 裁定 |

## Out 境界

- #2683 L2 行(質問上限 4/8/12 の全体アーキテクチャ)自体の改訂 — 本 intent は grilling という単一消費者の終了意味論のみを変え、他モード(Guide me 等)の質問上限は不変
- #2063 が導入した bounded review 契約の grilling 外の面(reviewer イテレーション予算等)
- 既存 drift の独立修正・別 Issue 起票(自然消滅分のみ同梱 — Q3 裁定)
- 上流リポジトリへの貢献・fork 運用の変更

## 依存関係と順序(operational 裁定)

**4層依存(Q1 裁定: 正本先行)**: 要件段裁定3点((a) Free 語彙 (b) §8 緊張の一意化 (c) semi 除外契約の要否)→ ①正本 `grilling-protocol.md` → ②契約面(stage-protocol 整合・question-budget・t415)→ ③投影(スキル・prose・docs)→ ④dogfood 実走。

**シーケンシング(Q2 裁定: dependency-first)**: walking-skeleton は self-feature 必須 — Bolt 1 = 最小の骨格置換 end-to-end(protocol 書き直し+最小テスト整合)を単独ゲートで通してから残りへ広げる。

**期限(Q3 裁定)**: ハードデッドラインなし。Rust ナレッジ議論は完了待ちの後続依存。

## 規模の見積り

| 面 | 見積り(行数レンジ) | 根拠 |
|---|---|---|
| `grilling-protocol.md` 書き直し | 130-200行(現行137行の全面改稿) | 現行実測137行+overlay 節の追加 |
| `stage-protocol.md` 整合改訂 | 30-80行の差分 | Step 3d(:348-356)・§8(:726-746)・depth 表(:300-311)の局所改訂 |
| センサー・directive 語彙 | 20-60行 | question-budget の Free 対応+fail-open 封鎖、`VALID_DEPTH_VALUES` の扱いは裁定 (a) に依存 |
| t415 改訂+新規テスト | 60-150行 | 逐語 pin の差し替え+回路遮断器・枝刈り列挙の落ちる実証 |
| スキル・prose・docs | 40-100行の差分 | 8箇所 sweep+docs 3箇所 |

合計概算 280-590行の差分(テスト込み)。単一 intent の凝集範囲内であり分割不要(cid:intent-capture:c4-2 — 規模だけを理由に intent 分割しない)。

## 成功指標との対応

intent-statement の Success Metrics 4行(骨格逐語の機械照合 / dogfood 完走 / 回路遮断器の落ちる実証 / 契約面同期 green)を本書の能力 1・12・4・7-9 がそれぞれ実現する。
