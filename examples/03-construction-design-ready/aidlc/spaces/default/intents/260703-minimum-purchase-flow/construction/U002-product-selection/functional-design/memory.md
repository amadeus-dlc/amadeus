# Memory: functional-design

## Interpretations

- Unit ディレクトリ名は `<unit-id>-<slug>` の契約に従い、U002 商品選択を `U002-product-selection` にした。
- greenfield であり、商品と在庫状況つき商品はこの Unit で新しく定義するデータモデルである。選択可否（在庫の有無と在庫不明）と数量の検証は新しい業務ルールであるため、Condition を真と判定した。
- 商品一覧画面の UI があるため、frontend-components.md を作成した。

## Deviations

- なし。

## Tradeoffs

- 在庫不明を在庫なしと別の語彙にした。表示文言と再試行の導線が在庫なしと異なるため（interaction-spec.md）、区別する価値がある。
- 商品一覧の在庫表示は在庫の有無だけにした。要求（R001）が在庫状況の表示までを求め、数量の表示を求めていないためである。

## Open questions

- 販売対象の商品情報の出どころ（登録と更新の手段）。walking skeleton では商品カタログに投入済みのデータを前提にする。
