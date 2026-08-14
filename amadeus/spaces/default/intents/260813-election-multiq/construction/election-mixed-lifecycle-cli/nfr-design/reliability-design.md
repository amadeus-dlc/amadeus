# Reliability Design — election-mixed-lifecycle-cli

## Failure model

[business-logic-model](../functional-design/business-logic-model.md)の各verbは一回の同期transaction。next/statusはwrite-free、voteはone pending append、tally/reportはU3 receiptでforward repairする。

## Recovery

evidence-before-state、expected state/run/targets/digest compare、same-run idempotency、timeline dedupeを使用する。異run/bytesはretryせずconflict。circuit breaker/failoverはexternal dependencyがないため非適用。failureはexit 1とsafe next actionを返す。

## Review

READY。rollback削除ではなくdurable evidenceから前進回復する。
