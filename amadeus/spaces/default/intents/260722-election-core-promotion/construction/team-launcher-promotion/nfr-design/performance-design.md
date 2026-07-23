# Performance Design — team-launcher-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- performance-requirements の「定数回シェル呼び出しのみ」を保つ構造: require_prerequisites()(business-logic-model)は起動時1回・PATH 探索2+uname 1 の固定回数で、ループ・リトライを持たない。doctor advisory も同型(検出2回のみ)
- tech-stack-decisions の bash 維持により、TS 化に伴う起動オーバーヘッド(bun プロセス追加)も発生しない

## 検証設計

- performance-requirements の検証(既存テスト wall-clock 機械比較+record 転記)を build-and-test 定型へ。scalability-requirements の搬送のみ方針・reliability-requirements のフェイルファストと機構を共有(検査は前段1回)

## 他 NFR との整合

- security-requirements の PATH 探索限定と同一の実装点(require_prerequisites)— 性能・セキュリティ・信頼性が単一関数の性質として同時に成立

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:17:56Z
- **Iteration:** 1
- **Scope decision:** none

Major2件(TEAM_ENGINEERS の宣言外シンボル断定 / BR-7 割付是正の引用先が ND consumes 内に不在)

### Findings

- Major1: TEAM_ENGINEERS を正本直読注記へ
- Major2: business-rules.md(consumes 外)の割付是正を直読照合注記へ

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:19:51Z
- **Iteration:** 2
- **Scope decision:** none

両 Major 閉包(TEAM_ENGINEERS の :32/:83 直読一致・BR-7 割付是正の直読照合節)。新規虚偽なし

### Findings

- None
