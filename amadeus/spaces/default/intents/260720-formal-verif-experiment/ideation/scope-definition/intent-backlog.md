# Intent Backlog — 260720-formal-verif-experiment

## 上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

scope-document.md の Must 6項目を、intent-statement.md の成功指標へトレース可能なバックログとして整列する(番号は実行順 — dependency/risk-first。feasibility-assessment.md の⚠2点は B-1/B-4 に吸収、constraint-register.md C-5 は B-3 の実行条件)。

## バックログ(実行順)

| # | アイテム | 依存 | 成功指標への対応 |
|---|---|---|---|
| B-1 | 欠陥台帳確定(M-1): PR#1268/#1277/#1273 の diff 読解→欠陥の全数列挙・IDづけ・再現条件記録 | なし | 指標1の分母確定 |
| B-2 | 注入ブランチ群作成(M-2): 欠陥1件=1ブランチ、revert ベース、非マージ隔離 | B-1 | 指標1の被検体 |
| B-3 | 2アーム blind 並行実装(M-3/M-4): TS 判定器と TLA+/TLC モデルを別エージェント・worktree 隔離で起草。各アームの完成条件=注入欠陥での「落ちる実証」 | B-2(注入内容は各アームへ非開示) | 指標1の検出器 |
| B-4 | 計測ハーネス+実測(M-5): 6×2 マトリクス、偽陽性(健全 main で赤くならないこと)、工数、CI 秒数 | B-3 | 指標1・2の入力 |
| B-5 | 採否判定レポート(M-6): 基準適用(全件検出必須→コスト最小)+6体翻意条件への回答+Alloy 追加要否判定(W-1 の発動条件評価) | B-4 | 指標2・3 |

## park 時の残作業(本 intent の ideation 完了条件)

- record PR 発行(独立2名レビュー、construction 進入の前提)
- ミラー Issue 起票(タイトル+3〜5行概要+record リンク+状態行)
