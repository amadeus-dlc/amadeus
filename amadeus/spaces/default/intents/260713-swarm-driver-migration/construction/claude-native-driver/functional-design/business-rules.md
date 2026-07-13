# Claude Native Driver ビジネスルール

## 上流トレーサビリティ

本成果物は`unit-of-work.md`のU-03、`unit-of-work-story-map.md`の5 acceptance slice、`requirements.md`のFR-05〜FR-06、FR-11〜FR-12、FR-15、FR-19、FR-23、NFR-02、NFR-04、NFR-11、`components.md`のC-05/C-08、`component-methods.md`のadapter/evidence union、`services.md`のClaude process contractを具体化する。

## Registrationとprobe

| ID | ルール | 違反時 |
|---|---|---|
| CBR-01 | generic registrationはdriver-keyed `DriverAdapterSet`を使い、Claude=2 adapter、Codex/Kiro=各1 adapterのcardinalityとadapter.driver一致をbuild時に検証する | production registry起動拒否 |
| CBR-02 | C-05は1 module/class familyとして2つのimmutable mode-bound viewをClaude setへ格納し、provider mapping/literalとCodex/Kiro実装状態を変更しない | build/test failure |
| CBR-03 | common CLI/auth probeは同一resolve scopeで1回だけ実行し、mode probeを追加する。cacheはattempt外へ出さない | `capability-probe-failed` |
| CBR-04 | probe順はCLI 5秒、auth 10秒、mode/evidence surface、非破壊handshake 30秒、総45秒で固定する | candidate unavailable |
| CBR-05 | version、env、flag受理だけでavailableにせず、非機密behavior handshakeとcapture surfaceを必要とする | `native-surface-unavailable` |
| CBR-06 | 明示modeのprobe failureはhard error、`auto`だけがdispatch前にU-01候補列へfallbackできる | worker/worktree 0件 |
| CBR-07 | Agent Teamsは2.1.178以降のsession-derived team contract、Ultra Codeは2.1.203以降の`--effort ultracode` contractをversioned profileで扱う | unknown profile |

## Launchとisolation

| ID | ルール | 違反時 |
|---|---|---|
| CBR-08 | native modeはbatch/waveごとに`claude -p` coordinatorをちょうど1 process起動する | launch拒否 |
| CBR-09 | Agent Teamsはexperimental env=`1`、`--teammate-mode in-process`、execution由来`--session-id`を明示する | mode evidence failure |
| CBR-10 | Ultra Codeは`--effort ultracode`を明示し、xhigh単独やkeyword自己申告を代替にしない | mode evidence failure |
| CBR-11 | 両modeは`--output-format stream-json`、`--include-hook-events`、`--verbose`、attempt専用ephemeral settings/hookを使う | `native-evidence-unavailable` |
| CBR-12 | Unit manifest/promptはstdinだけへ渡し、argv、settings、audit、checkpoint、fixtureへ保存しない | confidentiality failure |
| CBR-13 | envは固定allowlistで構築し、選択されていないprovider credential、全env dump、raw値を渡さない | launch拒否 |
| CBR-14 | Unitごとにreferee prepared worktreeを明示し、Claude自身の自動worktreeへ成果を置かない | Unit result拒否 |
| CBR-15 | wrapper identity/checkpoint/arm/process groupはU-02をそのまま使用し、C-05が独自supervisorを作らない | architecture violation |
| CBR-15a | adapterはpureな`AdapterExecutionPlan(LaunchSpec + EvidenceCapturePlan)`を返し、hidden observer I/Oやprivate mutable closureを持たない | launch拒否 |
| CBR-15b | U-02はcapture identity/plan digestをcheckpointへ保存し、capture start後だけproviderをarmし、group terminal後にcapture stop/joinする | success禁止 |
| CBR-15c | Ultraのstate observerはstream-boundで開始し、allowlisted run-created eventから得たexact path bindingをU-02 checkpointへ保存した後だけpollする | bindingなしはevidence failure |

## Agent Teams evidence

| ID | ルール | 違反時 |
|---|---|---|
| CBR-16 | team nameは指定せず、execution/attempt/wave由来UUIDの公式session-derived nameだけを読む | evidence failure |
| CBR-17 | `~/.claude/teams/<expected>/config.json`と`~/.claude/tasks/<expected>/`以外を列挙・読取しない | security failure |
| CBR-17a | deterministic counterごとにprefix lockをatomic予約し、team/task両exact pathが不存在の候補だけをdispatch前checkpointへ束縛する。既存pathを削除・再利用しない | provider process 0件 |
| CBR-18 | provider-stateはmembers 2件以上、taskとUnit tokenの全単射、member owner、completed statusを要求する | `NATIVE_EVIDENCE_BINDING_MISMATCH` |
| CBR-19 | streamは同じsessionのTaskCreated/TaskCompleted/TeammateIdleを要求し、deprecated `team_name`単独には依存しない | `NATIVE_EVIDENCE_SOURCE_MISSING` |
| CBR-20 | `native-child-stopped(completed)`はtask completedと対応teammate idleの両方が揃ったときだけ生成する | child incomplete |
| CBR-21 | config cleanup前にobserverがvalid snapshotを保存できなければ、process exit 0でもsuccessにしない | `NATIVE_EVIDENCE_STATE_MISSING` |

## Ultra Code evidence

| ID | ルール | 違反時 |
|---|---|---|
| CBR-22 | provider workflow stateから実run ID、task/agent ID、assignment labelを取得する | `NATIVE_EVIDENCE_STATE_MISSING` |
| CBR-23 | stream/hookのSubagentStart/Stop agent IDをprovider-stateのagent IDへ相関する | `NATIVE_EVIDENCE_BINDING_MISMATCH` |
| CBR-24 | Unitとnative worker agentは1対1、2件以上で、余分・欠落・重複を認めない | evidence failure |
| CBR-25 | workflow coordinatorの自己申告、生成script本文、xhigh、通常Agent toolだけを証拠にしない | evidence failure |
| CBR-26 | live discoveryでallowlistしたschema path以外はparseせず、未知schema件数だけを診断する | post-dispatchはfailed-resumable |
| CBR-27 | public/stable pathでrun/task/agent mappingを取得不能ならU-03をparkし、同名driverをfloorで成功扱いしない | scope return |

## Confidentiality、failure、resume

| ID | ルール | 違反時 |
|---|---|---|
| CBR-28 | normalized eventはID、enum、digest、Unitだけを持ち、message、prompt、description、transcript、raw responseを持たない | schema rejection |
| CBR-29 | hookはattempt ownership markerとnonce hashを検証し、eventごとのexclusive fileへ最小fieldだけを書く | hook event拒否 |
| CBR-30 | dispatch後のprocess、unknown event、child不足、mode marker欠落から別mode/floorへfallbackしない | failed-resumable |
| CBR-31 | crash/resumeでは旧Claude session/team/workflowを再利用せず、新attemptでfresh probeとsession IDを使う | resume拒否 |
| CBR-32 | evidence verified後もU-02/C-11の`check`と`finalize`がgreenでなければsuccessにしない | terminal success禁止 |
| CBR-32a | C-01とC-11は相互import/callせず、harness conductorだけがprepare/check、record-finalize request、finalize、record-finalize resultを順に媒介する | architecture failure |

## Compatibilityと検証

| ID | ルール | 違反時 |
|---|---|---|
| CBR-33 | 新driver pathはC-01を通し、`AMADEUS_USE_SWARM=1`の0.1.x Dynamic Workflow pathとは別variantとして保持する | compatibility failure |
| CBR-34 | legacy Dynamic Workflow unavailable時だけ既存`claude-task-floor`へloud-degradeし、開始後failureはfallbackしない | `SWARM_DEGRADED`契約違反 |
| CBR-35 | fake suiteはpublic C-01とproduction registryを通し、test-only registry injectionでU-03成功を作らない | acceptance failure |
| CBR-36 | macOS live proofは各mode 2 Unit以上、native evidence、成果、check、finalizeを必須とし、auth不足/skip/unknown schemaをpassにしない | live suite failure |
