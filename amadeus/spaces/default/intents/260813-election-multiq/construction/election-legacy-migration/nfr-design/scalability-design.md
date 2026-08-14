# Scalability Design — election-legacy-migration

## Topology

[business-logic-model](../functional-design/business-logic-model.md)どおりone election/single writer。horizontal scaling、queue、DBは非適用。

## Capacity

file数/bytesにO(n)。複数Electionは独立operationとして直列または明示的非交差時だけ並行可能。同一registry writerはlockで直列化する。

## Review

READY。安全境界を壊すparallelismを導入しない。
