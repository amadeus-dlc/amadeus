# Traceability：Inception

## 成功条件と成果物の対応

| 成功条件 | 対応する成果物 | 状態 |
|---|---|---|
| 購入者が商品を選択して注文を作成できる | `inception/requirements-analysis/requirements.md`（R001 から R004）、`inception/user-stories/stories.md`（S001 から S004）、`inception/refined-mockups/mockups.md`、`inception/application-design/components.md`、`inception/units-generation/units.md`（U001、U002）、`inception/delivery-planning/bolt-plan.md`（B001、B002） | 確定 |
| 注文作成の判断に在庫管理システムの在庫情報を参照できる | `inception/requirements-analysis/requirements.md`（R005、R006）、`inception/user-stories/stories.md`（S005、S006）、`inception/application-design/component-dependency.md`、`inception/units-generation/units.md`（U003）、`inception/delivery-planning/external-dependency-map.md` | 確定 |

## 要求と Unit、Bolt の対応

| 要求 | Unit | Bolt |
|---|---|---|
| R001 | U001、U003 | B002 |
| R002 | U001 | B002 |
| R003 | U002 | B001 |
| R004 | U002 | B001 |
| R005 | U002、U003 | B001 |
| R006 | U001、U002、U003 | B001（注文作成側）、B002（商品一覧側） |
