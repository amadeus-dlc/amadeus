# Scalability Design — election-mixed-lifecycle-cli

## Topology

[business-logic-model](../functional-design/business-logic-model.md)どおり短命Bun process、one election/single writerを維持する。外部service、load balancer、shard、queueは非適用。

## Capacity

question/voter/responseをMapで線形処理し、固定question上限は追加しない。容量限界はprocess memory/filesystemで明示errorにし、partial outputをcommitしない。複数Electionはdirectory単位で独立だが同一Election concurrent writerはscope外。

## Review

READY。要求外のdistributed topologyを追加せずdata sizeに比例してscaleする。
