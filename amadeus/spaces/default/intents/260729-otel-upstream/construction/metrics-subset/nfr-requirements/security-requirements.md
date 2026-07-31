# Security Requirements — U9: metrics-subset

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 機微情報の非流入

- Metric 属性に機微情報（prompt・argv・credential・無許可パス）を計測側で付与しない（BR-9、FR-DST-3）
- redaction policy の実装責務は U4 の二層（write-time＋export 境界）に委譲し、本 Unit は policy を追加実装しない（BR-8、BR-9）
- Metric record の属性は stage slug・operation 名・計測値など列挙可能な非機微値に限定し、自由形式のユーザー入力を属性値に流さない

## 出力境界

- Metric の出力先は machine-local JSONL の Metric Store に限定し、audit JSONL（canonical Journal）へ混入させない（BR-5）
- network flush・Collector 依存を持たない（BR-3）。外部送信は Relay（別 Unit、FR-RLY 群）の責務
- Metric Store を含む telemetry 成果物が credential-free であることの検査ゲート（VER-2）の対象に整合する形で record を構成する

## 検証

- 計測属性に機微キーが混入しないことをテストで固定する（VER-2 ゲートへの接続）
