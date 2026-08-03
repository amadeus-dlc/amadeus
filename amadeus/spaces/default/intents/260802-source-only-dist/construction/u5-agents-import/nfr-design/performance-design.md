# Performance Design — u5-agents-import

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一の`business-logic-model`をfallback入力とする。

## 性能方針

build時にcodex AGENTS suffixを1回読み、未追跡 `.agents/rules/amadeus-codex-suffix.md` へ1回書く。CLAUDE整合検査は3入力のbyte比較1回で、cacheや並列化を追加しない。

## 検証

test spyでsuffix生成read/write各1回、追跡AGENTS/CLAUDEへのwrite 0回をassertする。`bun scripts/promote-self.ts --check` の既存timeout内を停止guardとしservice SLOへ昇格しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:30:25Z
- **Iteration:** 1
- **Scope decision:** none

FD(BR-U5-4 申告済み拡張・BR-U5-5)・FR-3.1/NFR-2・ADR-A6/A7 と整合、無申告逸脱なし。Minor(expected:true 語彙)は全体是正済み

### Findings

- Minor: consumes 根拠語彙の正確化 — 是正済み
