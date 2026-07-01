# Construction Tasks

- [x] T001: README の skill 分類を更新する
  - 作業:
    - `README.md` と `README.ja.md` の Internal Skills に `amadeus-grilling` と `amadeus-domain-modeling` を残す。
    - Internal Skills に phase 内部 stage helper、判断補助 skill、内部確認用 skill を列挙する。
    - 英語版と日本語版で同じ分類になることを確認する。
  - 要求: R001, R002
  - ユースケース: UC001, UC002
  - 依存: なし
  - 設計根拠: ../../U001-internal-skill-policy-alignment/functional-design/business-rules.md#業務ルール
  - 証拠: test-results.md

- [x] T002: `amadeus-validator` の分類判断を記録する
  - 作業:
    - `amadeus-validator` を横断的補助 skill に残す根拠を確認する。
    - Issue #284 の内部 skill 候補との差分を Construction 判断として記録する。
  - 要求: R002
  - ユースケース: UC002, UC004
  - 依存: T001
  - 設計根拠: ../../U001-internal-skill-policy-alignment/functional-design/business-rules.md#例外
  - 証拠: test-results.md
