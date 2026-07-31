# Performance Design — u5-advisories-channel

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 性能予算

advisory 判定(business-logic-model.md L1 — spec hash 照合)とラッチ照会(L4 — マーカーファイル1回の stat/read)は `next` の1呼出しに高々3発火点分加算される。判定は既存の activationAdvisoryForHost の計算量(hash 照合)そのままで、新規の重い処理は導入しない(nfr-design:c1 — cache 等の常駐機構なし)。発火点3点化による増分は「非発火ステージで即 return する membership 判定」のみで O(1)。

## 検証形

専用の性能測定は行わない(NFR-1: 日常 CI の既存プロファイル内で回帰を検出 — t378/t381 は unit/integration 層)。`next` の応答時間に知覚可能な回帰が出た場合は既存テストの timeout が代理検出する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T20:46:14Z
- **Iteration:** 1
- **Scope decision:** none

iteration 1 READY(GoA 1-2)。NFR 全数表 5/5・N/A 妥当・c1/c3 遵守・FD 整合(fail-open/2経路ギャップの実装裏取り)・O(1) 予算妥当を全数実測。findings なし。UTC 2026-07-31T20:45:31Z

### Findings

- None
