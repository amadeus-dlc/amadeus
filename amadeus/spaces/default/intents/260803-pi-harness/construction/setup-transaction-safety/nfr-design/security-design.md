# Setup Transaction Safety — Security Design

## 適用範囲

本設計は既存setup `Plan`を、複数managed file、廃止file、利用者backup、install manifestを含むrecoverable local transactionとして適用する境界を保護する。engine-resolved inputは `business-logic-model` のみで、条件付きの `security-requirements` / `tech-stack-decisions` は期待どおり不在である。新しい要件やcloud serviceは作らない。

Pi payload/harness path/candidate versionの決定、Pi project trust、package supply chainは別Unitの責務である。本Unitはcandidate bytesを信頼済みとせずdigest検証するが、その意味内容を再分類しない。

## Assets and trust boundaries

| Asset / boundary | Authority | Untrusted input |
|---|---|---|
| Target project tree | current filesystem observation | symlink、path replacement、open-FD write、foreign file |
| Setup Plan | upstream planner closed union | raw path、duplicate/collision、stale `expectedBefore` |
| Candidate bytes/manifest | prepared digest + staged observation | source swap、partial read、wrong mode |
| Transaction journal | durable phase + observed filesystem cross-check | corrupt schema、forged state、multiple journal |
| Setup lock | nonce/host/PID/file identity | stale PID、PID reuse、foreign host |
| Original user bytes | captured inode in quarantine/backup | concurrent write、restore destination occupied |
| CLI result | coordinator closed result | exception text、absolute path、payload content |

setup processはtarget ownerと同じOS user権限で動き、sandboxではない。same-userによるtransaction module自体の改ざんは境界外だが、同一userの非協調editor/processによる正常な競合は境界内であり、bytesを自動削除・上書きしない。

## Target identity and path containment

target projectはopen時にcanonical realpath、device/inode、owner、root file descriptor相当のidentity viewを固定する。fresh targetはexisting parentのidentityとcanonical child nameを固定し、作成後に再照合する。

各Plan pathはUTF-8、NULなし、absoluteなし、空segmentなしのnormalized relative pathへparseする。次を拒否する。

- `..` root escape、platform separator ambiguity、reserved names
- Unicode normalization/case-fold alias、duplicate destination
- transaction metadata rootまたはlock pathとのcollision
- symlink ancestor/leaf、device、socket、FIFO、unexpected directory
- backup destination、manifest path、managed path間のcollision

各mutation直前にrootからno-followで再解決する。ただし検証とmutationがdigest CASになるとは主張しない。外部path replacementはatomic capture後のinode/digest検証とno-clobber restoreで扱う。transaction root外のremove/rename/link portはbranded `SafeTargetPath`なしでは呼べない。

hard linkは同一filesystem、regular file、owner/mode policy、link count policyを検証する。既存source inodeへのforeign hard linkを完全には防げないため、captured inodeはcommit後もowner-only backupへ残し、自動unlinkしない。

## Cooperative lock security

`SetupTransactionLockPort`はtarget identity digest単位のowner-only lock directoryをexclusive createする。owner recordはschema version、CSPRNG nonce、PID、host digest、process start identity、target identity、created timeを持ち、file/parentをfsyncする。

- alive owner、foreign/unknown host、permission error、malformed ownerはbusy/blocked。
- same-hostでPID不存在かつprocess start identity不一致を検証できる場合だけstale recovery候補にする。
- PID単独、mtime timeout単独、kill signal probe成功/失敗単独でlockを奪わない。
- stale recoveryもtransaction journal recoveryと同じexclusive ownership内で行う。
- 各filesystem mutation直前にnonceとlock directory identityを再検証し、loss時は後続mutationを停止する。

lockはsetup processだけの協調排他であり、一般のeditorや外部processを止めるsecurity boundaryではない。

## Closed-world preflight

lock取得とmandatory recovery後、全actionを一度に検証する。candidate manifest bytes/digestをこの時点で準備し、manifestを最後のtransaction actionへ含める。

preflightはtarget relative path、file kind、digest、size、mode、backup collision、manifest consistency、candidate source snapshotを検査する。一件でも不一致ならcandidate/managed/user file、manifest、journal、stagingを変更しない。lock metadataの作成・解放だけはこのwrite-zero定義の外である。

candidate sourceはregular file/no-follow、source root containment、read前後identity、digest/size/modeを検証する。source absolute pathやcredentialをPlan/journalへ保存せず、stage完了後のrecoveryはself-contained staged bytesだけを使う。

## Transaction root and journal integrity

`PrivateInstallerRootResolver`はtargetと同一filesystem、かつcanonical working tree / package root外のmachine-local rootをmutation前に確定する。Git repositoryではresolved Git administrative directory配下のowner-only Amadeus rootを優先し、Git worktreeの`.git` marker文字列をpathとして盲信しない。Git administrative directoryが別filesystem、unavailable、foreign owner、symlink、またはpolicy上利用不能なら、targetのexisting parent配下にtarget identity digestで名前付けしたowner-only private sibling rootを使う。どちらも確保できなければpreflight failureであり、capture/stage/journal mutationは0である。

private rootは次をすべて満たす。

- `realpath`がcanonical target / package / generated distribution rootの外側。
- targetと同じdeviceで、atomic rename/hard-link probeが成功する。
- ancestor/leafがno-follow、same owner、directory 0700。fileは0600。
- Git tracked/untracked working-tree inventory、archive candidate、package/generator input inventoryからpath/contentが到達不能。
- framework artifact catalog、doctor/status artifact list、audit collection rootの外側。

外部のwhole-disk backupやsame-user administratorによる明示読取を防ぐsandboxは提供しない。一方、通常のGit add/archive、package/generator、Amadeus artifact collectionからは構造的にworking tree外とし、ignore fileだけに依存しない。package/generator側にもdefence-in-depthのreserved private-root basename denylistを持たせ、将来のroot relocationでworking tree内へ混入した場合はbuildをfailさせる。

Functional Design上の論理的な `amadeus/.installer/transactions` / `backups` はこのprivate installer storage port内のnamespaceとして扱い、canonical target working tree内へmaterializeしない。transaction rootはprivate root配下へexclusive createし、directory 0700、file 0600、no-follow、same ownerを必須にする。transaction IDはCSPRNGで、strict canonical name以外をscan対象にしない。

`journal.json`はclosed/versioned schemaでparseし、unknown field、unknown phase/entry state、duplicate ordinal/path、path escape、digest format不正、phase逆行を拒否する。更新はsame-directory tempへのwrite、fsync、atomic rename、parent fsyncの順で行う。journal stateだけを信頼せず、stage/quarantine/target/backupのactual kind、digest、inode identityと突合する。

空directoryやtemp-only orphanはowner、strict name、内容allowlist、transaction root containmentをすべて確認した場合だけ削除する。unknown file、symlink、foreign owner、複数journal/transactionはblockedにし、recursive deleteへ渡さない。

journalにはrelative path、ordinal、state、digest、size、mode、opaque file identityだけを保存する。payload本文、home絶対path、username、token、credentialを含めない。digestは機密化ではないためaudit/CLIへfull digestを出さず、machine-local journal以外ではopaque transaction IDまたは短いdiagnostic prefixだけを使う。

## Capture-first mutation controls

既存targetを変更するactionは次の順序を崩さない。

1. `capture-intent`をjournalへdurable writeする。
2. current target pathをprivate quarantineへatomic renameして、rename時点のinodeを丸ごと捕捉する。
3. quarantineのregular kind、identity、digest、size、modeを`expectedBefore`と照合する。
4. mismatchならcandidateを配置せず、hard-link no-clobberでtargetへrestoreする。
5. restore先occupiedなら双方を上書き・削除せず、captured inodeをrecovery artifactとして保持してblockedにする。
6. match時だけstaged inodeをhard-link no-clobberでtargetへinstallし、directoryをfsyncする。

expected-absent `add`もno-clobber installだけを使い、外部createをoverwriteしない。跨filesystem copy、overwrite rename、blind unlink、recursive removeは禁止する。

capture後も既存open file descriptorは同inodeへ書ける。したがってcaptured inodeは最終verification後にowner-only committed backup pathへatomic promotionし、`CommittedBackupCatalog`のdurable writeとinode existence確認後だけcommit decisionを記録する。commit success後もbackupは自動GC/cleanupしない。

## Backup confidentiality and retention

transaction quarantine、rollback artifact、committed backup rootは0700 directory、0600 regular fileを使用し、symlinkを許さない。利用者向け `.bk` はPlanで既決のpath/mode policyに従うが、collision時にoverwriteしない。

backup catalogはoriginal relative path、capture時digest、opaque inode identity、private-root-relative backup ID、transaction IDだけを持つ。original file本文、absolute target、private root path、usernameを持たない。backupにはprovider configやcredentialが含まれ得るため、CLI/audit/doctor/status/artifact catalog/test snapshotへpathまたは内容を読み出さない。doctor/statusはopaque transaction ID、件数、容量bucket、remediation codeだけを返す。

retention/purgeは本transaction成功経路から切り離す。明示purgeを将来提供する場合もcurrent target/manifest、catalog ownership、backup digest、no-followを再検証し、unknown/modified backupを削除しない。本Unitでは自動期限削除を実装しない。

## Recovery and rollback security

recoveryはjournal phaseとactual filesystem observationの積からclosed actionを選ぶ。known before/after/stage/quarantine/backup identityに一致するstateだけを処理し、未知digest、missing required backup、occupied restore target、commit-decided divergenceはblockedにする。

- commit decision前はreverse ordinal rollbackを試みる。
- rollbackもcandidateをprivate quarantineへcaptureし、known after digestを確認してからoriginalをno-clobber restoreする。
- candidateやunknown bytesをunlinkせずrecovery artifactとして保持する。
- commit-decided後はrollbackへ戻さず、after state完全一致時だけcleanupを再開する。
- rollback/recoveryを繰り返しても同じstateへ収束し、二重capture/installを行わない。

created directoryはtransactionが作成したdurable recordがあり、no-followで同identity、空である場合だけ深い順に削除する。

## Threat matrix

| Threat / failure | Control | Negative verification |
|---|---|---|
| traversal / symlink escape | branded relative path、root no-follow | absolute/`..`/ancestor/leaf symlinkでtarget外mutation 0 |
| case/Unicode collision | canonical normalization + closed-world set | alias pairでjournal/stage write 0 |
| stale/PID-reused lock奪取 | nonce/host/process-start/file identity | live/reused/foreign hostでadmission 0 |
| preflight後path replacement | capture-first + post-capture verify | foreign inode保持、commit 0 |
| expected-absentへの外部create | install no-clobber | foreign bytes不変、rollback収束 |
| open-FD same-inode write | permanent committed backup inode | target/backup/artifactのいずれかにbytes残存 |
| forged/corrupt journal | closed schema + actual observation | unknown state/multiple journalでmutation 0 |
| staged source swap | read前後identity + digest verification | candidate publish/install 0 |
| restore先occupied | no-clobber restore | target/quarantine双方保持、blocked |
| backup内容漏洩 | owner-only storage + metadata-only diagnostic | secret canaryがaudit/CLI/journal metadata外で0件 |
| Git/packageへのbackup混入 | same-FS working-tree外private root + package denylist | git status/ls-files/archive/package inventoryでpath/content 0件 |
| commit decision喪失 | backup catalog/decision fsync ordering | crash traceがbeforeまたはafterへ収束 |
| cleanupでunknown content削除 | strict allowlist/identity | orphan foreign file保持、blocked |

## Failure policy

| Failure | Result | Mutation policy |
|---|---|---|
| Preflight conflict | typed conflict | payload/manifest/journal/stage 0 |
| Lock uncertainty/loss | busy/recovery-required | subsequent mutation 0 |
| Journal/schema ambiguity | blocked | automatic recovery/delete 0 |
| Capture mismatch | rollback/recovery artifact | candidate install 0 |
| Install occupied | rollback | external target overwrite 0 |
| Restore occupied | recovery-required | target/quarantine overwrite/delete 0 |
| Verify/backup promotion failure | rollback or recovery-required | commit decision 0 |
| Commit-decided cleanup failure | recovery-required(commit-cleanup) | rollback 0/new transaction 0 |

## Verification gate

- real filesystemでabsolute/traversal/NUL/case-fold/Unicode/symlink/device/FIFO/hardlink fixturesをproduction path parserへ通す。
- two-process barrierでlock admission最大1、PID reuse/foreign host/permission unknownでstale steal 0を確認する。
- mkdir、journal temp/write/rename/fsync、stage copy、capture rename、install link、verify、backup promotion、catalog/decision/cleanupの全ordinalへfailure/killを注入する。
- preflight後のpath replacement、expected-absent create、capture前からのopen-FD writeを各mutation境界へ注入し、外部bytesがtarget/backup/artifactのいずれかに残ることを確認する。
- corrupt/duplicate journal、unknown orphan、restore occupied、commit-decided divergenceで自動overwrite/delete 0を確認する。
- recoveryを1〜3回反復し、filesystem digest/identity集合とclosed resultが不変であることをproperty testする。
- payload、provider credential、home pathのcanaryをmanaged fileへ置き、audit/CLI/error/catalog/journal metadataに本文が0件であることをscanする。
- Git administrative rootとparent sibling rootの両profileで、`git status --untracked-files=all`、tracked inventory、archive candidate、production package/generator inventory、artifact catalogにtransaction/quarantine/backup path/contentが0件であることを確認する。private rootをworking tree内へmutationしたfixtureはcapture前またはpackage drift guardで必ずredにする。

検証はjournalの自己申告phaseだけでなく、actual target/stage/quarantine/backup inodeとdigest、fsync trace、manifest bytesから判定する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:00:54Z
- **Iteration:** 1
- **Scope decision:** none

transaction durabilityは一貫しているが、credentialを含み得る永続backupがSCM/packageへ流出する境界が閉じていない。

### Findings

- BLOCKER | captured inodeをtarget-local persistent backupとして自動GCせず保持し、内容にcredentialが含まれ得ると明記している一方、owner-only mode以外にGit staging・archive・package/generator・backup uploadから除外する契約がない。0600/0700は同一userで動くGitやpackagerには効かないため、通常の再帰的add/packageでsecret-bearing backupがrepositoryや配布物へ混入し得る。backup rootをGit administrative領域などSCM対象外かつ同一filesystemのmachine-local rootへ置くか、repository ignore・package denylist・generated inventory exclusionをtransaction作成前に検証し、除外不能ならcapture前にfail-closedとする必要がある。backup path/contentがaudit・doctor・status・artifact catalogへ出ないことと、Git/package inclusion mutation testも必要である。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:02:46Z
- **Iteration:** 2
- **Scope decision:** none

private installer rootがworking tree・package・generated artifact境界の外かつsame-filesystemへ強制され、credential-bearing persistent backupのSCM/配布物流出経路は閉じている。

### Findings

- None
