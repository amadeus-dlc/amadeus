# Memory: functional-design

## Interpretations

- Unit ディレクトリ名は `<unit-id>-<slug>` の契約に従い、U001 在庫参照を `U001-inventory-lookup` にした。
- 実行指示の「注文作成には新しいデータモデルと業務ルール（在庫参照の結果に基づく注文可否）がある」を根拠に、注文可否の判断へ在庫状況を供給する U001 の Condition を真と判定した。greenfield であり、在庫状況と参照失敗はこの Unit で新しく定義するデータモデルである。
- U001 は UI を持たないため、frontend-components.md は作らない。商品一覧画面は U002 の範囲である。

## Deviations

- なし。

## Tradeoffs

- 失敗の理由（接続失敗、時間切れ、解釈できない応答）を区別せず、単一の参照失敗として扱う。呼び出し元の振る舞いが理由によって変わらないため（GD001）、walking skeleton では単純さを優先した。

## Open questions

- 在庫管理システムの API 仕様（エンドポイント、認証方式、応答形式、在庫数量の粒度）と接続条件。
- 参照失敗と判定するまでの待ち時間の閾値。
