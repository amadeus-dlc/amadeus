# Construction Tasks

- [x] T001: Construction 完了時の PR 記録必須条件を validator に追加する
  - 作業:
    - `skills/amadeus-validator/validator/stages/construction/bolt-preparation.ts` に、完了済み Construction の `pr.md` 必須検査を追加する。
    - `dev-scripts/evals/amadeus-validator/check.ts` に、`pr.md` 欠落を検出する失敗 eval を追加する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: B001/T002, B002/T001
  - 設計根拠: ../../U002-validation-boundary/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)、[PR #285](https://github.com/amadeus-dlc/amadeus/pull/285)、`skills/amadeus-validator/validator/stages/construction/bolt-preparation.ts`

- [x] T002: PRリンク形式の validator 検査を追加する
  - 作業:
    - `skills/amadeus-validator/validator/AmadeusValidator.ts` に、GitHub Pull Request リンク形式の検査を追加する。
    - `construction/traceability.md` のPR欄が裸の `PR #nnn` の場合に fail する eval を追加する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U002-validation-boundary/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)、[PR #285](https://github.com/amadeus-dlc/amadeus/pull/285)、`skills/amadeus-validator/validator/AmadeusValidator.ts`

- [x] T003: validator skill の説明と昇格先を更新する
  - 作業:
    - `skills/amadeus-validator/SKILL.md` と `skills/amadeus-validator/evals/README.md` に、PR記録欠落検出の契約を追加する。
    - `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` で source skill の変更を `.agents/skills/amadeus-validator` へ反映する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: T001, T002
  - 設計根拠: ../../U002-validation-boundary/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)、[PR #285](https://github.com/amadeus-dlc/amadeus/pull/285)、`skills/amadeus-validator/SKILL.md`
