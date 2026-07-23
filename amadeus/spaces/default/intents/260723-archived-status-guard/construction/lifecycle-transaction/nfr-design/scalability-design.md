# Scalability Design — lifecycle-transaction

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`が定めるlocal single-writer境界を維持する。

## Capacity

- 10,000 audit rows・10,000 registry entriesを保証点とし、audit/registry scanは総row数に対してO(n)とする。
- journalはspaceごとに最大1件、固定schemaのO(1) sizeとする。
- shard数を増やしても各shardを一度ずつ走査し、rowごとの全shard再探索を行わない。

## Concurrency

- 同一workspaceで最大8 processを既存lockの50回×100 ms retryで直列化する。
- 8 process fixtureは8個の別intentを用意し、各intentへ別shard・別timestampの未消費HUMAN_TURNを1件ずつ割り当てる。8 processは各自のintentを`in-flight → archived`へ遷移させる。
- 期待結果は成功8件、rejection 0件、異なるoperationId 8件、intentごとのaudit event正確1件、starvation 0である。同一intent競合は別fixtureとし、最初のarchive成功1件・既にarchived rejection 7件・audit event1件を要求する。
- 5秒超lock blockerではwaiterをnon-zero timeoutとし、journal、audit、registry、cursorを変更しない。

## Non-applicable distribution

- fairness順序、distributed lock、horizontal scaling、multi-region、autoscaling、remote queueはN/A。
- AWS infrastructureを新設せず、failure domainは単一workspaceと各短命processに限定する。
