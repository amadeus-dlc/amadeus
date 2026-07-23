# Performance Design — U1-mirror-tool

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## PD-U1-1: 同期単純実行(PR-U1-1/PR-U1-3 の設計化)

status は buildSnapshot(ローカル読取)→ gh view(同期 spawn 1回)→ 純関数比較の直列3段(business-logic-model のフロー)。並列化・キャッシュ・タイムアウト機構を設けない — 律速の gh 往復に対しツール側最適化の余地が構造的にない。

## PD-U1-2: 既存経路の不変(PR-U1-2)

status 分岐は main の switch 追加のみ — 既存 verb の初期化・実行経路にコード追加ゼロ(diff で機械確認可能な形)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:50:23Z
- **Iteration:** 2
- **Scope decision:** none

i1 Critical(FD/ND 分岐矛盾)を双方向申告反映で一致・Major(RL-U1-4)/Minor(SC-U1-3)是正 → i2 READY

### Findings

- RD-U1-1 精密化の双方向申告(是正済み)
- 注入クラス (d) 追加(是正済み)
- SC-U1-3 引用(是正済み)
