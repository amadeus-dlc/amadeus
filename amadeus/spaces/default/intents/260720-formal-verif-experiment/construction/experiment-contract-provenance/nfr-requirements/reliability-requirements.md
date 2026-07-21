# Reliability Requirements — experiment-contract-provenance

## Reliability model

`business-logic-model.md` のappendBatch / lookup / fold、`business-rules.md` のatomicity / retry / fail-closed boundary、`requirements.md` のNFR-1/NFR-2、`technology-stack.md` のlocal Bun processを前提とする。availability SLAではなく、再実行可能性、atomic durability、deterministic recoveryを合否とする。

## Atomicity and recovery

- event batchは全生成・全検証後に`appendBatch(expectedHead, transactionId, events)`でall-or-nothing commitする。部分append許容数は0件とする。
- provenance ledgerとそのatomic store port / filesystem adapterはU1が所有する。U3のEvidence Storeはcell / suite evidence専用であり、authoring event ledgerを保存しない。
- U1 filesystem adapterはsame-directory temporary fileへcanonical batchとchain / content hashを書き、file flush成功後にatomic renameし、directory durability sync成功後をcommit pointとする。必要なdurability primitiveが利用不能ならacknowledgeせずtyped store errorを返す。
- response喪失時はtransaction lookupを先に行い、同一canonical batchのcommit済みなら同じreceiptへ収束する。未commit確認前の再送を禁止する。
- expected-head conflict、same-ID different-bytes、lookup corruptionを別errorとして保持し、成功やdomain verdictへ丸めない。
- stateはledgerから再構築し、別mutable state fileを正本にしない。同じledger bytesは同じfold state / next-command setを返す。

## Fault handling

schema、port、timeout、I/O、handler errorはclosed discriminatorとcause identityを保持する。catch-all success、silent fallback、自動後続commandは0件とする。`SKELETON_FAILED`後の後続transitionは全拒否し、failure ledgerを変更しない。

process crash前後の境界は、commit point前なら旧headだけがvalid、commit point後ならlookupで同一receipt再構築の二択に閉じる。startup scanはtemporary / final双方のlength、content hash、previous-head chainを検証し、torn / orphan temporaryを成功ledgerへ採用しない。backup / disaster recoveryはversion-controlled provenanceとcontent-addressed artifactsの上位record-syncが所有し、U1独自backupを作らない。

## Reliability tests

同一入力100回のparser / identity / fold一致、temporary write / file flush / rename / directory sync各境界のcrash injection、commit後response喪失、torn length / hash、orphan temporary、head conflict、same-ID different-bytes、corrupt lookup、duplicate event、UTC逆転、handler failure propagationを検証する。合否は部分append0、torn write採用0、commit point前ack 0、二重event0、同一transactionの異なる成功receipt 0、failureからのverdict生成0である。

## Observability

各commandはcommand identity、pre-state / post-state、handler identity、transaction / receipt identity、typed outcomeを1つのstructured receiptへ記録する。private contentは記録せず、同じidentityからledger / artifactへ双方向に辿れることを要求する。
