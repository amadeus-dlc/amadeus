# Claude Native Driver ビジネスロジックモデル

## 目的と上流境界

U-03はC-05 `ClaudeDriverAdapter`とClaude harness projectionだけを所有し、`claude-agent-teams`と`claude-ultracode`を共通C-01 lifecycleへ接続する。selector、attempt store、process supervisor、native verifier、referee、mergeを再実装しない。

| 上流成果物 | U-03で使用する契約 |
|---|---|
| `unit-of-work.md` | U-03の1 provider/2 mode、Claude slot single-writer、fake/live完了条件 |
| `unit-of-work-story-map.md` | Agent Teams、Ultra Code、unknown topology、legacy、resumeの5 slice |
| `requirements.md` | FR-11/FR-12のnative proof、FR-15のreferee、FR-19の機密性、FR-23のlive proof |
| `components.md` | C-05 adapter、C-08の二系統evidence、post-dispatch fail-closed |
| `component-methods.md` | `DriverAdapter`、`ProbeResult`、`LaunchSpec`、`NormalizedDriverEvent` v1 |
| `services.md` | batch 1 process、team/task/workflow source、probe順、cleanup/resume |

2026-07-13の公式Claude Code文書とlocal `claude 2.1.205`から、次をsurface profileの根拠とする。

- [Agent Teams](https://code.claude.com/docs/en/agent-teams): experimental env、in-process mode、session-derived team、team config/task path、Task/Teammate hooks。
- [Dynamic Workflows](https://code.claude.com/docs/en/workflows): v2.1.154以降、`--effort ultracode`はv2.1.203以降、`claude -p`で承認promptを出さずworkflow実行、workflow agent/runtime state。
- [CLI reference](https://code.claude.com/docs/en/cli-reference): `--teammate-mode`、`--effort ultracode`、`--session-id`、stream-json。
- [Hooks reference](https://code.claude.com/docs/en/hooks): `TaskCreated`、`TaskCompleted`、`TeammateIdle`、`SubagentStart`、`SubagentStop`のallowlist field。

versionは診断であり成功根拠ではない。localでは`--teammate-mode in-process --version`、`--effort ultracode --version`、`claude auth status`の非機密JSONを確認しただけで、native live実行はCode Generation entry/exit gateへ残す。

## C-05 moduleとproduction registration

driver-keyed registration、Claude=2/Codex=1/Kiro=1のcardinality、production composition root、fail-closed slotはU-01/U-02で完成済みのgeneric contractである。U-03はこの型やmappingを訂正せず、Claude slotへ格納する2つの実descriptorだけを提供する。他provider slot、common runtime、checkpoint、verifier、refereeは変更しない。

`ClaudeDriverAdapter`は1つのprovider module/class familyであり、singleton processやsingleton cacheではない。共通`DriverAdapter.driver`が単一driver IDを要求するため、factoryは次の2つのimmutable mode-bound viewを返し、Claudeの`DriverAdapterSet`へ2件とも格納する。

```text
createClaudeAdapterFamily(resolveScope)
  ├─ view(driver=claude-agent-teams, mode=agent-teams)
  └─ view(driver=claude-ultracode, mode=dynamic-workflow)
             │
             └─ shared commonProbe Promise (resolveScope内だけ)
```

U-03のregistration descriptorはClaude providerのfail-closed slotだけを、この2 viewを持つavailable setへ置換する。U-02のcomposition rootがstatic mappingとcardinalityを検証し、U-03はCodex/Kiro slotや4 driver mappingを編集しない。C-01は`probing` attemptごとにfresh resolve scopeを作り、Claude setの2 viewを同じscopeへ束縛する。scope破棄後にprobe結果を再利用しない。

この形は「C-05が2 modeを扱う」と「`DriverAdapter.driver`は1値」を両立し、2つの独立adapter実装へbusiness logicを複製しない。単一adapterの`driver`を実行中に変更することは禁止する。共通部分はCLI/auth/env/schema profile、差分はmode probe、launch args、provider-state parser、evidence policyだけである。

## End-to-end workflow

```mermaid
sequenceDiagram
  participant H as Claude Harness
  participant C as C-01 Coordinator
  participant A as C-05 Claude Adapter
  participant S as U-02 Supervisor
  participant P as Claude coordinator
  participant O as State Observer
  participant V as C-08 Verifier
  participant R as C-11 Referee

  H->>C: resolve/run(batch, units, topology)
  C->>A: common probe + selected mode probe
  A-->>C: ProbeResult(modeIdentifier)
  C-->>H: selected plan
  H->>R: prepare(batch, units)
  R-->>H: PreparedUnit[]
  H->>C: run(plan, PreparedUnit[])
  C->>A: buildExecution(plan, preparedUnits)
  A-->>C: LaunchSpec + EvidenceCapturePlan
  C->>S: U-02 capture plan/transportをcheckpointしてstart
  S-->>C: CaptureIdentity
  C->>S: identity-first provider wrapper
  S-->>C: process identity
  C->>C: dispatched checkpoint then arm
  alt Agent Teams
    S->>P: interactive PTY上でclaude + initial input
    P-->>A: exact team/task state + Task/Teammate hooks
    A-->>S: ready-for-graceful-exit
    S->>P: PTY exit inputを1回送信
  else Ultra Code
    S->>P: exact headless claude -p command + stdin manifest
    P-->>A: stream-json + hook events
  end
  par exact provider state
    O->>O: exact session team/workflow path only
    O-->>A: normalized snapshots
  end
  A-->>V: NormalizedDriverEvent[]
  V-->>C: evidence verdict
  C-->>H: evidence-verified Unit results
  loop advisory Unit checks
    H->>R: check(unit)
    R-->>H: converged / retry
  end
  H->>C: record-finalize(kind=request)
  C-->>H: request binding persisted
  H->>R: finalize(bound request)
  R-->>H: bound finalize envelope
  H->>C: record-finalize(kind=result, envelope)
  C-->>H: terminal checkpoint
```

テキスト代替: Claude harnessはC-01をdriver lifecycleの公開入口にし、C-11をrefereeの公開入口にする。C-01とC-11は互いをimport/callしない。harness conductorだけがprepare、advisory check、record-finalize request、finalize、record-finalize resultをversioned JSONで媒介する。adapterはAgent TeamsにPTY plan、Ultra Codeにstdio JSON planを返し、U-02 supervisorがclosed transport/capture順序を実行する。

## Probeアルゴリズム

### Resolve scope

1. C-01が`probing` checkpointをmaterializeした後、Claude adapter familyをresolve scopeへ生成する。
2. 最初に評価されたClaude viewが`commonProbe`を開始し、2つ目は同じPromiseをawaitする。
3. scope keyはin-memory object identityであり、batch番号やproject pathをglobal keyにしない。resumeはfresh scopeとなる。
4. common failureは両modeへ同じ主reasonを返すが、各`ProbeResult.driver/modeIdentifier`は混同しない。

### Common probe

| 順 | Check | 手段 | Timeout | 成功条件 |
|---:|---|---|---:|---|
| 1 | CLI | `claude --version` | 5秒 | executable、parse可能version、exit 0 |
| 2 | Auth | `claude auth status` | 10秒 | JSON statusがlogged-in。token/valueは読取後破棄 |
| 3 | Mode handshake | mode別の非破壊fixture | 30秒内 | Agent Teamsはinteractive PTY/team初期化surface、Ultraはstream `system/init`/terminalを確認 |
| 4 | Hook capture | attempt専用ephemeral settings | 同上 | mode別sentinel hookがowned evidence dirへ最小eventを1件書く |

handshakeはapplication code、git、team、workflowを作らず、toolsを無効化した固定応答だけを要求する。APIを呼べないauth/modeではavailableを返さない。raw output、result text、model responseは保存しない。

### Mode probe

Agent Teamsはexperimental env、interactive action、`--teammate-mode in-process`、session ID flag、expected team/task rootの安全なpath構築、Task/Teammate hook schema profileを検査する。`claude -p`で通常async Agentが動くことをTeams surfaceとして受理しない。

Ultra Codeは`--effort ultracode` flag受理、workflows無効設定がないこと、`system/init.capabilities`とlive-discovered profileの一致、SubagentStart/Stop captureを検査する。`xhigh`受理だけではavailableにしない。公式に安定fieldがないrun/task pathはcredentialed discovery fixtureが確定するまで`native-evidence-unavailable`である。

### Probe failureの意味

- 明示`claude-agent-teams`/`claude-ultracode`: hard error、prepare/worktree/provider process 0件。
- `auto`: dispatch前だけU-01の固定候補列へ進む。coordinatedでTeams unavailableならUltra、さらにunavailableならTask floor。
- dispatch後: probeを再解釈せずfailed-resumable。別mode/floorへfallbackしない。

## Mode別LaunchSpec構築

### 共通input

adapterは次の安全なmanifestをcanonical JSONとしてstdin bytesへ変換する。生prompt、credential、convergence command全文をevidenceへ複製しない。

```text
ClaudeBatchManifestV1
  executionId / attemptId / attemptNonceHash / planDigest
  waveIndex / waveDigest / sessionId
  units[] = unitSlug / assignmentToken / worktreePath / dependencySlugs
  convergenceCommand (provider入力だけ。永続eventには入れない)
  protectedSpecPath (provider入力だけ。baselineはC-11が所有)
```

`assignmentToken`は`sha256(executionId, attemptId, waveDigest, unitSlug)`の短縮base32であり、Unit slugと組み合わせてtask/workflow labelに使う。これはsecretでなく、別attemptの自己申告や残存stateを排除する相関tokenである。

Ultraではwrapperがprovider spawn後にstdinを1回だけwriteしてEOFを送る。Agent Teamsでは同じmanifest由来instructionをPTYの`initialInput`として1回送る。どちらもargvへpromptを置かず、shell commandを組み立てない。

### Agent Teams interactive PTY

```text
claude
  --teammate-mode in-process
  --session-id <execution-derived UUID>
  --settings <attempt-owned ephemeral settings path>
  --permission-mode dontAsk
```

`LaunchSpec.transport`は`pty-interactive`で、manifest由来instructionを`initialInput`、`/exit`を`gracefulExitInput`とする。`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`をenvへ追加する。PTY bytesはprocess lifecycle診断に限定し、Team eventやsuccess evidenceへ投影しない。`claude -p`、`--output-format stream-json`、通常async Agent/Taskはこのmodeで禁止する。

### Ultra Code headless stdio JSON

```text
claude -p --verbose --effort ultracode --output-format stream-json --include-hook-events
```

`LaunchSpec.transport`は`stdio-json`で、canonical manifestをstdinへ渡す。上記の必須flag列を保ち、`--effort xhigh`、keyword自己申告、通常subagentへ置換しない。

両modeのephemeral settings bytesはU-03のevidence hookだけを追加し、既存project/user settingsを上書きしない。contentはmode、hook command、evidence directoryの非機密pathだけを持つ。adapterは`attempt-owned-file(mode=0600)`として宣言し、U-02だけが作成する。invalid settingsの黙示無視を防ぐため、mode別probeのsentinel hook成立を必須にする。

envは固定allowlistで構築する。

- runtime: `PATH`、`HOME`、`SHELL`、`TMPDIR`、locale。
- correlation: evidence dir、attempt nonce hash、session ID、mode ID。raw nonceは渡さない。
- Agent Teams: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。
- auth: `claude auth status`が示したtransportに必要な既存keyだけ。OAuth/keychainではHOME以外のcredential値を複製しない。API/Bedrock/Vertex/Foundryは既知transport別allowlistを使用し、未知transportはprobe failure。

全env値はchildへin-memoryで渡すだけで、log、error、checkpointへserializeしない。

### Adapter execution/capture contract

Iteration 1 reviewで、上流`buildLaunch`と`normalize(rawStream)`だけではcleanup前provider-state observerをU-02 supervisorへ接続できないことが判明した。共通adapter interfaceを、hidden I/Oを増やさない次のpure plan + explicit lifecycleへ精緻化する。

```text
DriverAdapter
  prepareResources(input): AdapterResourcePreparation
  buildExecution(input, resources: MaterializedAuxiliaryResourceSet): AdapterExecutionPlan
  normalize(inputs: EvidenceInputs, context): NormalizedDriverEvent stream

AdapterExecutionPlan = U-01-owned / U-02-consumed common contract
  launch: LaunchSpec(transport = pty-interactive | stdio-json)
  capture: EvidenceCapturePlan
  captureIdentity: executionId / attemptId / planDigest / waveIndex / waveDigest
  resources: AuxiliaryResourcePlan[]
```

Claudeのresource preparationは、Agent Teamsのordered 256 prefix candidatesを持つ`exclusive-reservation`、両modeのephemeral settingsを持つ`attempt-owned-file`、attempt evidence/hook/snapshot rootを持つ`attempt-owned-directory`だけを宣言する。U-03は`mkdir`、`lstat`、write、unlink、reservation cleanupを行わない。U-02が返すmaterialized setからselected session UUID/path、settings path、evidence rootを読み、具体的argv、fixed initial binding、hookDirを純粋構築する。Ultraはprefix reservationを持たず、event-bound captureを返す。

U-02 `ProcessSupervisor`は`EvidenceCaptureSupervisor` portを所有し、次の順序を強制する。

1. `AdapterResourcePreparation`をU-02がmaterializeし、owner/content/selected candidate receiptをcheckpointへaudit-firstで束縛する。そのmaterialized setから構築した`AdapterExecutionPlan.captureIdentity.planDigest`、capture ID、state/hook/snapshot path digestを同じprepared lifecycleへ束縛する。
2. capture observerを開始し、owner process identity、capture ID、plan digestを持つ`CaptureIdentity`を返させる。Agent Teamsは`fixed-provider-path`の`initialBinding`にあるexact path observerを直ちに開始する。Ultraは`event-bound-provider-path` observerを開始し、provider eventからrun IDを得るまでpathを読まない。observerはC-05 parser/profileを使うが、起動順と停止保証はU-02が所有する。
3. `CaptureIdentity`をcheckpointへ保存した後にprovider wrapper identity handshakeを行う。providerのone-time armはcapture startedのfenced checkpointがなければ受理しない。
4. Ultraのworkflow-created eventをC-05のclosed binding parserへ渡し、run ID、session ID、resolved exact state pathを持つ`CaptureBinding`を作る。U-02はprofile ruleとrealpath confinementを再検証し、binding digestをaudit-first checkpointへ保存してからそのexact pathのpollingを有効にする。binding前にdirectory scanやstate readをしない。
5. Ultraのstructured stdoutを`processStream`、observer snapshotを`providerStateStream`、exact hook directoryのrecordを`hookRecordStream`として別channelへ保つ。Agent TeamsのPTY bytesはdiagnostic channelに隔離し、structured `processStream`やTeam evidenceへ昇格しない。private mutable closureや`buildExecution`中のpollingは禁止する。
6. provider group terminalを確認した後にcaptureへstopを送り、`stopAndWait`でlast valid atomic snapshotとhook record集合を確定する。observer停止不能、binding/snapshot欠落、hook読取未完了はsuccessにしない。
7. adapter `normalize`へ3 channelとterminal identityを渡す。U-02がcapture join後にowned resourceだけをcleanupし、resource receiptとcleanup結果をC-08判定へ含める。streamとprovider-stateを同じraw eventから二重生成しない。

coordinator crash時はcaptureが同一owner processとともに停止し、U-02が旧provider groupをterminate/waitする。snapshotが確定していなければ旧attemptをsuccessにせず、新attemptはfresh capture planから始める。

### Session prefix allocation

Agent Teamsのteam/task pathはsession UUID先頭8文字だけで決まり、task directoryはsession終了後も残り得る。dispatch前に次のbounded deterministic allocatorでprefixを予約する。

1. U-03のpure `prepareResources`が`counter=0..255`についてUUIDv5を`executionId + attemptId + waveDigest + counter`から導出し、reservation pathとexpected team/task guarded pathsを持つordered `exclusive-reservation` candidatesを返す。
2. U-02 `AuxiliaryResourceSupervisor`がcandidate順にuser-scoped reservationをatomic取得し、guarded pathsをdirect `lstat`する。root directoryは列挙せず、どちらかが存在する、symlinkである、ownership不明なら削除・再利用せず次candidateへ進む。
3. exactly 1件を選んだmaterialized receiptをowner process identity/lease/fencingへ束縛し、U-03のpure `buildExecution`がselected counter/full UUID/prefix/pathからAgent Teams argvと`fixed-provider-path.initialBinding`を作る。
4. U-02はcounter、full UUID hash、prefix、両path digest、reservation receiptとcapture bindingを`prepared` checkpointへaudit-first保存する。これが完了するまでobserver/providerを起動しない。
5. U-02はreservationをprovider group terminalとcapture joinまで保持し、owned scratch cleanup後にだけ解放する。crash時のstale reservationは旧owner非生存と旧group停止を証明した後だけ回収する。新attemptは新seedで再探索し、旧task pathを削除しない。

256候補が埋まる、lock livenessが不明、checkpoint前後のexact path再検査で出現した場合は`CLAUDE_SESSION_PREFIX_UNAVAILABLE`としてpre-dispatch停止する。Amadeus外processとの予約非協調raceはarm直前の再`lstat`と、実行中のfull session ID/assignment token/extra task検証でfail-closedにし、誤ったnative successを0件にする。

### Agent Teams固有instruction

Claude 2.1.178以降はteam名を任意指定できないため、U-02のmaterialized reservation receiptへ束縛したUUIDをinteractive processの`--session-id`へ渡し、expected team名を`session-<予約済みprefix>`として導出する。`team_name` prompt/flagや旧`TeamCreate`/`TeamDelete` toolを使わない。

stdin instructionは次の制約だけを構造化する。

1. leadは各Unitについて`[amadeus:<assignmentToken>] <unitSlug>` subjectの共有taskを1件作る。
2. Unit数と同数のnamed teammateをspawnし、各teammateへprepared worktreeを1件割り当てる。
3. teammateは他Unit worktreeを編集せず、Unit taskをcompletedへ更新する。
4. leadは全task completedと全teammate idleを待ってから終了する。
5. nested teamやlead自身のUnit実装を禁止する。

自然言語指示は起動要求であり証拠ではない。実team/task/hook stateだけを検証する。

### Ultra Code固有instruction

exact headless commandのstdin先頭でdynamic workflowを明示要求し、workflow scriptへ次を要求する。

1. manifestのUnit配列をinput `args`として扱う。
2. `pipeline(args.units, ...)`相当でUnitごとにちょうど1つのworker `agent()`を作る。
3. agent labelへassignment token、promptへUnit slug/worktreeを渡す。
4. 各agent resultをUnit slugで返し、全件settle後に終了する。
5. planner/verifierを含む余分なagentを作らない。

Claudeが生成したscript本文や「workflowを使った」という応答は保存・証拠化しない。provider workflow stateが実run/task/agentとlabelを記録し、stream/hook agent IDと一致した場合だけ成立する。

## Agent Teams evidenceアルゴリズム

### Exact path observer

expected session IDから次の2 pathを直接構築する。

```text
~/.claude/teams/session-<sessionId[0..8]>/config.json
~/.claude/tasks/session-<sessionId[0..8]>/
```

rootのdirectory listing、他team fallback、mtimeが新しいteamの採用は禁止する。observerはU-02がprovider wrapper arm前に開始し、予約済みexact path、prefix reservation、checkpointのfull session ID/digestを再検証する。symlinkを拒否し、realpathがexpected root配下であること、ownerがcurrent userであることを確認する。

team configはsession終了時に自動cleanupされるため、observerは実行中にvalid snapshotを繰り返し読み、最後のvalid normalized snapshotだけをattempt evidence dirへatomic replaceする。raw JSONは複製しない。task directoryはdispatch前に不存在を確認済みでなければ起動せず、実行中もfull session ID/assignment tokenと余分なtask 0件を要求する。

### Provider-state projection

allowlistは次だけである。

- config: member name、agent ID、agent type。
- task: task ID、subject内assignment token、status、owner teammate name、dependency task ID。
- file identity: expected team/task pathのdigest。path文字列自体は共有auditへ出さない。

task description、message、mailbox、transcript path、pane ID、prompt/outputは読み捨てる。member nameからagent ID、task ownerからUnit tokenへ結合し、`UnitChildBinding`を構築する。

### Hook/control projection

attempt専用hook directoryからprofileに登録した次のTeam eventだけをparseし、U-02 process supervisorからcontrol/terminal projectionを別入力として受け取る。PTY bytesや通常async Agentのstream表示からTeam event、ready signal、terminal evidenceを合成しない。

- `TaskCreated`: session ID、task ID、subject token、teammate name。
- `TaskCompleted`: session ID、task ID、subject token、teammate name。
- `TeammateIdle`: session ID、teammate name。
- `DriverControlSignal(ready-for-graceful-exit)`: session/coordinator ID、execution/attempt/nonce/plan/wave digest、expected Unit集合、live evidence digest。
- process terminal: wrapper identity、process group terminal status、exit code、capture join/seal digest。

deprecated `team_name`は存在しても診断以外に使わない。TaskCreated/Completedが同じtask/token、config/task snapshotが同じowner/memberへ結びつき、TeammateIdleが到着したときだけ、そのchildのcompleted stopを生成する。

### AND verdict

Agent Teams modeが成立するのは次のすべてが真の場合である。

1. `modeIdentifier=claude-agent-teams-v1`、coordinator session ID exact match、interactive `claude` + `pty-interactive` launch profile一致。
2. provider-stateに2 member以上、expected Unit全件のtask、Unit-member全単射。
3. hook projectionにexpected task全件のcreated/completedとowner全件のidle。
4. provider-stateとhook projectionのtask ID、assignment token、teammate nameが一致。
5. `claude-team-membership`と`claude-shared-task` markerが存在。
6. C-08のexecution/attempt/nonce/plan/wave correlationが一致。
7. 全Unit completedと全owner idleへ束縛した`ready-for-graceful-exit`を受け、U-02がPTYへgraceful exit inputをちょうど1回送る。signal単独は成功証跡に数えない。
8. 同じattemptのprocess groupがexit 0でterminalとなり、その後captureがjoin/sealされ、最終provider-state/hook evidenceがretainedされる。

## Ultra Code evidenceアルゴリズム

### Surface profile discovery gate

公式文書はworkflow scriptがsession directoryへ保存され、runtimeがagent resultを追跡すると説明する一方、run/task stateのstable field pathを公開していない。したがってCode Generation entryでcredentialed macOS discoveryを1回行い、次の最小fixtureだけを承認対象とする。

```text
ClaudeSurfaceProfile v1
  cli semver range
  system/init capability literals
  workflow-created stream envelope path
  workflow run ID field path
  run-state location derivation rule
  task ID / agent ID / label / status field paths
  SubagentStart/Stop envelope paths
```

fixtureはfield path、type、enum、synthetic IDだけを保持し、prompt、script、result、transcript、credential、local absolute pathを除去する。profileはexact version rangeとschema versionへ束縛する。新version/unknown capability/unknown fieldは推測せず`UNKNOWN_NATIVE_EVENT`件数と`native-evidence-unavailable`を返す。

run-state pathはstreamから得たrun IDとsession IDから一意に導出でき、expected session directoryへrealpath confinementできる場合だけ使う。`~/.claude/projects`全体をscanして最新runを探す方法は禁止する。これをlive discoveryで確立できなければU-03をparkする。

### Provider-state projection

profileでallowlistしたworkflow runから、run ID、task ID、worker agent ID、assignment label、statusだけを抽出する。generated script本文やagent prompt/resultは読まない。assignment labelのtokenをmanifestへ逆引きし、Unit-agent全単射を作る。

### Stream/hook projection

同じsessionのworkflow-created eventと`SubagentStart`/`SubagentStop`をparseする。start/stopのagent IDをprovider-state agent IDへ結合する。`SubagentStop.last_assistant_message`、transcript path、agent promptはschemaに取り込まない。Stop時のbackground taskにworkflowが残る場合、coordinator stopをcompletedにしない。

### AND verdict

Ultra Code modeが成立するのは次のすべてが真の場合である。

1. launchが`--effort ultracode`を使い、`modeIdentifier=claude-dynamic-workflow-v1`がprofile/streamで確認される。
2. provider-stateに実run IDが1つ、2 worker agent以上、expected Unit-agent全単射がある。
3. streamに同じrun/sessionのworkflow marker、全agentのSubagentStart/Stopがある。
4. 全task/agent statusがcompleted、coordinator exit 0、background workflow 0件である。
5. `claude-workflow` markerと`provider-state + stream` sourceが揃う。
6. xhighだけ、通常Agent toolだけ、prompt/assistant自己申告だけのevent集合ではない。

## Evidence hookと機密性

U-03はClaude harnessへattempt専用evidence hookを1つ追加する。framework sourceからdist/Claude/self-installへprojectionし、global `.claude/settings.json`へ常時有効なswarm stateを追加しない。adapterがephemeral settingsで次eventだけを配線する。

- Agent Teams: TaskCreated、TaskCompleted、TeammateIdle。
- Ultra Code: SubagentStart、SubagentStop、Stop。

hookはevidence dirのownership marker、session ID、attempt nonce hashを検証し、eventごとにexclusive-create fileへallowlist fieldだけを書く。並行hookが1つのJSONLへinterleaveしない。adapterはprovider streamを正本sourceとしてparseし、hook fileはcleanup前観測とstream相関のために使う。最終的にC-08へ渡すのは`NormalizedDriverEvent`だけである。

次を構造的に禁止する。

- env dump、credential/token value、auth status detail。
- stdin prompt、workflow script、task description、message/mailbox。
- assistant result、last assistant message、transcript path、raw stdout/stderr。
- home absolute pathやusername。共有eventにはdigest/enumだけを残す。

unknown raw eventは保存せず、profile別countだけを診断する。error messageも列挙code、driver、mode、CLI versionまでに限定する。

## Harness conductorと0.1.x互換

source of truthは`packages/framework/harness/claude/skills/amadeus/SKILL.md`である。現行の長い`invoke-swarm`分岐を、次の責務へ変更する。

1. engine directiveのbatch/units/topologyをpublic C-01 `resolve`へ渡し、selected planを受け取る。
2. harness conductor自身がC-11 `prepare`を呼び、返されたPreparedUnitをpublic C-01 `run`へ渡す。C-01はU-03 adapter/U-02 supervisor/C-08までを実行し、C-11をimport/callしない。
3. C-01が`claude-task-floor` planを返せば、現行Task fan-outをexecution planどおり実行して`record-floor`する。
4. 旧`AMADEUS_USE_SWARM=1`だけが存在する場合は、現行inline Dynamic Workflow behaviorを`claude-dynamic-workflow` legacy planとして実行して`record-legacy`する。
5. legacy workflow surfaceがdispatch前に利用不能な場合だけfloorへloud-degradeし、既存`SWARM_DEGRADED`を保持する。workflow開始後failureはfallbackしない。
6. native/floor/legacy結果を受けたconductorだけがC-11 `check` loopを回す。claimed/reasons確定後、C-01 `record-finalize(kind=request)`、C-11 `finalize`、C-01 `record-finalize(kind=result)`の順で二相handoffする。

C-01とC-11のsource import graphは両方向0 edgeでなければならない。versioned JSON、request digest、finalize invocation ID、result envelopeをharness conductorが明示的に受け渡し、C-01がauthoritative merge gateを迂回できないことをarchitecture testで固定する。

`AMADEUS_USE_SWARM`を新driverのon/offに使わず、`AMADEUS_SWARM_DRIVER`と併存した場合はU-01 conflict errorのままとする。U-03はglobal settingsへ`AMADEUS_*`を追加しない。

projection変更はClaude skill、evidence hook、harness manifest、generated dist/self-installへ限定する。project-local `.claude/settings.json`はpromotionでpreserveされるため正本にせず、`settings.json.example`へAgent Teamsを常時有効化する必要もない。native childのenvはC-05 launchが明示する。

## Failure、cleanup、resume

| Failure | Timing | Outcome |
|---|---|---|
| CLI/auth/mode/capture unavailable | pre-dispatch | explicit hard error / autoの固定fallback候補 |
| session prefix lock/path衝突、候補枯渇 | pre-dispatch | pathを削除せず停止。provider process 0件 |
| Agent Teams team未形成、member<2 | post-dispatch | failed-resumable、fallbackなし |
| team configがcleanup前にsnapshot不能 | post-dispatch | failed-resumable |
| capture observer停止/join不能 | post-dispatch | failed-resumable、success 0件 |
| task/Unit/member相関不一致 | post-dispatch | evidence failure |
| Ultra workflow run ID/path不明 | preflight discovery | U-03 park。floor代替なし |
| Ultra unknown schema/event | post-dispatch | failed-resumable、unknown countのみ |
| child不足/余分/stop欠落 | post-dispatch | evidence failure |
| coordinator crash/timeout | dispatch | U-02がgroup terminate/wait、failed-resumable |
| evidence green、check/finalize red | referee | U-02/C-11 verdictどおりsuccess禁止 |

normal exitではprovider自身のteam/workflow cleanupを妨げない。U-02はprovider group terminal後にcaptureをstopAndWaitし、adapterはlast valid snapshot、hook record、terminal streamをnormalizeする。その後U-02 `AuxiliaryResourceSupervisor`がephemeral settings、hook candidate、state scratchをowner receipt一致時だけ削除し、prefix reservationを解放する。cleanup failureは機密scratchが残る可能性があるためsuccessを禁止し、U-02がattempt dirをredacted診断付きで隔離する。U-03はcleanup closureを返さない。

crash/resumeではU-02がwrapper/provider process groupの非生存を証明する。new attemptはfresh probe、fresh UUID/session、fresh evidence dirを使い、旧provider session、team config、task state、workflow runを再利用しない。prepared worktreeとreferee-converged Unitの再利用可否はU-02/C-11が判定する。

## Deterministic testとlive proof

### Fake suite

fake `claude` executableはargv/env/cwd/stdin/exitとstreamを制御し、homeもtemp rootへ隔離する。production C-01 commandとproduction registry assemblyを通し、Claude slotだけが実adapterであることを検証する。

| Test group | 主なcase |
|---|---|
| registration | Claude setが2 driver/2 immutable view、Codex/Kiroが各1件またはplaceholder、duplicate/missing拒否、public C-01で両driver解決 |
| common probe | CLI missing、auth false/unknown、timeout、malformed status、hook sentinel欠落、attempt間cacheなし |
| Agent Teams launch | env、in-process、予約済みsession UUID、stdin close、prepared worktree全件、shell非使用 |
| prefix allocator | active teamだけ、persistent taskだけ、同prefix別full UUID、lock競合、arm直前race、候補枯渇、別attempt resume |
| Agent Teams evidence | 2 Unit happy path、member<2、duplicate/extra task、wrong full session、completed/idle欠落、cleanup race |
| capture lifecycle | capture checkpoint-before-arm、3 channel分離、observer停止不能、snapshot atomic replace、cleanup-before-snapshotでsuccess 0件 |
| Ultra launch | `--effort ultracode`必須、xhighのみ拒否、workflow disabled、stdin manifest |
| Ultra evidence | 2 Unit happy path、run ID欠落、unknown field、agent不足/余分、label重複、stop欠落 |
| confidentiality | planted credential/prompt/raw responseがstdout/stderr/audit/checkpoint/fixtureに0件 |
| compatibility | Task floor、legacy Dynamic Workflow、pre-dispatch loud-degrade、post-dispatch fallback禁止 |
| lifecycle | SIGTERM/SIGKILL、partial stream、snapshot直前cleanup、resumeで旧session不採用 |
| architecture | C-01↔C-11 import/call 0件、conductorのrequest/finalize/result順序、request/envelope binding |

### Credentialed macOS discovery/live

live testは明示opt-inとhost mutexを要求し、次の2段階に分ける。

1. Entry discovery: 最小非機密repoでAgent Teams/Ultraのfield pathを捕捉し、`ClaudeSurfaceProfile` fixtureを更新する。schemaを確定できないmodeはU-03をparkする。
2. Exit proof: 各modeについて2 Unit以上をClaude harness conductor → public C-01 → production registry → C-05 → U-02 capture/process supervisor → C-08まで通し、conductorがC-11 check/finalizeとC-01二相recordを媒介する。

保存するlive evidence indexはdriver/mode、CLI version、profile version、execution/attempt/run digest、marker/source、Unit/child count、check/finalize verdictだけである。auth不足、skip、unknown schema、fixtureだけ、floor、xhigh、自己申告はpassにしない。GitHub Actions Linuxはfake suiteだけ、Windowsは対象外とする。

## 完了不変条件

U-03を完了できるのは次がすべて成立した場合だけである。

1. generic production registrationがdriver-keyed adapter setを使い、Claude slotは2 immutable adapter、Codex/Kiroは各1 cardinalityをbuild時に検証する。provider mapping/literalに差分がない。
2. Agent Teamsが予約済みsession-derived team、dispatch前path衝突0件、独立provider-state + stream、2 Unit以上でTask floorと区別できる。
3. Ultra Codeが`--effort ultracode`、実workflow run/task/agent、provider-state + stream、2 Unit以上でxhigh/floorと区別できる。
4. unknown topology reasonとexplicit/auto/legacy意味がC-01から失われない。
5. raw provider data、prompt、credentialが永続surfaceへ0件である。
6. fake comprehensive suiteとmacOS両mode live proofがgreenである。
7. C-01とC-11にdirect edgeがなく、conductor媒介の`prepare`、`check`、record request、`finalize`、record resultを全Unitが通る。native evidenceだけでconvergedにならない。
8. capture plan/identityがcheckpointへ束縛され、provider arm前start、group terminal後join、cleanup-before-snapshot failureでsuccess 0件が証明される。

## Review

**Iteration:** 2
**Verdict:** READY

### 解消済みfinding

- Agent Teamsはheadlessではなくinteractive `claude`を`pty-interactive`で起動し、全Unit completed/idleの`ready-for-graceful-exit`、PTY exit input、process terminal、retained provider/hook evidenceをANDする。
- registrationはU-01のdriver-keyed setを消費し、U-03は2 immutable Claude descriptorだけを提供する。
- Agent Teamsは`fixed-provider-path`、Ultraは`event-bound-provider-path`を使い、capture lifecycleとC-01/C-11境界もU-02へ揃った。
- session prefix reservation、ephemeral settings、evidence/hook/snapshot rootはpure `prepareResources`から`AuxiliaryResourcePlan[]`として宣言され、U-02がmaterialize、checkpoint、owned cleanupする。U-03のdirect filesystem I/O/private cleanupは除去された。

### 新規finding

- Blocking findingなし。

### センサー結果

- `required-sections`: 4成果物すべてPASS。
- `upstream-coverage`: 4成果物すべてPASS、未参照0件。
- `linter` / `type-check`: 対象成果物はMarkdownのため非適用。
