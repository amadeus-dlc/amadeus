# Construction Tasks

- [x] T001: `dry-run` text contract を追加する。
  - 作業:
    - `dev-scripts/evals/amadeus-templates/check.ts` の `amadeus-discovery` text contract に、`dry-run` mode、出力項目、副作用禁止、`scaffold-only` 差分、consumer 境界の期待を追加する。
    - source skill 更新前に `npm run test:it:amadeus-templates` が失敗することを確認する。
  - 要求: R005
  - ユースケース: UC003
  - 依存: B001/T001, B001/T002
  - 設計根拠: ../../U002-dry-run-sync-verification/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: discovery skill を昇格し、検証を実行する。
  - 作業:
    - `dev-scripts/promote-skill.ts amadeus-discovery --replace` で `.agents/skills/amadeus-discovery/SKILL.md` を同期する。
    - text contract、promote-skill eval、validator、必要な標準検証を実行する。
  - 要求: R005
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U002-dry-run-sync-verification/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
