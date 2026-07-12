# SLO Configuration

## Applicability

`performance-design.md`、`security-design.md`、`reliability-design.md`、`monitoring-design.md`、`infrastructure-services.md`にuser-facing runtime SLIはなく、availability/latency/error-budget SLOはN/A。

## Operational contract

jobは5分timeout、manual CLIは10秒境界。これはexecution guardでありservice SLOとは呼ばない。

## Measurement

landing後のmain job成功/失敗を観測するが、単発runからavailability SLO達成を主張しない。
