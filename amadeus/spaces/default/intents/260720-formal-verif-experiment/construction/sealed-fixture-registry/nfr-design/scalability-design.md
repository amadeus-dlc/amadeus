# Scalability Design — sealed-fixture-registry

## 上流と cardinality

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。namespace は `universeRevisionId + baselineSha + denominatorReceipt` で、7または根拠ある5だけを表現し6/8を拒否する。

## Bounded indexes

`RevisionIndex` は fixture ごとに branch/proof/manifest/scan/seal をexactly 1、disclosure/materialization をarm-fixture pairごとに最大1、promotionをrevisionごとに最大1保持する。D-COUNT 7は14 pairs、5は10 pairsを上限とし、canonical orderingはidentity列で決めfilesystem enumerationへ依存しない。

## Multi-revision reservation

`ReservationStoreAdapter` はRegistry lock下で物理preallocation backing fileとACTIVE claimを同じstaged transactionとしてdurable publishし、同時 active revisionを1に直列化する。startupはsuccessorに接続済みの同revision/同identityをresumeし、未接続staging/backing orphanを成功claimへ採用しない。別revisionは開始しない。ownerのhost/pid/process-start identityがdeadと証明された場合だけABORTED successorをappendする。CLOSED/ABORTED後もbacking allocationのreleaseと`RELEASED` receiptがdurableになるまでactive reserved bytesへ計上する。旧proof/seal/disclosure/promotionは削除しない。

## Verification

7/5 accept、6/8 reject、14/10 pair上限と+1、2 revision保持、cross-revision nonce/grant拒否、同時claim、preallocation/claim/release各境界crash、orphan backing拒否、crash resume、live abort拒否、verified-stale abortを検査する。合否はactive revision=1、unclaimed execution=0、released前容量再利用=0、unknown/truncated fixture=0、immutable旧record消失=0である。
