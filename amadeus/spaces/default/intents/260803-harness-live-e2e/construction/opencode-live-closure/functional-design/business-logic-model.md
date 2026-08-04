# Business Logic Model — opencode-live-closure

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U11はOpenCode headless transportとproject plugin接続を実測し、成立時だけC5/C6 adapterをmaterializeし、不成立時は再実行可能なprobe packageとIssueで閉じる。

## Execution Workflow

1. C2は`GITHUB_ACTIONS === "true"`を最優先し、次に上流契約どおり`AMADEUS_OPENCODE_LIVE === "1"`を評価する。deny時はPhase guard、binary/auth probe、model callを0回にする。
2. gate許可後、U11所有の`OpenCodePhaseGuard`がU06〜U09のPhase 2 closureを検証する。Kimiはgreen receipt、Kiro 3面はgreenまたは要件を満たすIssue、C7/C8/C9投影が一致しなければC4を呼ばず`contract-invalid/phase-prerequisite-unmet`とする。
3. C5は非秘密の`AMADEUS_OPENCODE_MODEL`を`provider/model`として検証する。providerとmodelは各`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`を満たす必要があり、未指定・不正値・未登録providerはprobe/lease/scratch/spawn前に`contract-invalid/invalid-model-id`とする。providerからchild credential keyへの対応はtyped declarationの固定表だけを使い、任意env名やprovider config fragmentを受け付けない。
4. C5 preflightは`opencode --version`、`opencode run --help`、`dist/opencode`、`.opencode/commands/amadeus.md`、`.opencode/plugins/amadeus-opencode-plugin.ts`、U11所有`OpenCodeCredentialPort.canLease`をread-only検査する。2026-08-04実測versionは`1.18.4`、required flagsは`--command`、`--format default|json`、`--model`、`--dir`、`--title`である。`--auto`は存在するが使用禁止とする。preflightは既定優先順位`BINARY_MISSING → VERSION_UNSUPPORTED → DIST_MISSING → AUTH_UNAVAILABLE`のcanonical `SKIP`だけを返し、U11 closureの未完了判定は`LiveOutcome`外のstage evidenceとして保持する。
5. `OpenCodeCredentialPort`はU11 C5内部interfaceで、`canLease(provider): "available" | "unavailable"`、`lease(provider): Result<OpenCodeCredentialLease,"AUTH_UNAVAILABLE">`、`destroy(lease): Promise<Result<void,"cleanup-failed">>`を提供する。初期fixed tableは`openai → OPENAI_API_KEY`、`anthropic → ANTHROPIC_API_KEY`、`opencode → OPENCODE_API_KEY`だけで、未登録providerは`contract-invalid/invalid-model-id`とする。leaseはprovider、child key、opaque secret handle、cleanup resource IDだけを持つ。source `~/.local/share/opencode/auth.json`、source HOME/XDG、user config/plugin、account情報、credential pathを読取り・copy・symlink・bind mount・logしない。leaseはchild envへだけ射影し、prepare前にplanned登録、取得直後にcreated、全終了経路でdestroy、破棄失敗時はcleanup failureとする。native auth fileしか利用できない場合は`SKIP:AUTH_UNAVAILABLE`であり、Issue代替しない。
6. C4がregistrarを作った後、fresh git workspace/HOME/TMPDIR/XDG config/data/cache/stateを作り、`dist/opencode`の`.opencode`、`amadeus`、`AGENTS.md`だけを配置する。project-local `.opencode/opencode.json`はstructured serializerで`share:"disabled"`、`autoupdate:false`、permission global denyと、exact status用bash command 2本だけのallowを生成する。ambient/global/remote config値をmergeせず、`--auto`/`--share`/`--continue`/`--session`/`--attach`/`--file`/`--pure`を禁止する。
7. C5はtest-only `.opencode/plugins/amadeus-live-probe-receipt.ts`をscratchへ追加する。pluginは128-bit `AMADEUS_OPENCODE_PROBE_NONCE`を受け、`chat.message`で得たsession IDと同一sessionの`tool.execute.after`だけを追跡する。exact `bun .opencode/tools/amadeus-orchestrate.ts next --status`、続いてexact `bun .opencode/tools/amadeus-utility.ts status`を順に観測した場合だけ、O_EXCL/atomicで`.opencode/.amadeus-live-probe-receipt.json`へ`{schemaVersion:1,nonce,event:"tool.execute.after",sessionIdSha256,callIdSha256s,commandIds,commandSha256s,canonicalPluginSha256}`を書く。raw session ID、call ID、args、prompt/output/account/pathは書かない。
8. child envは`PATH`,`HOME`,`TMPDIR`,`XDG_CONFIG_HOME`,`XDG_DATA_HOME`,`XDG_CACHE_HOME`,`XDG_STATE_HOME`,`LANG`,`LC_ALL`,`NO_COLOR`,`AMADEUS_OPENCODE_PROBE_NONCE`とtyped declarationで許可された単一provider credential keyだけから構成する。model IDは検証済みargv、nonceとcredentialはchild envだけへ渡す。
9. receipt file不存在を確認後、C5はcredentialを持たないrun-owned supervisorを新しいprocess groupのleaderとして起動し、`PID == PGID`、start identity、runner/server group非一致、128-bit owner nonce、双方向control channelを検証する。検証完了後だけcredential leaseをone-shot FDで渡し、supervisorがscratch cwdで`opencode run --command amadeus --format json --model <validated-provider/model> --dir <scratch> --title amadeus-live-status -- --status`を同じgroupのchildとしてspawnする。supervisorはcredential bytesをchild envへ射影後にbufferをzeroizeしてFDを閉じ、OpenCode leaderが先に終了してもgroup member残存0を確認するまで生存する。custom command引数はliteral `--status`、retryは0、session継続・sharing・auto approval・外部attachmentを使用しない。
10. C6 anchorsはexit 0、stdoutの全non-empty行がJSON、全session-bearing eventのsession ID hashがreceiptと一致、nonce/event/canonical plugin hash/ordered call ID/command ID/command hash完全一致、`bash` tool completed event 2件のcall ID hashと順序がreceiptに一致、その2件より後に同一sessionのterminal `step-finish(reason="stop")`がexactly 1件、`amadeus/spaces/default/intents`不存在、source path/secret leakなしである。`reason="tool-calls"`等の中間stepはterminalに数えない。second toolより前のterminal、duplicate terminal、foreign-session event/terminalを拒否する。plugin receiptが同一sessionでforwarding engineとstatus utilityを実行した正本であり、modelの自然言語は成功条件に使わない。
11. 120秒deadlineまたはcontrol channel異常時、runnerはsupervisor PID/start identity/PGID/nonceを再検証してTERM 10秒→KILL 5秒をgroupへ送り、supervisorをwait/reapした後にgroup `ESRCH`とcredential-bearing descendant残存0を確認する。supervisor自身が異常終了した場合は、起動直後に登録したOpenCode child PID/start identity/PGIDが一致する間だけ同じgroupをowner-boundとして停止できる。supervisorまたは登録childのどちらも一致せずgroup所有を証明できない状態は、live開始前のsupervisor capability fixtureで拒否する。実行後にこの状態へ到達した場合はfatal cleanup failureとして残存探索を続け、outer timeoutで成功扱いせず、credential-bearing process残存0を得るまでlease破棄完了を記録しない。
12. 総budget 120秒、teardown 15秒、outer timeout 150秒、retry 0、live直列とする。model callとC6 assertion終了後は、job/descendant残存0とreapを確認し、opaque leak matcherが有効な間にstdout/stderrとscratch/config/receiptを最終scanし、その成功receiptを得てからscratchを除去する。post-delete不存在を確認してからcredential leaseをdestroyし、最後にmatcherをzeroizeしてcleanup barrierを閉じる。cleanup、destroy、leak scan、削除、不存在確認のいずれかが失敗した場合はC8を呼ばず`LiveRunError.cleanup-barrier-failed`で終端し、PASS、supported更新、materializationを禁止する。
13. barrier成功後だけsuccess/timeout/failure/unsupportedをsanitized receiptへ分類してC8へ追記する。append成功または同一receiptのalready-present後だけ`closure-committed`へ遷移する。全anchors成立かつ`closure-committed`の場合だけ`opencode-run-command` C5/C6をregistryへsupportedとしてmaterializeし、PASSとC9 projectionを解放する。C8 ledger failureはhard errorでありgreenを返さない。unsupported遷移はversion/helpを取得済みで、再現可能なprobeが特定の必須capability欠如を証明し、Issue必須fieldsが全て揃う場合だけ許可する。環境不足・auth不足・一時failureはU11未完了のhard errorとし、Issueで代替しない。

## Capability Decision Table

| Phase | Observation | Classification | Closure |
|---|---|---|---|
| pre-spawn | binary欠如 | `SKIP:BINARY_MISSING` | U11未完了、Issue代替禁止、C8 receipt absent |
| pre-spawn | version/help取得不能またはrequired flag欠如 | `SKIP:VERSION_UNSUPPORTED` | evidence完備時だけmeasured unsupported closure、それ以外はU11未完了 |
| pre-spawn | dist/command/plugin欠如 | `SKIP:DIST_MISSING` | U11未完了、Issue代替禁止、C8 receipt absent |
| pre-spawn | credential lease不能 | `SKIP:AUTH_UNAVAILABLE` | U11未完了、Issue代替禁止、C8 receipt absent |
| post-spawn | CLIがstable capability codeでcustom command、project config、plugin hook payloadを非対応と返す | measured capability unsupported | C7 Issue + C8 skip receipt |
| post-spawn | 120秒超過 | `TIMEOUT:JOURNEY_TIMEOUT` | U11未完了、C8 timeout receipt |
| post-spawn | non-zero/spawn/protocol/model error | `FAIL:EXECUTION_FAILED` | U11未完了、C8 failure receipt |
| post-spawn | exit 0だがJSON/receipt/state/leak anchor不成立 | `FAIL:ASSERTION_FAILED` | U11未完了、C8 failure receipt。根因実測なしにunsupported化禁止 |
| post-spawn | all anchors | `PASS:SUCCESS` candidate | cleanup barrier成功後のC8 appended/already-presentで`closure-committed`となった場合だけC7 supported + C5/C6 materialize + C9 projection |
| cleanup | job/descendant残存、scan/delete/destroy/zeroize/post-delete確認失敗 | stage hard error | C8 receipt absent、PASS/supported/materialize禁止 |

## Verification

- fake opencode binaryとfake plugin hostでargv/env/cwd、model grammar、credential lease、project config、custom command引数、ordered tool hook receipt、JSON event normalizationを検証する。
- `--auto`、ambient env、source HOME/auth file、user plugin/config、GHA bypass、implicit opt-in、secret/output leak、permission relaxationをmutant redにする。
- process owner mismatch/PID reuse/timeout/cleanup/ledger failure、OpenCode leader先行終了、supervisor control lossに加え、cleanup failure時C8 append 0回とledger failure時`closure-committed`未到達をU02 contract kitへ接続する。
- probe outputはversion/help digest、exit、JSON/session/receipt anchor booleans、sanitized failure classだけを保持し、raw responseをIssueへ載せない。文字列だけ、stale receipt、nonce/session/plugin/call/command hash不一致、command逆順、片方だけ実行、early/duplicate/foreign-session terminalをredにする。

U02 suite bindingは`opencode-run-command-contract`。stable assertionsは`OPENCODE_SAFE_FLAGS_ONLY`,`OPENCODE_ENV_ALLOWLIST_EXACT`,`OPENCODE_PROJECT_ONLY`,`OPENCODE_MODEL_ID_VALID`,`OPENCODE_CREDENTIAL_LEASE`,`OPENCODE_ORDERED_TOOL_RECEIPT`,`OPENCODE_JSON_SESSION_MATCH`,`OPENCODE_UNSUPPORTED_EVIDENCE_COMPLETE`,`PROCESS_GROUP_OWNER_MATCH`,`SUPERVISOR_REMAINS_GROUP_LEADER`,`CREDENTIAL_DESCENDANT_ZERO`,`NON_GREEN_RECEIPT_REQUIRED`,`PHASE_PREREQUISITE_REQUIRED`とする。

## Alternative Closure Contract

後続Issueは取得済みCLI version、OS/arch、required help digest、auth mode kind、sanitized exact command、project config digest、canonical plugin digest、specific missing capability、再現可能なprobe、各anchor boolean、exit/stable capability code、阻害要因、推奨seam、受入条件、親Issue/U11 artifact linkを必須とする。全fieldを取得できないbinary/dist/auth不足またはtransient failureはIssue closure不可。account、credential、HOME、raw stdout/stderr、prompt response、raw session/call IDを含めない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:33:44Z
- **Iteration:** 1
- **Scope decision:** none

安全なproject-local実行とconditional closureは具体化されているが、共通結果型に存在しないpreflight分類、未定義のcredential port、terminal anchorのsession結合不足により実装契約が閉じていない。

### Findings

- BLOCKER | preflight結果がcanonical taxonomyと共通型に違反する | Capability Decision Tableはbinary/dist/auth/model credential unavailableとversion取得不能をResult.err(environment-unavailable)へ分類する。しかしrequirements FR-2とcomponent-methods Error Ownershipはbinary/version/dist/authをcanonical skip codeへ正規化し、LiveRunErrorもledger-write-failedとcontract-invalidしか許可しない。environment-unavailableは未定義で実装不能である | C5 preflightはBINARY_MISSING、VERSION_UNSUPPORTED、DIST_MISSING、AUTH_UNAVAILABLEを既定優先順位で返し、U11 closure未完了というworkflow判定をLiveOutcomeとは別に保持する
- BLOCKER | CredentialSourcePort参照が上流契約に存在しない | business-logic-modelはC1のCredentialSourcePort.canLease/leaseを必須とするが、componentsのC1所有型とcomponent-methodsには同portがなく、U11はC1を所有しない。さらに登録providerとcredential keyの固定表も列挙されておらず、実装者はport形状・provider集合・lease失敗・破棄契約を推測する必要がある | U11所有のC5 credential portとして完全なinterface、provider→child key表、lease/cleanup/error契約を定義するか、U01所有のC1へ正式なpublic seamを追加してU11の依存を明示する
- BLOCKER | terminal anchorがreceiptと同一session・順序に結合されていない | C6は少なくとも1 eventのsession hashがreceiptと一致し、別途terminal step-finishが存在すれば成功できる。terminal event自体のsession一致や、ordered tool receipt後にexactly one terminalが発生する条件がないため、fake streamで一致sessionの非terminal eventと別sessionまたは先行terminalを混在させてもgreenになり得る | terminal step-finishをreceiptのsession hashへ必須結合し、両tool完了後のexactly-one terminal、duplicate/early/foreign-session terminal拒否を契約とmutant testへ追加する

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:36:47Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の3 BLOCKERは解消された。canonical preflight分類、U11所有credential port、同一session・順序付きterminal anchorは実装可能になった。ただしtimeout時のowner不明分岐がcredential-bearing子processを残し得る安全欠陥がある。

### Findings

- BLOCKER | owner不明時にcredential-bearing process groupを封じ込められない | timeout処理はleaderのowner identityを再検証できない場合にgroup signalを拒否し、identity一致leaderだけを停止してcleanup failureとする。fake leaderがcredentialを継承した子processを同一groupへspawnして先に終了すれば、owner不明分岐で子processはTERM/KILL対象外となり、outer timeout後もAPI keyを保持してmodel callを継続できる。失敗分類だけではFR-5のcleanupとNFR-1/NFR-3の安全・コスト境界を満たさない | run-owned supervisorをgroup leaderとしてreap完了まで維持する、または各descendantのowner identityを登録して有界停止できる仕組みを定義する。owner不明・leader先行終了fixtureでもcredential-bearing process残存0を必須anchorとし、達成不能ならlive実行を開始しない

## Human Adjudication

- **Date:** 2026-08-03T15:37:56Z
- **Decision:** reviewer上限到達後の選択肢1「run-owned supervisorで残存0を保証するよう修正し、人間裁定で解消扱いとして続行」
- **Resolution:** credentialを持たないrun-owned supervisorをprocess-group leaderとしてOpenCode leaderから分離し、OpenCode leader先行終了後もgroup member残存0までsupervisorを維持する。timeout/control lossではowner nonce、PID/start identity/PGIDを再検証してgroupを有界停止し、supervisor reap、group `ESRCH`、credential-bearing descendant残存0を必須anchorとする。
- **Resolution:** supervisor capabilityをcredential lease前に検証し、owner証明不能になるfixtureではliveを開始しない。実行後の異常ではfatal cleanup failureとして残存探索を継続し、残存0より前にlease破棄完了またはsuccessを記録しない。
- **Review record:** `Review — Iteration 2`は当時の検出結果として変更しない。追加review iterationは実施せず、この人間裁定を残るBLOCKERの解消根拠とする。
