# Memory: application-design

## Interpretations

- コンポーネントの語彙を glossary.md の 3 領域（商品選択、注文作成、在庫参照）に合わせ、実装パターンの用語ではなくドメインの言葉で命名した。
- knowledge/domain-map.md と context-map.md は未登録のため、境界の判断材料には要求、ストーリー、制約だけを使った。

## Deviations

- 実行指示により質問を対話で行わず、application-design-questions.md に推奨回答と確定理由を記録する形へ代替した。
- 設計の確定判断は inception/application-design/decisions.md に記録した。grilling セッションを実行していないため、inception/grillings.md は作成していない。

## Tradeoffs

- 在庫参照を商品サービスに含めたため、在庫状況の利用先が増えた場合はサービス分割の再評価が必要になる。最小購入フローの単純さを優先した。
- 注文作成時の在庫再確認を行わないため、選択から注文作成までの間に在庫が変動した注文を受ける余地がある。要求にない検証を足さないことを優先し、必要になれば Construction で再評価する。

## Open questions

- 在庫管理システムの REST API の仕様が未確認のため、在庫参照の入出力（商品の識別子の形式、在庫状況の表現）は Construction の設計で確定する。
- リレーショナルデータベースの製品選定が未確認である。Construction の NFR Requirements の技術スタック判断で確定する。
