# Security Design — kiro-ide-live

## 上流契約と境界

本設計は`business-logic-model.md:7-19`を入力とし、Kiro IDE/Electron/CDPをrun-owned untrusted process groupとしてC4 lifecycleへ接続する。NFR Requirementsはscope上skipされたため、不存在のsecurity requirementsやtech-stack decisionsは補作しない。

C2はGHA hard deny→strict opt-inを最初に評価し、deny時はphase evidence、filesystem probe、app launchを0回にする（`business-logic-model.md:7`）。許可後にU09所有`KiroIdePhaseGuard`を実行し、C4/U01 APIを変更しない（同:8）。その後だけregistrar、0700 scratch HOME/TMPDIR/workspace/user-data-dirを作る。child envは`PATH`,`HOME`,`TMPDIR`,`LANG`,`LC_ALL`,`NO_COLOR`のexact setとし、source HOME/profile/config、AWS/ambient envを渡さない（同:10-12）。native credentialは同一envでIDEが利用可能なmachine substrateだけをcapabilityとし、account/secret/pathを取得・記録しない。

## Profile and command controls

`GeneratedProfileBuilder`は同:21-50の2 path、SQLite schema/exact 3 rows、settings exact object/command orderだけをtyped constantsから生成する。directory→settings atomic write(mode 0600)→SQLite transaction→read-only query/deep equality/canonical digestの順で検証する。追加row/key、wildcard、symlink/hardlink、source copy、credential-shaped row、trusted commandのprefix/引数差分はlaunch前にfail-closedにする。

Kiro executableはbundle内absolute realpath、workspace/profileもregistrar receiptのinode/dev identityへ固定する。argvは同:13のclosed listで、`--no-sandbox`、fixed/non-loopback debugging address、追加extension/profile flagを拒否する。Chromium sandbox、workspace trust無効、telemetry offを維持する。generated profileは成功・失敗・debugの全経路で必ず削除し、保持できるのはsecret/profile/latchを除去したworkspaceだけである（同:17）。

9件の`kiroAgent.trustedCommands`はKiroにreal Bunを直接解決させない。C5はchild専用PATH先頭へowner-bound `HookCommandBroker` shimを`bun`名で配置し、real Bun pathをchildから不可視にする。shimはparent brokerへ`{runNonce,parentPid/start,workspace inode,argv}`を送り、自身ではshell/Bunを起動しない。brokerはargvがexact `[".kiro/hooks/amadeus-kiro-adapter.ts", <one fixed verb>]`、追加引数0、cwd/owner/process group一致、hook manifest digest一致の場合だけ受理する。prefix、quote差分、`;|&&|$()|newline`、absolute/alternate script pathは拒否する。

brokerはstatus journey用のfinite-state permitを持ち、session lifecycleと現在のuserPromptSubmit/status handlerとしてmanifestが宣言する最小eventだけを各1回許可する。それ以外のtrusted commandは設定に存在してもexecution 0とする。許可eventはbroker自身がreal adapterをchild外のrestricted workerで実行し、readをrun workspace、writeをlatch/counterとbroker audit receiptだけへ限定する。workerは副作用前に`IdeProcessContainmentPort.spawnIntoJob(workerSpec)`でrun jobへ原子的に生成し、PID/start identity、permit ID、5秒deadlineをregistrarへcreated登録する。完了時はexit/reapを、timeout時はTERM 1秒→job kill→KILL→reapを確認し、worker identity残存0を`KiroIdeContainmentReceipt`へ含める。Kiro groupはOS policyでreal Bun、shell、任意subprocess、source HOME/repository writeをdenyし、unexpected tool/commandを観測する前にも外部副作用0を保証する。backend不在またはdeny self-test不成立はapp launch前のcapability不足である。

## CDP endpoint and transport controls

app spawn直前に`DevToolsActivePort`不存在をno-follow確認し、spawn monotonic timeとprofile directory identityを記録する。fileはprofile内のowner一致・non-symlink regular file、mode 0600、size 1..4096 bytes、mtime/ctimeがspawn後であることを必須にする。内容はdecimal port 1..65535と`/devtools/browser/<UUID>` exact grammarの2行だけを受理し、hostは常にliteral `127.0.0.1`を構成してfileから読まない（`business-logic-model.md:13`）。

接続後に`Browser.getVersion`、`Target.getTargets`を取得し、productがElectron/Chrome、target URLがrun-owned workspace、browser websocket IDがfileと一致することを確認する。foreign/stale endpoint、redirect、non-loopback socket、unexpected page/extension targetを拒否する。CDP JSONはsingle message 262,144 bytes、total 4,194,304 bytes、8,192 messages、queue 32/524,288 bytes、JSON depth 32を上限とし、IDは単調整数でexactly-once相関する。raw payload、websocket path、profile path、chat proseはartifact/receipt/logへ保存せず、count/digest/typed anchorだけを残す。

## Chat and off-band evidence

target/context探索は60秒deadline内でpage/iframeとnested execution contextだけを走査し、visible ProseMirror/tiptap editorをDOM predicateで一意に選ぶ。literal `/amadeus --status`を挿入し、DOM read-backがbyte-exact一致してからEnter、editor clearを確認する（`business-logic-model.md:14-16`）。pixel、座標、screenshot、assistant proseは判定に使わない。

prompt前にscratch root identityを固定し、latch不存在、counter `c0`をno-followで確認する。counterは不在=0、存在時はowner一致/mode 0600/non-negative safe integerだけを受理する。実行後も親directory identity不変、latch/counterがnon-symlink regular fileで、`flag="status"`,`source="read-only-flag"`,`turn=c0+1`、counter=`c0+1`を必須にする。state/intents不存在、child aliveもANDし、preseed、turn飛越し、symlink、foreign owner、duplicate latchをnon-greenにする。

## Process containment and evidence

C5はapp launch前に`IdeProcessContainmentPort.probe()`を実行する。portは`spawnIntoJob(spec)`、`terminate(job)`、`waitEmpty(job)`をclosed interfaceとし、最初のuser instruction前の所属を保証する。Linux backendはchildから不可視/read-onlyのcgroup v2へ`clone3(CLONE_INTO_CGROUP)`またはjob内pre-exec launcherで生成する。Darwin backendはEndpointSecurity/launch constraintによるspawn authorizationで、許可されたbundle childとbroker workerを生成時にrun jobへ記録し、未登録fork/exec、`setsid` escape、reparentをdenyする。必要なentitlement/権限または実child self-testがない環境はcredential/app launch前CAPABILITY_UNSUPPORTEDとし、pollingへfallbackしない。

`ElectronDescendantTracker`は25ms snapshot detectorではなくbackendのspawn/exit eventを受ける監査viewである。app leader、renderer/helper/crash handler、broker workerは全て`spawnIntoJob`またはjob継承で生成され、PID/start identity/PGID、executable digest、parent event sequenceをregistrarへ記録する。cleanupはCDP close→job TERM 5秒→job kill→KILL→`waitEmpty`→全identity reapの順で行い、original group `ESRCH`とOS process table上のrun-owned descendant 0を別々に確認する。leader/profileを先に破棄せず、PID/PGID再利用とmarker喪失を防ぐ。C5は`KiroIdeContainmentReceipt`をC4のgeneric registrarへ返し、C4へElectron固有探索を追加しない。stdout/stderrは各262,144 bytes、combined 524,288 bytesまでdigest-only drainし、overflowもbounded teardownへ送る（`business-logic-model.md:17-18`）。

cleanup/leak scanは独立に全対象を試行し、profile、CDP path/payload、source/credential/account、process残存0を確認する。U09は既存C8 atomic append/C9 projectionだけを呼び、ledger failureをLiveOutcomeへ偽装しない。unsupported branchは同:19,89-91のsanitized fieldsをC7へ渡し、C8 receipt不存在を検証する。

## Verification

`kiro-ide-contract`でprofile extra row/key/wildcard/symlink、trusted command追加引数/prefix/shell chaining/不要verb、broker foreign parent/manifest、worker hang/未登録worker、host deny self-test、`--no-sandbox`、stale/foreign/malformed CDP file、endpoint identity mismatch、CDP byte/message/queue境界、duplicate ID、input drop、editor non-clear、preseed/symlink latch、child early exit、TERM無視、spawn直後に無印grandchildをforkして別PGIDへ離脱するhelper、profile/debug retention、job emptyとOS descendant 0の不一致、cleanup/C8/C9 failureをmutant redにする（`business-logic-model.md:80-87`）。cache、database、AWS scalingはdesktop live journeyに非適用である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:19:20Z
- **Iteration:** 1
- **Scope decision:** none

Profile・CDP endpoint・DOM/off-band anchorは具体化されているが、native credentialを持つIDEでhost command実行が予防的に封じられず、process groupを離脱したElectron helperのcleanupも保証できない。

### Findings

- BLOCKER | workspace trust無効化と広いtrustedCommandsに対するhost-command封じ込めがない | generated profileはsecurity.workspace.trust.enabled=falseと--disable-workspace-trustでWorkspace Trustを無効化し、mint、runtime-compile、state-sync等9個のhost-side Bun commandをtrusted登録する。profile digestは設定改変を検出するだけで、model/extensionが登録済みcommandを起動すること、またはKiroのtrusted-command照合がprefix扱いして追加shell引数を許すことを防がない。Chromium sandboxはElectron main/extension hostからのBun process実行を封じないため、native machine credentialを利用するrunでstatus journey外の副作用が実行可能である。 | status journeyに必要な最小helperだけへ権限を縮小し、引数を受けないowner-bound brokerとして実行するか、host command/process生成をOS境界でdenyする。追加引数・shell chaining・不要な登録commandの実行回数0を検証する。
- BLOCKER | process groupを離脱したElectron helperを検出・終了できない | cleanupはleaderのPGIDへTERM/KILLしgroup ESRCHだけを確認するが、Electron helperやcrash handlerがsetsidまたは別process groupへ移ると、元groupが空でもrun-owned descendantが生存する。security-design.mdとlogical-components.mdにはdescendant identityの登録、逃避group検出、run markerによる探索がなく、HELPER_PROCESS_SURVIVES mutantをどう検出するか実装できない。 | helper spawnをsandboxで同一groupへ強制するか、spawn時からPID/start identityをregistrarへ登録して全run-owned descendantの不在を確認し、別groupへ離脱するfake helperをredにする。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:21:35Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のhost-command制御と別PGID helper対策は具体化されたが、新設broker workerがprocess lifecycle外にあり、25ms snapshot方式にもescaped descendantを見失う競合が残る。

### Findings

- BLOCKER | HookCommandBrokerのrestricted workerが登録・有界終了されない | security-design.mdはbrokerがreal adapterをKiro child外のrestricted workerで実行すると定めるが、そのworkerのPID/start identity、process group、deadline、registrar登録、TERM/KILL/reap、cleanup receiptがない。Electron groupの終了やElectronDescendantTrackerはchild外のbroker workerを対象にしないため、adapter hookがhangするfakeではworkerがrun終了後も生存し、workspace書込み権限を保持できる。 | broker workerを副作用前にrun-owned resourceとしてregistrarへ登録し、各permitのdeadlineとTERM/KILL/reap、残存0をKiroIdeContainmentReceiptへ含める。
- BLOCKER | 25ms process snapshotでは別groupへ逃げたdescendantの完全捕捉を保証できない | ElectronDescendantTrackerはsnapshot時のancestry、bundle executable identity、またはargvのuser-data-dir/workspace markerでprocessを登録する。許可helperがsnapshot間にmarkerを持たないgrandchildをspawnして終了し、grandchildがsetsid後にreparentされると、次回snapshotではancestryもmarkerもbundle identityもなく検出できない。original groupと登録identityが消えてmarker scanが2回emptyでも、このgrandchildは生存し得る。 | polling発見ではなくOSのjob/cgroup相当またはspawn監査で全descendantを生成時にrunへ束縛するか、許可helperからの子process生成をpreventiveに禁止し、snapshot間に無印grandchildが離脱するmutantをredにする。
