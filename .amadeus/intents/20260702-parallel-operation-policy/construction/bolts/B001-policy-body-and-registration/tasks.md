# Construction Tasks

- [x] T001: parallel-operation.md 本文を作成する。
  - 作業:
    - `.amadeus/steering/policies/parallel-operation.md` を新設する。見出し構成は BR001（目的、対象、責務分担、判断基準の章 4 つ、根拠）に従う。
    - 並行させる単位の判断基準（接触面による並行可否。BR004）、共有成果物の統合手順（追従、再生成、検証の順。BR005）、ゲート承認の運用（キュー確認、まとめ承認、承認記録、遡及承認。BR006）、同一 worktree での直列化（BR007）を、肯定形の行動指針として書く（BR002）。
    - 各判断基準の章に、観察済みの実例への根拠リンク（#334 cycle、#350 cycle、遡及承認の記録と各 PR。BR003）を置く。
    - 責務分担に、Git Branching Policy との境界（単一 branch の lifecycle と複数 worktree の並行判断）を明記する。
  - 要求: R001, R002, R003, R004
  - ユースケース: UC001, UC002, UC003
  - 依存: なし
  - 設計根拠: ../../U001-parallel-operation-policy-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: 索引へ登録する。
  - 作業:
    - `.amadeus/steering/policies.md` の方針に並行運用ポリシーへの参照行を追加する。
    - `.amadeus/steering/policies/README.md` の登録済み policy 表に行を追加する。
    - workspace 全体の validator pass を確認する。
  - 要求: R005
  - ユースケース: UC004
  - 依存: T001
  - 設計根拠: ../../U001-parallel-operation-policy-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
