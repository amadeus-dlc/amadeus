# Context Map

## Dependencies

| Downstream | Upstream | 依存内容 | 組織パターン | 統合パターン | 状態 | 根拠 |
|---|---|---|---|---|---|---|
| BC001 | BC002 | 在庫情報の参照（REST API。商品一覧の在庫状況表示と注文作成時の在庫確認に使う） | 順応者 | 腐敗防止層（ACL） | adopted | [U001 domain-entities.md](../intents/260703-minimum-purchase-flow/construction/U001-inventory-lookup/functional-design/domain-entities.md) |
