# Business Logic Model — kiro-ide-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U09はKiro IDE/Electron raw-CDP transportを共通C1〜C4/C7〜C9へ接続するC5/C6 sliceである。

## Execution Workflow

1. C2は`GITHUB_ACTIONS === "true"`を最優先し、次に`AMADEUS_KIRO_IDE_LIVE === "1"`を評価する。deny時はphase evidence、filesystem probe、app launchを0回にする。
2. gate許可後、U09所有の`KiroIdePhaseGuard`がU04/U05のPhase 1 closureをread-only検証する。不成立はC4を呼ばず`Result.err(contract-invalid/phase-prerequisite-unmet)`とする。
3. C5 preflightはmacOS、Kiro.app executable、bundle version、`dist/kiro-ide`、generated-profile SQLite、loopback CDP capabilityを検査する。minimum bundle versionは既存spike契約の`0.12.0`、2026-08-04ローカル実測は`0.12.333`とし、上位versionもprofile/CDP/chat probe成功を要する。
4. C4がregistrarを作った後、fresh workspace、HOME、TMPDIR、user-data-dirを作り、`dist/kiro-ide`の`.kiro`、`amadeus`、`AGENTS.md`だけをworkspaceへ配置する。
5. C5は下記`Generated Profile Contract`のconstantsだけからprofileを生成する。directory→settings→SQLite transaction→read-only再検証の順で作成し、row key集合、settings deep equality、canonical SHA-256 digestが一致しなければlaunch前にfail-closedにする。wildcard `"*"`、source profile copy、credential rowは禁止する。
6. child envは`PATH`,`HOME`(scratch),`TMPDIR`(scratch),`LANG`,`LC_ALL`,`NO_COLOR`だけから構成し、ambient env、source HOME/profile/config path、AWS envを渡さない。authは同一envでKiro IDEが利用できるnative machine credential substrateだけを許容する。
7. C5は`Kiro.app <workspace> --remote-debugging-address=127.0.0.1 --remote-debugging-port=0 --user-data-dir=<scratch-profile> --disable-workspace-trust --skip-welcome --skip-release-notes --new-window`を`detached:true`のisolated process groupでspawnする。`--no-sandbox`は付けない。Chromiumがscratch profileへ書く`DevToolsActivePort`からport/websocket pathを読み、loopback endpointとchild起動後のfresh fileであることを検証する。
8. C5はCDP readinessを60秒、visible ProseMirror/tiptap chat editorを60秒でpollする。固定sleep、Playwright、pixel座標は使わず、page/iframe targetとnested execution contextだけを走査する。
9. C6はprompt直前に`amadeus/.amadeus-readonly-latch`不存在とturn-counter `c0`（不存在は0）を確認する。CDPでchatへliteral `/amadeus --status`を挿入し、read-back一致後にEnter送信、editor clearを確認する。
10. 120秒以内にoff-band status evidenceを待つ。anchorsはlatchの`flag="status"`、`source="read-only-flag"`、`turn=c0+1`、counter `c0+1`、state/intents不存在、child aliveである。chat prose、screen pixel、screenshotはassertion/evidenceに使わない。
11. success/failure/timeoutの全経路でCDP socketを閉じ、process group ID `pgid=leaderPid`へSIGTERM、10秒後も`kill(-pgid,0)`が成功する場合はSIGKILL、さらに5秒pollする。leaderのexitをawaitし、`kill(-pgid,0)`が`ESRCH`となるgroup残存0だけをreapedとする。generated profileはmachine authの有無にかかわらず常に削除し、debug保持しない。sanitized workspaceだけは明示debug時に保持可能とする。
12. 総journey budgetは240秒、teardown 15秒、outer Bun timeout 300秒、retry 0、suite直列実行とする。cleanup/leak failureは`FAIL:EXECUTION_FAILED`、ledger failureは`Result.err(ledger-write-failed)`とする。
13. green時だけC8へreceiptを追記する。unsupported時はIssue URLと測定結果をC7へ記録し、C8に`kiro-ide` receiptが不存在であることを検証する。C9はC7のunsupported+IssueまたはC7 supported+C8 receiptをmatrixへ投影する。app/profile/CDP/chat/auth capabilityのどこで不成立か、推奨seam、受入条件、sanitized再現情報がないIssueはclosureに使わない。

## Generated Profile Contract

- settings path: `<profile>/User/settings.json`
- database path: `<profile>/User/globalStorage/state.vscdb`
- schema: `CREATE TABLE ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)`
- rows: `("kiroAgent.onboarding.onboardingCompleted","true")`、`("releaseNotes/lastVersion","0.0.0")`、`("trusted-publishers-init-migration","true")`のexact 3行だけ
- settings JSON:

```json
{
  "workbench.startupEditor": "none",
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  "telemetry.telemetryLevel": "off",
  "security.workspace.trust.enabled": false,
  "update.showReleaseNotes": false,
  "kiroAgent.trustedCommands": [
    "bun .kiro/hooks/amadeus-kiro-adapter.ts audit-and-sensors",
    "bun .kiro/hooks/amadeus-kiro-adapter.ts block",
    "bun .kiro/hooks/amadeus-kiro-adapter.ts log-subagent",
    "bun .kiro/hooks/amadeus-kiro-adapter.ts mint",
    "bun .kiro/hooks/amadeus-kiro-adapter.ts runtime-compile",
    "bun .kiro/hooks/amadeus-kiro-adapter.ts session-end",
    "bun .kiro/hooks/amadeus-kiro-adapter.ts session-start",
    "bun .kiro/hooks/amadeus-kiro-adapter.ts stop",
    "bun .kiro/hooks/amadeus-kiro-adapter.ts state-sync"
  ]
}
```

検証digestは、rowsをkey昇順の`[[key,value],...]`、settings objectをkey昇順・trustedCommandsを上記固定順でcanonical JSON化し、そのUTF-8 bytesへSHA-256を適用する。raw SQLite file bytesは非決定的なのでdigest対象にしない。

## Trusted Hook Commands

profileへ許可するのは次のexact commandだけである。

- `bun .kiro/hooks/amadeus-kiro-adapter.ts audit-and-sensors`
- `bun .kiro/hooks/amadeus-kiro-adapter.ts block`
- `bun .kiro/hooks/amadeus-kiro-adapter.ts log-subagent`
- `bun .kiro/hooks/amadeus-kiro-adapter.ts mint`
- `bun .kiro/hooks/amadeus-kiro-adapter.ts runtime-compile`
- `bun .kiro/hooks/amadeus-kiro-adapter.ts session-end`
- `bun .kiro/hooks/amadeus-kiro-adapter.ts session-start`
- `bun .kiro/hooks/amadeus-kiro-adapter.ts stop`
- `bun .kiro/hooks/amadeus-kiro-adapter.ts state-sync`

## Result Mapping

| Observation | Result |
|---|---|
| CI / opt-in deny | canonical skip、external call 0 |
| Phase 1 closure不成立 | `Result.err(contract-invalid/phase-prerequisite-unmet)` |
| platform/app/version/dist/profile/CDP/chat/auth不成立 | canonical skip。C7のevidence Issue link確定まで未完了、C8 receiptなし |
| spawn/CDP/protocol/app early exit | `FAIL:EXECUTION_FAILED` |
| readiness/journey deadline | `TIMEOUT:JOURNEY_TIMEOUT`、bounded teardown |
| input read-back/editor clear/latch/state anchor不成立 | `FAIL:ASSERTION_FAILED` |
| cleanup/leak failure | `FAIL:EXECUTION_FAILED`、green禁止 |
| ledger append failure | `Result.err(ledger-write-failed)` |
| all anchors + durable receipt | `PASS:SUCCESS` |

## Verification

- fake Electron/CDP serverでDevToolsActivePort freshness、loopback、target/context、chat read-back、submit、latch/counterを検証する。
- preseeded latch、stale DevToolsActivePort、foreign endpoint、input drop、editor non-clear、child early-exitをredにする。
- fake process groupでTERM無視、group KILL、leader exit、group `ESRCH`、profile削除、debug workspace保持分離を検証する。
- registry、ledger、matrix、runbook triggerを`kiro-ide` adapter IDへ接続する。

U02 suite bindingは`kiro-ide-contract`。mutantは`PROFILE_EXTRA_ROW→PROFILE_SCHEMA_EXACT`、`PROFILE_WILDCARD_TRUST→TRUSTED_COMMANDS_EXACT`、`CDP_FIXED_PORT→CDP_EPHEMERAL_LOOPBACK`、`CHROMIUM_SANDBOX_DISABLED→SANDBOX_REQUIRED`、`HELPER_PROCESS_SURVIVES→PROCESS_GROUP_EMPTY`、`PROFILE_DEBUG_RETAINED→CREDENTIAL_PROFILE_DELETE_REQUIRED`、`STATUS_LATCH_PRESEEDED→OFFBAND_STATUS_FRESHNESS_REQUIRED`をそれぞれredにする。

## Alternative Closure Contract

後続Issueはtested app version、OS/arch、profile seed digest、CDP readiness/target/chat probeの各結果、阻害要因、推奨seam、受入条件、sanitized command、親Issue/U09 artifact linkを必須とする。screenshot、raw CDP payload、profile path、credential/account情報は含めない。Issue URLとunsupported状態はC7、C8 receipt不存在はC8 query、表示整合はC9が所有し、この3条件が一致した時だけPhase 2 closureへ渡す。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:06:43Z
- **Iteration:** 1
- **Scope decision:** none

依存方向とgate precedenceは整合するが、generated profileの具体仕様、Electron process treeの完全終了、unsupported closureとC8 ledgerの境界、Chromium sandbox無効化に未解決のBLOCKERがある。

### Findings

- BLOCKER | Generated profile契約が実装不能 | SQLite file path・ItemTable schema・3行のliteral key/value、settings file path・JSON shape・各fixed valueが定義されていない。安全境界となるprofileを実装者が推測すると、credential row混入や過剰なtrusted command許可を検証できない | profileの全file path、schema、literal row/settings値、生成順序、validation digestをclosed contractとして定義する
- BLOCKER | Electron process treeを完全にreapできない | workflowはappと全childの終了を要求するが、KiroIdeHandleが保持するのはElectron PIDだけで、process group、helper PID集合、子process discoveryの契約がない。親PIDへのTERM/KILLだけではElectron helperが残存し得る | isolated process groupで起動してgroup全体を終了・確認するか、全descendantを追跡して個別reapし、残存0をcleanup receiptで検証する
- BLOCKER | Alternative closureがC8 ledger schemaと不整合 | U09はgreen receiptまたはIssueをregistry/ledger/matrixへ確定し三者一致を要求するが、C8はLiveRunReceipt専用で、unsupported/follow-up IssueはC7、projectionはC9の責務である。Issue branchをC8へ表現する型やAPIは存在しない | Issue URLとunsupported状態はC7へ記録し、C8はgreen receipt不存在を検証するだけと明記し、C9で両者を整合投影する
- BLOCKER | Native credential利用中にChromium sandboxを無効化する | 起動契約が明示的に--no-sandboxを付与し、machine credential substrateへ接続するIDE renderer/helperの隔離を弱める。上流要件にsandbox無効化の根拠や代替防御はない | --no-sandboxを削除するか、不可避性を実測で証明し、credentialを持たない別process/profileへの分離など同等の封じ込めを設計する

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:09:07Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4 BLOCKERはすべて解消された。generated profileはpath・schema・literal値・生成順序・digestまで閉じ、Electronはisolated process group単位で終了と残存0を確認する。unsupported closureはC7/C8/C9の責務境界に整合し、Chromium sandboxも維持される。未解決BLOCKERはない。

### Findings

- None
