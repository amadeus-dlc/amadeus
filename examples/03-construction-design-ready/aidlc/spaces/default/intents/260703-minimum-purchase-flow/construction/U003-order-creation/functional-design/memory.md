# Memory: functional-design

## Interpretations

- Unit ディレクトリ名は `<unit-id>-<slug>` の契約に従い、U003 注文作成を `U003-order-creation` にした。
- 実行指示の「注文作成には新しいデータモデルと業務ルール（在庫参照の結果に基づく注文可否）があるため、Functional Design が必要である」に基づき、Condition を真と判定した。注文と注文番号が新しいデータモデル、注文可否の判断が新しい業務ルールである。
- mockups.md が Functional Design へ委ねた注文番号の形式を「ORD-YYYYMMDD-NNNN」に確定した。
- 注文内容確認画面と注文完了画面の UI があるため、frontend-components.md を作成した。

## Deviations

- external-dependency-map.md はリレーショナルデータベースの製品確定を NFR Requirements（Stage 3.2）に置いていたが、実行指示により 3.2 は skip した。製品の確定は Code Generation の実装計画へ移した。

## Tradeoffs

- 在庫確認から記録までの間の在庫変動を許容した。在庫の引き当ては本 Intent の対象外であり、walking skeleton の最小範囲を優先した。
- 注文を 1 商品の平坦なモデルにし、注文明細を分離しなかった。本 Intent の注文対象が 1 商品であり、要求にない構造を先取りしないためである。

## Open questions

- リレーショナルデータベースの製品の確定（Code Generation の実装計画で扱う）。
- 日内連番の桁あふれと、注文の記録に失敗した場合の購入者への表示。
