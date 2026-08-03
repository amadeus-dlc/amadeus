# Scalability Design — execution-observability-baseline

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Linear Projection

`ExecutionIndex`をaudit fold中に構築し、operation／attempt／receiptをkey lookupする。projectorはevent streamを一度だけ読み、childごとの全audit再走査を禁止する。1／100／1,000 event fixtureでO(E)を検証する。

## Concurrency と Distribution

既存per-clone shard＋mkdir lockを維持し、4 processでID衝突と欠落を検証する。同じschemaを7 package／5 self-install投影へ生成し、harness別storeやdaemonを作らない。
