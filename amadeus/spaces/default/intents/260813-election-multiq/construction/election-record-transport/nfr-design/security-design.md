# Security Design — election-record-transport

## Boundary

[business-logic-model](../functional-design/business-logic-model.md)のvoter view/deliveryとrecord verificationを対象にする。NFR Requirementsはabsent-and-expected。

## Controls

- DistributionViewV2のclosed key setにpeer vote/status/recommendationを型として持たない。
- voter固有view pathを送り、notification本文はelectionId/pathだけ。
- question/voter identifiersをrecordへ必須帰属し、予約本文を別questionへ混ぜない。
- rendererとverifierを別関数/入力経路にし、ledger/materialized/history/currentを比較。
- delivery成功前にtimelineをmintせず、provenanceとrun IDでdedupe。

## Review

READY。blind confidentialityとaudit integrityをapplication boundaryで保証する。

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
