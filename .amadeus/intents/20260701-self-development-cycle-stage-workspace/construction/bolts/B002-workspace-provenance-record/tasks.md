# Tasks

- [x] T001: workspace 対応記録の置き場所を開発手順に明示する
  - 作業:
    - `.amadeus/development.md` に build workspace、host environment、target workspace、target artifacts の記録先を明示する。
    - PR 準備条件から provenance の最低記録項目を参照できるようにする。
  - 要求: R003
  - ユースケース: UC002, UC003
  - 依存: B001/T002
  - 設計根拠: ../../U002-workspace-provenance/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/development.md`

- [x] T002: 検証証拠を PR 準備条件から追跡できるようにする
  - 作業:
    - `.amadeus/development.md` の PR 準備条件に、対象 Intent の validator 結果と標準検証結果の記録を明示する。
    - `.amadeus/steering/policies.md` の provenance 最低記録項目と重複しない責務にする。
  - 要求: R004
  - ユースケース: UC002, UC003
  - 依存: T001
  - 設計根拠: ../../U002-workspace-provenance/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/development.md`、`.amadeus/steering/policies.md`
