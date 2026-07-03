# Domain Map

## Subdomains

| 識別子 | 名前 | 種別 | 役割 | 状態 | 根拠 |
|---|---|---|---|---|---|
| SD001 | 購入 | コア | 購入者が商品を選択して注文を作成する購入フローを担う | adopted | [U001 domain-entities.md](../intents/260703-minimum-purchase-flow/construction/U001-inventory-lookup/functional-design/domain-entities.md) |
| SD002 | 在庫管理 | 支援 | 在庫情報を管理し、購入フローへ在庫参照の応答を供給する | adopted | [U001 domain-entities.md](../intents/260703-minimum-purchase-flow/construction/U001-inventory-lookup/functional-design/domain-entities.md) |

## Bounded Contexts

| 識別子 | 名前 | サブドメイン | 役割 | 状態 | 根拠 |
|---|---|---|---|---|---|
| BC001 | 購入フロー | SD001 | 商品選択、注文作成、在庫参照を含む本 Intent のアプリケーションの境界 | adopted | [U001 domain-entities.md](../intents/260703-minimum-purchase-flow/construction/U001-inventory-lookup/functional-design/domain-entities.md) |
| BC002 | 在庫管理システム | SD002 | 在庫情報を管理し、在庫参照の要求に応答する外部システム（EXT001） | adopted | [U001 domain-entities.md](../intents/260703-minimum-purchase-flow/construction/U001-inventory-lookup/functional-design/domain-entities.md) |
