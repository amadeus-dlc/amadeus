# Code Generation Plan — local-exporters

上流入力（consumes 全数）: functional-design（business-logic-model.md、business-rules.md、domain-entities.md）、nfr-requirements、nfr-design、unit-of-work.md、requirements.md（すべて参照済み）

## 対象要件

FR-EXP-2〜5、FR-JRN-3、FR-EVT-2、FR-DST-3/4/5、VER-2、BR-4/5/7/10/13/14

## 実施方針

- 承認済み functional-design／nfr-design の seam をそのまま実装（逸脱なし）
- AuditLogExporter を journal schema v2 codec（appendJournalRecordV2: lock → seq → v2 encode → sync append）へ載せ替え、registry 検証済み accept set と統一失敗契約（append 失敗 = sync throw + fatal latch）を実装
- redaction は write-time と export 境界の二層（Mandated: export-boundary-redaction）。Command は scrubbed opt-in 層へ、全 admitted 値に credential scrub
- LocalSpanExporter / LocalLogExporter / LocalMetricExporter は fail-open store + export 境界 redaction
- テストは実装と同一コミットで red-green（TDD）。正本は packages/framework/core/、生成面は package.ts / promote:self で同期
- 成果は PR #1719 として review・CI 後に merge

## 検証計画

- unit テスト（redaction）+ integration テスト（audit v2 exporter / credential-free gate / telemetry stores）
- typecheck・lint・dist:check・promote:self:check
- patch coverage gate（追加行のカバレッジ）
