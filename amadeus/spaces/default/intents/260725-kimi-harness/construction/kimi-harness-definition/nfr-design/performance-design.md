上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Performance Design — kimi-harness-definition

> 上流入力の使用箇所: performance-requirements.md の「ほぼ N/A・生成時間は既存水準」判定を設計対象の前提とする。

## 対象の概要

performance-requirements.md で「実行時の性能対象なし・生成時間は既存水準(秒〜十数秒オーダー)」と判定済みのため、性能設計の対象は持たない。

## 設計

- 新規の性能機構は設けない。生成時間は packager の既存経路(runner-gen・graph compile)に従う(business-logic-model.md §生成フロー)
- 回帰検査は t145(byte-parity)に委ねる(performance-requirements.md §測定可能な基準 — CI が実効の回帰検査)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T14:02:14Z
- **Iteration:** 1
- **Scope decision:** none

5成果物は要件の対応品と忠実に一致。byte-parity が security/reliability の機構、再生成が回復。N/A は正直。検出4件は全て minor で同一 iteration で修正済み。spot-check 要求は形式不正(owner が consume でない)のため conductor が実体で解決。

### Findings

- (minor / reliability-design) U5 への曖昧な委譲 → 修正済み(dist:check の再生成が実測と明記)
- (minor / logical-components) 帰属の誤り → 修正済み(security-requirements の記述へ)
- (minor / performance-design) 帰属の誤り → 修正済み(performance-requirements の記述へ)
- (minor / ヘッダ) consumes 全数列挙の流儀は nfr-requirements で承認済みの様式
