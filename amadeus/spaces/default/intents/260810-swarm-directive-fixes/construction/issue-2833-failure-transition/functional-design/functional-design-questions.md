# Functional Design Questions — issue-2833-failure-transition

## Resolution

新規質問は0件。Unit境界、相関key、Retry/Skip/Abort粒度、autonomous parked、Stop hook不変、TDDは [`unit-of-work.md`](../../../inception/units-generation/unit-of-work.md)、[`unit-of-work-story-map.md`](../../../inception/units-generation/unit-of-work-story-map.md)、[`requirements.md`](../../../inception/requirements-analysis/requirements.md)、[`components.md`](../../../inception/application-design/components.md)、[`component-methods.md`](../../../inception/application-design/component-methods.md)、[`services.md`](../../../inception/application-design/services.md) で確定済み。

## Ambiguity Analysis

material ambiguityなし。same-hunkまたは必須join key不足を実装時に発見した場合は、推定で補わず設計逸脱として停止する。

## Construction Amendment — Retry Dispatch Correlation

2026-08-10、実装時にRetry後のprepared batchを再dispatchする既存protocolが存在しないことを検出した。ユーザー裁定「1 — invoke-swarm拡張」により、既存`invoke-swarm`へprepared batch / retry attemptのoptional相関を追加し、再`prepare`を省略して既存poolのacquire → native dispatch → confirmへ進む。soloは既存BOLT event familyへ明示batch / attempt相関をthreadする。新directive kind・新workflow state・solo Unit Pool移植は行わない。
