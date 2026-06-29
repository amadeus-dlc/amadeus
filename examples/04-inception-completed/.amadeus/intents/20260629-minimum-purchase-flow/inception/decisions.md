# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Inception の所有境界を BC001 販売管理に固定する | 採用 | なし | [D001-inception-boundary.md](decisions/D001-inception-boundary.md) |
| D002 | 最小購入フローと注文作成を Unit として分ける | 採用 | D001 | [D002-unit-and-bolt-split.md](decisions/D002-unit-and-bolt-split.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Inception 成果物の境界判断であるため。 |
| D002 | D001 | Unit と Bolt の分割は、BC001 販売管理を中心にする判断を前提にするため。 |
