# Reliability Design — sealed-fixture-registry

## 上流と durable state

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。seal/disclosure/promotion/reservationをappend-only successor transactionとして統一する。

## RegistryTransactionStore

`RegistryTransactionStore` は全fileをsame-filesystem unique staging directoryへwrite/flushし、directory sync後にcomplete owner/identity recordを含むdirectoryをnonexistent successorへexclusive atomic renameする。parent directory sync後だけsuccessを返す。lock owner record（nonce、host、pid、process-start identity、operation identity）もunique stagingでdurable化してからlock名へexclusive renameし、ownerless visible lockを作らない。releaseはowner nonce一致を再読後にlock directoryをnonce付きquarantineへrenameし、parent sync後に除去する。

response喪失はseal identity、arm-fixture successor、permission nonce、reservation IDでlookupし、全bytes/linkage一致時だけ同receiptへ収束する。same identity/different bytes、event/grant片側、scan drift、staging orphanをsuccessへ採用しない。

## Recovery ownership

`RegistryRecovery` はcomplete successorだけを再読し、ACTIVE reservationをsame revisionへresumeする。durable lock ownerのhost/pid/process-start identityがdeadと証明できる場合だけ、owner nonce一致を再確認してlockをquarantine renameし、parent sync後に新lockを取得する。live/unknown ownerは奪取せずdeadline failureにする。reservation ownerがdeadの場合だけ明示ABORTEDをappendする。正準release順はCLOSEDまたはABORTED successor commit → physical backing release → absence / length再検証 → `RELEASED` receipt commitである。release後・receipt前crashはterminal reservationとbacking absenceをlookupして同じ`RELEASED` receiptへ収束し、receipt前に容量を再利用しない。未接続staging/backing orphanはquarantineし、成功claimへ昇格させない。materialization final pathが存在するretryはevent/grant/destination/exact bytes一致時だけreceiptをappendする。

## Crash verification

reservation preallocation/claim/close/abort/release、lock owner publish/保持/release/quarantine、materialization write/rename/receipt、seal/disclosure/promotionのwrite/flush/sync/rename/ack境界へcrash injectionを置く。live/unknown lock奪取=0、dead lock永久停止=0、orphan backing採用=0を確認する。合否はack済み消失=0、partial success=0、二重claim=0、duplicate lifecycle event=0、同一request異receipt=0である。
