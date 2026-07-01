# Construction Tasks

- [x] T001: 前提不成立分類の text contract を追加する。
  - 作業:
    - `dev-scripts/evals/amadeus-templates/check.ts` に `upstream_feedback_required` と stage 前提確認の期待値を追加する。
    - `amadeus-decision-review` と phase skill の source/promoted 両方を確認する。
  - 要求: R004
  - ユースケース: UC002
  - 依存: B001/T002, B002/T003
  - 設計根拠: ../../U002-prerequisite-failure-routing/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: 配布対象 skill に repo 内 Issue 番号前提が混入しないことを確認する。
  - 作業:
    - `dev-scripts/evals/amadeus-templates/check.ts` で `amadeus-decision-review` の source/promoted から `Issue #277` と `Issue #272` を除外する。
    - 配布対象 skill には一般化した説明だけを書く。
  - 要求: R005
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U002-prerequisite-failure-routing/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T003: stage 前提確認の検証入口を実行する。
  - 作業:
    - `npm run test:it:amadeus-templates` を実行する。
    - `npm run test:it:amadeus-contracts` を実行する。
    - `npm run diff:check` を実行する。
  - 要求: R004, R005
  - ユースケース: UC002, UC003
  - 依存: T001, T002
  - 設計根拠: ../../U002-prerequisite-failure-routing/functional-design/domain-entities.md
  - 証拠: [test-results.md](test-results.md)
