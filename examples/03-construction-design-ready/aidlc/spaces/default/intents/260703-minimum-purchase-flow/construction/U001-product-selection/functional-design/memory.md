# Memory: functional-design

## Interpretations

- Unit ディレクトリ名は `<unit-id>-<slug>` の契約に従い、U001 商品選択を `U001-product-selection` にした。
- greenfield であり、商品（商品識別子、商品名、価格）はこの Unit で新しく定義するデータモデルであるため、Condition を真と判定した。
- 商品一覧画面の UI があるため、frontend-components.md を作成した。
- ゲートは、実行指示「人間の承認を待つ箇所は、この指示を人間の承認として扱ってください」を人間の承認として扱った。

## Deviations

- なし。

## Tradeoffs

- B001 の商品一覧は商品名と価格だけを表示する。在庫状況の表示と選択可否は U002（B002）の責務であり、この Unit では選択操作の可否を商品ごとに制御できる構造だけを用意した。二重実装を避け、U002 の統合を差し込みで済ませるためである。

## Open questions

- 注文対象になる商品情報の出どころ（登録と更新の手段）。walking skeleton では投入済みの商品データを前提にする。
- 商品一覧の表示順。walking skeleton では商品一覧提供が返した順で表示する。
