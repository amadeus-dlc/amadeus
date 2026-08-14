# Security Design — election-canonical-schema

## Trust boundary

[business-logic-model](../functional-design/business-logic-model.md)のdecode pipelineを唯一のuntrusted-data境界とする。認証、network、encryption requirementはこのlocal Bun libraryに適用されず、新設しない。上流NFR Requirements artifactsはabsent-and-expectedで、設計はRequirements NFR-3 fail-closedとNFR-4 determinismを実現する。

## Controls

- schemaVersion discriminatorとfield whitelistでambiguous/unknown inputを拒否。
- unknown→canonical変換はsmart constructorのみ。raw castとpartial valueを禁止。
- question/choice/response referenceとcoverageをcommit前検証。
- digestはdomain separationしたcanonical identity helperを再利用し、path/time等のambient inputを除外。
- errorは分類/pathを返すがsecretは扱わず、raw ballot本文を不要にlogしない。
- fuzz/PBTでmalformed inputがdecoderを通過しないことを検証。

## Failure posture

validation failureは値なしResultとし、callerがwriteを開始できない型境界にする。unknown versionはforward compatibilityとして推測せずunsupported-version。availability fallbackとしてlegacyを試すのはversion absentかつstrict legacy shapeの場合だけ。

## Review

READY。実在しないAWS/network controlを追加せず、local data integrity boundaryへcontrolを集中している。

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
