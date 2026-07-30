# Code Generation Plan — metrics-subset

上流入力（consumes 全数）: functional-design（business-logic-model.md、business-rules.md、domain-entities.md）、nfr-requirements、nfr-design、unit-of-work.md、requirements.md（すべて参照済み）

## 対象要件

FR-MLM-1, FR-EXP-5（unit-of-work.md U9）

## 実施方針

- OTel Metrics API subset（meter-provider.ts）: Counter/Histogram のみ、二重登録は throw（tracer-provider の登録契約に整合）、任意 aggregation advice は例外化（BR-1/FR-EXP-5）
- Trace Context 相関: 明示 Context 優先、無ければ active Context。intentId は export 境界で解決（BR-3、canonical journal と同方針）
- U4 hardened local-metric-exporter.ts を配線。redaction は export 境界
- global 登録の production 配線は本 Bolt 対象外（conductor 執行裁定 2026-07-30 — production 計測 callsite ゼロの実測により、配線は callsite 導入 Unit へ委譲）
- TDD（Red 実測 → 最小実装 → Green）。成果は PR #1732

## 検証計画

- t369（15 tests）+ 影響 otel スイート8ファイル
- typecheck・lint・dist:check・promote:self:check・patch coverage
