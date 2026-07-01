# Construction Tasks

- [x] T001: Skill Contract catalog に stage 前提確認を追加する。
  - 作業:
    - `amadeus-contracts/catalog/skills.ts` の `amadeus-decision-review` 契約へ stage 前提確認の事前条件を追加する。
    - decision review の postcondition と feedback condition に `upstream_feedback_required` を反映する。
  - 要求: R001, R002, R003, R004
  - ユースケース: UC001, UC002
  - 依存: B001/T001
  - 設計根拠: ../../U001-stage-prerequisite-evidence/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md), [PR #280](pr.md)

- [x] T002: Skill Contract 生成物を更新する。
  - 作業:
    - `npm run contracts:generate` を実行する。
    - `skills/**/references/skill-contract.md` と generated skill contracts を更新する。
  - 要求: R003
  - ユースケース: UC001
  - 依存: T001
  - 設計根拠: ../../U001-stage-prerequisite-evidence/functional-design/domain-entities.md
  - 証拠: [test-results.md](test-results.md), [PR #280](pr.md)

- [x] T003: phase skill 起動時説明を stage 前提確認へ整合させる。
  - 作業:
    - `skills/amadeus-ideation/SKILL.md`、`skills/amadeus-inception/SKILL.md`、`skills/amadeus-construction/SKILL.md` に stage 前提確認を追加する。
    - `promote-skill` で昇格先成果物へ同期する。
  - 要求: R001, R002, R003
  - ユースケース: UC001
  - 依存: B001/T002
  - 設計根拠: ../../U001-stage-prerequisite-evidence/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md), [PR #280](pr.md)
