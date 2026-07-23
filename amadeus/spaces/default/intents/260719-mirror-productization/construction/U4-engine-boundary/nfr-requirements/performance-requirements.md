# Performance Requirements — U4-engine-boundary

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## PR-U4-1: next 経路への追加コスト

phase boundary 経路にのみ追加(通常の next 呼出に影響ゼロ)。追加処理は U3 resolve(最大3 read — U3 PR-U3-1)+state フィールド読取1回。発火は workflow あたり最大3回(E-MPRRA1)— 数値目標は置かない(nfr-requirements:c3 — 強制メカニズム不在)。

## PR-U4-2: 冪等判定のコスト

冪等判定(BR-U4-5)は既存 gate/checkbox 系の決定的読取に相乗り — 新規走査を追加しない構造を実装要件とする。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:35:47Z
- **Iteration:** 1
- **Scope decision:** none

U4 NFR-R READY i1(帰属全件一致・RL-U4-2 は BR-U4-5 の補完と判定・tech-stack 実参照)

### Findings

- None
