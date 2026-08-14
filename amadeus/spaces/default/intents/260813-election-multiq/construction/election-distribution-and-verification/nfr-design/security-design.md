# Security Design — election-distribution-and-verification

## Supply-chain boundary

canonical core/skill/spec sourceからgenerated harness、tests、norm evidenceへのprojectionをtrust boundaryとする。NFR Requirementsはabsent-and-expected。

## Controls

- `packages/framework/core/`正本だけを編集し、generated dist/self-installを直接commitしない。
- isolated buildを2回実行しbyte-identical、source-only guardで生成物越境を拒否。
- skill projection、model-map identities、test/coverage registry、norm markerを明示検査。
- full quality commandのexit 0とFR trace matrixを完了証拠にし、timeout retryをreal failureと区別。
- `always-elect`更新は実装/test証拠後、旧workaround語彙0-hitを確認。

## Review

READY。source→distribution→normの各supply面をdeterministic evidenceで拘束する。

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
