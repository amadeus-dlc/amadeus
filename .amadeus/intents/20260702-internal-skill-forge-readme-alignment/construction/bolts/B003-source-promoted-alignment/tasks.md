# Construction Tasks

- [x] T001: source skill と昇格先成果物の確認境界を README に追加する。
  - 作業:
    - `README.md` に `skills/amadeus-*` と `.agents/skills/amadeus-*` の両方を確認する方針を追加する。
    - `README.ja.md` に同じ方針を追加する。
  - 要求: R003, R005
  - ユースケース: UC003
  - 依存: なし
  - 設計根拠: ../../U002-skill-forge-review-contract/functional-design/domain-entities.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: 今回の変更で skill 昇格が不要であることを確認する。
  - 作業:
    - `skills/amadeus-*` と `.agents/skills/amadeus-*` の一覧を比較する。
    - 今回の変更対象が README と Amadeus 成果物であり、skill 本文変更ではないことを記録する。
  - 要求: R003, R004
  - ユースケース: UC003, UC004
  - 依存: T001
  - 設計根拠: ../../U002-skill-forge-review-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
