# Scalability Requirements — sealed-fixture-registry

## Closed capacity

`business-logic-model.md` のDefectUniverse、`business-rules.md` の7/5 cardinality、`requirements.md` のknown defects、`technology-stack.md` のsingle-process registryに従う。容量単位は`universeRevisionId + baselineSha + denominatorReceipt`である。

## Cardinality model

- 1 revisionはcandidate rows最大7、root clusters 5、sealed fixtures 7または5だけを許す。6は表現不能とする。
- fixtureごとにbranch 1、proof 1、payload manifest 1、scan receipt 1、seal 1をexactly要求する。
- disclosureはarm / fixture pairごとに最大1、materialization receipt最大1で、最大14 pairsである。promotion transactionはrevisionごとに最大1である。
- index / validation / canonical orderingはrow / fixture / entry数に線形とし、filesystem enumeration orderへ依存しない。

## Multi-revision retention

再測定やdenominator訂正は新revision namespaceへappendし、旧proof / seal / disclosure / promotionをimmutableに保持する。新revisionが旧nonce、grant、seal aliasを暗黙再利用しない。

開始前capacity reservationはperformance要件のworst-case budgetをRegistry単一writer lock下でdurableにclaimする。claimはreservation ID、revision / baseline、owner session / process-start identity、reserved bytes、state `ACTIVE`を持つ。同時revisionは1 activeに直列化する。success / terminal failureは同じlock下で`CLOSED` eventをappendしてclaimを解放する。startupはACTIVE claimを同じrevisionへresumeし、別revisionを開始しない。明示abortはowner process-start identityがliveでないことを検証して`ABORTED` eventをappendした場合だけ解放する。自動削除やsilent compactionを行わない。

## Verification

7 / 5 accept、6 / 8 reject、D-COUNT 7の14 disclosure pairs accept / 15th reject、D-COUNT 5の10 accept / 11th reject、2 revision保持、nonce / grant cross-revision拒否、capacity reservation同時claim、crash後same-revision resume、live owner abort拒否、stale owner abort / closeを検証する。active revision数1、unknown fixture / entry truncation 0を合否とする。
