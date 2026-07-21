# Scope Document — 260720-formal-verif-experiment

## 上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

intent-statement.md の成功指標、feasibility-assessment.md の実測(対象面・材料・⚠2点)、constraint-register.md の C-1〜C-8 をスコープ境界として正規化する。

## In Scope(Must — 全て必須、Should/Could は置かない)

| # | 項目 | 根拠 |
|---|---|---|
| M-1 | 欠陥台帳の確定: 修正 PR(#1268/#1277/#1273)の diff 起点で再注入対象欠陥を全数列挙(5件+計数差1の解消) | feasibility I-2/R-4 |
| M-2 | 欠陥再注入ブランチ群の作成(欠陥1件=1ブランチ、修正 diff の revert ベース、main へ非マージ) | 実験の被検体。raid-log R-3 の隔離条件込み |
| M-3 | TS 内完結判定器アーム: universe 宣言+直積全域性総当たり+fast-check 不変条件+2時刻ブランド型規律の最小実装 | 6体グリリング C改 陣営の確約構成 |
| M-4 | TLA+/TLC アーム: 選挙状態機械の最小 TLA+ モデル+TLC 有界検査(tla2tools.jar 取得含む、C-1 境界内) | 6体グリリング A 陣営の確約構成 |
| M-5 | 計測ハーネス: 各注入ブランチ×各アームの検出/不検出、偽陽性、実装工数(時間・行数)、CI 実行秒数の記録表 | 採否基準の入力(C-4) |
| M-6 | 採否判定レポート: 全欠陥検出必須→コスト最小の基準適用と、6体の翻意条件への回答 | intent-statement 成功指標3 |

## Out of Scope(Won't — 明示的除外)

| # | 項目 | 根拠 |
|---|---|---|
| W-1 | Alloy アーム(取りこぼしバグ類型が実測された場合のみ、別途裁定の上で追加) | Q1 裁定(C-2) |
| W-2 | 勝者アームの本採用 CI 常駐ゲート化・品質ゲート通過(本採用 intent 側の仕事。実験成果物は初版として温存) | Q3 裁定(C-3) |
| W-3 | 監査 append-only・カーソルライフサイクル等、選挙プロトコル以外の領域への適用 | 段階適用(実証台=選挙のみ) |
| W-4 | Z3/SMT の導入 | 6体グリリング全会一致で初期導入却下 |
| W-5 | 配布フレームワークへの一切の変更(packages/framework/、dist/、self-install) | C-1(Bun-only Forbidden) |

## 実行順序の原則(dependency / risk-first)

1. M-1(台帳確定)が全ての分母 — 最初に固定
2. M-2(注入ブランチ)は M-1 に依存
3. M-3/M-4 は相互独立・**blind 並行**(C-5: 同一エージェントが両アームを書かない)
4. M-5→M-6 は M-2〜M-4 の完了後

リスク先行の判断: 最大リスクは共通モード故障(R-1)であり、M-3/M-4 の blind 分離を実行計画の hard 制約とする(worktree 隔離+アーム別エージェント)。

## 規模と期限

実験全体で1日規模(A-3、中確信度)。本 intent は ideation 完了で park し(C-6)、construction の実施はミラー Issue・record PR レビュー後のユーザー判断。
