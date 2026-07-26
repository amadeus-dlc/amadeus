上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Performance Design — kimi-harness-docs

> 上流入力の使用箇所: performance-requirements.md の N/A 判定(分量は既存章と同程度)を前提とする。

## 対象の概要

performance-requirements.md で N/A(存在しない対象)と判定済み。

## 設計

- 分量は既存章(codex-cli.md 等)と同程度とし、手順の探索性を優先する(performance-requirements.md §判定と基準)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T15:07:47Z
- **Iteration:** 1
- **Scope decision:** none

Security/reliability は要件と1対1でトレース、N/A 判定は正直、logical-components は執筆フローと整合。検出2件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / reliability-design) Bolt ID の根拠なし参照 → 修正済み(内容で名指し)
- (minor / logical-components) 引用先を §検証シーケンス に修正
