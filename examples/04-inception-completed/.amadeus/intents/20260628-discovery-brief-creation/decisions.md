# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Ideation を完了し Inception へ進める | 採用 | なし | [D001-complete-ideation.md](decisions/D001-complete-ideation.md) |
| D002 | Inception の境界と gate passed を固定する | 採用 | D001 | [D002-inception-gate-passed.md](decisions/D002-inception-gate-passed.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Discovery Brief 記録と Intent 候補提示の対象、対象外、初期モックが揃っているため。 |
| D002 | D001 | Ideation gate passed を前提に、Inception 成果物へ分解したため。 |
