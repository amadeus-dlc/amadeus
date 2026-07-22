# Scalability Design — tla-invalid-timestamp-skeleton

## 上流と closed capacity

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。identityは`revisionId + CompositionHeadId + executionManifestIdentity`で、fixture=1、local=2、CI rows=2、worker=1、worktree=1に閉じる。

## RevisionIndex

branch/composition/manifest/artifact/summaryはrevisionごとに各1、attempt keysは{1,2}だけを許す。attempt 0/3、別fixture、parallel attemptsをrejectし、retryは旧raw evidenceを保持した新revisionへ切る。旧composition worktreeはterminal outcome後にHEAD/tree/cleanとCompositionHeadを再読し、未参照materialization 0を確認して`RETIRED` receiptをdurable appendしてactive indexから外す。receipt後だけworktree bytesを削除でき、commit/tree/raw evidenceはimmutable storeに保持する。U8 root/full matrixは開始しない。

`SkeletonReservationStore` は同時ACTIVE revisionを1にする。same revision resumeは旧ownerのhost/pid/process-start identityがdeadであること、revision/CompositionHead/execution manifest/reservation bytes/current attemptsが全一致することを再読し、新session/process-start identityとfresh nonceを持つatomic `RESUMED` successorで排他的に所有権移転した後だけ許す。live/unknown ownerは拒否する。dead ownerの明示ABORTED以外でreleaseせず、terminal後のphysical releaseとRELEASED receiptまでbytesを再利用しない。

## Verification

attempt 1/2、0/3、second active、RESUMED所有権競合、live/unknown resume拒否、worktree RETIRED前後crash、dirty/unreferenced materialization retirement拒否、live/stale abort、cross-revision artifactを検査する。active worktree/reservation/TLC process各1を合否とする。
