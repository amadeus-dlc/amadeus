# Security Design — election-store(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 書込境界の設計

security-requirements.md の要件を次で実現する:

- パス構成は `electionsRoot(space) + electionId + 固定ファイル名` の3要素関数に集約(business-logic-model.md のレイアウト)— 外部入力の直結経路なし。electionId は採番規則由来(実装時 mirror.ts 様式)
- appendBallot 先頭の duplicate 検査(全期間適用)は ledger 読取→照合→reject の単一関数で、検証済み Ballot(U1 parse 済み — parse-don't-validate の境界分担)のみ受理
- blind 保護: materialize 前の ballots/ 実体化 API を持たない(開票前は ledger 追記のみ — 型面で経路が存在しない)

## 他 NFR との共有制約

- 書込は tmp+rename の単一ヘルパー経由(reliability-requirements.md のクラッシュ耐性と同一機構)で、性能面の追加コストは rename 1回(performance-requirements.md の O(1) 追記に影響なし)。並行アクセス制御は不要(scalability-requirements.md の単一書込主体)。ランタイムは tech-stack-decisions.md の Bun fs API のみ
