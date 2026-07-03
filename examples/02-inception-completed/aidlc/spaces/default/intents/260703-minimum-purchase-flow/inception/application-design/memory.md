# Memory: application-design

## Interpretations

- 新しいコンポーネントとサービス層の設計が必要であるため Application Design を実行した。
- Greenfield のため、既存コンポーネントとの整合ではなく、Ideation の技術制約を設計制約として扱った。

## Deviations

- 既存コードベース、既存アーキテクチャ、既存コンポーネントは存在しない。

## Tradeoffs

- 在庫参照は独立サービスではなく商品サービス内のコンポーネントにした。
- 未確認の外部 API 仕様を B001 に持ち込まないよう、注文作成の貫通と在庫参照を分離できる設計にした。

## Open questions

- 商品一覧の取得元は未確認。
- 在庫管理システムの API 仕様は未確認。
- リレーショナルデータベースの製品は未確認。
