# 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | Ideation を完了し Inception へ進める | 採用 | なし | [D001-complete-ideation.md](decisions/D001-complete-ideation.md) |
| D002 | BC001 販売管理を Inception の中心境界にする | 採用 | D001 | [D002-inception-boundary.md](decisions/D002-inception-boundary.md) |
| D003 | 最小購入フローと注文作成を Unit に分ける | 採用 | D002 | [D003-unit-split.md](decisions/D003-unit-split.md) |
| D004 | Bolt を注文作成、注文内容確認、商品選択に分ける | 採用 | D003 | [D004-bolt-split.md](decisions/D004-bolt-split.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | なし | Ideation の対象、対象外、初期モック、Inception への引き継ぎが整理済みであるため。 |
| D002 | D001 | Ideation の対象範囲を Inception の境界へ対応させる判断であるため。 |
| D003 | D002 | Unit は BC001 販売管理の価値境界として切るため。 |
| D004 | D003 | Bolt は Unit Design Brief の分割方針に従うため。 |
