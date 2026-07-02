# Construction Tasks

- [x] T001: eval に approval evidence 除去の改変ケースを追加し、RED を確認する。
  - 作業:
    - `dev-scripts/evals/amadeus-validator/check.ts` に、fixture の `state.json` の `taskGeneration.status: passed` の Bolt から `kind: approval` の evidence を除去し、validator が fail することを確認する検証を追加する。
    - `taskGeneration.status` が `ready_for_approval` の場合は approval evidence なしで pass することの確認も追加する。
    - 現行の validator で改変ケースの検証が失敗（RED）することを実行結果で確認し、記録する。
  - 要求: R004
  - ユースケース: UC005
  - 依存: なし
  - 設計根拠: ../../U002-approval-evidence-validation/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: validator に approval evidence 検査を実装し、GREEN を確認する。
  - 作業:
    - `skills/amadeus-validator/validator/AmadeusValidator.ts` の `taskGeneration` 検査に、`status` が `passed` の項目の `evidence` に `kind: approval` が含まれることの検査を追加する。`path` の種類は限定しない。
    - `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` で昇格先を同期する。
    - `npm run test:it:amadeus-validator` で T001 の改変ケースを含む eval が pass（GREEN）することを確認する。
  - 要求: R004, R005
  - ユースケース: UC005
  - 依存: T001
  - 設計根拠: ../../U002-approval-evidence-validation/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)
