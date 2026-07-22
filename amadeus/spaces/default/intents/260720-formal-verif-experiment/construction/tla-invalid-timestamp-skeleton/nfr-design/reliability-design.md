# Reliability Design — tla-invalid-timestamp-skeleton

## 上流と state model

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、local/CI完全traceと決定論性が揃う場合だけpassをmintする。

## Composition と attempt recovery

`CompositionStore` はbase/Arm T/injection/resulting tree/commitを段階hashし、commit後にHEAD/tree/cleanを再読する。crash retryはCompositionHead全identity一致時だけresumeする。local attemptはU3 transaction lookupを使い、attempt1成功後はattempt2から再開し、別bundleでattempt1を再実行しない。

CI transport不明は同run metadata/artifact hashを再取得し、attempt上限後はterminal failureにする。別run dispatchを自動化しない。

## OutcomeTransaction

pass/failはexpected headとdeterministic transaction IDでatomic appendし、response喪失はlookup後だけ同bytesを再送する。transport/head/lookup/corruptionはdomain outcomeをmintしない。failure後はledger suffixからArm S/reveal/promotion/benchmark command 0の`StopReceipt`を生成する。

reservation/lockはcomplete owner recordをunique stagingでsyncしてlock名へexclusive renameし、ownerless lockを作らない。dead ownerだけをnonce照合付きquarantine renameで回収し、live/unknown ownerは奪取しない。same revision recoveryは全bound identity再読後、fresh owner/nonceのatomic `RESUMED` successorで所有権を移す。normal releaseもowner nonce再読、quarantine rename、parent sync、除去の順で行う。ACTIVE/RESUMED/CLOSED/ABORTED/RELEASEDとworktree RETIRED successorを持つ。composition、ownership transfer、worktree retirement、reservation、attempt1/2、CI poll/archive、outcome append各境界へcrash注入し、duplicate attempt/outcome/reservation=0、failure後command=0を検証する。
