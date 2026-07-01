# Construction Tasks

- [x] T001: 後続候補を Construction 判断として記録する
  - 作業:
    - `skill-forge` 監査を現在の README と metadata 整合から分離する理由を記録する。
    - `SKILL.md` 英語化を後続候補として分離する理由を記録する。
    - Discovery 候補 ID の改善候補を今回の成功条件に混ぜない理由を記録する。
  - 要求: R005
  - ユースケース: UC004
  - 依存: B001/T002, B002/T003
  - 設計根拠: ../../U001-internal-skill-policy-alignment/functional-design/business-logic-model.md#業務ロジック
  - 証拠: test-results.md

- [x] T002: 検証証拠を記録する
  - 作業:
    - README、metadata、昇格 eval、diff check、Amadeus validator の結果を `test-results.md` に記録する。
    - `acceptance.md` と `traceability.md` に反映できる証拠を整理する。
  - 要求: R001, R002, R003, R004, R005
  - ユースケース: UC004
  - 依存: T001
  - 設計根拠: ../../U001-internal-skill-policy-alignment/functional-design/business-rules.md#業務ルール
  - 証拠: test-results.md
