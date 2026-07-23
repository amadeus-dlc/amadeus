# Logical Components — gh-optional-runtime-norm

> 入力: performance/security/scalability/reliability requirements、tech-stack decisions、business logic model

## Components

| Component | Responsibility |
|---|---|
| Norm Clause | optional ghの許可条件 |
| Norm Verifier | CID/legacy/full-text/diff検査 |
| Review Evidence | reviewer/human/merge lifecycle |

## Boundary

U1はdocumentation/evidenceだけを所有し、runtime implementationはU2/U4、phase routingはU6へ委任する。
