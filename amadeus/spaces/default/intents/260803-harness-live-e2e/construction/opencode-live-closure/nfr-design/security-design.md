# Security Design — opencode-live-closure

## 上流契約と境界

本設計は`business-logic-model.md:7-19`を入力とし、OpenCode headless/plugin capability probeをgreen adapter materializationまたはevidence-backed unsupported closureへ排他的に接続する。現在のengine directiveはNFR Requirementsの2 inputを`consumes_absent.expected=true`としつつ、本unitの`security-design.md`/`logical-components.md`生成を明示している。これはstage frontmatterのskip条件と矛盾するが、forwarding loopではruntime directiveがrouting authorityであり、stage Step 2もexpected absenceではfallbackして欠落内容を発明しないよう要求する。本設計はそのclosed fallbackとして、存在する`business-logic-model.md`だけを具体化し、不存在のsecurity requirementsやtech-stack decisionsは補作しない。

C2はGHA hard deny→`AMADEUS_OPENCODE_LIVE === "1"`を最初に評価し、deny時はPhase guard、probe、model callを0回にする（`business-logic-model.md:7`）。許可後にU11所有`OpenCodePhaseGuard`がPhase 2 closureをread-only検証し、不成立ならC4を呼ばない（同:8）。model IDは`provider/model`をexact 1 slashで分割し、各segmentを同:9のgrammar/lengthでbrand化する。providerは`openai|anthropic|opencode`だけ、credential keyはそれぞれ`OPENAI_API_KEY|ANTHROPIC_API_KEY|OPENCODE_API_KEY`へtyped tableで固定し、未知provider/config fragment/env keyをspawn前に拒否する。

成功後の拘束順序はC4 registrar→0700 scratch HOME/TMPDIR/XDG/git workspace→isolated preflight→dist/config/plugin materialize→credential lease→model callである。child envは同:14のexact setと選択providerのcredential key 1個だけ。source HOME/XDG/auth file/user config/plugin/account/AWS/ambient envを読取り・copy・link・mergeしない。

## Credential and containment controls

`OpenCodeCredentialPort`はC5内に閉じ、opaque lease handle、child key、cleanup resource IDだけを返す。source locator/secretをC5へ返さない。C5所有`OpenCodeContainmentPort`はcredential取得前にatomic `spawnIntoJob`、control-channel、kill/empty self-testを行う。backendがfirst instruction前のjob所属を保証できない場合は`AUTH_UNAVAILABLE`へ偽装せずenvironment capability hard errorとしてU11未完了にする。

対応backendは2種だけである。Linux cgroup v2 backendはparent brokerだけがwrite可能なdelegated subtreeにrun nonce directoryを作り、cgroup directory FDを`CLOEXEC`にする。childは別UIDのuser namespaceと専用mount namespaceで起動し、cgroupfsをunmountまたはread-only bindして親・兄弟cgroupへのwriteを不可能にする。`clone3(CLONE_INTO_CGROUP)`または既に当該cgroup内で起動したpre-exec launcherからsupervisorをspawnし、最初のuser instruction前のmembershipをparent側`cgroup.procs`で確認する。`cgroup.kill`後の`populated=0`と、parent-owned spawn/exit audit上のrun descendant 0を別々に確認する。別UID/mount isolation/delegation権限のどれかを実証できない場合はcredential取得前に拒否する。

Darwin spawn-guard backendではOpenCode childをrun固有Seatbelt/EndpointSecurity policy下に置き、childからshell、Bun、任意execを全面denyする。project pluginの`tool.execute.before`がexact 2 commandをparent-owned `OpenCodeToolBrokerPort.execute({runNonce,sessionHash,callHash,argv})`へ転送し、brokerだけがapproved argv/digestを検証してrestricted workerを`spawnIntoJob`する。workerのstdout/stderrはbrokerがbounded resultへ変換してpluginへ返すため、OpenCodeのtool event/receipt順序は維持される。plugin pre-exec interception、OS exec deny、broker peer identityのいずれかを実証できない版ではcredentialを取得しない。launcherはsupervisor/OpenCode/broker workerのapproved executable realpath/digest、PID/start identity/PGIDを生成時にregistrarへ通知し、terminate後にjob emptyとOS上のrun descendant 0を別々に確認する。fork直後escape、setsid、launcher crash、raw shell exec、broker bypass、unregistered execの実child self-testが1件でもgreenでなければcredentialを取得しない。通常POSIX process groupだけのbackendはunsupportedである。

credentialを持たないsupervisorをjob/process-group leaderとして起動し、PID=start group leader、start identity、PGID、runner/server group非一致、128-bit owner nonce、双方向channelを検証する（`business-logic-model.md:15-17`）。検証後だけone-shot anonymous pipeでlength-prefixed `{runNonce,generation,childKey,secret}`を1 frame送る。supervisorだけがread FDを継承し、他FDはCLOEXEC。supervisorはnonce/generation/keyを検証し、OpenCode child envへ射影後にbuffer zeroize/FD closeする。

OpenCode childと全descendantは同じrun-owned jobから離脱できない。timeout/control lossではowner jobへTERM 10秒→KILL 5秒、membership empty、supervisor reap、group ESRCHを確認してからleaseをdestroyする。supervisor/leader identity不一致でも無関係groupへsignalせずjob handleで回収する。supervisor/child/job capability不成立はcredential transfer前に拒否し、worker先行終了/`setsid`/fork直後逃避をself-testする。

credential brokerはsecret original UTF-8 bytesとsource HOME/XDG/auth locatorのraw/JSON-escaped/percent-encoded pathをopaque `OpenCodeLeakMatcher`へ封入する。stdout/stderrへchunk境界越しに適用し、pattern/offset/matched bytesを永続化せず、cleanup時にzeroizeする。

## Project policy and plugin receipt

`.opencode/opencode.json`はtyped serializerで`share:"disabled"`,`autoupdate:false`,global deny、次のbash commandだけexact allowにする: `bun .opencode/tools/amadeus-orchestrate.ts next --status`、`bun .opencode/tools/amadeus-utility.ts status`。prefix、追加引数、shell chaining、alternate path、`--auto|--share|--continue|--session|--attach|--file|--pure`を拒否する（`business-logic-model.md:12,15`）。config/plugin/commandはregular file、owner一致、mode 0600/0555、canonical digest一致をlaunch直前に再検証する。

test pluginはcurrent nonceと`chat.message` sessionをprocess-localに束縛し、同一sessionの`tool.execute.after`で上記2 commandを順番どおりexactly once観測した場合だけreceiptを書く（同:13,16）。receipt fileはprompt前にno-follow不存在を確認する。pluginはO_EXCL temp write/fsync→no-replace renameを行い、exact schema、canonical plugin hash、session/call/commandのhashだけをmode 0600で保存する。raw ID/args/output/path/accountを保存しない。stale/foreign/duplicate/reverse order/片方欠落/early terminal時はcommitしない。

## Bounded JSON event evidence

stdoutは全non-empty lineをUTF-8 JSONとしてparseし、single line 262,144 bytes、total 4,194,304 bytes、8,192 events、queue 32/524,288 bytes、JSON depth 32を上限にする。stderr 262,144 bytes、combined 4,456,448 bytes。incremental digestとleak matcherをraw bytesへ先に適用し、overflow/leak後もjob reapまでdiscard-drainする。raw streamや自然言語を保存しない。

C6は全session-bearing eventのsession hashがreceiptと一致、bash completed 2件のcall/command hashと順序一致、その後の同一session `step-finish(reason="stop")`がexactly 1件、exit 0、state/intents不存在、leak 0をANDする（`business-logic-model.md:16`）。`tool-calls`は中間、second tool前/duplicate/foreign terminal、unknown/duplicate call ID、prose-onlyをgreenにしない。

## Closure and verification

LC-OC-14はC5が所有するcleanup barrierである。C5はjob membership empty、supervisor/child/launcher/broker worker reap、credential pipe close/buffer zeroizeを確認する。opaque matcherが有効なままstdout/stderrとscratch/plugin receipt/configをscan-before-deleteし、全scan receipt成功後にscratch/plugin/configを除去してpost-delete不存在を確認する。その後credential leaseをdestroyし、最後にmatcherをzeroizeしてbarrierを閉じる。未達、owner不明、destroy/cleanup/leak失敗はC8を呼ばない`LiveRunError.cleanup-barrier-failed`とし、元のPASS/TIMEOUT/FAIL/unsupported候補はsecondary診断に限定する。

model callとassertion後は、上記barrier成功時だけPASS/TIMEOUT/FAIL/CAPABILITY_UNSUPPORTEDのsanitized receiptをC8へappendする。append成功または同一receiptのalready-present後にだけLC-OC-13を`closure-committed`とし、PASS返却、C7 supported更新、adapter materialization、C9 projectionを解放する。C8 ledger write失敗は`Result.err(ledger-write-failed)`のまま分離し、greenを返さない。supportedはall anchors時だけ。unsupportedは取得済みversion/helpとstable capability codeがcustom command/project config/plugin payloadの具体的欠如を再現し、全Issue fieldsが揃う場合だけ許可する。binary/dist/auth/containment不足、timeout、transient/assertion failureをIssueで代替しない。同:21-33,44-46のC7/C8/C9責務を再定義しない。

`opencode-run-command-contract`でmodel/env/provider table、native auth file参照、permission relaxation、unsafe flag、credential pipe replay、API key/path leak、config prefix/chaining、plugin nonce/session/call/order/hash、JSON byte/event/queue境界、early/duplicate/foreign terminal、supervisor/control loss、Linux cgroupfs write/別UID/mount namespace逃避、Darwin raw shell/broker bypass、atomic spawn直後escape、setsid、launcher crash、job emptyとOS descendant 0の不一致、cleanup barrier前PASS/C8/materialize、credential destroy/ledger/unsupported誤分類をmutant redにする（`business-logic-model.md:35-42`）。cache、database、AWS scalingは単発CLI probeに非適用である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:35:46Z
- **Iteration:** 1
- **Scope decision:** none

封じ込めと証拠検証は具体化されているが、stage実行条件への違反、cleanup failureの上流契約との矛盾、run-owned jobの実装方式未定義により実装契約が閉じていない。

### Findings

- BLOCKER | NFR Designの実行条件と成果物が矛盾する | stage定義はNFR Requirementsがskipされた場合に本stageもskipすると明記する一方、security-design.mdはNFR Requirementsおよびsecurity requirements/tech-stack decisionsがscope上存在しないまま設計を生成している。required consumeを満たさない成果物では、実装者が達成すべきNFRと技術制約を確定できない | stage条件どおりNFR Designをskipするか、NFR Requirementsを実行してrequired consumeを明示的に渡したうえで設計を再生成する
- BLOCKER | cleanup failureの終端分類と成功確定順序が上流機能設計に違反する | security-design.mdはledger failureだけhard errorとし、logical-components.mdもcleanup failureをhard errorとして接続していない。しかしbusiness-logic-model.mdはlease destroy失敗をcleanup failure、所有証明喪失をfatal cleanup failureとし、credential-bearing process残存0より前のsuccess記録を禁止する。LC-OC-14の所有者とLC-OC-13/C8への必須ゲートも未定義なため、cleanup失敗後にPASS/materializationを確定できてしまう | LC-OC-14をC4またはC5へ明示的に所有させ、job empty、supervisor/child reap、credential destroy、scratch除去、matcher zeroizeの完了をLC-OC-13・C8 append・materializationの前提にする。未達またはdestroy失敗はhard errorとしPASSを禁止する
- BLOCKER | 非離脱run-owned jobの実装契約がない | security-design.mdはatomic spawnIntoJobと、setsid/fork後も全descendantが離脱不能なjobを要求する一方、具体的なbackend、対応OS、atomic membership API、識別子と回収手順を定義していない。他の契約はPGID/ESRCHに依存するがPOSIX process groupはsetsidによる離脱を防止できず、self-testだけでは実childの封じ込めを保証できない | 対応OSごとの強制可能なbackendとatomic spawn/registration契約を定義し、非離脱性を提供できない環境はcredential取得前に拒否する。process groupのみを使う場合は全descendant登録・回収方式を具体化し、setsid/fork逃避fixtureで残存0を証明する

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:41:14Z
- **Iteration:** 2
- **Scope decision:** none

expected-absenceをruntime routing authorityで扱う契約と、cleanup barrier完了前のPASS/C8/materialization禁止は解消された。しかしrun-owned jobのbackendは、credential-bearing descendantの離脱を強制的に防ぐ実装境界がまだ閉じていない。

### Findings

- BLOCKER | run-owned job backendが非離脱性を強制できない | Linux案はdelegated cgroup内へのatomic spawnとcgroup.killを定義したが、同一UIDのchildからcgroup filesystemを隔離するmount namespace・権限・別UID境界がなく、childが書込み可能な親または兄弟cgroupへ自身を移せる場合、jobのpopulated=0がcredential-bearing descendant残存0を意味しない。Darwin案もOpenCodeが必須の2 bash commandをspawnする経路と、launcher/brokerによるapproved-exec mediation interfaceを定義しておらず、登録通知は生成後の逃避を防止しない。self-testだけでは実childへの強制境界にならない | Linuxではchildからcgroupfsを不可視またはread-onlyにするmount namespace、別UID、delegation権限を含む非離脱契約を追加する。DarwinではOpenCodeのtool spawnを必ずbroker経由にする具体的interfaceと、承認前にprocess生成できない強制機構を定義する。いずれも逃避childを使ってjob emptyとOS上のdescendant残存0を別々に検証し、保証不能ならcredential取得前に拒否する
