# Security Design — election-legacy-migration

## Boundary

[business-logic-model](../functional-design/business-logic-model.md)のfilesystem/git mutationをtrust boundaryとする。

## Controls

explicit election ID/path resolution、target collision/dirty check、plan digest-bound approval、canonical before/after digest、schema byte不変、broad glob禁止。failure時にsource evidenceを削除しない。

## Review

READY。destructive scopeとTOCTOUをplan/receiptで拘束する。

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
