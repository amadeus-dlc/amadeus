# NFR Design 質問 — election-question-tally

## Context

[business-logic-model](../functional-design/business-logic-model.md)を入力とする。

## Q1: primary controlは？

- A. target/preserved partitionとdigestのfail-closed検査
- B. network ACL
- C. database lock
- D. OAuth
- E. cache
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。established data integrityを守る）

## Q2: component分離は？

- A. resolver、partition validator、question tally、assembler
- B.単一関数
- C.外部worker
- D. questionごとprocess
- E. CLI内branch
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。pure test seamを作る）
