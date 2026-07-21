# Performance Design — tla-arm-toolchain

## 上流と budgets

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。artifact cap 128 MiB、TLC run 120秒以下、workers=1、heap 256–1024 MiBを固定する。

## Acquisition pipeline

`TlcArtifactAcquirer` はHTTPS connect 10秒、headers 30秒、body 120秒、redirect最大3をabsolute deadlinesとして扱う。1 MiB以下のbufferでtemporary fileへsingle-pass write/hashし、完了後1回だけverification readする。descriptor別staging slotは1、quarantineはfailed bytes最大1件とする。

`AcquisitionLifecycleStore` はcomplete owner record（nonce、host、pid、process-start identity、descriptor）をunique stagingでsyncしてからlock名へexclusive renameし、ownerless lockを作らない。dead ownerだけをnonce照合付きquarantine renameで回収し、live/unknown ownerは奪取しない。lock下で128 MiB + metadata 1 MiB + 1 GiBのbacking fileを物理preallocateし、ACTIVE claimと同じstaged successorへatomic publishする。verified cache publishまたはfailure successor後にphysical release、absence再検証、RELEASED receipt commitの順で閉じる。release後・receipt前crashはabsence lookupから同じreceiptへ収束する。正常lock releaseはowner nonce一致を再読し、lock directoryをnonce付きquarantineへrename、parent sync、quarantine除去の順で行う。各応答喪失はdescriptor / reservation / owner nonce lookupへ収束する。cap/deadline/checksum failureはcacheへ昇格しない。

## TLC execution budget

`TlcRunDeadline` はJDK/jar/model/cfgのrun前identity再検証を開始する前からsuite remainingを計測する。全JDK snapshot manifest再hashも同じbudgetを消費し、再検証後の残時間と120秒の小さい方からevidence publish reserveを差し引いてJava process groupへ渡す。残時間がreserve以下ならspawnしない。timeout後terminate 5秒、kill 5秒で閉じる。stdout/stderr各16 MiB超過、queue nonzero、warning、partial explorationはsuccess verdictを作らない。

## Acceptance

cap/deadline/redirect/staging/free-space、lock/preallocation/release各crash境界、JDK再hashでbudget枯渇、TLC deadline、terminate/kill、heap/workers drift、output capをfixture化する。合否は永久lock=0、容量leak=0、run中network capability=0、workers=1、deadline延長=0、partial exploration NOT_DETECTED=0である。
