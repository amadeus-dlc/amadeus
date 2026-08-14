# Security Design — formal-election-multiq

## Integrity boundary

Formal spec、CFG、model-map、TLC executable outputをuntrusted evidenceとして扱い、registered source identitiesと照合する。NFR Requirementsはabsent-and-expected。

## Controls

- module/cfg/aux/implementation identitiesをcanonical helperで再計算。
- model-map completenessとselected model nameをfail-closed検証。
- TLC exit 0、outcome `NOT_DETECTED`、partial=false、completion marker/runId一致を全条件にする。
- stderr/tool error/timeout/partial stateをsuccessへ丸めない。
- generated mutant/temporary pathをverified sourceとして登録しない。

## Review

READY。proof receiptとsource bytesのbindingを完了条件にする。

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
