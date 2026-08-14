# Security Design — election-mixed-lifecycle-cli

## Boundary

[business-logic-model](../functional-design/business-logic-model.md)のCLI input/state transitionをtrust boundaryとする。

## Controls

全JSONをU1 decode、pathをU3 resolver、target/digestをU2、recordをU4で検査する。CLIはraw castしない。stale directive、established target、state/run/digest mismatchをwrite前拒否。stdoutにreservation本文やpeer responseを漏らさず、destructive repairを自動実行しない。

## Review

READY。defense in depthは各owner boundaryのtyped resultで構成する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T12:09:30Z
- **Iteration:** 1
- **Scope decision:** none

### Findings

- None. 当該unitの適用NFR成果物はfunctional designと整合し、外部serviceを追加せずfailure boundaryとcontrolを実装可能にしている。

### Summary

要求済みのfail-closed、determinism、reliabilityまたはsupply-chain integrityをunit ownership内で満たすためREADYとする。
