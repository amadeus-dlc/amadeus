# Construction Tasks

- [x] T001: README の内部 skill 一覧を workflow family ごとに整理する。
  - 作業:
    - `README.md` の Internal Skills を確認し、公開入口と内部 step の境界が崩れない表現へ更新する。
    - `README.ja.md` の内部スキル節を同じ分類へ更新する。
  - 要求: R001, R004, R005
  - ユースケース: UC001, UC004
  - 依存: なし
  - 設計根拠: ../../U001-readme-skill-role-alignment/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: 内部 skill の互換性境界を README 上で維持する。
  - 作業:
    - 内部 skill を公開入口として推奨しない説明を残す。
    - 既存の phase skill と横断的補助 skill の説明を変更しない。
  - 要求: R001, R004
  - ユースケース: UC001
  - 依存: T001
  - 設計根拠: ../../U001-readme-skill-role-alignment/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
