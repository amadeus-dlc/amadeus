# Memory: functional-design

## Interpretations

- Unit ディレクトリ名は `<unit-id>-<slug>` の契約に従い、U003 注文作成を `U003-order-creation` にした。
- 注文は greenfield で新しく定義するデータモデルであり、在庫参照の結果に基づく注文可否という業務ルールを持つため、Condition を真と判定した（実行指示の条件判定に使う事実と一致する）。
- 注文可否の判定点は、application-design の decisions.md の 3（注文作成時に在庫の再確認を行わない）に従い、商品一覧画面の選択段階にした。B001 では在庫参照（U002）が未統合のため、この判定は B002 の統合後に効く。
- 注文内容確認画面と注文完了画面の UI があるため、frontend-components.md を作成した。
- ゲートは、実行指示「人間の承認を待つ箇所は、この指示を人間の承認として扱ってください」を人間の承認として扱った。

## Deviations

- なし。

## Tradeoffs

- 注文の識別子の形式を「ORD-作成日（YYYYMMDD）-日内連番 4 桁」に確定した。mockups.md の例示と一致し、購入者への表示に使える読みやすさを持つ。日内連番の桁あふれは walking skeleton では許容する。
- 注文に商品名と価格の写しを保持する。商品情報の後日の変更が記録済みの注文へ波及しないためであり、記録の重複より監査可能性を優先した。

## Open questions

- リレーショナルデータベースの製品。NFR Requirements を実行しないため、Code Generation の実装計画で確定して記録する。
- 日内連番の桁あふれ（1 日 1 万件以上の注文）の扱い。
