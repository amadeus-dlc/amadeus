# Performance Design — u9-docs-norms

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 性能

文書語彙inventoryはrepo全域`rg`1回で導出し、候補fileを1回読む。常駐処理やruntime性能への影響はない。

## 検証

対象語彙の残存件数をbefore/afterで記録し、禁止された旧契約が0件になることをassertする(**対象は修正対象面のみ — 記録面(codekb・intent record・履歴文書の散文引用)は BR-U9-6 / c1-ac-grep-surface-scope に従い除外**)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:30:25Z
- **Iteration:** 1
- **Scope decision:** none

FD 最新版(起草まで・4+1 分割)と整合、旧語彙不検出、c1 準拠。Minor(BR-U9-6 スコープ限定の carry-forward)は是正済み

### Findings

- Minor: 残存 grep のスコープ限定を NFR 側へ転記 — 是正済み
