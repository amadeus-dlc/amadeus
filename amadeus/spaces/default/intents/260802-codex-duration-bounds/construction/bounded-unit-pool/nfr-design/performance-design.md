# Performance Design — bounded-unit-pool

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Pool Scheduler

`UnitPoolScheduler`はsettle eventで起動し、active<capの間だけFIFO headをacquireする。queued時はworkerをspawnせず、default/hard 4を超えない。

## Capacity Tests

fake worker＋latchでcap 1／2／4、Unit 1／4／8を実行しmaximum activeとqueue順を記録する。Kahn planはO(U+D)、transitionはindexed queueでO(log U)以下とする。
