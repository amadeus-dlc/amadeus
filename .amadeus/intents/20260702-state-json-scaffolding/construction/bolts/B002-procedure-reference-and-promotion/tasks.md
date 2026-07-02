# Construction Tasks

- [x] T001: state 更新手順を持つ phase skill へスクリプトの利用参照を追加する。
  - 作業:
    - `skills/amadeus-ideation-intent-capture/SKILL.md`、`skills/amadeus-inception/SKILL.md`、`skills/amadeus-construction-functional-design/SKILL.md`、`skills/amadeus-construction-bolt-preparation/SKILL.md`、`skills/amadeus-construction-traceability-finalization/SKILL.md` の state 更新を記述する手順へ、遷移種別を含めた 1 行程度のスクリプト利用参照を追加する。
    - 参照は昇格先の path（`.agents/skills/amadeus-validator/scripts/StateScaffold.ts`）を指し、手書きの代わりに雛形生成を既定の動きとして読めるようにする。
  - 要求: R004
  - ユースケース: UC003
  - 依存: B001/T002
  - 設計根拠: ../../U001-state-scaffold-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: amadeus-validator の SKILL.md にスクリプト同梱の案内を追加する。
  - 作業:
    - `skills/amadeus-validator/SKILL.md` に、同梱の雛形生成スクリプトの用途と実行方法の短い案内を追加する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: B001/T002
  - 設計根拠: ../../U001-state-scaffold-contract/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)

- [x] T003: 変更した skill の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts <skill-name> --replace` を、amadeus-validator、amadeus-ideation-intent-capture、amadeus-inception、amadeus-construction-functional-design、amadeus-construction-bolt-preparation、amadeus-construction-traceability-finalization に対して実行する。
    - `npm run test:it:promote-skill` で同期を確認する。
  - 要求: R006
  - ユースケース: なし
  - 依存: T001, T002
  - 設計根拠: ../../../inception/units/U001-state-scaffold-contract/design.md
  - 証拠: [test-results.md](test-results.md)
