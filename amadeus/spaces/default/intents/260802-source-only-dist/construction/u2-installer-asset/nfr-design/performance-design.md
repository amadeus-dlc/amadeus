# Performance Design — u2-installer-asset

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 予算

新版installはtar+SHA256SUMSのHTTP取得各1回、redirect有限回、SHA-256 streaming走査1回、展開1回とする。全payloadのmemory一括読込を禁止し、既存setup command timeoutを停止guardとする。

## 検証

fixture byte数2倍でread/hash/write counterが線形に増えること、旧版経路の追加request 0回をassertする。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:30:25Z
- **Iteration:** 1
- **Scope decision:** none

FD(BR-U2 群)・ADR-A1/A4/A9 と整合、fail-closed/locate 契約に無申告逸脱なし。Minor 2件(ADR-A9 再掲・consumes 定型)は conductor 是正済み

### Findings

- Minor: security-design へ ADR-A9 役割分担を再掲 — 是正済み
- Minor: consumes 定型文言の正確化 — 是正済み
