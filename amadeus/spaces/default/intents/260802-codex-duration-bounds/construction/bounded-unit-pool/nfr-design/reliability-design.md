# Reliability Design — bounded-unit-pool

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Atomic Transition

`PoolTransitionCoordinator`がattempt／slot／active、settle／release／requeue／dependent cancelを各1 event batchでcommitする。duplicate resultは既存receiptを返し、releaseを再実行しない。

## Reconciliation

`ReconciliationController`はattempt×kindでdefault2／hard3を予約する。exhaustionはclosed synthetic outcomeとreleaseを同時commitしdrainingへ移る。late resultは観測eventだけでauthoritative stateを変えない。
