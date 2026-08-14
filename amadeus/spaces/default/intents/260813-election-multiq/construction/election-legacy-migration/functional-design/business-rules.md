# Business Rules — election-legacy-migration

## Sources

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) からU6 ruleを抽出する。

## Rules

- BR-M1: dry-runはwrite-freeで全対象/precondition/digestを表示。
- BR-M2: applyはplan digestにboundされたapproval必須。
- BR-M3: schema bytesをmigration目的で書き換えない。
- BR-M4: source/targetは明示解決し、broad globを使わない。
- BR-M5: target collision/dirty/conflictはmove前に拒否。
- BR-M6: before/after canonical digest一致が成功条件。
- BR-M7: `legacy-question` identityは移動前後で一致。
- BR-M8: retryはoperation receiptで前進回復し、異planを拒否。
- BR-M9: mismatch時にsource evidenceを削除しない。

## Traceability

FR-COMP-1/4、NFR-3/4を被覆する。
