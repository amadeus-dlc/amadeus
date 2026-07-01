# Construction Tasks

- [x] T001: traceability template を完了時表契約に合わせる。
  - 作業:
    - source template と昇格先 template に `Construction からの追跡` を追加する。
    - 必須列 `ボルト`、`タスク`、`証拠`、`状態` を template に含める。
  - 要求: R001, R002, R004
  - ユースケース: UC003
  - 依存: なし
  - 設計根拠: ../../U002-traceability-template-alignment/functional-design/business-logic-model.md
  - 証拠: `skills/amadeus-construction/templates/intents/construction/traceability.md`, `.agents/skills/amadeus-construction/templates/intents/construction/traceability.md`

- [x] T002: template eval の期待見出しを更新する。
  - 作業:
    - `dev-scripts/evals/amadeus-templates/check.ts` の Construction traceability template 期待見出しに `Construction からの追跡` を追加する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U002-traceability-template-alignment/functional-design/business-rules.md
  - 証拠: `dev-scripts/evals/amadeus-templates/check.ts`

- [x] T003: example 更新要否を判断する。
  - 作業:
    - 既存 example の Construction traceability を確認し、完了済み Construction の例に必要な表があるか確認する。
    - 更新しない対象の理由を decisions に残す。
  - 要求: R004
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U002-traceability-template-alignment/functional-design/domain-entities.md
  - 証拠: construction/decisions.md
