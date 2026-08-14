# Security Design — election-question-tally

## Integrity boundary

[business-logic-model](../functional-design/business-logic-model.md)のvalidated canonical inputをtrustしつつ、target/preserved partitionとexpected digestは各callで再検証する。NFR Requirementsはabsent-and-expectedで、Requirements NFR-3/4のdata integrityを実装する。

## Controls

- target/preserved overlap、coverage不足、digest mismatchでoutputなしfail-closed。
- established resultをcopy-on-writeし、入力objectをmutationしない。
- questionIdで全mapをnamespaceし、同internalNoのcross-question混入を防ぐ。
- receipt axisだけをorderingへ使用し、self-reported timestampを権威にしない。
- error/logへreservation/rationale本文を不要に含めない。

## Review

READY。pure boundaryでcommit前にpreservation violationを遮断する。

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
