上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Performance Requirements — kimi-hook-adapter

> 上流入力の使用箇所: business-logic-model.md の dispatch フロー(短命プロセス)、business-rules.md の BR-2(fail-open)、requirements.md の NFR-4、technology-stack.md の bun 起動特性を評価の前提とする。

## 対象と基準

- adapter は hook イベントごとに起動する短命プロセス(business-logic-model.md §dispatch)。Kimi セッションの応答を遅くしないため、起動+正規化+core hook 呼出の合計はユーザーの体感を阻害しないこと(目安: 1イベントあたり秒以下のオーダー。core hook の既存コストが支配的)
- 計測は live journey(Bolt 6)の実走で確認し、厳密な SLA は設けない(hook は fail-open の補助的機構 — requirements.md FR-2c/NFR-2 が根拠)

## 根拠としての補足

hook の timeout は Kimi 側に既定値がある(公式 hooks docs: `timeout` フィールド 1-600秒・既定30秒 — 実測取得)。adapter はそれを下回る設計とする。subprocess の多重起動は audit-and-sensors の fan-out(2プロセス)程度に留める(business-logic-model.md §dispatch フロー step 2)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T12:57:52Z
- **Iteration:** 1
- **Scope decision:** none

5成果物は正直で内部一貫。performance は SLA を捏造せず journey 計測へ委譲、security は実在する面をカバー、reliability は BR-2/BR-3 と一致。検出5件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / performance) 30秒の無根拠引用 → 修正済み(公式 docs 出典を明記)
- (minor / security) credential 委譲の参照先なし → 修正済み(設計意図として明記)
- (minor / scalability) 2件の緩い引用 → 修正済み(監査ロックの記述を正確化)
- (minor / performance) NFR-4 の誤アンカー → 修正済み(FR-2c/NFR-2 へ)
- (minor / 使用箇所 parity) → ブロッククォートの使用箇所行が参照行として機能(c12 様式どおり)
