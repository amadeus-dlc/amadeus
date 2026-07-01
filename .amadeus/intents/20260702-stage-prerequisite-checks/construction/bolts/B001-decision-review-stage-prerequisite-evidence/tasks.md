# Construction Tasks

- [x] T001: `amadeus-decision-review` の入力証拠に stage 前提確認を追加する。
  - 作業:
    - `skills/amadeus-decision-review/SKILL.md` に、skill 供給元と実行環境の stage 前提を入力証拠として扱う説明を追加する。
    - source skill、昇格先成果物、host environment、stage0、stage1、stage2、stage0 採用判断を区別する。
  - 要求: R001, R002
  - ユースケース: UC001
  - 依存: なし
  - 設計根拠: ../../U001-stage-prerequisite-evidence/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md), [PR #280](pr.md)

- [x] T002: `amadeus-decision-review` の判断ノードと outcome を stage 前提確認へ拡張する。
  - 作業:
    - 判断ノードに stage 前提確認を追加する。
    - `upstream_feedback_required` を outcome として説明する。
    - stage 前提確認の分類表を追加する。
  - 要求: R003, R004
  - ユースケース: UC001, UC002
  - 依存: T001
  - 設計根拠: ../../U001-stage-prerequisite-evidence/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md), [PR #280](pr.md)
