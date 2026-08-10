# Domain Entities — issue-2833-failure-transition

入力: [`unit-of-work.md`](../../../inception/units-generation/unit-of-work.md)、[`unit-of-work-story-map.md`](../../../inception/units-generation/unit-of-work-story-map.md)、[`requirements.md`](../../../inception/requirements-analysis/requirements.md)、[`components.md`](../../../inception/application-design/components.md)、[`component-methods.md`](../../../inception/application-design/component-methods.md)、[`services.md`](../../../inception/application-design/services.md)。

## Value Objects

| Entity | Fields | Invariant |
|---|---|---|
| UnitKey | intent, stage, unit, attempt, batch | solo batchも明示identity。必須key欠落は構築不可 |
| UnitOutcomeEntry | UnitKey, outcome, reason, sequence | outcomeは3値、sequenceはcanonical audit順 |
| ProjectionDiagnostic | eventId, sequence, kind, missing keys | 不正eventからUnitKeyを捏造しない |
| OutcomeProjection | units, unresolvedFailures | stable order、Unit attemptごとに最新有効値 |

## Decision Entities

| Variant | Payload | Lifecycle effect |
|---|---|---|
| retry-unit | target UnitKey | new attempt eligible |
| skip-unit | target, cancelled, reason | current attempt terminal |
| await-unit-ruling | target, siblings | cursor hold |
| parked | trigger, preservedOutcomes | Construction terminal pause |
| retry-swarm-dispatch | preparedBatch, targetUnit | 既存poolを再prepareせずpermit取得へ進む |

## Relationships

UnitKey 1件は同一attempt内のevent列を識別する。OutcomeProjectionは複数UnitOutcomeEntryを持ち、unresolvedFailuresはその部分集合。FailureTransitionは必ずtarget UnitKeyを持ち、siblings/preservedOutcomesは入力projectionから逐語保持する。

## Lifecycle Constraints

- event identity dedupe後、canonical seqでfoldする。
- Retryは同じUnit slugに新attempt identityを作る。
- Skipは現在attemptをcancelledにするがUnit自体をsucceeded扱いしない。
- Abortは新state entityを作らず、既存監査とengine-owned parked envelopeへ投影する。
- cleanup/discard entityは本Unitに存在しない。
- retry-swarm-dispatchは既存`invoke-swarm`のoptional相関であり、新directive kindではない。native attempt identityはpool `acquire`が発行し、directiveは先行attemptを捏造しない。
