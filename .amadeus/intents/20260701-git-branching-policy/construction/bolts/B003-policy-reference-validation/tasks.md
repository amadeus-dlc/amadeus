# Construction Tasks

- [x] T001: policy 参照方針を記録する
  - 作業:
    - `.amadeus/steering/policies/git-branching.md` に Intent traceability、acceptance、PR 説明から参照する policy の扱いを記録する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: B001/T002, B002/T002
  - 設計根拠: ../../U002-policy-traceability-validation/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies/git-branching.md`

- [x] T002: validator と evaluator の検出候補を分ける
  - 作業:
    - `.amadeus/steering/policies/git-branching.md` に validator で検出する候補、evaluator で検出する候補、人間判断に残す候補を分けて記録する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U002-policy-traceability-validation/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies/git-branching.md`

- [x] T003: Construction traceability に policy 参照を残す
  - 作業:
    - `construction/traceability.md` に Git ブランチ戦略 policy を参照した証拠を残す。
  - 要求: R004
  - ユースケース: UC003
  - 依存: T002
  - 設計根拠: ../../U002-policy-traceability-validation/functional-design/domain-entities.md
  - 証拠: [test-results.md](test-results.md)、[../traceability.md](../../traceability.md)
