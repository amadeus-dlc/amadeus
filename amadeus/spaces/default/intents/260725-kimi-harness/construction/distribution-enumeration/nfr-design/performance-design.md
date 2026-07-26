上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Performance Design — distribution-enumeration

> 上流入力の使用箇所: performance-requirements.md の基準(チェック時間は既存+1面・実機確認は人手)を設計の前提とする。

## 対象の概要

performance-requirements.md のとおり、性能対象は CI のチェック時間のみ。

## 設計

- `dist:check`・`promote:self:check` は既存の全 harness 走査のままとし、kimi 追加は1面分の増加に留める(performance-requirements.md §判定と基準)
- 新規の並列化・キャッシュ機構は設けない(既存経路のまま)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T14:52:50Z
- **Iteration:** 2
- **Scope decision:** none

major 1件・minor 4件は全て解消。列挙4対象・dogfood 前提・帰属・byte-parity 定義が正確になり、実装可能な水準。

### Findings

- None
