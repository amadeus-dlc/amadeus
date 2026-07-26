上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Performance Design — kimi-live-journey

> 上流入力の使用箇所: performance-requirements.md の基準(最小プロンプト・CC-1 範囲・明示タイムアウト)を設計の前提とする。

## 対象の概要

performance-requirements.md のとおり、性能対象は journey の実行コストそのもの。

## 設計

- journey のプロンプトは最小(status / doctor の2種)で、長い対話を要求しない(performance-requirements.md §判定と基準)
- タイムアウトは明示値で打ち切り、理由を記録(business-logic-model.md §決定木)
- クレジットは journey 実走のみで、明記を残す(business-rules.md BR-3 経由の CC-1 範囲)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T15:00:50Z
- **Iteration:** 1
- **Scope decision:** none

5成果物は要件と忠実に一致。security(注入・tmp 完結・認証の扱い)・reliability(2条件 skip・記録・失敗判定)が正確。検出は provenance note のみでブロッキングなし。

### Findings

- (minor / 共通) BR 参照は consume 外だが「経由」の provenance 表記と consume 内の同一 BR 連鎖で担保済み(変更不要)
