# Security Design — bounded-unit-pool

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Dispatch Guard

`PoolDispatchGuard`はStartPermit、first claim、active cap、Unit attempt budgetを同時検証する。driver overrideはresolved cap以下だけを受理し、unknown effectで再dispatchしない。

## Worktree Isolation

`WorkerLaunchSpec`へUnit worktreeと禁止git境界を固定し、protected path digestで検証する。queue eventはtyped outcomeとcorrelation factだけを保存し、prompt／credential／raw outputを除外する。
