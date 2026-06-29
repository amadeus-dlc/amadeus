# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | 注文作成を扱う。 | U002 | [design.md](units/U002-order-creation/design.md) | B002 | [B001-create-order.md](bolts/B001-create-order.md) |
| B002 | 注文内容確認を扱う。 | U001 | [design.md](units/U001-minimum-purchase-flow/design.md) | B003 | [B002-confirm-order.md](bolts/B002-confirm-order.md) |
| B003 | 商品選択を扱う。 | U001 | [design.md](units/U001-minimum-purchase-flow/design.md) | なし | [B003-select-product.md](bolts/B003-select-product.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | B002 | 注文作成は確認済み注文内容を前提にするため。 |
| B002 | B003 | 注文内容確認は選択商品を前提にするため。 |
| B003 | なし | 商品選択は最小購入フローの入口であるため。 |
