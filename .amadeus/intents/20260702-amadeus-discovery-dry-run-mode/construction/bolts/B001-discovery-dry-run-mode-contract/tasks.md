# Construction Tasks

- [x] T001: `amadeus-discovery` に `dry-run` mode 説明を追加する。
  - 作業:
    - `skills/amadeus-discovery/SKILL.md` の入力と実行モードに `dry-run` を追加する。
    - `dry-run` の読み取り対象、出力項目、判定案、recommended 候補、推奨次アクションを説明する。
    - `dry-run` と `scaffold-only` の差分を説明する。
  - 要求: R001, R002, R003
  - ユースケース: UC001
  - 依存: なし
  - 設計根拠: ../../U001-discovery-dry-run-contract/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: `dry-run` の過去分析と学習分類の consumer 境界を補強する。
  - 作業:
    - `skills/amadeus-discovery/SKILL.md` に、`amadeus-history-review` と `amadeus-learning-review` の結果を入力にできるが所有しないことを説明する。
    - `.amadeus/` 更新、GitHub Issue 作成、Intent Record 作成、`amadeus-ideation` 自動実行を行わないことを `dry-run` の副作用禁止として整理する。
  - 要求: R003, R004
  - ユースケース: UC002
  - 依存: T001
  - 設計根拠: ../../U001-discovery-dry-run-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
