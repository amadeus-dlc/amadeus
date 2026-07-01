# Construction Tasks

- [x] T001: policy overview に Git ブランチ戦略の導線を追加する
  - 作業:
    - `.amadeus/steering/policies.md` に Git ブランチ戦略 policy の概要を追加する。
    - `.amadeus/steering/policies/git-branching.md` へのリンクを追加する。
  - 要求: R001, R003
  - ユースケース: UC001
  - 依存: なし
  - 設計根拠: ../../U001-git-branching-policy/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies.md`

- [x] T002: Git ブランチ戦略 policy の配置先を作る
  - 作業:
    - `.amadeus/steering/policies/git-branching.md` を作成する。
    - policy の目的、対象、責務分担の初期構造を記録する。
  - 要求: R001, R003
  - ユースケース: UC001
  - 依存: T001
  - 設計根拠: ../../U001-git-branching-policy/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies/git-branching.md`

- [x] T003: policy notes の登録状態を同期する
  - 作業:
    - `.amadeus/steering/policies/README.md` の詳細方針未登録の記述を、登録済み policy 一覧へ更新する。
  - 要求: R001
  - ユースケース: UC001
  - 依存: T002
  - 設計根拠: ../../U001-git-branching-policy/functional-design/domain-entities.md
  - 証拠: [test-results.md](test-results.md)、`.amadeus/steering/policies/README.md`
