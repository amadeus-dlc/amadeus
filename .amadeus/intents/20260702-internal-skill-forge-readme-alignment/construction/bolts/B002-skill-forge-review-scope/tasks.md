# Construction Tasks

- [x] T001: Amadeus skill 確認時の skill-forge 観点を README に追加する。
  - 作業:
    - `README.md` に、skill boundary、trigger description、body instructions、eval coverage、Codex metadata の確認観点を追加する。
    - `README.ja.md` に同じ確認観点を追加する。
  - 要求: R002, R005
  - ユースケース: UC002
  - 依存: なし
  - 設計根拠: ../../U002-skill-forge-review-contract/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: skill-forge の責務境界を README 更新に限定する。
  - 作業:
    - 今回は `skill-forge` の本文や skill metadata を変更しない。
    - README の確認観点が skill-forge の既存用途と矛盾しないことを確認する。
  - 要求: R002, R004
  - ユースケース: UC002, UC004
  - 依存: T001
  - 設計根拠: ../../U002-skill-forge-review-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
