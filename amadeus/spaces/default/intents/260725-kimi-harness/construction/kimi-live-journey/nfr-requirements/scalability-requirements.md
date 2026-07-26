上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Scalability Requirements — kimi-live-journey

> 上流入力の使用箇所: business-rules.md の BR-1(決定的 tier では skip)と business-logic-model.md の driver フローを根拠とする。

## 対象の概要

本 Unit はテスト基盤で、スケールの概念を持たない。

## 判定と基準

**N/A**(存在しない対象)。journey 数の増加は既存の skipReason ゲートで管理され、CI(決定的 tier)では skip されるため CI コストに影響しない(business-rules.md BR-1)。live 実行は opt-in のみ。
