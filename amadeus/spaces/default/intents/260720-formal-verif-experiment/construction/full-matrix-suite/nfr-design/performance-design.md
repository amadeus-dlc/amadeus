# Performance Design — full-matrix-suite

## 上流と budget

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。schedule=12、cells=96/72、suite complete<=120秒、timeout cleanup込み<=150秒、total<=1,800秒に閉じる。

## ResourceLeaseController

revision開始前に2 logical CPUs/2 GiB/active process1のOS-level exclusive leaseを取得し、provider/host/CPU/core IDs/memory/OS/arch/runnerを`ResourcePolicyIdentity`へ固定する。`ResourceLeaseStore` はcomplete owner recordをdurable化してからexclusive lease名へpublishし、dead ownerだけをnonce照合付きquarantineで回収する。resumeは同一policyを再取得後のatomic RESUMED、normal releaseはowner nonce再読→quarantine→parent sync→除去で閉じる。両armへ同identityを渡し、各suite前後のowner/process list/counters/pressure/clock telemetryをreceipt化する。drift/unknown process/telemetry欠損はincompleteにする。

`CapacityReservationStore` はworst-case 96/72 bundles +1 GiBのphysical backingとACTIVE claimを同一staged successorでdurable reserveする。terminal後はphysical release→absence再検証→RELEASED receiptとし、各crash境界をidempotent lookupで回復する。suite timerはstartからfinal cell durable publishまでで、120秒後はterminate/kill10秒+partial flush/INCOMPLETE20秒だけ許す。

## Median

armごとにcomplete measured durations exactly5をsortしindex2を採用する。warmup/partial/timeoutを除外し、raw/sorted/median source/positionを保存する。合否はentries12、cells96/72、active process1、complete5/arm、resource drift0である。
