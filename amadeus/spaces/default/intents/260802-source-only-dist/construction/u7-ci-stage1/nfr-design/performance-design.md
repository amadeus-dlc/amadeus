# Performance Design — u7-ci-stage1

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 予算

CI各test jobのbuildは1回、再現性jobは正本build+隔離buildの2回に固定する。既存job timeout(10〜30分)内を停止guardとし、build cacheの新設はしない。

## 検証

workflow静的テストでtest jobごとのbuild前置1回、test開始前であること、再現性比較の追加build1回をassertする。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:30:25Z
- **Iteration:** 1
- **Scope decision:** none

FD 最新版(build script u7 所有・段階1限定)と整合、段階2混入なし、nfr-design:c1 準拠

### Findings

- None
