# NFR Design 質問 — election-v2-store

## Context

[business-logic-model](../functional-design/business-logic-model.md)を入力とする。

## Q1: reliability patternは？

- A. create-only evidence + atomic replace + same-run forward repair
- B. delete rollback
- C. distributed transaction
- D. queue
- E. database
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。filesystem single writerに適合）

## Q2: security controlは？

- A. strict decode、explicit path、create-only/conflict guard、blind pending
- B. IAM
- C. TLS
- D. WAF
- E. secrets manager
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。実在するlocal boundaryを守る）
