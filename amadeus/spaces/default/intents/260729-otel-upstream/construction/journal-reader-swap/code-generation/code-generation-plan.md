# Code Generation Plan — journal-reader-swap

上流入力（consumes 全数）: functional-design（business-logic-model.md、business-rules.md、domain-entities.md）、nfr-requirements、nfr-design、unit-of-work.md、requirements.md（すべて参照済み）

## 対象要件

FR-JRN-4（正規化 field access）、FR-JRN-5 系の読取面、BR-8/BR-9/BR-16（correlation 非合成・raw record 保全）

## 実施方針

- 承認済み functional-design の共通 reader（U3 codec の parseJournalLine による v1/v2 dispatch）へ全読取面を載せ替える:
  - `amadeus-lib.ts` auditBlockField / findAllEvents — journalRecordField 経由の正規化 field access
  - `amadeus-otel-projector.ts` — journalSpanInput による span-input view 正規化
  - `amadeus-migrate.ts` doctor migration-evidence — v1/v2 行 decode
- U4（local-exporters）が lib に置いた interop 正規化は共有 accessor へ吸収して削除（二重定義を残さない）
- テストは実装と同一コミットで red-green（TDD）。t365（unit: accessor 等価性）/ t366（integration: projector）を新設
- 正本は packages/framework/core/、生成面は package.ts / promote:self で同期
- 成果は PR #1718 として review・CI 後に merge

## 検証計画

- t365 / t366 + 既存 audit 読取系 suite（t188 / t31 等）の回帰確認
- typecheck・lint・dist:check・promote:self:check
- patch coverage gate（追加行のカバレッジ、allowlist は理由＋期限付きのみ）
