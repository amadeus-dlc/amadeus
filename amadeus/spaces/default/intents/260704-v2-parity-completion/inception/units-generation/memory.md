# Memory: units-generation

## Interpretations

- Unit は「独立に検証できる成果」で切った。R006（成果物双方向一致）は単一 Unit にせず、U003（生成側）、U005（検査側）、U007（文書側）へ分散させた。
- scope backlog の 7 項目は Unit 候補として評価した結果、いずれも今回の Unit にしない（backlog #1 の必要最小集合だけ U001 が内包し、残りは backlog のまま）。

## Deviations

- 境界戦略と粒度の質問は、事前の包括承認に基づき推奨案で自動確定した（G003 GD012）。
- stories が存在しないため unit-of-work-story-map.md は作成していない（skill 契約の「stories がある場合のみ」に従う）。

## Tradeoffs

- 粗め 8 Unit は、Unit 内の作業量のばらつき（U003 は 38 skill で大きい）と引き換えに、依存 DAG と検証境界を単純にする。U003 の内部分割は Delivery Planning の Bolt 側で吸収する。

## Open questions

- U008 の dogfooding 範囲（本 Intent の残ステージをどこまでエンジン駆動へ切り替えるか）は Delivery Planning で確定する。
