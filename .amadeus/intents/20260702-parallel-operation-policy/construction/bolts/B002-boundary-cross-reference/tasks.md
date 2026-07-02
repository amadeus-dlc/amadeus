# Construction Tasks

- [ ] T001: git-branching.md へ責務分担の相互参照を追記する。
  - 作業:
    - `.amadeus/steering/policies/git-branching.md` の `責務分担` に、複数 worktree の並行判断（並行させる単位、共有成果物の統合、ゲート承認の運用、直列化）は並行運用ポリシーが扱う旨の相互参照を追記する。
    - 追記は相互参照の明記に限定し、既存の判断基準を変更しない（INV002）。
  - 要求: R005
  - ユースケース: UC004
  - 依存: なし
  - 設計根拠: ../../U001-parallel-operation-policy-contract/functional-design/business-rules.md
  - 証拠: 未登録

- [ ] T002: 両 policy の責務分担の整合を確認する。
  - 作業:
    - `parallel-operation.md` と `git-branching.md` の責務分担の記述を突き合わせ、矛盾がないことを確認する。
    - workspace 全体の validator と `npm run test:all` の pass を確認する。
  - 要求: R005
  - ユースケース: UC004
  - 依存: T001
  - 設計根拠: ../../U001-parallel-operation-policy-contract/functional-design/business-rules.md
  - 証拠: 未登録
