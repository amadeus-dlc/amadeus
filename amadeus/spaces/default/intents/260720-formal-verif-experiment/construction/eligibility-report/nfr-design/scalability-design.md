# Scalability Design — eligibility-report

## 上流と closed capacity

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。arms2、cells96/72、axes3、decision variants4、Alloy assessment1、outputs2、trace<=256に固定する。

## ReportRevisionClaim

identityはrevision/FullMatrixEvidence/algorithm/report+trace schemas/reservationを束ねる。32 MiB output+staging+1 GiBのphysical backingとACTIVE claimをreport-store lock下で同一transactionとしてpublishする。dead ownerと全bound identity一致後のatomic RESUMEDだけを許し、publisher再読不一致はABORTEDへ閉じる。successful final rename/parent sync/receipt lookup後にreport identityを参照するCLOSED successorをcommitし、失敗/quarantine後はABORTED successorへ閉じる。

algorithm/schema変更は新revisionで旧decision/report/traceを保持する。crash recoveryはreport identity lookup→CLOSED/ABORTED lookup/commit→physical release→absence再検証→RELEASED receiptの順へ収束し、RELEASEDまでbytesを再利用しない。

## Verification

72/96と±1、trace256/257、2 revision、claim/resume、cross-revision matrix/algorithm/schema/reservation driftを検査する。third arm/5th decision/dynamic handler=0である。
