# Business Rules — codex-live-walking-skeleton

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。本ルールはU01の共通production kernelとCodex adapter/journeyに適用する。

## Gate and Capability Rules

| Rule | Invariant | Violation result |
|---|---|---|
| BR-G01 | `GITHUB_ACTIONS === "true"`は全opt-inより優先する | `SKIP:CI_FORBIDDEN` |
| BR-G02 | adapter opt-inは厳密な文字列`"1"`だけを許可する | `SKIP:OPT_IN_REQUIRED` |
| BR-G03 | deny時はbinary/version/auth probeとprocess spawnが0回 | contract test failure |
| BR-G04 | `codex-exec` capabilityはregistryにexactly once存在する | contract invalid |
| BR-G05 | supported capabilityはminimum/measured version、anchor、opt-inを持つ | registry finding |
| BR-G06 | preflightはread-onlyで、課金processを起動しない | contract invalid |

## Environment and Credential Rules

- BR-E01: child environmentは明示allow-listから構築し、`process.env`のspreadを禁止する。
- BR-E02: adapterが必要とするsensitive keyとsource path keyはtyped declarationへ列挙する。
- BR-E03: source credential/config/hooksをscratchへcopy、symlink、bind mountせず、source pathをchildへ渡さない。
- BR-E04: hostはraw secret/pathを公開しない`CredentialSourcePort`を`LiveRunContext`へ注入する。C5 preflightは`canLease`、C5 prepareは`lease`で許可されたin-memory/env `CredentialBinding`を生成しchild allow-listへ射影する。scratch credential fileは生成しない。
- BR-E05: credential値、source path、absolute home、prompt全文、stdout/stderr全文をreceipt・ledger・Issue・debug logへ書かない。
- BR-E06: debug保持の有無にかかわらず一時credential bindingとchild process memoryを破棄する。
- BR-E07: leak findingが1件でもあれば、実行結果がsuccessでも`FAIL:EXECUTION_FAILED`へ昇格する。

## Lifecycle Rules

- BR-L01: common gateはpreflightより先、preflightはscratch allocationより先に実行する。
- BR-L02: scratch allocation開始後は、prepare途中を含む全終端経路でcleanupとleak checkをそれぞれ試行する。
- BR-L03: C4はscratch allocationより前に`ResourceRegistrar`を生成し、allocatorとC5はいずれも副作用前に`registerPlanned`、成功直後に`markCreated`する。
- BR-L04: C4はprepareのreturn/throwにかかわらず`registrar.snapshot()`を取得し、cleanupはpartial `PreparedRun`なしでもplanned/created resourceを扱う冪等操作とする。
- BR-L05: cleanupがthrowしてもleak checkを省略せず、leak checkがthrowしてもcleanup診断を失わない。
- BR-L06: timeoutは明示値を持ち、retry既定は0、1 journeyは直列実行する。
- BR-L07: child processは成功・failure・timeout・abortの全経路でterminate/reapする。
- BR-L08: cleanup/leak failureはtimeout、assertion、successより優先し、元結果をsecondary diagnosticへ保持する。

## Result and Evidence Rules

- BR-R01: external substrateの期待される結果だけをclosed `LiveOutcome`へ正規化する。
- BR-R02: programmer error、invalid contract、malformed registry/ledgerをskip/successへ変換しない。
- BR-R03: outcome `status`と`LiveCode`の組み合わせはcanonical tableに一致する。
- BR-R04: evidenceはkind、sanitized value/digest、source categoryを持ち、secret scannerを通る。
- BR-R05: `LiveRunReceipt`は非永続`SkippedLiveRunReceipt`と永続対象`RecordedLiveRunReceipt`のunionである。skipはreceipt ID/durabilityを持たない。
- BR-R06: recorded receiptはschema version、deterministic receipt ID、UTC time、Git SHA、adapter/version、outcome、cleanup、durability modeを持つ。
- BR-R07: cleanup/leak診断を含むrecorded receiptが確定するまでledger appendを開始しない。
- BR-R08: ledger append成功またはpending解消済みの同一receiptだけをrecorded run successとして返せる。
- BR-R09: ledger failureはrecorded receiptを内包する`ledger-write-failed`で返し、greenを偽装しない。

## Ledger Rules

- BR-D01: ledgerはappend-only JSONLで、既存bytesを再整形しない。
- BR-D02: malformed line、unknown adapter、schema退行、receipt ID conflictをfail-closedで拒否する。
- BR-D03: final ledgerへ部分行を公開せず、sibling temp write+fsync+atomic renameを使う。
- BR-D04: lock ownerはPID+process start epochで識別し、owner stamp失敗時はcritical sectionへ入らない。
- BR-D05: releaseはon-disk owner token一致時だけ行い、別ownerのlockを削除しない。
- BR-D06: dead ownerまたはgrace超過unstamped lockだけをreaper mutex+CAS rename+再検証で回収できる。
- BR-D07: live/unknown owner、`EPERM`、token mismatch、fresh unstamped lockを自動解除しない。
- BR-D08: same ID/same contentはidempotent、same ID/different contentはconflictである。
- BR-D09: parent directory fsync capabilityを測定し、保証レベル不明をsuccess扱いしない。
- BR-D10: `file-and-directory` appendはpending markerを先にdurable化し、rename後directory fsyncとmarker除去後fsyncが完了するまでsuccess/`already-present`を返さない。
- BR-D11: pending付き同一receiptのrecoveryはrecord一致を検証してdirectory fsyncを完遂し、markerを安全に除去してから`already-present`を返す。
- BR-D12: pending付きfailureを含む通常return/throwでも、`finally`はowner一致lockを必ず解放する。recoveryはfresh lockを取得し、live-owner lockを回収対象にしない。

## Matrix and Runbook Rules

- BR-M01: capability registryがstatic truth、ledgerがrun fact、Markdown matrixがderived viewである。
- BR-M02: matrixはadapter ID順に決定的sortし、harness、transport、opt-in、CI deny、設定/認証隔離、anchor、対応状態、version、最終green SHA/timeまたはIssue linkを必須列とする。
- BR-M03: supportedでgreen receiptがないadapterは`UNVERIFIED`と表示する。
- BR-M04: generated block driftはtest failureである。
- BR-M05: runbookは`dist/<harness>`、driver、installer変更時の該当journey、command、opt-in、ledger確認を記載する。
- BR-M06: runbookの必須節とregistry ID参照をdoc contract testで検証する。
- BR-M07: C4 runnerはmatrixを変更せず、S2の明示`update`だけがgenerated blockを更新し、S2 `check`がdriftを独立`MatrixError`で返す。

## Codex-specific Rules

- BR-C01: Codex minimum versionは0.139.0以上とし、measured versionをreceiptへ記録する。
- BR-C02: `codex exec`はscratch git project内だけで実行する。
- BR-C03: project trustとconfigはscratch targetへ限定し、user/global設定を暗黙に採用しない。
- BR-C04: C5が`CredentialSourcePort.canLease`で許可されたenv/in-memory auth bindingのavailabilityをpreflightし、`prepare`内でleaseを生成する。source auth file/path、設定、hooksを読まない。
- BR-C05: assertionはexit/schema/file/state anchorを用い、自然言語の全文一致を成功条件にしない。
- BR-C06: must-green Codex journeyはevidence Issueによる代替完了を認めない。

## Rule Precedence

競合時は次の順でprimary resultを決める。

1. contract/ledger integrity error
2. credential leakまたはcleanup failure
3. timeout
4. assertion failure
5. execution failure
6. success

gate/preflight skipはscratch lifecycle開始前の`Result.ok(SkippedLiveRunReceipt)`終端であり、failure precedenceへ混在させない。

## Verification Matrix

| Rule group | Required verification |
|---|---|
| BR-G | pure policy table test、probe/process spy 0回 |
| BR-E | child env allow-list、secret/source-path corpus |
| BR-L | partial prepare registrar、throw、timeout、abort、cleanup/leak両試行のbaseline |
| BR-R | code/status exhaustive test、sanitization、ledger failure |
| BR-D | nominal atomic append、idempotent response loss、dead-owner回収、live-owner拒否、pending durability recovery |
| BR-M | deterministic projection、manual drift、doc contract |
| BR-C | fake Codex integrationとexplicit-opt-in real journey |

U01は上表の最小production contract regressionを所有する。網羅的property test、cleanup double-failure組合せ、SIGKILL/stamp前kill、PID再利用、double reaper、crash競合corpusはU02 `live-e2e-common-hardening`のadversarial reusable suiteが所有する。
