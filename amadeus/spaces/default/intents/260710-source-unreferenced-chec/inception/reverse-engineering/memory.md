# Stage Diary — reverse-engineering (source-unreferenced-check)

## Interpretations

- 2026-07-10T03:15:00Z — 既存 codekb(2026-07-09 gate-mechanics 版)があるため diff-refresh 方式で実行(project.md 是正 cid:reverse-engineering:c1)。前回スキャンコミット 162553b99 → 現 HEAD 584262c1a の38コミット差分。
- 2026-07-10T03:15:00Z — Developer(スキャン)→ Architect(合成)の2サブエージェント直列で実行(cid:reverse-engineering:c3)。フォーカスは #735 が依存する packaging 面(package.ts の buildTree/checkHarness、全 harness manifest、authoredExempt 実態)。

## Deviations

## Tradeoffs

- 2026-07-10T03:15:00Z — Architect が diff-refresh 由来の「(本 intent)」ラベル陳腐化(旧 intent 節に現在マーカーが残存)9箇所を発見し履歴ラベルへ是正。diff-refresh 方式の既知コスト(節の追記が積層する)として許容し、フルスキャンへの切替はしない(churn とコストが上回る)。

## Open questions

- 2026-07-10T03:15:00Z — requirements へ引き継ぐ未決5点(architecture.md の合成ビュー参照): (1) 参照集合の導出点(実読み記録 vs manifest 静的導出) (2) 発火点(checkHarness 相乗り vs 独立サブコマンド) (3) 検出時の重大度(hard fail vs warning) (4) build 機構3種の除外リストの権威と保守 (5) 落ちる実証の配置層(t148 先例)。
