# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の境界を BC004 販売管理に固定する | 採用 | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | 注文作成を B001 の責務に固定する | 採用 | D001 | [D002-order-creation-bolt-boundary.md](decisions/D002-order-creation-bolt-boundary.md) |
| D003 | greenfield として既存コード分析を対象外にする | 採用 | D001 | [D003-greenfield-codebase-analysis.md](decisions/D003-greenfield-codebase-analysis.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Inception 成果物全体の責務境界を決める判断であるため。 |
| D002 | D001 | BC004 の中で注文作成の Bolt 責務を固定する判断であるため。 |
| D003 | D001 | 実装対象コードの有無は、Unit Design Brief と Bolt の入力範囲に影響するため。 |
