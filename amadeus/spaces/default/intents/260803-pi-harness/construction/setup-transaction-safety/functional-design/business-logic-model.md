# setup-transaction-safety — Business Logic Model

## 目的と責務境界

`SetupTransactionCoordinator`は既存setup `Plan`を、対象project上でrecover可能な`SetupTransactionPlan`へ正規化し、複数file、廃止managed file、利用者向けbackup、install manifestを一つのtransactionとして適用する。Pi payload、harness path、candidate versionの決定は所有せず、Pi以外のharnessにも同じ契約を適用する。

現行`Applier`の逐次copyと、その後に独立して行う`ManifestIo.write`はtransaction境界の内側へ移す。CLIはcoordinatorのclosed resultだけを解釈し、manifestだけを後から書いたり、失敗したentry以降を独自に再実行したりしない。

## Admission and mandatory recovery

1. install/upgrade/uninstall entrypointはtargetをrealpath化し、target identityをdevice/inode/realpath digestで固定する。存在しないfresh targetは作成予定parentのidentityとcanonical pathを固定する。
2. target identity単位の`SetupTransactionLockPort.withExclusive`を取得する。lock ownerはnonce、PID、host digestを持つ。alive owner、host不明、permission不明は`transaction-busy`で拒否し、同一hostのPID不在を確認できる場合だけstale lockを回収する。
3. lock内で`recoverSetupTransaction`を必ず先に実行する。未完了journalが0件なら`clean`、1件ならjournal stateに従いrollbackまたはcommit cleanup、複数件・不正schema・整合不能なら`blocked`である。
4. recoveryが`clean | recovered-rolled-back | recovered-committed`になった場合だけ新しいplanを受理する。`blocked`、I/O failure、lock lossではpayload/manifest mutationを0件にして終了する。
5. transaction中はowner nonceを各mutation直前に再検証する。lock ownershipを失ったprocessは後続mutationを止め、journalを残して`recovery-required`を返す。

## Planning and closed-world preflight

1. `planSetupTransaction(plan, target)`はPlan entryをcanonical relative path順へ並べ、`add | replace | preserve | backup-and-replace | remove`のclosed actionへ写像する。`remove`は旧install manifestにだけ存在するmanaged pathをdistribution側がPlanへ供給し、旧checksumと一致する場合だけ生成できる。
2. Planは各entryについて`expectedBefore = absent | {digest,class,mode}`と`candidate = absent | {sourceRef,digest,mode}`を公開するよう拡張する。既存`PlanEntry.md5`はcandidate digestへ移行し、upgrade classification時に読んだactual digestをexpectedBeforeへ保持する。coordinatorはpayload内容を再分類しない。
3. `CandidateManifestPort.prepare(plan)`はmutation前に新install manifest bytesとdigestを決定する。manifest自身を最後の`replace` actionとしてtransactionへ含める。manifest factory failureはwrite 0で拒否する。
4. exclusive lock内で全actionのtarget stateを一度に読む。path containment、symlink、file kind、before digest、backup destination collision、case-fold collision、duplicate path、manifest整合を検査する。1件でも不一致なら`conflict(entries)`を返し、managed file、manifest、staging、journalを作らない。
5. conflict-free snapshotへ`TransactionId`、plan fingerprint、entry ordinal、before/after fingerprintを付与する。同じtargetとplan fingerprintの再要求は、未完了transactionをrecoveryした後に新しいIDで再計画し、古いjournalを再利用しない。

lock file/directoryは排他に必要な一時coordination metadataであり、conflict時にも必ず解放する。「write 0」はcandidate、managed/user file、install manifest、transaction journal/stagingへのmutation 0を意味する。

## Write-ahead staging and journal

1. targetと同一filesystemの`amadeus/.installer/transactions/<transactionId>/`をexclusive createする。root/ancestor/leafのno-follow検査を行い、0700 directory、0600 fileを使用する。
2. `journal.json`をphase=`preparing`でatomic writeし、fileとparent directoryをfsyncする。crashで空directoryまたはjournal tempだけが残った場合、recoveryはtransaction rootの厳格な名前・owner metadata・内容集合を検証して安全なorphanだけを削除し、不明な内容はblockedにする。
3. 各candidate fileとcandidate manifestを`stage/<ordinal>`へcopyし、expected digest、size、modeを再検証する。stage完了ごとにentry stateを`staged`へ更新し、file、journal、directoryをfsyncする。source pathはjournalへ保存せず、recoveryはself-contained stagingだけを使う。
4. originalが存在するactionには`quarantine/<ordinal>`とcommit後の`backups/<transactionId>/<ordinal>`を予約する。利用者向け`.bk`を残す`backup-and-replace`だけはfinal backup pathもplanへ含め、すべてのdestination collisionをpreflightする。captured inodeはいずれかの永続backup pathでcommit後も保持する。
5. 全stage hash検証後にjournal phaseを`prepared`へdurableにする。`prepared`前のfailureはtarget payloadを未変更のままtransaction metadataをcleanupし、cleanup不能なら`recovery-required`を返す。

## Apply, verify, and commit

1. entryをcanonical ordinal順に処理する。`replace | backup-and-replace | remove`ではjournalへ`capture-intent`をfsyncした後、現在target pathをprivateな`quarantine/<ordinal>`へatomic renameする。quarantine destinationは0700 transaction directory内の一意pathで、事前にabsenceを検査し、外部writerへ公開しない。renameはその瞬間にpathにあったfileを丸ごと捕捉するため、検証とrenameの間にdigest-CASがあるとは仮定しない。
2. 捕捉後にquarantineのkind、file identity、digest、size、modeをPlan.beforeと照合する。一致しなければcandidateを配置せず、`restoreNoReplace`でquarantine inodeをtargetへhard-linkしてからquarantine linkを外す。targetが既に占有されて復元できない場合は両方を上書きせず、quarantineを`recovery-artifact`としてjournalとdiagnosticに残してblockedにする。未知contentは自動削除しない。
3. `add`とoriginal捕捉済みの`replace | backup-and-replace`は、staged inodeをtargetへhard-linkする`installNoReplace`を使う。これはtargetが存在すれば`occupied`を返して既存contentを変更しない。成功後にstage linkだけを外し、target directoryをfsyncする。跨filesystem copyとoverwrite renameは許可しない。
4. `occupied`、captured mismatch、I/O failureでは当該外部contentを保持したまま既適用entryのrollbackへ遷移する。rollbackのrestoreもhard-link no-clobberであり、占有targetを上書きできない場合はoriginal quarantineをrecovery artifactとして保持して`recovery-required`にする。
5. rename/link後・journal更新前にcrashしても、entryのbefore/after digestとstage/quarantineの所在が有限状態を一意にする。recoveryは保存済みstateを盲信せずfilesystem observationと照合し、同じcapture/installを二重実行しない。
6. managed entryをすべて適用後、candidate manifest actionを最後に同じcapture/install手順でatomic replaceする。続いて`TransactionVerifierPort.verify(plan)`が全candidate digest、remove absence、preserve bytes、利用者向けbackup、manifest digestに加え、全quarantineの存在とinode identityを確認する。captured inodeへの遅延writeを検出してもそのinodeをunlinkしない。
7. verification成功後、すべてのcaptured inodeを`amadeus/.installer/backups/<transactionId>/<ordinal>`へatomic renameする。`backup-and-replace`は既決の利用者向け`.bk` pathを使い、それ以外はtransaction backup pathを使う。original relative path、capture時digest、inode identity、backup relative pathを持つ`CommittedBackupCatalog`をatomic write + fsyncし、各captured inodeに永続pathがあることを検証する。これはcommitの必須前処理である。
8. backup promotion成功後だけjournalへphase=`commit-decided`をfsyncする。これが唯一のcommit pointである。以後のcrash recoveryはrollbackせず、stage/tempだけをcleanupしphase=`committed`、journal removal、transaction directory removal、parent fsyncまで完了する。committed backupはcleanup対象外で、自動GCしない。open済みFDからcommit直前・直後に書かれても同inodeのbackup pathが残る。
9. commit decision前のfailureは直ちに逆順rollbackを試みる。backup promotion後・decision前にfailureした場合、rollbackはbackup pathからno-clobber restoreする。commit decision後のcleanup failureは成功へ丸めず、`recovery-required(commit-cleanup)`を返す。次回recoveryがcleanupを完了した後にだけ新transactionを受理する。

## Reverse rollback and interruption recovery

rollbackは最大ordinalから逆順に、journal stateとfilesystem observationの積で決定する。

| Before | After | Observed state | Recovery action |
|---|---|---|---|
| absent | file digest A | target=A | target Aをrollback quarantineへcaptureし検証後もtransaction/recovery artifactとして保持 |
| absent | file digest A | target absent | already restored |
| file digest B | file digest A | backup=B, target=A/absent | target Aをrollback quarantineへcaptureし、backup Bをno-clobber restore。Aもcleanupでunlinkしない |
| file digest B | absent | backup=B, target absent | backup Bをrestore |
| file digest B | any | target=B, backup absent | already restored |
| any | any | target/backup/stageが既知digest以外 | `recovery-conflict`で停止し自動削除しない |

各復元後にbefore stateをdigest/absenceで検証し、entryを`rolled-back`へfsyncする。作成directoryはtransactionが作成した記録があり、空である場合だけ深い順に削除する。全entry復元後にmanifestのbefore stateも確認し、phase=`rolled-back`をdurableにしてtransaction metadataを削除する。rollback途中の再crashは同じ規則を再適用して収束する。

`commit-decided` journalでは全after stateを再検証する。after stateが完全ならcleanupを再開し、欠落・未知digestなら`commit-state-diverged`としてblockedにする。commit decisionをrollbackへ読み替えない。

## Failure, concurrency, and security scenarios

| Scenario | Outcome |
|---|---|
| preflight conflict | typed conflict、payload/manifest/journal mutation 0 |
| concurrent setup | 1 ownerだけadmit、他は`transaction-busy` |
| preflight後・capture前の外部編集/path replacement | 原子的にquarantineへ捕捉後検証、不一致はno-clobber restoreまたはartifact保持、commit 0 |
| expected-absent pathへの外部create | installNoReplaceがoccupied、外部content保持、commit 0 |
| write/rename/fsync failure before commit | reverse rollback。完了不能なら`recovery-required` |
| process kill at any apply boundary | 次回起動でbefore bytesへ収束 |
| process kill after commit decision | 次回起動でcommit cleanupへ収束 |
| same recovery twice | 2回目は`clean`、target diff 0 |
| capture済みinodeへのopen-FD write | commit前検知ならrollback、最終検証後ならcommitted backup inodeへ残り自動削除0 |
| targetまたはbackupの未知digest | 自動上書き/削除せず`recovery-conflict` |
| symlink/path traversal/case collision | preflight refusal、target外mutation 0 |
| corrupt/multiple journal | new transaction拒否、path/digestだけのremediation |
| user-visible backup collision | preflight conflict、既存backup保持 |

journalにはrelative path、digest、size、mode、ordinal、stateだけを保存し、payload bytes、home絶対path、tokenを含めない。error detailもtarget-relative pathへredactする。transaction root外のremove/renameはbranded `SafeTargetPath`なしではportへ渡せない。

## Verification model

- State-machine property: `preparing → prepared → applying → commit-decided → committed`または`rolling-back → rolled-back`以外の遷移を拒否する。
- Failure injection: mkdir、journal write/rename/fsync、stage copy、backup rename、target rename、verify、cleanupの全call ordinalでfailure/killを注入し、commit前はbefore snapshot、commit後はafter snapshotへ収束させる。
- N→N+1 property: add/change/unchanged/retired/modified-managed/user-preserved/shared-backupの積で、競合時全target bytes不変、成功時candidate一致、rollback時before一致を確認する。
- Replay property: recoveryを1〜3回実行して結果とfilesystem digest集合が不変である。
- Concurrency property: 2 processをbarrierでpreflightへ同時到達させ、transaction admission最大1、journal最大1にする。
- External-edit property: preflight後の各entryについてcapture前後、最終revalidation直後、commit decision直前、cleanup直前/直後にopen-FD same-inode writeを、capture/install前にpath replacement、expected-absent create、symlink replacementを注入する。外部bytesはtarget、committed backup、recovery artifactのいずれかに必ず残り、captured inodeの自動unlink 0とする。commit前に観測した競合はterminal success 0、最終観測後のwriteはcommitted backupで保持する。
- Security property: traversal、absolute path、symlink ancestor/leaf、case-fold alias、malformed journalでtarget外mutation 0にする。
- Durability trace: fake portが各mutation前のjournal fsync、rename後のdirectory fsync、commit decision fsync順序を証明する。

## 上流トレーサビリティ

`unit-of-work`のgeneric setup transaction ownership、`unit-of-work-story-map`のFR-DST-001とNFR-REL-002〜003、`requirements`のfresh/update/idempotent install・廃止管理対象・利用者file保持・atomic rollback、`components`のpreflight/staging/journal/backup境界、`component-methods`のrecover/plan/apply closed result、`services`の逐次短命transactionを実行可能なworkflowへ具体化した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:59:45Z
- **Iteration:** 1
- **Scope decision:** none

クラッシュ回復は閉じているが、preflight後の外部編集を上書きできるTOCTOUが残る。

### Findings

- BLOCKER | target-exclusive lockが協調するsetup実行だけを排他する一方、conflict判定はjournal/stagingより前のpreflight一度だけであるため、preflight後から各rename/remove直前までにユーザーや非協調プロセスが対象を変更すると、その新しい内容をbackupへ移してafter内容をcommitし、成功時にユーザー編集を失わせ得る。各mutationのWAL記録後かつ実操作直前に、no-followで再解決した対象のkind・identity・digestがPlan.beforeと一致することを検証し、不一致ならそのmutationを行わずrollbackへ移るCAS相当契約が必要である。対象不在を期待するcreateも直前の不在確認を同じ規則に含め、preflight後編集との競合propertyを追加する必要がある。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:02:18Z
- **Iteration:** 2
- **Scope decision:** none

境界時点の再検証は追加されたが、非協調writerに対するcompare-and-mutate原子性がmacOS/Linuxで実装不能な抽象のまま残る。

### Findings

- BLOCKER | AtomicMutationPort.compareAndMutateはkind・device/inode・digest等の検証とrename/removeを、非協調プロセスのpath replacementやsame-inode writeに対して単一原子操作として実行し、precondition-lost時は対象を一切変更しないと要求している。しかしmacOS/Linuxの通常のfilesystem APIには、内容digestまたはinode identityを条件にしたrename/remove CASはなく、no-followで検証してからmutationする間の競合を排除できないため、この契約は実装不能である。実装可能な契約として、no-clobber renameで現対象をtransaction-owned quarantineへ原子的に捕捉してからidentity/digestを検証し、不一致時は捕捉物を削除せず復元またはuser-visible recovery artifactとして保持する方式へ変更するか、全writerが同じlockへ協調することを明示的な安全前提に限定する必要がある。

## Review — Iteration 3

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:05:24Z
- **Iteration:** 3
- **Scope decision:** none

capture-first方式でpath置換競合は閉じたが、捕捉inodeへの継続書込みをcommit時cleanupが失わせる競合が残る。

### Findings

- BLOCKER | destructive actionが対象をquarantineへrenameしても、外部writerがcapture前から開いていたfile descriptorは同じinodeへ書込みを継続できる。commit前のquarantine再検証後からcommit-decidedまたはinternal quarantine削除までにその書込みが起きると、検証を通過した後の新しい外部bytesをcleanupがunlinkして失わせるため、「same-inode write時はbytesがtargetまたはartifactに残りcommit=0」を全競合順で満たせない。非協調writerの終了を検出するportableな方法はないため、captureした既存inodeを成功時にもuser-visible backupとして保持する、または同じlockに協調するwriterだけを保証対象と明記する必要がある。少なくとも最終revalidation直後・commit-decided直前・cleanup直前/直後へのopen-fd writeを検証propertyへ加える必要がある。

## Review — Iteration 4

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:07:18Z
- **Iteration:** 4
- **Scope decision:** none

capture済みinodeの永続backup保持によりopen-FD競合を含むデータ保全が閉じ、循環依存・契約矛盾・実装不能・上流要件漏れを認めない。

### Findings

- None
