# NFR Design 質問 — election-mixed-lifecycle-cli

## Context

[business-logic-model](../functional-design/business-logic-model.md)を入力とする。NFR Requirementsはabsent-and-expected。

## Q1: scaling modelは？

- A. 短命single-writer CLI、question/response数に線形、horizontal service化なし
- B. distributed workers
- C. database sharding
- D. queue
- E. autoscaling
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。現行topologyを維持する）

## Q2: reliability modelは？

- A. read-only next、evidence-before-state、idempotent same-run retry
- B. blind retry
- C. delete rollback
- D. eventual consistency
- E. silent fallback
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。stale/partial commitを防ぐ）

## Q3: performance budgetは？

- A. O(Q+R+C)と既定single-question p95 thresholdを維持
- B.固定question上限
- C.全組合せ
- D. cache常駐
- E.無計測
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。Requirements NFR-1/2に従う）
