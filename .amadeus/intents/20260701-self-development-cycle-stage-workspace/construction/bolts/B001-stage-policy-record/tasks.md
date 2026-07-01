# Tasks

- [x] T001: stage 判定語彙を用語集で追跡できるようにする
  - 作業:
    - `.amadeus/glossary.md` の stage0、stage1、stage2 の説明を、build workspace、target workspace、target artifacts の区別と整合する形で確認する。
    - stage0 採用条件に必要な語が不足していれば、用語を追加する。
  - 要求: R001
  - ユースケース: UC001
  - 依存: なし
  - 設計根拠: ../../U001-stage-adoption/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/glossary.md`

- [x] T002: stage2 を次回 stage0 として採用する条件を方針に記録する
  - 作業:
    - `.amadeus/steering/policies.md` に stage0 採用条件と Maintainer 判断の扱いを記録する。
    - stage2 を自動昇格しない不変条件が方針から追跡できることを確認する。
  - 要求: R002
  - ユースケース: UC001, UC003
  - 依存: T001
  - 設計根拠: ../../U001-stage-adoption/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies.md`
