# Logical Components — election-v2-store

## Input

[business-logic-model](../functional-design/business-logic-model.md)をstore componentsへ分ける。

## Components

| Component | Owns | Failure containment |
|---|---|---|
| Canonical Reader | strict dual-read | one artifact |
| Blind Pending Lane | voter event staging | one voter |
| Ledger Materializer | ordered integration | one election run |
| Tally Run Repository | immutable history/current | one run |
| State/Timeline Committer | compare/write + receipt | one transition |
| Repair Coordinator | same-run progress detection | one operationId |

## Reliability and resources

write orderはhistory→current→state→timeline。各stepはidempotency evidenceを持ち、後段失敗で前段を削除しない。single writer lockを共有resourceとし、network/cache/DBは追加しない。

## Review

READY。multi-file blast radiusをoperation receiptで可視化し、復旧をdeterministicにする。
