# Performance Design — u8-source-only-switch

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 性能

境界guardは`git ls-files`1回と正本pattern集合とのset intersection O(n)。compile guardは既存compile1回、self-install鮮度はbuild候補とのbyte比較1回とする。

## 退行検査

tracked file数を2倍にしたfixtureでscan回数が線形であることをcounter assertし、CI既存timeoutを維持する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:30:25Z
- **Iteration:** 1
- **Scope decision:** none

FD 最新版(撤去のみ)・ADR-A8・BR-U8 群と整合、検証劇場なし

### Findings

- None
