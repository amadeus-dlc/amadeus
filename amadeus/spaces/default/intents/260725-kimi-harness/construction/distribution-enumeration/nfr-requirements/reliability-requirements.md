上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Reliability Requirements — distribution-enumeration

> 上流入力の使用箇所: business-rules.md の BR-1/BR-2/BR-3、business-logic-model.md の決定木、requirements.md の FR-5b(drift guard 対象)を根拠とする。

## 対象の概要

列挙の信頼性は「片落ちが構造的に検出される」ことに集約される。

## 信頼性の仕組み

- **原子性**: U5 所有の閉集合は同一変更で追加し、コミット間で不整合にしない(business-rules.md BR-1)
- **drift guard**: `dist:check`・`promote:self:check` が green を維持(business-rules.md BR-3)。列挙の片落ちは型検査または既存テストで検出される構造を維持し、独自検査は足さない(business-logic-model.md 決定木)
- **回復**: 生成物は正本から再生成できる(`bun scripts/package.ts kimi`(dist 面)/ `bun run promote:self`(ルート .kimi-code 面)の再実行)
