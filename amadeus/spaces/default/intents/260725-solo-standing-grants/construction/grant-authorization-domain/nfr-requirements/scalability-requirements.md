# Scalability Requirements: grant-authorization-domain

## Inputs and Growth Model

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`に基づく。scale dimensionはintent数、audit shard数、audit event数、active grant数である。

## Capacity Targets

| ID | Dimension | Required capacity | Behavior |
|---|---:|---:|---|
| U1-SCALE-01 | intents | 100 | Route Id lookupがspace内全intentを正確に走査し、exactly oneのreceipt ownerを返す |
| U1-SCALE-02 | audit events | 100,000 | 5秒timeout内、correctness不変 |
| U1-SCALE-03 | shards per intent | 32 | shard順に依存しない |
| U1-SCALE-04 | valid grants | 10,000 | 完全順序で一意candidate |

## Scaling Strategy

現段階ではfilesystem scanを維持する。target超過が実測された場合のみ、監査正本を変えないderived indexを別intentで検討する。本Issueではcache invalidation、database migration、background compactionを導入しない。

## Concurrency

複数sessionのroute receiptはUUID v4で分離し、後発receiptが先発をsupersedeしない。space-wide lookupはexactly oneを要求し、同一Route Idが複数intentに現れた場合はmutationしない。

## Boundary Outcomes

- Route Id一致0件はtyped fallbackとし、いずれのintentも操作しない。
- Route Id一致1件はそのreceipt所有intentだけをtransaction targetにする。
- Route Id一致が同一intent内または複数intentに2件以上あればtyped fallbackとし、いずれのintentも操作しない。
- active-intent cursorの値やintent列挙順を変えても上記結果は変わらない。

## Traceability and Verification Ownership

| Target | Upstream | Business rules | Fixture / blocking suite owner |
|---|---|---|---|
| U1-SCALE-01 | FR-12–17, NFR-02 | BR-23–28 | receipt ownership integration suite |
| U1-SCALE-02 | NFR-07 | BR-22–28 | performance regression suite |
| U1-SCALE-03 | NFR-01, NFR-02 | Audit Invariants | shard permutation property suite |
| U1-SCALE-04 | FR-07, NFR-07 | BR-13 | candidate selection unit suite |
