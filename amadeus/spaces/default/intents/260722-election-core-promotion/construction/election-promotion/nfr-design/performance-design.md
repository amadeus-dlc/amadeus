# Performance Design — election-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- performance-requirements の「実行時影響ゼロ」を保つ構造: business-logic-model の移動ロジック(git mv+import 1行)は実行パスの変更を含まない — 設計上の追加機構なし
- tech-stack-decisions の新規依存ゼロ・言語不変により、ビルド/起動特性も不変

## 検証設計

- performance-requirements の検証(t234〜t244 の wall-clock 前後比較+record 転記)を実装受け入れへ転記

## 他 NFR との整合

- reliability-requirements の全 green 契約(BR-5)と同一ラン(--ci)で測定可能。security-requirements / scalability-requirements の変更なし宣言が測定の対照条件を単純化

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:22:54Z
- **Iteration:** 1
- **Scope decision:** none

Major3件(BR-2/BR-4 の business-logic-model への誤帰属2件+実装手順順序の FD 逆順 — 再生成が残置確認より先で配布物混入リスク)

### Findings

- Major1/2: 出典を business-rules(consumes 外・直読注記)へ訂正
- Major3: 順序を FD 準拠(SKILL 書き換え→U1 green→再生成)へ是正

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:24:48Z
- **Iteration:** 2
- **Scope decision:** none

3指摘全閉包(BR-2/BR-4 の business-rules 直読帰属・7段順序の FD 準拠化)。新規誤引用なし

### Findings

- None
