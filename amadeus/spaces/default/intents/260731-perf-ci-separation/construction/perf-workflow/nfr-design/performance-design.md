# Performance Design — U2 perf-workflow

上流入力(consumes 全数): business-logic-model.md(U2 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の NFR-2/FR-2 と実測(job 3断面 0.2-0.3min、per-test 上限総和)を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## timeout の有界性(NFR-2 の設計固定)

business-logic-model.md ロジック2 の 25/5/5(min)は実測導出(perf-tests = 2×(per-test 上限総和+setup)≈24.4→25 / benchmark 系 = 10×max 実測 0.3min→慣例値5)。無制限 job を作らない(現行 ci.yml の benchmark timeout 無宣言を踏襲しない — 意図的相違)。

## daily 実行の性能特性

- cron 47 17 * * *(0/30分回避)で GitHub schedule の混雑遅延を低減(business-logic-model.md ロジック1)
- 実行頻度は日次1回+dispatch — ランナー消費は PR 駆動時代(full PR ごと4 job)から大幅減

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T11:34:13Z
- **Iteration:** 1
- **Scope decision:** none

SKIP degrade の不在扱い・timeout 25/5/5・action ピン・権限最小・非介入主張の全てを live repo と上流 record で照合し一致。参照全解決、over-claim なし。READY。

### Findings

- None
