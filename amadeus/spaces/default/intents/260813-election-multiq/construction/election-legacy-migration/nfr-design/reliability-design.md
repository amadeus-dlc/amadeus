# Reliability Design — election-legacy-migration

## Failure model

[business-logic-model](../functional-design/business-logic-model.md)のoperationId/plan digest/completed stepsをdurable receiptへ記録する。

## Recovery

source/target実在とdigestから既完了stepを再判定しsame-planだけ前進。異planはconflict。source absent/target present/digest matchはrepair completion、mismatchは停止。schema/recordを削除rollbackしない。

## Review

READY。crash境界ごとにdeterministic resumeが可能。
