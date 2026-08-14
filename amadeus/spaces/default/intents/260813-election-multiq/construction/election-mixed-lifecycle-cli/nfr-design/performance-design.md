# Performance Design — election-mixed-lifecycle-cli

## Input and budget

[business-logic-model](../functional-design/business-logic-model.md)のcommand flowをO(Q+R+C+V)またはsorting込みO(n log n)に保つ。Requirements NFR-2のbaseline/treatment交互30回、p95増分`max(20%,5ms)`以下をB5で検証する。

## Design

1 invocationでstate/snapshotを各1回strict readし、ID Mapを再利用する。全question×全choiceのcross product、常駐cache、background workerを追加しない。status/nextはtallyを再計算せずcanonical snapshotから導出し、verifyだけがhistory foldを実行する。

## Review

READY。固定上限で隠さずalgorithmic costとbenchmarkで管理する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T12:09:30Z
- **Iteration:** 1
- **Scope decision:** none

### Findings

- None. performance/security/scalability/reliability/logical componentsは相互整合し、single-writer CLI topologyを維持する。
