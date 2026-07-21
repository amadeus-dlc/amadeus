# Reliability Design — experiment-contract-provenance

## Design inputs

`performance-requirements.md` のbounded work、`security-requirements.md` のintegrity、`scalability-requirements.md` のsingle ledger、`reliability-requirements.md` のcommit / recovery、`tech-stack-decisions.md` のfilesystem adapter、`business-logic-model.md` のappendBatch semanticsを具体化する。

## Immutable object + HEAD protocol

`ProvenanceStoreAdapter`はtransaction ID配下のimmutable objectへcanonical batch、previous head、content hashを書き、全file flushとobject directory syncを完了する。次に`heads/<ledger>/<new-head-id>`のimmutable pointer objectをdurable化し、single-writer lock下でlogical `CURRENT` symlinkではなくexclusive successor recordをappendする。readerはvalid successor chainの末尾をHEADとして導出する。

commit pointはsuccessor recordのatomic rename + parent syncである。objectだけ残るcrashはunreferenced object、successor commit後のresponse喪失はtransaction lookupで同じreceiptへ収束する。旧headは上書きされないためrename→sync間でもold/new chainのどちらかを検証できる。

## Recovery state machine

startupはobject hash、successor previous-head chain、transaction uniquenessを検査する。unreferenced valid objectは同transaction retryで再利用でき、torn object / successorはquarantine receiptを残す。same-ID different bytes、two successors for same expected headはcorruptionとして停止する。

## Failure injection

object write / flush / sync、successor write / rename / parent sync、ack各境界へcrashを注入する。old/new valid head exactly one、partial event0、ack済み消失0、same transaction異receipt0を要求する。
