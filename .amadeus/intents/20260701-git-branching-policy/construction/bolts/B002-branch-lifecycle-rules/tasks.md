# Construction Tasks

- [x] T001: branch 作成と追従ルールを記録する
  - 作業:
    - `.amadeus/steering/policies/git-branching.md` に default branch、agent branch prefix、branch 名、`origin/main` 追従のルールを記録する。
  - 要求: R002, R003
  - ユースケース: UC002
  - 依存: B001/T002
  - 設計根拠: ../../U001-git-branching-policy/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies/git-branching.md`

- [x] T002: PR 作成前検証と merge 後処理を記録する
  - 作業:
    - `.amadeus/steering/policies/git-branching.md` に PR 作成前検証、merge 人間委譲、merge 後の `origin/main` 追従を記録する。
  - 要求: R002, R003
  - ユースケース: UC002
  - 依存: T001
  - 設計根拠: ../../U001-git-branching-policy/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies/git-branching.md`

- [x] T003: docs-only と緊急修正の例外を記録する
  - 作業:
    - `.amadeus/steering/policies/git-branching.md` に docs-only と緊急修正の例外理由の記録先を明記する。
  - 要求: R002
  - ユースケース: UC002
  - 依存: T002
  - 設計根拠: ../../U001-git-branching-policy/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies/git-branching.md`
