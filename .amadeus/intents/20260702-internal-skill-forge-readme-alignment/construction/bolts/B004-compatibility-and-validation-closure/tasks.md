# Construction Tasks

- [x] T001: README 更新と受け入れ状態を対応づける。
  - 作業:
    - `inception/acceptance.md` の要求状態へ実装証拠を登録する。
    - Construction traceability に B001 から B004 の証拠を登録する。
  - 要求: R001, R002, R003, R004, R005
  - ユースケース: UC004
  - 依存: なし
  - 設計根拠: ../../U001-readme-skill-role-alignment/functional-design/domain-entities.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: ローカル検証で Construction の PR 前状態を固める。
  - 作業:
    - Amadeus Validator を実行する。
    - README と契約の整合検査を実行する。
    - 差分検査を実行する。
  - 要求: R005
  - ユースケース: UC004
  - 依存: T001
  - 設計根拠: ../../U002-skill-forge-review-contract/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)
