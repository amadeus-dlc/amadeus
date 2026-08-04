# setup-transaction-safety — Domain Entities

## Modelling policy

transaction domainはsetup package内のTypeScript discriminated union、pure parser/reducer、filesystem portで表す。database、daemon、Pi専用transaction実装を追加しない。既存`Plan`、`Manifest`、`ApplyWrite`は互換adapterを経て段階的にcoordinatorへ統合し、CLIから旧non-transactional apply pathを残さない。

## Identity and safe path values

| Value | Construction | Invariant |
|---|---|---|
| `TargetIdentity` | realpath + device/inodeまたはfresh parent identity + canonical pathのdigest | transaction中不変 |
| `TransactionId` | 256-bit CSPRNG | target内で一意、pathに安全なencoding |
| `PlanFingerprint` | sorted action、relative path、before/after digest、manifest digest | raw bytesなし、順序決定的 |
| `LockOwnerToken` | transaction nonce + PID + host digest | mutation前に一致検証 |
| `SafeRelativePath` | strict parser | absolute、escape、NUL、`.`/`..`なし |
| `SafeTargetPath` | target identity + no-follow containment check | mutation portだけが受理 |
| `FileIdentity` | no-follow statのdevice/inode/typeと観測nonce | path replacementを検出 |
| `ContentDigest` | `sha256:<hex>` parser | lower-case fixed length |
| `EntryOrdinal` | canonical path順の0始まり整数、manifestは最後 | duplicate/gapなし |

`TargetIdentity`の再観測が変わった場合はtarget replacementとしてblockedにする。case-insensitive filesystemではcase-fold keyも一意でなければならない。

## Transaction plan and snapshots

```ts
type FileSnapshot =
  | { kind: "absent" }
  | { kind: "file"; identity: FileIdentity; digest: ContentDigest; size: number; mode: number };

type TransactionAction =
  | { kind: "add" }
  | { kind: "replace" }
  | { kind: "preserve" }
  | { kind: "backup-and-replace"; finalBackupPath: SafeRelativePath }
  | { kind: "remove" };

type SetupTransactionEntry = {
  ordinal: EntryOrdinal;
  path: SafeRelativePath;
  action: TransactionAction;
  class: "owned" | "shared" | "user-preserved" | "manifest";
  before: FileSnapshot;
  after: FileSnapshot;
  candidateRef: string | null;
  required: boolean;
};
```

`SetupTransactionPlan`はtransaction/target/plan identity、sorted entries、candidate manifest bytes reference、created directory候補、backup retention、preflight snapshot versionを持つimmutable aggregateである。`candidateRef`はplanning process内だけのopaque referenceで、journalにはstage ordinalだけを保存する。

既存`Plan`はtransaction adapterが次を要求するよう拡張する。

- candidate fileのafter digestだけでなく、classification時のexpected-before absence/digestを保持する。
- 旧manifestにのみあるmanaged pathを`remove` entryとして列挙する。
- preserve/shared backupの意図を明示し、coordinatorがfile classを再推測しない。
- manifest factoryに渡すcandidate file集合とinstall metadataを公開する。

Pi candidate内容とharness pathはPlan producerの責務であり、coordinatorはこれらを解釈しない。

## Journal aggregate and state machine

`SetupTransactionJournalV1`は次を持つ。

```ts
type TransactionPhase =
  | "preparing" | "prepared" | "applying"
  | "rolling-back" | "rolled-back"
  | "commit-decided" | "committed";

type EntryState =
  | "planned" | "staged" | "apply-intent" | "applied"
  | "rollback-intent" | "rolled-back" | "cleanup-complete";
```

journal headerは`schemaVersion=1`、transaction ID、target/plan fingerprint、phase、lock owner digest、created/updated timestampを持つ。entry recordはordinal、safe relative path、action、before/after snapshot、stage/backup relative location、backup retention、state、last observationを持つ。timestampやerror detailはidentityに使わない。

許可遷移は以下である。

```text
preparing -> prepared -> applying -> commit-decided -> committed
                          |     |
                          +-> rolling-back -> rolled-back
```

`commit-decided`からrolling-backへの遷移、rolling-backからcommitへの遷移は禁止する。journal storeはwhole-document atomic replace、file fsync、parent fsyncを一つのreceiptとして返す。

## Filesystem observations and recovery decisions

`EntryObservation`はtarget、stage、pending quarantine、committed backup、final backupそれぞれを`absent | known-before | known-after | other-file | non-file | io-failed`へ正規化する。raw bytesをdomainへ渡さない。

`RecoveryDecision`はpure reducerである。

- `already-before`: mutationなしでrolled-backへ進める。
- `remove-after`: after digestのtargetだけを削除する。
- `restore-backup`: before digestのbackupだけをtargetへ戻す。
- `finish-after`: commit-decided時に既知after stateのcleanupだけを行う。
- `blocked`: unknown digest、missing required backup、target identity change、ambiguous state。

recoveryのdestructive decisionもtargetをrollback quarantineへatomic captureしてから内容を判定し、事前観測とmutationの原子CASを仮定しない。candidate afterと一致するcaptureだけをtransaction metadataとして処理し、異なるcaptureはno-clobber restoreまたはrecovery artifact保持とする。

`CaptureOutcome`は`captured(quarantineObservation) | absent | failed(code)`である。destructive actionはWAL receipt後にpathのcurrent inodeをprivate quarantineへatomic renameし、捕捉後のobservationをexpected-fileと比較する。digest条件付きrename/remove CASは要求しない。mismatch時の`RestoreOutcome`は`restored | target-occupied | failed`で、occupied時はquarantine linkを残す。

`InstallNoReplaceOutcome`は`installed | occupied(observation) | failed`である。same-filesystem stage/quarantine inodeからtargetへhard linkを作るため、既存targetを上書きしない。link成功後だけsource linkを外す。recovery artifactはtransaction ID/ordinal、captured observation、original relative path、remediation IDを持ち、unknown contentが自動cleanup対象にならないことを型で区別する。

## Backup, staging, and manifest entities

`StagedCandidate`はordinal、stage relative path、digest、size、mode、fsync receiptを持つ。すべてtarget-local transaction root内にあり、prepared後のrecoveryは元payloadへ依存しない。

`BackupRecord`は`absent-marker | pending-quarantine | committed-backup | user-visible | recovery-artifact`である。pending quarantineはcommit decision前に必ずcommitted backupまたはuser-visible backupへpromoteする。captured mismatchや占有により復元不能なcontentはrecovery artifactへ遷移する。いずれもcaptured inodeを自動削除しない。

`CommittedBackupCatalog`はschema/version、transaction ID、各ordinalのoriginal relative path、capture時digest、file identity、backup relative path、retention=`manual`を持つ。catalogと全backup linkのfsync receiptが揃わなければcommit decisionへ進めない。backup contentはopen済みFDから後で変化し得るため、capture時digestはprovenanceであってcleanup許可条件ではない。automatic GC APIは本Unitに存在せず、利用者が明示的に管理する。

`CandidateManifest`はserialized bytes、digest、file entry集合、distribution/installer metadataを持つ。`ManifestTransactionEntry`として最大ordinalに固定し、managed fileと別transactionにしない。current manifestは通常fileと同じbefore snapshot/backup規則に従う。

## Lock and transaction directory entities

`TransactionLock`は`held | busy | stale-reclaimable | blocked`のclosed unionである。heldにはowner tokenとtarget identity、busyにはredacted owner facts、stale-reclaimableには同一host PID不在のprobe receipt、blockedにはhost/permission/metadata ambiguityを持つ。

transaction layoutは固定する。

```text
amadeus/.installer/transactions/
  <transaction-id>/
    journal.json
    stage/<ordinal>
    quarantine/<ordinal>
amadeus/.installer/recovery/
  <transaction-id>/<ordinal>
amadeus/.installer/backups/
  <transaction-id>/catalog.json
  <transaction-id>/<ordinal>
```

許可されるfile集合以外、symlink、device、socket、nested transaction directoryを検出した場合は自動cleanupしない。transaction directoryとjournal tempのowner/mode/schemaを検証できる場合だけorphan cleanupできる。

## Public results and failure codes

```ts
type SetupTransactionResult =
  | { kind: "committed"; transactionDigest: string; manifestDigest: string }
  | { kind: "rolled-back"; transactionDigest: string; cause: SetupFailureCode }
  | { kind: "recovery-required"; transactionDigest: string; phase: TransactionPhase; cause: SetupFailureCode }
  | { kind: "blocked"; code: SetupFailureCode; checkId: string; paths: readonly string[] };

type SetupRecoveryResult =
  | { kind: "clean" }
  | { kind: "recovered-rolled-back"; transactionDigest: string }
  | { kind: "recovered-committed"; transactionDigest: string }
  | { kind: "blocked"; code: SetupFailureCode; checkId: string };
```

主要failure codeは`transaction-busy | stale-lock-ambiguous | recovery-blocked | journal-invalid | journal-ambiguous | plan-invalid | target-conflict | target-identity-changed | path-unsafe | symlink-unsafe | cross-device-transaction | manifest-prepare-failed | stage-failed | stage-verification-failed | backup-failed | apply-failed | journal-write-failed | fsync-failed | verification-failed | rollback-failed | recovery-conflict | commit-state-diverged | cleanup-pending | lock-lost`のclosed unionである。

## Ports and ownership

| Port | Operations | Must not own |
|---|---|---|
| `SetupTransactionLockPort` | acquire、owner recheck、safe stale reclaim、release | transaction phase |
| `TargetObservationPort` | target identity、no-follow lstat、digest/mode、case semantics | action classification |
| `TransactionStorePort` | exclusive dir create、journal atomic write/fsync、list pending、safe cleanup | payload generation |
| `StagePort` | candidate copy、hash verify、file fsync | target apply |
| `QuarantineMutationPort` | atomic capture rename、capture検証、hard-link `installNoReplace` / `restoreNoReplace`、stage/temp cleanup、directory fsync | digest CAS、overwrite rename、captured inode deletion |
| `CandidateManifestPort` | Planからcandidate manifestをprepare | manifest commit順序 |
| `TransactionVerifierPort` | after/before snapshot集合の全件検証 | mutation、repair |
| `ClockAndIdPort` | UTC time、CSPRNG transaction/owner token | global mutable ID |

`SetupTransactionPorts`は上記portをexplicit fieldで受ける。production adapterはNode/Bun filesystemを使い、test adapterは全call ordinalでfailure/killを注入できる。既存`ApplyWrite`はmigration中のcompatibility adapterとしてのみ使い、copy後manifest writeという旧public pathはcoordinator配線完了時に削除する。

## 上流トレーサビリティ

`unit-of-work`のPlan/Applier/ApplyWrite再利用、`unit-of-work-story-map`のtransaction failure/recovery fixture ownership、`requirements`のN→N+1と利用者変更保護、`components`のSetupTransactionCoordinator単独ownership、`component-methods`の3 public method、`services`の1 invocation/1 transaction lifecycleをdomain modelへ落とした。
