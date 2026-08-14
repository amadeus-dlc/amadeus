# Business Logic Model — election-legacy-migration

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) のU6を詳細化する。

## Plan → approve → apply → verify

1. 明示election IDからsource/target directoryとregistry mutationを解決する。
2. U3でdefinition/ledger/tally/historyをstrict readし、U1 canonical aggregate digestを作る。
3. dry-run planに全move、preconditions、before digestを出す。writeしない。
4. approval receiptとplan digestが一致する場合だけapplyする。
5. target collision、dirty/unexpected files、registry conflictをapply前に拒否する。
6. directoryをrecoverableなrename/moveで移し、registryをatomic updateする。schema bytesは変更しない。
7. targetを同じdecoderでreadしafter digestを計算する。
8. mismatchなら成功扱いにせず、source/targetの実状態とrecovery actionを返す。削除rollbackはしない。

Canonical digestは`legacy-question`、ballot responses、results、history/timeline semanticを含み、path/mtimeは除外する。read-only dry-runとverifyはbyte不変。

## Recovery

operationIdとplan digestをreceiptへ保存する。同じplanのretryは既に完了したmove/registry stepを検出し、after fidelityを再実行する。異plan/異targetはconflict。source absent + target present + digest一致はcompleted repairとして扱える。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T12:03:12Z
- **Iteration:** 1
- **Scope decision:** none

### Findings

- None. schema変換とdirectory migrationを分離し、canonical meaningで前後検証するためFR-COMP-4を実装可能。

### Summary

dry-runとplan-bound approval、idempotent receiptにより対象外pathへの拡大と意味のsilent driftを防ぐ。
