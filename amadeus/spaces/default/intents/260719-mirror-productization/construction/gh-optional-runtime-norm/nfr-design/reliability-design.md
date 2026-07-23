# Reliability Design — gh-optional-runtime-norm

> 入力: performance/security/scalability/reliability requirements、tech-stack decisions、business logic model

## Design

draft→independent review→human approval→mergeの一方向stateと証跡を用いる。未mergeではrelease-readyを拒否する。

## Recovery

review rejectionはdraftへ戻し、runtime faultはdirect CLI exit 1、phase boundaryはretry/skipへ分離する。
