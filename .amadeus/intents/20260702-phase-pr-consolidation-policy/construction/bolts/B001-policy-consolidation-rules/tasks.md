# Construction Tasks

- [x] T001: Git Branching Policy へ phase PR 統合の小節を追加する。
  - 作業:
    - `.amadeus/steering/policies/git-branching.md` の「PR 作成」節の後に、phase PR の統合を扱う小節を追加する。
    - 既定が phase ごとの PR であること、統合は 3 条件（実行スコープが `refactor` または docs 系、変更対象が文書だけ、Ideation の未確定事項が事前の grilling または Issue の確定判断で解消済み）をすべて満たす場合だけ選べる例外であることを肯定形で書く。
    - 統合できる範囲は仕様側（Discovery〜Inception）に限り、Construction 実装と finalization は従来どおり別 PR であることを書く。
    - 統合 PR の説明に含める記録項目（含まれる phase 成果物の一覧、各 phase の gate 状態）と、gate の判定は phase ごとに `state.json` で行うことを書く。
    - 統合の対象は仕様成果物であり、skill 変更を含む PR は粒度制約に従うことを書く。
  - 要求: R001, R002, R003
  - ユースケース: UC001, UC002, UC003
  - 依存: なし
  - 設計根拠: ../../U001-pr-consolidation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: branch 名の節へ仕様側統合の命名例を追加する。
  - 作業:
    - 「branch 名」節の例に、仕様側統合 branch の `codex/issue-<n>-specification` を既存の phase 単位の例と並べて追加する。
  - 要求: R002
  - ユースケース: UC002
  - 依存: T001
  - 設計根拠: ../../U001-pr-consolidation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
