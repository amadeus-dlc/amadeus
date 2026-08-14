# Performance Design — election-legacy-migration

## Input

[business-logic-model](../functional-design/business-logic-model.md)のplan/apply/verifyを対象files/bytesに線形化する。

## Design

canonical decode/digestは各artifact一回、dry-runで得たplanをapplyへ再利用する。bulk workspace scan、全Election migration、cache/parallel writeをしない。性能よりcorrectnessを優先し、progressをoperation stepsで可視化する。

## Review

READY。explicit one-election operationでboundedにする。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T12:09:30Z
- **Iteration:** 1
- **Scope decision:** none

### Findings

- None. performance/security/scalability/reliability/logical componentsはplan-bound single-election operationとして整合する。
