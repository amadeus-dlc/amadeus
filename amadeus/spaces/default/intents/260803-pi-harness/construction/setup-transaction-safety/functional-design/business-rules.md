# setup-transaction-safety — Business Rules

## Admission and planning rules

| Rule | Invariant | Failure |
|---|---|---|
| BR-STS-001 | target identityごとにexclusive transaction ownerは高々1 | `transaction-busy` |
| BR-STS-002 | `recoverSetupTransaction`がclean/recovered terminalになる前に新transactionをadmitしない | `recovery-blocked` |
| BR-STS-003 | Plan actionは`add | replace | preserve | backup-and-replace | remove`のclosed unionで、relative pathのcanonical順を持つ | `plan-invalid` |
| BR-STS-004 | 全entryはexpected-beforeとcandidate-afterのabsence/digestを持つ。digest不明のdestructive actionを許可しない | `snapshot-incomplete` |
| BR-STS-005 | retired managed fileは旧manifest checksumとactual digestが一致する場合だけ`remove` | `target-conflict` |
| BR-STS-006 | candidate manifestを最後のtransaction entryとしてmutation前に決定する | `manifest-prepare-failed` |
| BR-STS-007 | duplicate/case-fold alias、backup collision、path escape、symlink、file-kind/digest mismatchを全件preflightする | `target-conflict` |
| BR-STS-008 | preflight conflict時はmanaged/user file、manifest、journal、stagingへのwrite 0。排他lock metadataだけ作成・解放できる | FR-DST-001 |

## Journal and durability rules

| Rule | Invariant | Failure |
|---|---|---|
| BR-STS-010 | transaction rootはtarget-localかつtargetと同一filesystem | `cross-device-transaction` |
| BR-STS-011 | journalはschema/version、transaction/target/plan fingerprint、entry ordinal、before/after、stateを持つ | `journal-invalid` |
| BR-STS-012 | 各mutation前にintentをatomic write + file/parent fsyncし、mutation後に観測結果を検証してreceiptをfsyncする | `journal-write-failed` |
| BR-STS-013 | candidate sourceはstageへcopy後にdigest/size/modeを検証し、recoveryはsourceに再アクセスしない | `stage-verification-failed` |
| BR-STS-014 | rename後・journal receipt前の再開はfilesystem digestとstage/backup所在で判定し、blind replayしない | duplicate mutation 0 |
| BR-STS-015 | journal/transaction directoryの削除後もparent directoryをfsyncする | `cleanup-pending` |
| BR-STS-016 | journal raw payload、home絶対path、secretを保存せず、transaction metadataは0700/0600 | NFR-SEC |
| BR-STS-017 | destructive actionはWAL capture-intent後にcurrent targetをprivate quarantineへatomic renameし、捕捉後にPlan.beforeを検証する | `captured-mismatch` |
| BR-STS-018 | captured mismatchはno-clobber restoreし、target占有時はquarantineをrecovery artifactとして保持する。未知contentを削除しない | external bytes保持 |
| BR-STS-019 | expected-absent create/candidate配置はhard-link based `installNoReplace`を使い、target占有時は既存contentを変更しない | `target-occupied` |

## Apply and commit rules

| Rule | Invariant | Failure |
|---|---|---|
| BR-STS-020 | originalのdestructive mutation前にrecoverable backupを確定する。元がabsentならabsence markerを使う | `backup-failed` |
| BR-STS-021 | candidate fileはsame-filesystem stageからatomic renameし、cross-device fallback copyを使わない | `apply-atomicity-failed` |
| BR-STS-022 | preserve actionはbytes/modeを変更せず、verification対象にだけ含める | `preserve-diverged` |
| BR-STS-023 | managed entries適用後にinstall manifestを最後にatomic replaceする | partial manifest 0 |
| BR-STS-024 | 全after state verification後のdurable `commit-decided`だけがcommit point | `verification-failed` |
| BR-STS-025 | commit decision前のfailureはrollback、decision後はcleanup。phaseを跨いで方針を変更しない | convergence |
| BR-STS-026 | cleanup failureをcommitted成功へ丸めず`recovery-required(commit-cleanup)`にする | failure transparency |
| BR-STS-027 | rollbackはcaptured inodeをoriginalへ戻す。commitは全captureをtransaction backupまたは既決の利用者向けbackupへpromoteして保持する | data preservation |
| BR-STS-028 | commit前に全captured inodeを永続transaction backupへpromoteしcatalogをfsyncする。commit後のcaptured inodeを自動unlink/GCしない | open-FD write保持 |

## Rollback and recovery rules

| Rule | Invariant | Failure |
|---|---|---|
| BR-STS-030 | rollbackはapplied ordinalの逆順で、manifestを含むbefore snapshotへ復元する。現在targetも削除前にrollback quarantineへcaptureする | `rollback-failed` |
| BR-STS-031 | targetがafter digestならcaptureしてbackupをno-clobber restoreし、既にbefore digestならno-op。capture inodeを自動unlinkしない | idempotent recovery |
| BR-STS-032 | target/backup/stageがbefore/after以外のdigestなら自動変更せずblocked | `recovery-conflict` |
| BR-STS-033 | transactionが作成した空directoryだけを深い順に削除する | user directory保持 |
| BR-STS-034 | `commit-decided` recoveryはafter snapshotを検証してcleanupだけを再開する | `commit-state-diverged` |
| BR-STS-035 | recovery terminal後の同じrecoveryは`clean`でfilesystem diff 0 | NFR-REL-002 |
| BR-STS-036 | corrupt/multiple journalを推測で選択・削除せず、新transactionを拒否する | `journal-ambiguous` |

## Lock and path security rules

- BR-STS-040: lock ownerはnonce、PID、host digestを持ち、同一hostでPID不在を確認できる場合だけstale reclaimする。PID alive、permission不明、host mismatchは安全側にblockedとする。
- BR-STS-041: lock nonceを各mutation直前に再検証し、ownership loss後のmutationは0件とする。
- BR-STS-042: target-relative pathはnormalization後もroot配下で、空・`.`・`..`・absolute・NULを拒否する。
- BR-STS-043: ancestorまたはleaf symlinkをfollowしてtransaction root外へ到達しない。no-follow observationとbranded safe pathだけをmutation portへ渡す。
- BR-STS-044: journal parserはunknown schema/state/action、duplicate ordinal/path、非canonical path、invalid digestをfail-closedにする。
- BR-STS-045: diagnosticはrelative path、operation、check ID、digest prefixだけを返し、raw bytes/absolute home pathを返さない。

## Closed outcomes

`SetupTransactionRefusal`は`plan-invalid | target-conflict | transaction-busy | recovery-blocked | unsupported-target`、`SetupTransactionResult`は`committed | rolled-back | recovery-required | blocked`、`SetupRecoveryResult`は`clean | recovered-rolled-back | recovered-committed | blocked`のclosed unionである。

`committed`はcommit cleanupまで完了した場合だけ返す。`rolled-back`はbefore snapshot完全一致を検証した場合だけ返す。`recovery-required`はtransaction ID digest、durable phase、remediation check IDを持ち、成功exitへ変換しない。

## Verification rules

- Preflight property: action/permutation、case alias、symlink、digest mismatch、backup collisionでconflict countを網羅し、target payload/manifest/journal diff 0。
- Crash matrix: 全filesystem port callの直前/直後にkillし、commit decision前はbefore、後はafterへrecovery 1〜N回で収束する。
- Atomicity property: N→N+1 add/change/remove/preserve/backupのどのfailureでもNとN+1の混合集合をterminal successにしない。
- Fsync ordering: mutation intent receipt < mutation < directory fsync < applied receipt、全verification < commit decisionをassertする。
- Concurrency property: process 2〜4本でadmitted=1、busy=N-1、pending journal最大1。
- External-edit property: capture前後、最終revalidation直後、commit decision直前、cleanup直前/直後へopen-FD writeを注入し、target/committed backup/recovery artifactのいずれかにbytesが残ること、committed backup unlink 0を確認する。path replacement/create/symlink競合はcommit 0、rollback/recovery収束を確認する。
- Idempotency property: committed再installはplan noop、rollback/recovery再実行はfilesystem diff 0。
- Data-safety property: unknown digest、modified retired file、pre-existing backup、non-empty user directoryを自動上書き/削除しない。
- Recovery corruption property: truncated/unknown-version/duplicate/multiple journalでnew transaction 0、typed blocked 1。

## 上流トレーサビリティ

`unit-of-work`のtransaction safety制約、`unit-of-work-story-map`のfailure transparency/idempotency、`requirements`のFR-DST-001、`components`の唯一filesystem writer境界、`component-methods`のtyped refusal/result、`services`のfailure時atomic rollbackをbusiness invariantへ変換した。
