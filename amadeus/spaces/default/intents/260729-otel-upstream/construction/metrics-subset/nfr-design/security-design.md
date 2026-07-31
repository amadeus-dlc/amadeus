# Security Design — U9: metrics-subset

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の要件（機微情報の非流入・出力境界）に対する設計。

## 属性の非機微化設計

- Metric 属性は stage slug・operation 名・計測値など列挙可能な非機微値に限定し、自由形式のユーザー入力を属性値に流さない（security-requirements.md § 機微情報の非流入）
- trace ID・span ID・ユーザー入力等の高カーディナリティ値は相関フィールドに留め、Metric 属性の集計キーにしない（scalability-design § カーディナリティと共通の制約）
- 計測側で機微情報（prompt・argv・credential・無許可パス）を属性に付与しないことをテストで固定する（BR-9、FR-DST-3、VER-2 ゲートへの接続）

## redaction の責務境界

- redaction policy の実装責務は U4 の二層（write-time＋export 境界）に委譲し、本 Unit は policy を追加実装しない（BR-8/BR-9）。二重実装によるポリシー分裂を防ぐ
- Metric Store を含む telemetry 成果物が credential-free であることの検査ゲート（VER-2）の対象に整合する形で record を構成する

## 出力境界の設計

- Metric の出力先は machine-local JSONL の Metric Store に限定し、audit JSONL（canonical Journal）へ混入させない（BR-5）
- network flush・Collector 依存を持たない（BR-3）。外部送信は Relay（FR-RLY 群）の責務として、本 Unit のコンポーネントに送信経路を作らない
