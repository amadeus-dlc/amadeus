上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Performance Design — kimi-hook-adapter

> 上流入力の使用箇所: performance-requirements.md の基準(短命プロセス・journey で計測・SLA なし)を設計対象の前提とする。

## 対象の概要

performance-requirements.md のとおり、adapter はイベント単位の短命プロセスで、厳密な SLA を持たない。

## 設計

- **起動コストの最小化**: shim は import を最小限に保ち、lib も core hook の subprocess 呼出のみ(business-logic-model.md §dispatch フロー)。初期化の重い処理を持たない
- **fan-out の上限**: audit-and-sensors は最大2プロセス(performance-requirements.md §根拠としての補足どおり)
- **計測**: live journey(Bolt 6)の実走で確認。Kimi の hook timeout(既定30秒)を大きく下回る設計

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T14:08:42Z
- **Iteration:** 1
- **Scope decision:** none

5成果物は要件と一致。fail-open 全経路・Stop 整形のみ中継・security 4基準・無状態。検出3件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / reliability-design) 回復の設計要素を追加
- (minor / performance-design) セクション参照を修正
- (minor / security-design) 見出しアンカーを正確化
