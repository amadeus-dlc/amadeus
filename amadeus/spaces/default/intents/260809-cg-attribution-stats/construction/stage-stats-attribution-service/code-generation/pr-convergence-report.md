# PR Convergence Report — stage-stats-attribution-service

## Status

- State: `not-applicable-yet`
- Converged: `false`
- Reason: Issue #2695全体のPRはまだ作成されておらず、U-04単独でmergeability、review thread、remote checkの収束を主張できないため。

## Local evidence

- Unit commit `6a0cf2cd29002ca7b6c9a8769c41c4293b176203`
- Intent branch integration commit `65b0caa44`
- Swarm check `converged=true`、`tampered=false`
- Swarm finalize 1/1 converged、merge failure 0
- Focused 91/91、provider regression 38/38、parent combined 129/129
- Typecheck、lint、source-only、diff-check Green
- Local build後のpackaging test 10/10 Green
- 全3formatのoversized pipe、producer/consumer exit、digest parity、JSON parse Green

PR作成後の実convergenceはBuild and Testを完了してからIssue全体のbranch/PRを対象に行う。この記録はremote PR checkやreview convergenceのPASSを代用しない。
