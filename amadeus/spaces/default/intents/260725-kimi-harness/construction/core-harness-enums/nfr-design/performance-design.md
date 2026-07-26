上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Performance Design — core-harness-enums

> 上流入力の使用箇所: performance-requirements.md の基準(バージョン取得が支配的・probe は軽量)を設計の前提とする。

## 対象の概要

performance-requirements.md のとおり、doctor の性能対象はバージョン取得の spawn と軽量 probe のみ。

## 設計

- バージョン取得は `kimi --version` の単一 spawn とし、重い初期化・ネットワークアクセスを行わない(performance-requirements.md §判定と基準)
- 機能 probe は最小の発火確認で、セッションを起動しない(business-rules.md BR-4 経由の advisory 規定 — performance-requirements.md §判定と基準)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T14:37:34Z
- **Iteration:** 1
- **Scope decision:** none

5成果物は要件を過不足なく operationalize。security/reliability/scalability/performance は誠実に転記。検出2件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / logical-components) handleDoctor の実体参照を FD 由来の記述に修正
- (minor / logical-components) 検出が resolve のゲートでないことを精密化
