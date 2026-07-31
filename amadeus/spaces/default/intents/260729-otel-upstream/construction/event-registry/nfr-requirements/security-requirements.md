# Security Requirements — U2: event-registry

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 機微情報の非流入

- EventDef の requiredAttributes 定義に機微キー（prompt・argv・credential・無許可パス）を含めない。Registry 登録時のレビュー観点として固定する（FR-DST-3 と整合）
- `command` 属性の safe-key 扱い見直し（FR-DST-4）と `redactionOptIn` の限定キー許可（FR-DST-5）は Registry の属性定義に反映し、argv 由来値にトークン等が混入しないポリシーを EventDef 側で担保する
- redaction の実行責務は write-time＋export 境界の二層（U4 側）にあり、本 Unit は属性語彙の入口を絞る役割に限定する

## 分類の強制

- `recordException()` の exception Span Event を telemetry と分類し、canonical（AuditLogExporter 受理集合）へ混入させない（BR-3、FR-EVT-7）。誤分類は drift guard が拒否する
- telemetry 成果物が credential-free であることの検査ゲート（VER-2）に対し、Registry の属性定義が検査可能な正本として機能する

## 検証

- 未登録名・誤分類・required attributes 不足を compile-time／unit test／sensor で拒否することをテストで固定（VER-1）
