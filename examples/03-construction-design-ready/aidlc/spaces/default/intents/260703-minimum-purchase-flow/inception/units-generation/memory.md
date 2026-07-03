# Memory: units-generation

## Interpretations

- Unit 識別子は実行指示に従い U001 からの連番にした。
- 在庫参照（U001）を独立 Unit にしたのは、技術レイヤーによる分割ではなく、glossary に定義されたドメイン領域であり、Application Design の GD006（在庫参照の共有）に対応する境界だからである。
- スコープバックログの 3 項目は、いずれも本 Intent の対象外のため Unit 候補として採用しなかった。

## Deviations

- 実行指示により逐次質問を行わず、指示内容と既存成果物から回答を確定した。質問と回答は units-generation-questions.md に、境界戦略と粒度の確定判断は inception/grillings.md（G003）に記録した。

## Tradeoffs

- U003（注文作成）は UI 2 画面とサービス、ドメインを含み他の Unit よりやや大きいが、注文の作成と記録は分割すると価値を観測できないため 1 つに保った。

## Open questions

- なし。実装順序と経済的な順序付けは Delivery Planning が扱う。
