# Memory: units-generation

## Interpretations

- Application Design と要求から、商品選択、注文作成、在庫参照を Unit とした。
- Unit 識別子はユーザー指定に従い `U001` からの連番にした。

## Deviations

- 技術レイヤー別の Unit 分割は避け、各 Unit が UI とサービス層を縦に貫くようにした。

## Tradeoffs

- `U001` を商品選択、`U002` を注文作成、`U003` を在庫参照にした。
- これにより `B001` は `U001` と `U002` を束ねて注文作成を貫通できる。

## Open questions

- 商品一覧の取得元は未確認。
- 在庫管理システムの API 仕様は未確認。
