# Security Design — gh-optional-runtime-norm

> 入力: performance/security/scalability/reliability requirements、tech-stack decisions、business logic model

## Design

norm clauseへgh credential store委譲、argument array、secret非保持/非出力、mirror限定scope、人間承認を不可分に記載する。

## Validation

canonical全文一致と禁止表現absenceでscope creep、credential ownership、shell invocationを検査する。
