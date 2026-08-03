# Performance Design — convergence-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Reserve Path

`BudgetCoordinator`はfold済み`BudgetIndex`からsubjectをO(1) lookupし、policy snapshot、counter、reservation、attemptを1 batchでcommitする。同一key replayは既存receiptを返す。

## Retry Scheduling

`RetrySchedulerPort`を注入し、50ms×ordinalをcanonical lock外で待つ。Stop 2／8／hard10、retry 2／hard3をshared policyから読み、cap+1でmodel／worker callを行わない。
