# Intent Backlog — 260720-leader-store-sync

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md — 並びは raid-log の risk-first 順(scope-definition:c3)

## 並び(risk-first)

intent-statement.md の問題閉包を、feasibility-assessment.md の方式実現可能性順(C=GO/A=GO 暫定/B=条件付き)と constraint-register.md の C-1〜C-8 に整合させて分解した(裁定依存 — 方式選挙の結果で B-1/B-2 の要否が確定):

| # | バックログ項目 | リスク根拠 | 依存 |
| --- | --- | --- | --- |
| B-1 | 抽出述語+除外規則の実装と落ちる実証(M-1/M-2)— 境界誤判定 R-1 を最初に潰す | R-1(E-PM10A 違反は S1 級) | 方式選挙 |
| B-2 | sync PR 生成(M-3)+自己検査の corpus 適用(M-5) | R-2(巨大 PR 化) | B-1 |
| B-3 | 同期契機ノルムの persist(M-4、norm PR 経由) | R-2 恒久面 | 方式選挙(契機定義) |
| B-4 | 交差目録の着手前確認(scripts/ 新規ファイル vs e1/e2/e4 実装面) | R-3 | 実装着手前(B-1 の前提) |

## 除外バックログ(二重起票回避)

- 方式 B(CLI advisory)採用時の実装 → 別 Issue 起票(W-2)。#1279(diary 自動生成)は e1 管轄の別 intent 候補 — 本 intent へ編入しない。
