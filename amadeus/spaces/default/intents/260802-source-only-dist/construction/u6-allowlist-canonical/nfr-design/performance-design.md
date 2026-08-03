# Performance Design — u6-allowlist-canonical

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 性能

allowlistは十数件の静的readonly dataで、import時1回の配列構築だけとする。整合検査はtracked/preservedRuntime/patternの各集合を1回正規化・sortし、対象fileとdeep-equalするO(n log n)処理とする。

## 検証

counterで各entryの走査1回、`git check-ignore`はfixture batch 1回に束ねる。実時間負荷試験、cache、daemonは導入しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:30:25Z
- **Iteration:** 1
- **Scope decision:** none

3区分モデル(tracked5+dispatcher/preservedRuntime5/perUserPatterns4)を正確に踏襲、件数・遅延方針とも矛盾なし。Minor(depth 表現)は是正済み

### Findings

- Minor: depth 1|2 リテラル union への表現整合 — 是正済み
