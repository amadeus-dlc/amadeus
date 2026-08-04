# Business Logic Model — codex-live-walking-skeleton

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U01はC1〜C4/C7〜C9の共通production kernel、Codex C5 adapter、Codex C6 journey specificationを1つのvertical walking skeletonとして実装する。

## End-to-End Workflow

`runLiveJourney`は次の一方向pipelineを実行する。

| Step | Operation | Success output | Failure behavior |
|---|---|---|---|
| 1 | registryから`codex-exec` capabilityを解決 | typed capability | 未知・重複・不正entryはcontract error |
| 2 | pure gateを評価 | allow | deny時は非永続`SkippedLiveRunReceipt`を返し、probe/processは0回 |
| 3 | Codex read-only preflight | binary/version/dist/auth findings | 不成立時は非永続`SkippedLiveRunReceipt`を返す |
| 4 | C4が`ResourceRegistrar`を生成 | 空のcleanup registry | 生成不能なら副作用開始前に停止 |
| 5 | C4がregistrarをallocatorへ渡し、generic scratch project/homeを確保してgit/distを配置 | `ScratchReceipt` | partial snapshotから確保済み断片をcleanupしexecution failure |
| 6 | Codex adapterをprepare | `PreparedRun` | partial prepareでも登録済み対象をcleanupへ渡す |
| 7 | explicit timeout下でexecute | normalized `AdapterExecution` | throw、abort、non-zero、timeoutを段階付きfailureへ正規化 |
| 8 | Codex journey assertion | `AssertionResult` | prose一致ではなくexit/schema/file/state anchorで判定 |
| 9 | cleanupとleak checkを独立実行 | 2つのreceipt/finding集合 | 一方がthrowしても他方を必ず試行 |
| 10 | result precedenceを適用 | closed `LiveOutcome` | cleanup/leakは元結果より優先してexecution failure |
| 11 | sanitized recordable receiptを生成 | `RecordedLiveRunReceipt` | secret/source path/全文outputがあればcontract error |
| 12 | ledgerへatomic append | appended / already-present | write失敗は`ledger-write-failed`でhard failure |

gate/preflight skipはscratch、prepare、execute、ledger appendを行わず、`LiveRunReceipt` unionの`SkippedLiveRunReceipt`を`Result.ok`で返す。skip receiptはoutcome、adapter ID、評価時刻、sanitized diagnosticを持つが、Git SHA、durability、`receiptId`を持たずC8へ渡せない。実行開始後だけ`RecordedLiveRunReceipt`を生成・永続化する。

## Policy and Preflight Decision Flow

1. `GITHUB_ACTIONS === "true"`なら`CI_FORBIDDEN`のskipped receiptを即時返す。
2. `AMADEUS_CODEX_EXEC_LIVE !== "1"`なら`OPT_IN_REQUIRED`のskipped receiptを返す。
3. allow時だけpreflightを開始する。
4. preflightはbinary、minimum version、dist、auth availabilityをread-onlyに測定する。
5. 複数findingは`BINARY_MISSING` → `VERSION_UNSUPPORTED` → `DIST_MISSING` → `AUTH_UNAVAILABLE` → `CAPABILITY_UNSUPPORTED`の固定順でprimary codeを選ぶ。残りはsanitized secondary diagnosticへ保持する。
6. child environmentはallow-listから新規構築し、ambient env spreadをしない。

この順序により、GHAまたはopt-in不足時はbinary/version/auth probeとCodex process spawnの双方が0回になる。

## Codex Adapter Workflow

### Generic Scratch Setup（C4 ownership）

- fresh project/homeを作り、projectをgit initializeし、対象`dist/codex`を配置する。
- source auth/config/hooksはcopy、symlink、bind mountせず、scratchにもdebug保持面にも置かない。
- project trust対象をscratch projectへ限定する。
- generic directory/fileは副作用より前にC4の`ResourceRegistrar`へ`planned`登録し、作成直後に`created`へ遷移させる。

### Codex Prepare（C5 ownership）

- `LiveRunContext`はhost-injected `CredentialSourcePort`を保持し、raw secretやsource pathは保持しない。Codex preflightは同portの`canLease(declaration)`だけでauth availabilityをread-only判定する。
- C4は完成済み`ScratchReceipt`、`ResourceRegistrar`、`CredentialSourcePort`を`PrepareContext`としてC5へ渡す。C5は`prepare`内でcredential resourceを`planned`登録してから`lease(declaration)`を呼び、許可されたin-memory/env `CredentialBinding`を生成して`created`へ遷移させる。
- C5がbindingをchild allow-listへ射影し、raw値を`PreparedRun`へ保持しない。source auth file/path、設定、hooksを読まず、scratch credential fileを生成しない。
- bindingの取得・注入はC5、実行後の破棄保証はC4がregistrar snapshotをC5 cleanupへ渡すことで所有する。prepareがthrowしてもplanned/created leaseはsnapshotへ残る。
- Codex固有のargument、cwd、project-local non-secret configを構成する。git初期化とdist配置は行わない。
- Codex固有resourceも副作用前に`registerPlanned`、成功直後に`markCreated`し、prepareがthrow/`Result.err`でもC4が`registrar.snapshot()`からcleanup対象を取得できるようにする。

### Execute and Assert

- `codex exec`をscratch project内で1回起動し、短いdeterministic promptを渡す。
- explicit timeoutと`AbortSignal`を適用し、retry既定値は0とする。
- adapterはexit code、timed-out state、sanitized stdout/stderr metadataを`AdapterExecution`へ正規化する。
- journey specificationは期待するexit、構造化result、生成fileまたはstate anchorを判定し、自然言語の全文一致に依存しない。

### Cleanup

- prepare途中、spawn failure、timeout、assertion failure、successのすべてでC4が`registrar.snapshot()`を取得し、同じcleanup経路へ入る。
- Codex child processをterminate/reapし、一時`CredentialBinding`を破棄する。
- debug保持時も保持対象はworkspaceとsanitized logだけで、credentialは保持しない。
- cleanupと共通leak scanを別々に試行し、診断を集約する。

## Result Classification

primary resultの優先順位は高い順に次とする。

1. contract invalidまたはledger write failure: outer `Result.err`
2. cleanup failureまたはcredential leak: `FAIL:EXECUTION_FAILED`
3. journey timeout: `TIMEOUT:JOURNEY_TIMEOUT`
4. deterministic assertion failure: `FAIL:ASSERTION_FAILED`
5. spawn/CLI/prepare execution failure: `FAIL:EXECUTION_FAILED`
6. success: `PASS:SUCCESS`

cleanup/leakがprimaryを上書きした場合、元のtimeout/assertion/execution outcomeはsecondary diagnosticとしてsanitized receiptへ残す。programmer errorやinvalid contractを通常のexternal failureへ偽装しない。gate/preflight skipはscratch開始前の`Result.ok(SkippedLiveRunReceipt)`終端である。

## Ledger and Projection Algorithm

### Atomic Append

1. 事前capability probeでdurability modeを`file-and-directory`または`file-only`へ確定する。不明は開始前に拒否する。
2. receipt schema、adapter ID、40桁Git SHA、UTC timestamp、code/status整合、evidence非秘密性を検証する。
3. PID+process start epochのowner tokenをstampするmkdir lockをbounded retryで取得する。
4. lock内で既存JSONLをbyte-preservingに全検証する。
5. `file-and-directory` modeではreceipt ID付きpending markerを作成してparent directoryをfsyncする。
6. sibling tempへ既存bytes+新規1行を書き、mode `0600`、file fsync、atomic renameを行う。
7. `file-and-directory` modeではparent directory fsyncに成功してからpending markerを除去し、再度directory fsyncする。失敗時はpending markerを残してsuccessを返さない。
8. final ledgerを再検証する。success時はpending markerがないこと、failure時はmatching pending markerがdurableに残ることを確認する。
9. success/failureの別にかかわらず`finally`でowner一致lockをreleaseする。pending付きfailureを返した後、同processまたは別processの`recoverRunReceipt`は新しいlockを取得できる。

同一`receiptId`・同一内容は、pending markerがない場合だけ`already-present`である。pendingが残る場合、recoveryはfresh owner lockを取得してfinal record一致を検証し、必要なdirectory fsync→marker除去→directory fsyncを完遂してからlockをreleaseし`already-present`を返す。同一ID・異内容はconflictである。`file-only`はdirectory durabilityを主張せず、file fsync+renameの完了をreceiptへ明示する。

### Stale Lock Recovery

- owner PIDがdeadと確認できる、またはunstamped lockがgraceを超えた場合だけ回収候補にする。
- reaper mutex下でprivate pathへCAS renameし、owner token/mtimeを再検証してから削除する。
- live、`EPERM`、unknown owner、fresh unstamped、token mismatchは自動解除しない。
- bounded timeout後はsanitized lock状態を返し、強制削除optionを提供しない。

### Matrix Projection（S2 ownership）

`runLiveJourney`はmatrixを生成・検査せず、ledger appendまでをC4のtransaction boundaryとする。別のS2 commandがregistryとvalidated ledgerをadapter ID順に読み、harness、transport、opt-in、CI deny、設定/認証隔離、anchor、support state、version、最終green SHA/time、Issue linkをprojectする。

- **render:** expected generated blockを純粋に返す。
- **update:** maintainerがlive receipt記録後に明示実行し、generated blockだけをdeterministicに更新する。live test自身はdocsを変更しない。
- **check:** current docsとexpected blockを比較し、driftを`MatrixError`としてCLI/testをnon-zeroにする。

projection failureはC4の`LiveRunError`へ混入せず、S2 commandの`Result<void, MatrixError>`として扱う。U01完了時は実Codex run → ledger append → explicit update → check → runbook doc contract testの順で閉じる。

## Business Scenarios

| Scenario | Expected behavior |
|---|---|
| GHA + opt-in=1 | `CI_FORBIDDEN`、probe/process 0回 |
| local + opt-in欠落 | `OPT_IN_REQUIRED`、probe/process 0回 |
| binary/version/dist/auth不成立 | `SkippedLiveRunReceipt`、scratch/process 0回 |
| prepare途中throw | partial resourcesをcleanup、leak scan実行、execution failure |
| journey timeout | processをabort/reap、cleanup後にtimeout。cleanup失敗時はexecution failureへ昇格 |
| assertion failure | sanitized assertion diagnostic、cleanup後にassertion failure |
| execution success + leak | successを返さずexecution failure |
| receipt append失敗 | `ledger-write-failed`、green扱い禁止、同一receiptで回復可能 |
| rename後directory fsync失敗 | pending markerを保持してhard failure。recoveryがfsyncを完遂後に`already-present` |
| append後response loss | pending状態を回復して`already-present`、重複行なし |
| stale lock + dead owner | CAS回収後にappend再試行 |
| matrix手編集 | 独立S2 checkがfailure。live runnerはdocsを変更しない |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:01:44Z
- **Iteration:** 1
- **Scope decision:** none

主要な安全・障害時契約は概ね具体化され、component依存の循環は認められないが、認証隔離、skip終端型、partial prepare cleanup、ledger durability、matrix、ownershipおよびU01/U02境界にBLOCKERが残る。

### Findings

- BLOCKER | requirements.mdのFR-4/NFR-1と、credential materialをscratch CODEX_HOMEへcopyするBR-E03/Codex Prepareが矛盾する。
- BLOCKER | gate/preflight skipをResult<LiveRunReceipt, LiveRunError>と状態遷移で表現できず、services.mdのskip receiptとも矛盾する。
- BLOCKER | partial prepare中の登録resourceをC4へ引き渡すregistrar/snapshot/state contractがなく、PreparedRun未生成時のcleanupを保証できない。
- BLOCKER | receipt確定後に判明するdirectory fsync結果をimmutable ledger recordへ整合させる方法と、rename後fsync失敗時のrecovery契約がない。
- BLOCKER | CapabilityMatrixRowがFR-11必須のopt-in、CI deny、設定・認証隔離、anchorを表現しない。
- BLOCKER | matrix project/checkがrunLiveJourney内か独立S2か矛盾し、drift failureの返却型とledger更新後の生成・検査順が未定義である。
- BLOCKER | scratch/dist配置がC4所有とC5 Codex Prepare所有の双方に割り当てられている。
- BLOCKER | U02所有のadversarial failure-injectionをU01 Functional Designの必須Verification Matrixが取り込み、Unit境界と完了条件が矛盾する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:11:03Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の主要8論点は設計へ反映されたが、CredentialBinding生成経路、generic scratchとregistrarの順序、pending durability failure後のledger lock解放に3件のBLOCKERが残る。

### Findings

- BLOCKER | CredentialBindingのproducer、入力source、C5からC4への引渡しAPIがなく、Codex auth preflight/prepareを一意に実装できない。
- BLOCKER | generic scratch副作用がResourceRegistrar生成より先に実行されるworkflowと、副作用前planned登録ルールが矛盾する。
- BLOCKER | directory fsync失敗時にpending markerとlive-owner lockが残り、recoverRunReceiptがlockを取得・回収できない。

## Human Adjudication

- **Date:** 2026-08-03T14:14:39Z
- **Decision:** reviewer上限到達後の選択肢1「3契約を修正し、人間裁定で解消扱いとして続行」
- **Resolution:** C5がhost注入の`CredentialSourcePort`に対する`canLease` / `lease`、`CredentialBinding`の取得・child allow-listへの注入を所有する。C4はportと`ResourceRegistrar`をC5へ渡し、registrar snapshot経由で破棄を保証する。source auth file/path、設定、hooksは参照・複製しない。
- **Resolution:** C4はscratch allocationより前に`ResourceRegistrar`を生成し、allocatorとC5へ渡す。双方とも副作用前に`registerPlanned`、成功直後に`markCreated`する。
- **Resolution:** directory fsync失敗ではdurableなpending markerを残す一方、`finally`でowner一致lockを必ず解放する。recoveryはfresh lockを取得してfsyncとmarker除去を完遂する。
- **Review record:** `Review — Iteration 2`は当時の検出結果として変更しない。追加review iterationは実施せず、この人間裁定を3件のBLOCKER解消根拠とする。
