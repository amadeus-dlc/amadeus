# Swarm Driver コンポーネント設計

## 上流コンテキスト

本設計は `requirements`、brownfield の `architecture` と `component-inventory`、および `team-practices` を入力とする。User Stories（`stories`）は実行計画でSKIPされているため、機能要求FR-01〜FR-26と利用シナリオUSR-01〜USR-10を振る舞いの正本とする。

既存の責務境界は維持する。`amadeus-orchestrate.ts`はConstruction batchのeligibilityだけを判定し、`amadeus-swarm.ts`はUnit worktreeの準備、収束再検証、merge-backだけを判定する。新設するdriverモジュールは、この2つの間で選択、能力検査、native dispatch、証跡検証、再開checkpointを所有する。

## コンポーネント一覧

| ID | コンポーネント | 種別 | 主責務 | 所有しないもの |
|---|---|---|---|---|
| C-01 | `SwarmDriverCoordinator` | 新規・共通tool | driver lifecycleの唯一の公開入口。resolve、dispatch、resume、referee結果取込を順序制御する | swarm eligibility、Unit収束判定、merge |
| C-02 | `DriverContract` | 新規・共通型 | driver値、floor ID、topology、probe、normalized event、checkpointの閉じた型を定義する | provider固有JSON |
| C-03 | `DriverSelector` | 新規・純粋ロジック | env解析、legacy互換、topology分類、`auto`選択、fallback判定を決定的に行う | CLI起動、I/O |
| C-04 | `DriverAdapterRegistry` | 新規・閉じたregistry | 4 native driverのprovider adapterだけを既知集合として引く | floor実行、custom driver/plugin SDK |
| C-05 | `ClaudeDriverAdapter` | 新規・provider adapter | Agent TeamsとUltra Codeのprobe、batch coordinator起動、native evidence正規化 | checkpoint、audit、収束判定 |
| C-06 | `CodexDriverAdapter` | 新規・provider adapter | Codex multi-agent coordinatorのprobe・起動、JSONLとSubagent hookの正規化 | undocumentedな`--ultra` flagの仮定 |
| C-07 | `KiroDriverAdapter` | 新規・provider adapter | trust条件確認、2〜4 Unitのbalanced wave分割、Kiro coordinator起動、parent-child session証跡の正規化 | Unit drop、1 Unit末尾wave、暗黙skip |
| C-08 | `NativeEvidenceVerifier` | 新規・共通policy | normalized eventだけを読み、native driverごとの必須証跡とUnit割当をfail-closed検証する | provider生出力の解析 |
| C-09 | `DriverAttemptStore` | 新規・永続化 | record-local checkpointをlock下でatomic writeし、execution/attemptを再開する | credential、prompt、生レスポンス |
| C-10 | `DriverAuditEmitter` | 新規・監査 | driver lifecycleの監査eventをredaction済みfieldだけで発行する | referee既存の収束event |
| C-11 | `SwarmReferee` | 既存・変更最小 | `prepare` / `check` / `finalize`、protected spec、lying-conductor guard、merge | AI dispatcher、driver選択 |
| C-12 | `DistributionProjection` | 既存拡張 | 共通正本をClaude、Codex、Kiro、Kiro IDE、`dist`、self-installへ同期する | 生成先の直接編集 |

## 公開境界

### C-01 `SwarmDriverCoordinator`

ハーネスのSKILL proseが呼ぶ唯一の新しい実行境界とする。CLI正本は `packages/framework/core/tools/amadeus-swarm-driver.ts` に置き、各ハーネスへ既存manifest経路で投影する。公開subcommandは次に限定する。

1. `resolve` — env、harness、batch、Units、topologyを検証し、batch内1回のprobeを行って選択planとexecution/attempt IDを確定する。
2. `run` — native planへreferee `prepare`のworktree manifestを束縛し、1 coordinator processを起動してnative evidenceを検証する。floor/legacy planでは実行せず、既存harness behaviorへ渡す機械可読manifestを返す。
3. `resume` — 再開可能失敗、または期限切れleaseと旧owner非生存を証明できるactive checkpointへ新attempt IDとfencing tokenを発行し、probeから再開する。
4. `record-floor` — conductorが既存Claude Task / Codex exec / Kiro subagent floorを実行した結果をattemptへ記録する。
5. `record-legacy` — 4 harnessの0.1.x互換実行結果を新driverへ読み替えずattemptへ記録する。
6. `record-finalize` — execution/attempt/plan/worktree/finalize IDとdigestを持つreferee envelopeを取り込み、成功または再開可能な失敗をcheckpointへ反映する。
7. `status` — 機密値を含まないattempt要約を表示する。

ハーネスproseは選択表、driver値、fallback規則を再実装しない。engineの`invoke-swarm`受領後にC-01を呼び、C-11の結果をC-01へ返すだけとする（FR-01、FR-03、NFR-06）。

### C-02〜C-04 共通domain境界

`DriverContract`は公開値5種、内部floor 3種、0.1.x legacy executionをdiscriminated unionで分離する。`DriverSelector`はその型だけを受け取り、副作用なしで同じ入力から常に同じ結果を返す。`DriverAdapterRegistry`はswitch exhaustive checkで4 native driverだけを列挙する。floorとlegacyはprovider adapterではなくconductor execution planとしてC-01が返し、未知値を動的ロードしない（FR-02、FR-07、FR-16、OOS-02）。

実装配置は公開入口と共通runtimeを4ファイルへ保ち、provider固有adapterだけを内部directoryへ分ける。

```text
packages/framework/core/tools/
├── amadeus-swarm-driver.ts
├── amadeus-swarm-driver-contract.ts
├── amadeus-swarm-driver-selector.ts
├── amadeus-swarm-driver-runtime.ts
└── amadeus-swarm-driver-adapters/
    ├── claude.ts
    ├── codex.ts
    └── kiro.ts
```

`amadeus-swarm-driver-runtime.ts`はcomposition rootであり、evidence verifier、attempt store、audit emitterを同じ原子的runtime境界へ保つ。provider固有adapterは独立Unitの変更境界と一致させるため最初から別ファイルにする。`amadeus-swarm-driver-adapters/`はC-04の既知集合だけを収容する非公開配置であり、動的load、custom driver、公開plugin SDKは提供しない。

composition rootは3つのprovider moduleを静的importし、4 native driver値をexhaustiveに対応付ける。共通runtimeを先に収束可能にするため、各moduleは当初、型付きのfail-closed `unavailable` registration slotをexportできる。Claude、Codex、Kiroの各Unitは自分のslotだけを実adapterへ置換し、他providerのfileやregistry mappingを変更しない。明示driverが未実装slotへ解決された場合はworker作成前にhard error、`auto`では既存のdispatch前fallback規則だけを適用する。release closureは全slotが実装済みであることとmappingのexhaustivenessを検査する。

この配置精緻化はUnits Generationの承認済み分解計画を反映する。C-01の公開subcommand、C-02〜C-10の責務、closed registry、runtime data flowは変更しない。

## Provider adapter境界

### C-05 `ClaudeDriverAdapter`

1つのadapterが `claude-agent-teams` と `claude-ultracode` の2 modeを扱う。共通のCLI/auth probeを1回だけ行い、mode固有surfaceを追加検査する。

- Agent Teamsは `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` とin-process teammate modeを明示し、execution IDから導出した一意なteam名を使う。Team configの`members`と共有task listを、stream eventと相関して正規化する。
- Ultra Codeはxhigh effortだけを成功条件にせず、standing Dynamic Workflowのrun ID、workflow task/agent ID、Unit割当が取れたときだけnative successとする。
- `claude -p --output-format stream-json --include-hook-events`の生streamはadapter内だけで扱い、promptやmessage本文をC-01へ返さない。

### C-06 `CodexDriverAdapter`

`codex-ultra`はAmadeusの実行契約名であり、存在しない`--ultra` flagを仮定しない。単一の `codex exec --json` coordinatorを、model catalogが受理する`model_reasoning_effort="ultra"`とmulti-agent collaborationを明示的に有効化したisolated設定で起動する。通常のUnitごとの`codex exec` floorとの差は次の4条件で示す。

1. 実行時に解決されたmodelがUltra reasoning effortを受理し、初期event/handshakeからmodel IDと`ultra` modeを確認できる。
2. batchあたりcoordinator processが1つである。
3. coordinatorが2つ以上のchild agentへUnitを委譲する。
4. JSONLのthread IDと、attempt専用の`SubagentStart` / `SubagentStop` hookが記録したchild agent IDを相関できる。

`model_reasoning_effort=xhigh`、Ultra非対応modelへのsilent downgrade、coordinatorの自己申告、単一`codex exec`成功だけではnative evidenceにならない（FR-13）。

### C-07 `KiroDriverAdapter`

入力Unitsは順序を維持しつつ、multi-Unit時に各waveが2〜4件となる均等分割へ変換する。`waveCount=ceil(n/4)`として余りを先頭waveから1件ずつ配るため、5件は3+2、9件は3+3+3、13件は4+3+3+3になる。各waveは `kiro-cli chat --no-interactive` のcoordinator process 1つで実行し、必要なagentと`subagent` toolを明示的にtrustする。Kiroのpersisted subagent sessionが持つparent session ID、wave Unit数と同数のcompleted child session ID、各Unitの割当を正規化する。Unitをdropせず、前waveがevidence verifiedになってから次waveを起動する（FR-14、NFR-10）。

## 証跡・永続化境界

### C-08 `NativeEvidenceVerifier`

adapterが生成したversion 1のnormalized event以外を受け取らない。native driver成功の共通条件は次のAND条件とする。

- 全eventがdriver、execution/attempt、attempt nonce hash、plan digest、wave index/digestで期待planへ相関する。
- driverごとに独立sourceのANDを満たす。Claude 2 driverはprovider state + stream、Codexはmodel handshake + JSONL stream + Subagent hook、Kiroはsession metadata + process streamを要求する。
- 各waveのcoordinator開始とexit 0の終了が同じnative runへ相関する。
- provider state/session metadata/Subagent hookから正規化したUnit-child割当がwave Unitsとの全単射である。
- 各childにstartと`completed` stopがあり、failed/欠落/余分なchildが0件である。
- driver固有のnative markerとmode confirmationがある。Codexはresolved modelのUltra受理も必須とする。
- worktree成果は別途C-11の`check` / `finalize`を通る。

未知eventは保存せず診断件数だけを返す。必須event欠落、相関不一致、重複Unit割当、child stop欠落はpost-dispatchの`NATIVE_EVIDENCE_*` failureにし、`FallbackReason`へ変換せず別driverへfallbackしない。`native-evidence-unavailable`はpreflight時にcapture surfaceを利用できない場合だけのfallback reasonとする（FR-11〜FR-15、NFR-02）。

### C-09 `DriverAttemptStore`

checkpointは `<record>/.amadeus-swarm-driver/batch-<n>.json` に置く。既存gitignoreの`.amadeus-*`規則でversion control対象外とし、既存audit lockとatomic renameを再利用する。各transitionはbatch、一意なtransition ID、lease ID、単調増加fencing token、closed edge details、pre/post digestを持ち、lock内で`SWARM_DRIVER_TRANSITION`を先にappendしてからcheckpointをatomic replaceする。checkpoint write失敗でauditだけが残った場合は、resumeがtransition ID/digestを照合してidempotentに再適用し、結果を`SWARM_DRIVER_RECONCILED`へ記録する。hard crashでactive checkpointが残った場合は、期限切れlease、旧ownerのprocess start identity、旧process group停止を確認し、`active-attempt-recovered`を経て新attemptへ移る。fencing token不一致の旧writerを拒否してsplit-brainを防ぐ。格納するのはID、enum、hash、Unit slug、worktree path、state、時刻、referee結果だけであり、prompt、credential、provider responseは格納しない。

### C-10 `DriverAuditEmitter`

driver lifecycle用に監査taxonomyを次の5 eventへ拡張する。

| Event | 所有者 | 目的 |
|---|---|---|
| `SWARM_DRIVER_ATTEMPTED` | driver tool | execution/attempt開始、requested、harness、topology、probe要約 |
| `SWARM_DRIVER_SELECTED` | driver tool | selected、execution mode、fallback reason、CLI/mode識別子 |
| `SWARM_DRIVER_TRANSITION` | driver tool | transition ID、closed edge、pre/post digest、redacted edge details |
| `SWARM_DRIVER_RECONCILED` | driver tool | phantom/未反映transitionのreapply、既反映、failure化 |
| `SWARM_NATIVE_EVIDENCE` | driver tool | evidence kind、child/task件数、Unit対応、verdict |

既存`SWARM_DEGRADED`は互換名を維持し、driver選択情報の唯一の書き手をC-10へ移す。C-11は`SWARM_STARTED`、Unit verdict、baton、`SWARM_COMPLETED`だけを所有する。監査formatとemitter testを同時更新し、event名をprose側から発行しない（FR-17〜FR-19、NFR-05）。

## 既存コンポーネントへの変更範囲

| 既存面 | 必要な変更 | 非変更保証 |
|---|---|---|
| 4 harnessの`skills/amadeus/SKILL.md` | `invoke-swarm`手順をC-01呼出しへ置換し、floor実行seamを残す | 通常stage subagent、対話conductor、single-Unit |
| `amadeus-swarm.ts` | finalizeへexecution/attempt/plan/worktree/finalize IDを受け、merge commit付きversioned envelopeを返す。driver audit書込を除去し、既存収束event維持 | prepare/check/finalize判定、lying-conductor guard |
| `audit-format.md` | 新eventとfield、redaction規則を追加 | 既存event意味 |
| manifest/onboarding/docs | 新toolと環境変数契約を全投影 | 正本は`packages/framework` |
| tests/live journeys | fake CLI adapter fixtureと4 native live journeyを追加 | credentialed GitHub Actionsは追加しない |

## 所有権とセキュリティ

- engine、driver tool、refereeの3者間に循環依存を作らない。
- provider credentialは現在のCLI認証に委ね、値を読み取ってcheckpoint/auditへ渡さない。
- child process環境はallowlist方式で継承し、driver制御変数、既存認証が必要とするprovider定義変数、PATH、HOME、locale、tempだけをadapterごとに宣言する。
- CLI UXはstdoutを機械可読結果、stderrを警告・修正方法に分離する。GUI、AWS resource、network serviceは新設しない。
- release criterionはローカルmacOSとGitHub Actions Linux。Windows専用既存コードは目的なく変更せず、新driverのWindows対応を表明しない（NFR-08、NFR-09）。
