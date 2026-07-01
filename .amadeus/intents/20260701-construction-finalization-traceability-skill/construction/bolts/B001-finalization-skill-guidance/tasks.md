# Construction Tasks

- [x] T001: Construction 公開入口の検証説明を更新する。
  - 作業:
    - `amadeus-construction` の検証説明に、完了済み Construction の `Construction からの追跡` 表要件を追加する。
    - 必須列 `ボルト`、`タスク`、`証拠`、`状態` を明記する。
    - `Task Generation からの追跡` だけでは完了済み Construction の traceability 条件を満たさないことを明記する。
  - 要求: R001, R002, R003
  - ユースケース: UC001, UC002
  - 依存: なし
  - 設計根拠: ../../U001-finalization-skill-guidance/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md), [pr.md](pr.md)

- [x] T002: Traceability finalization 内部 skill の手順を更新する。
  - 作業:
    - `amadeus-construction-traceability-finalization` の手順に、`Construction からの追跡` の作成または補修を追加する。
    - 必須列と `Task Generation からの追跡` との差を明記する。
  - 要求: R001, R002, R003
  - ユースケース: UC002
  - 依存: T001
  - 設計根拠: ../../U001-finalization-skill-guidance/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md), [pr.md](pr.md)
