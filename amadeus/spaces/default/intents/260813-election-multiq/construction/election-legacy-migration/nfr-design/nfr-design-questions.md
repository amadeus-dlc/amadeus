# NFR Design 質問 — election-legacy-migration

## Context

[business-logic-model](../functional-design/business-logic-model.md)を入力とする。

## Q1: failure recoveryは？

- A. plan-bound receiptとsame-plan forward repair
- B. broad rollback delete
- C. untracked retry
- D. eventual queue
- E. manual guess
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。targetを限定し証拠を残す）

## Q2: scaleは？

- A. one election operation、files/bytesに線形
- B. distributed workers
- C. database shard
- D. concurrent same-election apply
- E.無制限parallel
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。migration安全性優先）
