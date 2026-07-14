# Swarm Driver Migration Unit定義

## 上流コンテキスト

本分解は、Application Designの`components`、`component-methods`、`services`、`component-dependency`、`decisions`と、Requirements Analysisの`requirements`を正本とする。`stories`は実行計画でSKIPされているため、`requirements`のUSR-01〜USR-10を利用者シナリオとして扱い、FR-24〜FR-26からrelease向けの受入シナリオREL-01〜REL-02を導出する。RELは新しいscopeではなく、既存要求をUnitへ割り当てるための識別子である。

承認済みApplication Designの責務境界は維持する。C-01はdriver lifecycleの公開入口、C-02〜C-04は共通contractと決定的selection、C-05〜C-07はprovider adapter、C-08〜C-10はevidence・attempt・audit、C-11は既存referee、C-12はdistribution projectionである。ADR-001〜ADR-009の共通tool、batch coordinator、二段階evidence、atomic checkpoint、versioned event、native proof、legacy shim、platform境界、mode別closed transportも変更しない。

## 分解原則

- Unitは独立した実装・test・review境界であり、常駐serviceや独立deployable packageではない。全Unitは既存`packages/framework`へ埋め込まれ、同じAmadeus framework releaseとして配布される。
- 純粋で決定的なselection policyと、lock・process・checkpointを持つstateful lifecycleを分ける。
- Claude、Codex、Kiro/Kiro IDEはproviderごとのvertical sliceとし、adapterからharness統合、fake CLI test、local live proofまでを同じUnitへ閉じる。
- `runtime.ts`をcomposition rootとして残し、provider固有adapterだけを非公開内部ファイルへ分ける。custom driverやplugin SDKは追加しない。
- batchは依存DAGからengineが導出する一時的なready Unit集合であり、Unitの親、永続domain object、手動の分割階層ではない。
- 本成果物は依存topologyを定義する。実装順、価値順、費用順、critical pathはDelivery Planningで決める。

## Unit一覧

| ID | Unit名 | Slug | 主境界 | Deployment model | 相対複雑度 |
|---|---|---|---|---|---|
| U-01 | Driver Contract & Selection Policy | `driver-contract-selection-policy` | C-02、C-03、C-04 registration contract、legacy policy | framework coreへembedded | L |
| U-02 | Swarm Execution Lifecycle | `swarm-execution-lifecycle` | C-01、C-04 production registry assembly、C-08〜C-10、C-11 envelope連携 | framework coreへembedded | XL |
| U-03 | Claude Native Driver | `claude-native-driver` | C-05、Claude conductor/projection | core + Claude harnessへembedded | L |
| U-04 | Codex Native Driver | `codex-native-driver` | C-06、Codex conductor/hook/projection | core + Codex harnessへembedded | L |
| U-05 | Kiro Native Driver | `kiro-native-driver` | C-07、Kiro/Kiro IDE conductor/projection | core + Kiro harnessesへembedded | L |
| U-06 | Release & Migration Closure | `release-migration-closure` | C-04実装済みslot検証、C-12、共有docs・移行追跡 | release closure、runtime非独立 | M |

複雑度はUnit間の相対値であり、implementation orderや優先度を示さない。

## U-01 Driver Contract & Selection Policy

### 定義と境界

新旧環境変数、公開driver 5値、内部floor、legacy execution、topology、probe結果、fallback reasonを閉じた型として定義し、同じ入力から同じselection planを返す純粋policyを所有する。外部CLI起動、filesystem、audit append、checkpoint write、provider event parsingは所有しない。

### 責務と成果

- `amadeus-swarm-driver-contract.ts`でC-02のdiscriminated unionとversioned JSON schemaを定義する。
- `amadeus-swarm-driver-selector.ts`でenv parse、競合拒否、別harness driver拒否、topology 4 fixture、`auto`表、fallback、legacy表を実装する。
- C-04の既知driver ID、`DriverAdapter`、`DriverRegistration`をversioned contractとして閉じた集合で定義する。U-01はregistrationの型とdriver-to-provider cardinalityを所有し、具象moduleの静的importやprocess lifecycleは所有しない。
- `AMADEUS_USE_SWARM`を新driverへ読み替えず、0.1.xのharness別execution planとdeprecation metadataを返す。
- stdout/stderr/auditへ渡せるredacted selection resultを定義し、secret-like fieldをcontract段階で拒否する。

### 要求・受入・test

- 主要求: FR-01〜FR-04、FR-07〜FR-10、FR-16〜FR-17、FR-22、NFR-01、NFR-06〜NFR-07。
- 利用者シナリオ: USR-01〜USR-09のselection部分。
- Unit test: 5値、未設定、空文字、不正値、新旧競合、別harness明示値、4 topology分類、全`auto`分岐、fallback reason順序、legacy全行を反復して同一結果にする。
- Property/fixture test: `selected=auto`、未知driver、silent fallback、未列挙reasonが生成されないことを検証する。
- 完了条件: selectorがprocess/worktree作成前に機械判定でき、harness proseへ選択表を複製せず、全selection fixtureが決定的にgreenとなる。

### 制約

Node/Bun標準以外のruntime I/Oへ依存しない。engine directiveへdriver fieldを追加せず、通常stage subagent、single-Unit、対話conductorへ適用しない。

## U-02 Swarm Execution Lifecycle

### 定義と境界

C-01の公開CLI lifecycleと、C-08 evidence verifier、C-09 attempt store、C-10 driver audit emitter、C-11 referee envelope連携を1つのstateful deep moduleへ閉じる。provider固有CLI command、provider raw event parser、harness tool invocationは所有しない。provider差を持たないclosed transport、capture、live controlのcontractと実行順序はこのUnitの共通境界として所有する。

### 責務と成果

- `amadeus-swarm-driver.ts`の`resolve`、`run`、`resume`、`record-floor`、`record-legacy`、`record-finalize`、`status`を実装する。
- `amadeus-swarm-driver-runtime.ts`をcomposition rootとし、probe-once、dispatch、normalized evidence検証、referee handoffを順序制御する。
- U-01が所有するversioned `DriverAdapter`、`DriverRegistration`、`ProbeResult`を消費し、`AdapterExecutionPlan`、`LaunchSpec`、`CoordinatorTransport`、`EvidenceCapturePlan`、`CaptureCheckpoint`を含む共通実行contractを閉じ、`createCoordinator({ registry })`という内部factoryでlifecycleを組み立てる。U-02の単体testだけはfake registrationを注入できるが、provider Unitのintegration/live proofは必ず下記production registry assemblyを通す。
- `CoordinatorTransport`は`stdio-json | pty-interactive`、captureは`fixed-provider-path | event-bound-provider-path | hook-only`のclosed unionとする。capture observer開始、variant付きcheckpoint保存、provider arm/spawn、event-bound時だけのfenced `capture-bound`、PTY時だけのlive control、process terminal、observer join、retained evidence正規化の順をprovider-neutralに制御する。
- C-04 production registry assemblyをcomposition root内に置き、`claude.ts`、`codex.ts`、`kiro.ts`の3 moduleを静的importして4 native driver値へexhaustiveに対応付ける。動的discoveryは行わない。
- U-02収束時点では3 provider moduleに型付きfail-closed `unavailable` registration slotを用意する。slotはprovider IDと未実装reasonだけを返し、native workerを起動できない。U-03〜U-05は自分のslotだけを実装へ置換する。
- batch execution ID、attempt ID、lease、fencing token、audit-first transition、atomic replace、crash reconciliationを実装する。
- 既存`amadeus-swarm.ts`の`prepare` / `check` / `finalize`意味を維持し、versioned finalize envelopeとmerge resultを追加する。driver toolとrefereeは互いを直接呼ばず、conductorが媒介する。
- `SWARM_DRIVER_ATTEMPTED`、`SWARM_DRIVER_SELECTED`、`SWARM_DRIVER_TRANSITION`、`SWARM_DRIVER_RECONCILED`、`SWARM_NATIVE_EVIDENCE`をredaction済みfieldだけで発行する。

### 要求・受入・test

- 主要求: FR-05〜FR-06、FR-15、FR-18〜FR-22、NFR-02〜NFR-05、NFR-11。
- 利用者シナリオ: USR-01〜USR-08の共通lifecycleとUSR-10。
- Unit/integration test: probeがbatch/attemptごと1回、明示probe failureでworker/worktree 0件、post-dispatch fallback 0件、evidence全単射、audit redactionを検証する。fake `stdio-json` / `pty-interactive`と3種のcapture planを使い、capture-before-arm、fixed initial binding、event-bound一回だけの`capture-bound`、hook-onlyのbinding禁止、PTY control timeout、terminal-before-joinを網羅する。
- Failure injection: probe timeout、native evidence欠落、partial worker failure、audit成功後checkpoint失敗、lease失効、stale writer、referee check/finalize/merge失敗を検証する。
- E2E fixture: 2 Unit以上のfake adapterを既存worktree、protected spec、lying-conductor guard、`prepare` / `check` / `finalize`へ通す。
- 完了条件: provider具象実装なしでclosed transport/capture全variantとlive controlをfake adapterから実行でき、U-03〜U-05が共通contract/runtimeを編集せずreadyになれる。native自己申告だけでは成功せず、native result、referee convergence、merge-backが揃うまでbatch成功eventを発行しない。再開後も成功二重発行と未完了Unit成功化が0件となる。

### 制約

checkpointとaudit transitionを別Unitへ分けない。provider credential、prompt、raw responseを永続化しない。新しいdaemon、network service、AWS resourceは作らない。

## U-03 Claude Native Driver

### 定義と境界

C-05の1つのClaude adapterで`claude-agent-teams`と`claude-ultracode`を別modeとして扱い、Claude Code harnessから共通driver lifecycleをend-to-endで利用可能にする。共通selector、transport/capture runtime、attempt state、evidence verdict、referee verdictは再実装しない。Code Generation入口で判明したheadless Agent Teams不成立は、完成済みU-02 contractの`pty-interactive` variantをClaude adapterから利用して回復する。

### 責務と成果

- `amadeus-swarm-driver-adapters/claude.ts`で共有CLI/auth probeとmode固有surface probeを実装する。
- U-02が用意したClaudeのfail-closed registration slotを、Agent TeamsとUltra Codeの2 modeを提供する実descriptorへ置換する。他provider slotとregistry mappingは変更しない。
- Agent Teamsはbatchごと1つのinteractive PTY上で`claude` coordinatorを起動し、`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`、in-process teammate mode、attempt専用session、exact team/task state、TaskCreated / TaskCompleted / TeammateIdle、共有taskのUnit-child全単射を証明する。全Unit task completedかつ全owner idleのlive projectionだけが`ready-for-graceful-exit`を返し、runtimeがPTYへexit inputを送る。このsignalは終了制御だけに使い、成功証跡へ数えない。
- Ultra Codeはbatchごと1つのheadless `claude -p --verbose --effort ultracode --output-format stream-json --include-hook-events` coordinatorを起動し、Dynamic Workflow run/task/agent ID、completed snapshot、journal/stream、hook、Unit割当を相関する。`xhigh`やcoordinator自己申告だけをnative successにしない。
- Agent Teamsはattempt専用session launch planからarm前の`initialBinding`を作る`fixed-provider-path`、Ultra Codeはnative eventからexact run/pathへ一度だけ束縛する`event-bound-provider-path`を使う。raw PTY bytesやroot scanへTeam構造を推測せず、terminal後のretained evidenceで最終判定する。
- U-02が完成条件として提供するclosed transport/capture union、binding、live control、capture lifecycleを変更せずに消費する。common runtimeへClaude名の条件分岐を追加せず、既存`node-pty` 1.1.0を再利用して新しいruntime dependencyを追加しない。
- Claude harnessの`invoke-swarm` conductor手順とprojectionをC-01呼出しへ変更し、既存Task floorと0.1.x Dynamic Workflow behaviorをexecution planとして維持する。
- provider raw stream、team/task state、workflow eventをversioned normalized eventへ変換し、生payloadをadapter外へ出さない。

### 要求・受入・test

- 主要求: FR-05〜FR-06、FR-11〜FR-12、FR-15、FR-19、FR-23、NFR-02、NFR-04、NFR-11。
- 利用者シナリオ: USR-01〜USR-03、USR-06〜USR-08、USR-10のClaude経路。
- Deterministic integration: fake PTYとfake headless `claude`、team/workflow state fixture、capture-before-arm、fixed/event-bound binding、live control、graceful exit、process/env/cwd/stdin、未知schema、child不足、mode marker欠落、cleanup前snapshot欠落を検証する。
- macOS opt-in live proof: Claude conductorから公開C-01 CLIとproduction registry assemblyを通して、Agent Teamsはinteractive PTYで2 teammate以上、Ultra Codeはheadless workflowで2 Unit以上をそれぞれ1回以上実行し、mode固有native証跡、各Unit成果、`check`、`finalize`を保存する。Codex/Kiro slotがfail-closed placeholderでもClaude harnessのselection対象外なのでClaude proofを妨げない。認証不足やsurface不明はpassにしない。
- 完了条件: Agent TeamsとUltra Codeの両方がClaude Task floorと機械的に区別され、明示modeを別方式へ置換しない。
- Review checkpoint: (1) Agent Teams adapter/fixture、(2) Ultra Code adapter/fixture、(3) Claude harness/legacy projection、(4) credentialed live proofの4区分ごとに、変更ファイル集合と独立したdeterministic test結果を提示する。各区分はU-02共通runtimeを編集せず、失敗時のrollbackをClaude provider境界内へ閉じる。

### 制約

provider Unit内部で2 modeを別acceptance sliceにする。Unit内部をさらにAgent Team化しない。他teamをscanせず、execution由来のteam/runだけを読む。selector、U-02共通runtime、checkpoint store、evidence verdict、resume、referee、他provider mappingはU-03の変更対象外とする。

## U-04 Codex Native Driver

### 定義と境界

C-06のCodex adapterとCodex固有evidence hookを所有し、通常の`codex exec` floorや`xhigh`と区別できる`codex-ultra`をCodex harnessからend-to-endで実行可能にする。

### 責務と成果

- `amadeus-swarm-driver-adapters/codex.ts`でCLI/auth、Ultra reasoning受理、multi-agent surface、hook trustをprobeする。
- U-02が用意したCodexのfail-closed registration slotを、`codex-ultra`実descriptorへ置換する。他provider slotとregistry mappingは変更しない。
- batchごと1つの`codex exec --json` coordinatorを起動し、stdinをcloseし、resolved modelのUltra受理と2 child agent以上へのUnit委譲を要求する。
- attempt専用`SubagentStart` / `SubagentStop` evidence hookを実装し、thread ID、child agent ID、Unit割当をnonce付きで相関する。
- Codex harnessの`invoke-swarm` conductor、config/trust、manifest/projectionをC-01呼出しへ変更し、既存Unit別`codex exec` floorと0.1.x loud degradationを維持する。
- `xhigh`、単一thread、plan update、coordinator自己申告だけをnative evidenceとして拒否する。

### 要求・受入・test

- 主要求: FR-05〜FR-06、FR-13、FR-15、FR-19、FR-23、NFR-02、NFR-04、NFR-11。
- 利用者シナリオ: USR-04、USR-06〜USR-08、USR-10のCodex経路。
- Deterministic integration: fake `codex` JSONL、model handshake、hook event、process/env/cwd/stdin close、Ultra downgrade、child不足、nonce不一致を検証する。
- macOS opt-in live proof: Codex conductorから公開C-01 CLIとproduction registry assemblyを通し、Ultra対応modelとnative multi-agentで2 Unit以上を実行してresolved model/mode、native委譲、Unit成果、`check`、`finalize`を保存する。他providerのfail-closed slotはCodex selectionへ参加しない。
- 完了条件: `codex-ultra`が通常の`codex exec` floorおよびxhigh-only実行と機械的に区別され、Ultra非対応ならworker開始前にhard errorとなる。

### 制約

存在しない`--ultra` flagや特定model slugをhard-codeしない。hookはassistant message、prompt、credentialを記録しない。

## U-05 Kiro Native Driver

### 定義と境界

C-07のKiro adapterを所有し、Kiro CLIとKiro IDEの既存harness surfaceから、非対話trustを満たした`kiro-subagent`をend-to-endで利用可能にする。

### 責務と成果

- `amadeus-swarm-driver-adapters/kiro.ts`でCLI/auth、non-interactive trust、subagent/session metadata surfaceをprobeする。
- U-02が用意したKiroのfail-closed registration slotを、Kiro CLI/Kiro IDE共通の`kiro-subagent`実descriptorへ置換する。他provider slotとregistry mappingは変更しない。
- 入力順を保ち、2〜4 Unitのbalanced waveへ決定的に分割する。5件は3+2、9件は3+3+3、13件は4+3+3+3とし、Unit dropと1件末尾waveを禁止する。
- waveごと1つのKiro coordinatorを起動し、parent session、completed child session、Unit割当の全単射をstreamとsession metadataのANDで証明する。
- Kiro CLI/Kiro IDEのconductor、agent trust、manifest/projectionをC-01呼出しへ変更し、既存subagent floorと0.1.x loud degradationを維持する。
- Kiro IDE固有hook形式は既存projection境界へ閉じ、driver selection policyを複製しない。

### 要求・受入・test

- 主要求: FR-05〜FR-06、FR-14〜FR-15、FR-19、FR-23、NFR-02、NFR-04、NFR-10〜NFR-11。
- 利用者シナリオ: USR-05〜USR-08、USR-10のKiro経路。
- Deterministic integration: fake Kiro CLI/session metadata、trust不足、approval要求、wave fixture、parent-child不一致、child不足、Unit dropを検証する。
- macOS opt-in live proof: Kiro/Kiro IDE conductorから公開C-01 CLIとproduction registry assemblyを通し、2 Unit以上と5 Unitのfixtureでnative subagent、balanced wave、各Unit成果、`check`、`finalize`を保存する。他providerのfail-closed slotはKiro selectionへ参加しない。
- 完了条件: trust不足をworker作成前に拒否し、上限を超える全Unitを決定的waveで処理し、既存floorとnative session evidenceを区別する。

### 制約

provider CLIの人向け文言だけへ依存しない。前waveのevidence verified前に次waveを起動しない。Windows対応は表明しない。

## U-06 Release & Migration Closure

### 定義と境界

3 provider adapterが揃った時点のclosed registry完全性検証と、C-12 Distribution Projection、共有文書、platform matrix、移行追跡を1つのrelease invariantとして閉じる。新しいdriver behavior、provider parser、registry mappingは実装しない。

### 責務と成果

- U-02のproduction registry assemblyが4 native driver値をexhaustiveに静的配線し、Claude/Codex/Kiroの全registration slotが実descriptorへ置換済みであることをdeterministic checkで保証する。placeholder、余分なdescriptor、未知driver、動的loadを0件にする。
- `packages/framework`正本からClaude、Codex、Kiro、Kiro IDE、`dist`、Claude/Codex self-installへ生成し、drift 0を確認する。生成先を直接編集しない。
- User Guide、harness guide、developer reference、migration guide、環境変数例へ5値、選択表、hard error、loud fallback、legacy、macOS/Linux、Windows未保証を同期する。
- 全deterministic suiteをmacOSとGitHub Actions Linuxで通し、provider Unitが保存した4 driverのmacOS live evidenceをrelease matrixから追跡する。
- `AMADEUS_USE_SWARM`の読取、compatibility branch、warning、legacy-only test、暫定文書を0.2.0で削除するGitHub Issueを日本語で起票し、全harness検証を受入条件にする。

### 要求・受入・test

- 主要求: FR-22〜FR-26、NFR-06、NFR-08〜NFR-09、NFR-11〜NFR-12。
- 導出シナリオ: REL-01「maintainerが全harnessへ同じdriver契約を配布・検証できる」、REL-02「maintainerが0.2.0削除scopeを追跡できる」。
- Distribution test: `package.ts --check`、全harness generated tree、`promote-self --check`、setup/self-install、docs contract scanを検証する。
- Platform verification: macOSとGitHub Actions Linuxでunit/integration/E2E/distributionをgreenにする。credentialed live CIとWindowsは要求しない。
- 完了条件: registry placeholderが0件、正本と全生成物のdriver契約driftが0件、4 driverのlive evidence参照が欠落0件で、0.2.0 IssueのURLが成果へ記録される。

### 制約

release closureをprovider固有実装の修正場所にしない。live proofの不足をskipや文書上の主張で埋めない。0.2.0削除そのものは今回実装しない。

## 横断的な受入制約

| 制約 | 適用Unit | 検証 |
|---|---|---|
| 明示driverはsilent fallbackしない | U-01〜U-05 | selector fixture + provider preflight integration |
| native証跡とreferee収束のAND | U-02〜U-05 | fake/native E2E + lying-conductor guard |
| closed transport/capture lifecycle | U-02、U-03〜U-05 | fake PTY/stdio + capture checkpoint/binding failure injection |
| credential・prompt・raw payload非保存 | U-01〜U-05 | schema validation + secret scanner + failure fixture |
| legacy意味を0.1.x中は維持 | U-01、U-03〜U-06 | harness別legacy fixture + docs scan |
| macOS/Linuxのみ保証、Windows対象外 | U-03〜U-06 | release matrix + docs/distribution checks |
| 正本は`packages/framework` | 全Unit | package drift guard。`dist`直接編集なし |
| Comprehensive test追跡 | 全Unit | FR別test/live evidence matrix |

## 要求カバレッジ要約

| 要求群 | 主担当Unit | 補助Unit |
|---|---|---|
| FR-01〜FR-04、FR-07〜FR-10 | U-01 | U-02、U-03〜U-05 |
| FR-05〜FR-06 | U-02 | U-03〜U-05 |
| FR-11〜FR-12 | U-03 | U-01、U-02 |
| FR-13 | U-04 | U-01、U-02 |
| FR-14 | U-05 | U-01、U-02 |
| FR-15 | U-02 | U-03〜U-05 |
| FR-16〜FR-17 | U-01 | U-02、U-03〜U-06 |
| FR-18〜FR-21 | U-02 | U-03〜U-05 |
| FR-22 | U-01、U-02、U-06 | U-03〜U-05 |
| FR-23 | U-03〜U-05 | U-02、U-06 |
| FR-24〜FR-26 | U-06 | U-01〜U-05 |

FR-01〜FR-26は少なくとも1つの主担当Unitを持つ。NFR-01〜NFR-12は各Unitの受入制約とU-06のrelease matrixで追跡する。

### FR別の主担当と必須証跡

| FR | 主担当Unit | 必須test / evidence |
|---|---|---|
| FR-01 | U-01 | 未設定=`auto`と5値共通fixture |
| FR-02 | U-01 | 不正値・空文字・別harness値のno-side-effect fixture |
| FR-03 | U-01 | multi-Unit `invoke-swarm`だけへ適用するscope fixture |
| FR-04 | U-01 | 新旧env全競合fixture |
| FR-05 | U-02 | batch/attempt内probe 1回とworker-before-probe 0件のintegration |
| FR-06 | U-02 | 明示probe failureで代替worker 0件のfailure test |
| FR-07 | U-01 | 全selection branchの反復決定性fixture |
| FR-08 | U-01 | coordinated/independent/both/unknownの4 fixture |
| FR-09 | U-01 | Claude unknown時のUltra選択とreason表示・監査fixture |
| FR-10 | U-01 | `auto`だけの列挙済みloud fallback fixture |
| FR-11 | U-03 | interactive Agent Teams fake PTY + macOS 2 teammate live proof |
| FR-12 | U-03 | exact Ultra Code headless command fixture + macOS 2 Unit live proof |
| FR-13 | U-04 | Ultra handshake/hook integration + macOS 2 Unit live proof |
| FR-14 | U-05 | trust/wave fixture + macOS 2/5 Unit live proof |
| FR-15 | U-02 | 4 driver共通のprepare/check/finalizeとlying-conductor E2E |
| FR-16 | U-01 | harness別0.1.x legacy全行fixture |
| FR-17 | U-01 | 解決試行ごとのstderr warningとexecution ID audit fixture |
| FR-18 | U-02 | execution/attemptからselection・Unit・evidence・finalizeの相関test |
| FR-19 | U-02 | stdout/stderr/audit/checkpoint/fixtureのsecret scanner |
| FR-20 | U-02 | crash、new attempt、確定済みUnit再利用のfailure injection |
| FR-21 | U-02 | native/referee/merge各failureで成功event 0件のatomicity test |
| FR-22 | U-01、U-02 | deterministic unit/integration suite全分岐 |
| FR-23 | U-03、U-04、U-05 | 4 native driverのmacOS opt-in live evidence |
| FR-24 | U-06 | package/dist/self-install drift 0 |
| FR-25 | U-06 | User/harness/developer/migration docs contract scan |
| FR-26 | U-06 | 日本語GitHub Issue、削除checklist、全harness受入条件、URL |

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-14T09:34:34Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Resolved（前回Critical） | `unit-of-work.md` U-02/U-03、`unit-of-work-dependency.md`「Provider Unit convergence seam」「Shared resourcesと競合制御」「並列開発可能性」、`unit-of-work-story-map.md` U-02/U-03・Transport/capture lifecycle | provider-neutralなclosed transport/capture contract、runtime、全variant fake test、完了条件はU-02へ全面移管された。U-03〜U-05は完成済みU-02 contractだけを消費し、共通seamを編集しないことが3成果物で一致しているため、U-03とU-04/U-05のhidden dependencyは解消した。 | 追加対応なし。U-02完了前にprovider Unitをreadyにしない現在のdependency invariantを維持する。 |
| 2 | Resolved（前回Major） | `unit-of-work.md` U-03、`unit-of-work-story-map.md` U-03 Slice 1〜5 | U-03はClaude adapter、Claude harness、provider固有fixture/live proofへ縮小され、selector・U-02共通runtime・checkpoint/evidence/referee・他provider mappingは変更対象外になった。Agent Teams、Ultra Code、harness/legacy、live proofの4 review checkpointごとに変更ファイル集合と独立したdeterministic test結果を要求しており、1 Unitのreview/rollback境界として実装可能である。 | 追加対応なし。4 checkpointの証跡をConstruction時のPRに保持する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `amadeus-sensor-required-sections.ts` | PASS（3/3、dependency edge block `ok`） | H2必須節とmachine-readable YAMLは構造上有効で、宣言された6 Unit DAGにcycle/self-loop/未宣言参照はない。 |
| `amadeus-sensor-upstream-coverage.ts` | PASS（3/3、未参照0件） | `components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`、`stories`への参照は全成果物に存在する。 |
| `git diff --check` | PASS | whitespace errorなし。 |

### Summary

前回のCritical/MajorはともにResolvedで、新規blocking findingはない。6 UnitのDAG、provider並列性、mode別capture、live controlと最終successの分離、要求・scenario coverage、shared resource ownershipは実装可能な形で閉じているためREADYと判定する。
