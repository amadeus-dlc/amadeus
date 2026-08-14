# Security Design — election-v2-store

## Boundaries

[business-logic-model](../functional-design/business-logic-model.md)のfilesystem read/write boundaryを保護する。NFR Requirementsはabsent-and-expected。network/auth controlは非適用。

## Controls

- 全readをU1 strict decoderへ通し、raw cast禁止。
- election IDから既存resolverでdirectoryを解決し、path traversal/broad globを許さない。
- pending voter fileでcollecting中のpeer response露出を防ぐ。
- history create-only、same-ID different-bytes conflictで改ざん/衝突を拒否。
- temp+atomic rename、expected-state compare、runId timeline dedupe。
- ballot/reservation本文をerror/auditへ不要に複製しない。

## Review

READY。confidentialityはblind lane、integrityはdecoder/history、availabilityはforward repairで担保する。

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
