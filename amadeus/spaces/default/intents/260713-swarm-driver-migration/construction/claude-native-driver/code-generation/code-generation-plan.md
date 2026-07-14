# Claude Native Driver コード生成計画

## 対象、前提、完了条件

本計画は U-03 `claude-native-driver` を **1 Unit = 1 Bolt = 1 PR** で実装する。後述の Step 1〜10 は同一 PR 内の実装・レビュー順序であり、追加の Unit、Bolt、子 PR へ分割しない。mode-specific transport／capture lifecycleを完成させるU-02補完スタックPRを親にし、U-03 の差分をClaude providerへ限定する。

実装前の実コード照合では、次を確認済みである。

- `DriverAdapterSet` と Claude exactly 2 / Codex・Kiro exactly 1 の cardinality 検証は U-01 で実装済みである。registration schema、driver literal、provider mappingを再変更しない。
- U-03 設計が要求する `AdapterExecutionPlan(LaunchSpec + EvidenceCapturePlan)`、capture-before-arm、provider-group-terminal-after-join、3 channel の `EvidenceInputs` は、現行の単一 `buildLaunch` / raw stream `normalize` と U-02 runtime には未実装である。U-03開始前に専用U-02補完スタックPRで実装し、U-03は完成済みseamだけを消費する。
- selector、topology、fallback、attempt store、lease/fencing、process group、C-08 verdict、C-11 referee/merge の既存意味は変更しない。Claude adapterがこれらを再実装しない。

U-03 の完了条件は次のとおりである。

1. production Claude slotが `claude-agent-teams` と `claude-ultracode` の immutable adapterをexactly 2件持ち、Codex/Kiro slotと公開driver mappingに差分がない。
2. Agent Teamsは予約済みsession-derived exact team/task stateとTask/Teammate stream・hookをID/tokenでAND結合し、2 Unit以上のUnit-child全単射を証明する。
3. Ultra Codeは`--effort ultracode`、profile-bound workflow run/task/agent state、同一run/sessionのworkflow markerとSubagentStart/StopをAND結合し、2 Unit以上のUnit-child全単射を証明する。
4. capture plan/identity/bindingをaudit-first checkpointへ束縛し、capture開始後だけproviderをarmし、provider group terminal後にstopAndWaitしてからnormalizeする。snapshot欠落、join失敗、unknown schemaをsuccessにしない。
5. Claude conductorだけがpublic C-01とC-11を`prepare → run → check → record-finalize(request) → finalize → record-finalize(result)`の順で媒介し、C-01↔C-11 direct import/invokeを0件にする。
6. credential、prompt、workflow script、description、message、assistant result、transcript、生stdout/stderr、生absolute pathを永続surfaceへ0件とする。
7. Comprehensive fake suite、macOS上のAgent Teams/Ultra Code各2 Unit以上のlive proof、GitHub Actions Linuxのdeterministic suite、distribution/self-install drift checkをすべてgreenにする。Windowsは対象外とする。

## 所有境界と非目標

### U-03が所有するもの

- C-05 Claude adapter family、2つのmode-bound view、resolve-scope probe。
- Claude surface profile、auth transport allowlist、session prefix allocator、manifest/settings/launch/capture plan factory。
- Agent Teams / Ultra provider-state projector、stream/hook parser、evidence correlator、normalized event projection。
- attempt専用Claude evidence hookとClaude harness conductor projection。
- Claude production registrationをunavailable slotから2-adapter available setへ置換する変更。

### U-03が所有しないもの

- driver値、selection表、topology分類、fallback優先順位、legacy env表。
- U-02 attempt store、lease/fencing、armed process、C-08 native verdict、resume policyの再実装。
- C-11のprepare/check/finalize、AIDLC/code merge、cleanup判定の再実装。
- Codex/Kiro provider adapter、dynamic plugin discovery、SDK/API client、daemon、database、queue、cloud resource。
- 0.2.0での`AMADEUS_USE_SWARM`削除、全provider完成後の共有migration文書。これらはU-06に残す。
- Windowsでの新driver保証。

## Entry gate: Claude surface discovery

PART 2開始後、production実装より先に、認証済みローカルmacOSで非機密の最小2 Unit fixtureを用いてsurface discoveryを行う。

- Agent Teams: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`、`--teammate-mode in-process`、session-derived team config/member/shared task、TaskCreated/TaskCompleted/TeammateIdleのfield pathとID相関を確認する。
- Ultra Code: `--effort ultracode`、`system/init` capability、workflow-created event、run ID、run-state exact path導出、task/agent/label/status、SubagentStart/Stopのfield pathと型を確認する。
- fixtureへ残すのはCLI semver range、field path、型、enum、synthetic ID、digestだけとし、prompt、script、result、credential、transcript、local absolute pathを除去する。

Ultra Codeの実run/task/agent mappingとstream-bound exact pathを機械的に確定できない場合は、U-03をその場で **park** する。xhigh、通常Agent tool、Task floor、assistant自己申告、root scan、mtime newest、推測schemaで代替してはならない。Agent Teamsについてもstate + stream/hookの独立二系統を確立できなければ同様にparkする。

### Entry gate実行結果 — 2026-07-14

**判定: PARKED**

macOS上のClaude Code 2.1.205と既存OAuth認証を使い、非機密の2 worker Dynamic Workflowを実行した。`--effort ultracode`は受理され、native `Workflow`、run ID、task/agent進捗、SubagentStart/Stop hookの発火をstream上で確認できた。

一方、workflow-created eventから導出できるのはscript/transcript/result系のlocationであり、run/task/agentの独立provider-stateを表すstable exact path/schemaは確認できなかった。stream内のworkflow progressをprovider-stateとして再利用すると同一sourceの二重消費になり、設計で必須とした`provider-state + stream/hook`の独立ANDを満たさない。

state rootの列挙、latest/mtime探索、xhigh、Task floor、通常Agent、assistant自己申告による代替は行っていない。raw traceは削除し、profile/raw payload/absolute path/credentialをrepositoryへ保存していない。Step 1は未達のためcheckboxを完了にせず、production code、test、生成物、`code-summary.md`の作成へ進まなかった。

再開条件は、Claudeがworkflow-created eventから一意に導出できるrun-state exact path/schemaを提供するか、同等の独立provider-state surfaceを公式に定義することである。要件を緩和して再開する場合はFunctional Designへ戻り、evidence契約の再承認を必要とする。

### Entry gate再開調査結果 — 2026-07-14T08:51:16Z

**判定: DESIGN ROLLBACK REQUIRED**

Claude Code 2.1.205の認証済みmacOS環境で、repository外の非機密2 worker fixtureを新規実行した。Ultra Codeについては、前回のpark理由を解消できた。

- `--effort ultracode`でnative `Workflow`を実行し、tool resultの`runId`と`transcriptDir`から、root scanやmtime探索なしでsession root配下の`workflows/<runId>.json`を一意導出できた。
- snapshotは`runId`、`taskId`、`status=completed`、`agentCount=2`、2件の`workflow_agent`の`label` / `agentId` / `state=done` / `model`を持つ。
- `transcriptDir/journal.jsonl`は`started`×2と`result`×2を持ち、各`agentId`がsnapshotの2 workerと全件一致した。SubagentStart/Stop hookも2件ずつ発火した。従ってUltraは、exact provider-state/journalとhookの独立sourceを同一run/sessionでAND結合できる。

一方、Agent Teamsは承認済み起動契約では実行不能であることが確定した。

- Claude binaryのCLI actionは`Fl() && !on() && !agentId`の場合だけ`initializeSessionTeam()`を呼ぶ。`Fl()`は`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`の有効判定、`on()`は`!isInteractive`である。そのため`claude -p`ではteam初期化が必ずskipされる。
- `claude -p` + experimental env + `--teammate-mode in-process`で2つのnamed `Agent`を起動し、TaskCreated/TaskCompleted/SubagentStart/SubagentStopは各2件観測した。しかし、provider開始前から50 ms間隔で同期させたexact `session-<sessionId[0..8]>` team/task observerはprocess terminalまで1度もstateを観測せず、TeammateIdleも0件だった。これらのchildはAgent Teamsではなくordinary async Agent floorである。
- flag、in-process option、Task/Subagent eventのみをAgent Teams successとすると、FR-11、CBR-16〜21、完了条件2の「provider-state + stream/hookの独立AND」とfloor識別を弱めるため採用しない。

最小の戻り先はApplication Designである。`requirements.md` FR-11はAgent Teamsのnative proofを要求するが、non-interactive processや`claude -p`を要求していない。その後の`component-methods.md`、`unit-of-work.md`、U-03 Functional Design / NFR Requirements / NFR Design / Code Generation planがAgent Teamsへ`claude -p` / `stream-json`を一律適用した。次の最小訂正案をApplication Designから再承認する必要がある。

1. Claude adapterのexecution transportをmode-specificにし、Agent Teamsはinteractive PTYの`claude` coordinator、Ultra Codeは従来どおりnon-interactive `claude -p` stream-json coordinatorとする。どちらもbatch/waveごとにcoordinator processはexactly 1件とする。
2. Agent Teamsの独立ANDは、provider前に開始したexact team/task snapshotとattempt専用TaskCreated/TaskCompleted/TeammateIdle hook recordで証明する。PTY terminal streamはprocess terminal identityに限定し、structured eventを推測しない。
3. U-02がpipe processだけを想定しているなら、`LaunchSpec` / process supervisorにclosed `stdio-json | pty-interactive`のtransport seamを追加し、identity-first、capture-before-arm、provider-group-terminal-after-join、lease/fencingは不変とする。これはU-02 owner moduleに影響するため、U-03の黙示的な実装で追加しない。
4. Application Design訂正後にUnits Generation、Delivery Planning、U-03 Functional Design、NFR Requirements、NFR Design、本planを順に再生成し、interactive PTY上の2 teammate live discoveryをStep 1の入口ゲートとして再実行する。

Step 1はAgent Teams側が未達のため引き続き未完了とし、production code、test、生成物、`code-summary.md`は作成しない。生trace、provider result、transcript、local absolute pathはrepositoryへ保存しない。

## 予定する変更面

### 正本コード

| 種別 | 予定ファイル | 目的 |
|---|---|---|
| Claude adapter | `packages/framework/core/tools/amadeus-swarm-driver-adapters/claude.ts` | placeholderを2つのimmutable Claude adapterを持つavailable setへ置換 |
| Claude deep module | `packages/framework/core/tools/amadeus-swarm-driver-claude.ts`（新規候補） | family/probe/profile/manifest/launch/prefix/evidenceを一つのprovider moduleとして提供。責務で分離が必要な場合も薄いwrapperを乱造しない |
| surface profile data | `packages/framework/core/tools/data/claude-surface-profiles/*.json`（新規候補） | discovery済みfield path/type/enum/version rangeだけを持つredacted fixture |
| evidence hook | `packages/framework/core/hooks/amadeus-claude-native-evidence.ts`（新規候補） | attempt-owned dirへallowlist eventをexclusive-createし、session/nonce/ownershipを検証 |
| Claude conductor | `packages/framework/harness/claude/skills/amadeus/SKILL.md`、必要最小限のClaude manifest | C-01/C-11のversioned JSON二相transport、native/floor/legacy分岐、hook projection |
| 配布物 | `dist/{claude,codex,kiro,kiro-ide}/`、self-install対象 | `scripts/package.ts`とpromotionから機械生成。生成先を直接編集しない |

ファイル名は既存module境界との整合で調整してよいが、変更責務は上表を上限とする。特にU-01 selector/foundation、Codex/Kiro adapter、referee implementationを変更面へ追加しない。

### Test成果物

| Test層 | 予定ファイル | 主な検証 |
|---|---|---|
| Unit / contract | `tests/unit/t234-claude-driver-contract.test.ts` | 2 immutable view、fresh resolve scope、closed capture plan/schema、registration cardinality |
| Unit / security | `tests/unit/t235-claude-driver-probe-launch.test.ts` | probe deadline、auth env allowlist、stdin-only manifest、prefix 256、settings 0600、secret/path canary |
| Unit / property | `tests/unit/t236-claude-native-evidence.pbt.test.ts` | Teams/Ultra全単射、order independence、missing/extra/duplicate、片系、unknown field、計算量 |
| Integration / lifecycle consumption | `tests/integration/t237-swarm-driver-capture.test.ts` | U-02補完PRで完成済みのcapture-before-arm、binding checkpoint、terminal-before-joinをClaude planでも維持 |
| Integration / Claude | `tests/integration/t238-claude-driver-runtime.test.ts` | fake `claude`、production registry、argv/env/cwd/stdin、両mode、probe/cache/failure mapping |
| Architecture / harness | `tests/integration/t239-claude-driver-boundary.test.ts` | C-01↔C-11 edge 0、Claude-only slot変更、SDK/plugin/global settings mutation 0、conductor順序 |
| E2E / failure injection | `tests/e2e/t240-claude-native-driver.test.ts` | 2 Unit fake Teams/Ultra、prepared worktree、evidence、check/finalize、crash、legacy/floor回帰 |
| Opt-in macOS live | `tests/integration/t241-claude-native-live.test.ts` または専用live runner | 各mode 2 Unit以上、production path、native state+stream、成果、check/finalize、redacted evidence index |
| 既存回帰 | `t199`、`t227`〜`t233`、`t134`、`t135`、audit/coverage tests | legacy prefix、U-01/U-02 lifecycle、referee、harness、taxonomy、配布同期 |

## Test strategy

Active Test Strategyは **Comprehensive** である。各主要componentはhappy path、最低2つのerror/edge、closed schemaのinvalid caseを含む10〜15 caseを目安とする。

- Unit/propertyを主にし、probe/manifest/profile/parser/correlatorをdeterministicに検証する。
- integrationはfake executable、temp HOME、fake clock、filesystem/process spy、実checkpoint/audit storeを使用する。
- E2Eはpublic C-01、production registry、Claude adapter、capture/process lifecycle、C-08、conductor媒介C-11を通す。test-only registryでproduction acceptanceを偽装しない。
- failure injectionはprobe timeout、prefix race、capture start/arm間crash、binding前read、cleanup-before-snapshot、stopAndWait失敗、partial stream、unknown schema、wrong session/run、hook replay、provider exit、finalize failureを対象にする。
- performanceはcommon probe exactly 1、mode probe最大1、waveごとのmode-specific coordinator exactly 1、root listing 0、prefix候補最大256、`O((n+e+s) log(n+e+s))`以下をoperation counterで検証する。
- securityはcredential/prompt/script/result/transcript/path canaryの永続surface混入0、global settings before/after digest一致、unknown auth transport拒否をmerge blockerにする。
- macOS live proofは明示opt-inかつhost mutexで実行し、auth不足・skip・unknown schemaをpassへ読み替えない。GitHub Actions Linuxはcredential不要fake suiteを必須とし、Windowsは対象外とする。

### Test configuration

新しいtest runnerや重複configは追加しない。既存の`bun:test`、`tests/run-tests.ts`、`tsconfig.tests.json`、coverage registry/ratchetを再利用する。live proofだけは通常CIのcredentialed jobへ追加せず、既存runnerから明示opt-inで分離し、未実行をgreenとして記録しない。新規testは既存metadata/discoveryへ登録し、coverage registry/ratchetを正本generatorで同期する。

## 実装手順

- [ ] **Step 1: macOS surface discovery entry gateを実行し、redacted profileを固定する。** 非機密2 Unit fixtureでAgent TeamsとUltra Codeを実行し、Teamsのexact team/task state + Task/Teammate event、Ultraのworkflow-created/run/task/agent state + Subagent eventを独立sourceとして確認する。profile fixtureのfield path/type/enum/version rangeだけをレビュー可能な形で固定する。**失敗条件:** exact path、Unit-child全単射、独立二系統のいずれかを確定不能。失敗時はU-03をparkし、production codeを作らない。**Verify:** redaction scan、root scan 0、xhigh/floor/self-report negative evidence。**Trace:** USR-01〜03、FR-11/12/23、CBR-05/07/16〜27、U03-REL-01/03/04/08。

- [ ] **Step 2: U-02 capture contract前提を検証する。** 親U-02補完PRが`AdapterExecutionPlan`、closed `EvidenceCapturePlan`、`CaptureIdentity/Binding`、3-channel `EvidenceInputs`、audit-first binding、capture-before-arm、terminal-before-joinを提供することを`t237`とtypecheckで確認する。U-03ではgeneric contract/runtimeを変更しない。**失敗条件:** 必須variant／順序が欠落、provider-specific branchをU-02へ追加する必要が生じる。欠落時はU-03を停止してU-02補完PRへ戻す。**Verify:** `t227`〜`t233`、`t237`、typecheck、architecture diff。**Trace:** FR-19/20/22、CBR-01/02/15a〜15c、U03-PERF-09、U03-REL-07。

- [ ] **Step 3: Claude family、fresh-scope probe、surface profile guardを実装する。** 2つのimmutable mode-bound viewを同一familyから作り、common CLI/auth/stream/hook probe Promiseだけをfresh resolve scope内で共有する。CLI 5秒、auth 10秒、handshake/hook 30秒、総45秒をfake clockで固定し、version/flagだけのavailable、cross-attempt cache、unknown profile/auth transportを拒否する。**失敗条件:** mutable driver、global/singleton cache、credential/raw auth detailの永続化。**Verify:** `t234`/`t235`のprobe count・timeout・resume、production registration build。**Trace:** FR-05/06/11/12/19、CBR-03〜07、U03-PERF-01〜03、U03-SEC-01。

- [ ] **Step 4: manifest、env/settings、session prefix、mode別execution planを実装する。** Unitをstable sortしたstdin-only manifest、transport別env allowlist、0600 ephemeral settings、exclusive hook dirを構築する。Agent Teamsは最大256のUUIDv5候補をuser-scoped lockで予約し、team/task両exact pathの不存在をdispatch前とarm直前に検証する。Ultraは`--effort ultracode`とprofile-bound stream-binding planを作る。waveごとのcoordinatorはAgent Teamsでinteractive `claude`、Ultra Codeでheadless `claude -p`をexactly 1件とする。**失敗条件:** shell command、argv prompt、全env spread、existing path delete/adopt、root listing、Unitごとのprovider process。**Verify:** `t235`のargv/env/cwd/stdin/path spy、collision exhaustion、secret canary。**Trace:** FR-11/12/19、CBR-08〜17a、U03-PERF-04〜06、U03-SEC-02〜06。

- [ ] **Step 5: attempt-owned evidence hookとcapture executionを接続する。** hookはsession/nonce/ownershipを検証し、allowlist eventをevent別exclusive fileへ書く。generic capture supervisorはTeams fixed path observerまたはUltra awaiting-binding observerをprovider arm前に開始し、checkpoint後だけarmする。provider group terminal後にstopAndWaitし、last valid atomic normalized snapshot、hook set、terminal process streamを別channelとして確定する。**失敗条件:** shared JSONL、raw state保存、observer停止不能をempty successへ変換、cleanup前snapshot欠落の無視。**Verify:** `t237` lifecycle traceと全crash boundary、hook spoof/replay/interleave fixture。**Trace:** FR-19〜22、CBR-15a〜15c/21/29〜31、U03-REL-03/07、U03-SEC-03/04。

- [ ] **Step 6: Agent Teams projector/correlatorを実装する。** 予約済みsession-derived exact config/task pathからallowlist member/taskだけをprojectし、TaskCreated/TaskCompleted/TeammateIdle stream/hookをtask ID、assignment token、teammate nameでAND結合する。member 2件以上、expected Unit-task-member全単射、全task completed、全owner idle、coordinator exit 0の場合だけTeams markerを生成する。**失敗条件:** deprecated `team_name`単独依存、片系evidence、persistent task採用、extra/missing/duplicate childのpartial success。**Verify:** `t236` property matrix、`t238` fake state/stream cleanup race。**Trace:** USR-01、FR-11/15/23、CBR-16〜21/28、U03-REL-01〜04。

- [ ] **Step 7: Ultra Code projector/correlatorを実装する。** Step 1のexact profileだけを受理し、workflow-created eventからrun IDとstate exact pathを導出してcheckpoint binding後にpollする。provider-stateのrun/task/agent/assignmentと同一session/runのworkflow marker、SubagentStart/StopをAND結合し、2 worker以上・expected Unit-agent全単射・background workflow 0・exit 0を要求する。**失敗条件:** unknown version/path/eventの近似、latest run scan、xhigh/通常Agent/floor/self-reportの代替、missing stopの成功化。**Verify:** `t236`/`t238`のprofile/path/event negative matrix。**Trace:** USR-02/03、FR-12/15/23、CBR-22〜27/30、U03-REL-01〜05。

- [ ] **Step 8: production registry、public runtime、Claude conductorを接続する。** Claude placeholderだけを2-adapter available setへ置換し、public C-01から両driverをprobe/runできるようにする。Claude harness sourceでnew driver、Task floor、0.1.x legacy Dynamic Workflowを別variantとして扱い、conductorだけがC-11 prepare/check/finalizeとC-01 record request/resultをversioned JSONで順序付ける。旧変数と新変数の競合、legacy loud degradation、post-dispatch fallback禁止を維持する。**失敗条件:** Codex/Kiro slot変更、C-01↔C-11 direct edge、native evidence単独のbatch success、global `.claude/settings.json` mutation。**Verify:** `t238`/`t239`、既存`t135`/`t199`/`t231`/`t233`。**Trace:** USR-01〜03/07〜10、FR-15〜18/21/22、CBR-32〜36。

- [ ] **Step 9: Comprehensive E2E/failure/security/coverage gateを閉じる。** public C-01→production registry→Claude adapter→capture/process→C-08→conductor/C-11をfake CLIと実temp Git worktreeで通す。Teams/Ultra各2 Unit、probe/process/capture crash、wrong session/run、unknown schema、secret canary、legacy/floor回帰を実行し、test discoveryとcoverage台帳を同期する。**失敗条件:** test-only registryだけのacceptance、skip-as-pass、raw evidence fixture、未割当FR/NFR。**Verify:** `t234`〜`t240`、coverage registry check、typecheck、lint、fixed-seed反復。**Trace:** FR-22、NFR-02〜05/11、CBR-35。

- [ ] **Step 10: macOS live proof、生成同期、1 PRの最終収束を行う。** production Claude conductorからAgent TeamsとUltra Codeを各2 Unit以上で実行し、native marker/source、Unit成果、C-11 check/finalize、C-01二相recordをredacted evidence indexへ保存する。auth不足、unknown schema、floor、xhigh、self-reportはpassにしない。正本から全harness dist/self-installを生成し、U-03境界外差分とsecret/path漏えいを監査する。**Verify:** live runner、`bun tests/run-tests.ts --ci`、`bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`git diff --check`、GitHub Actions Linux。**Trace:** FR-23/24、NFR-04/08/11/12、CBR-36。

## Story-to-step traceability

| Scenario | U-03で閉じる受入結果 | Plan Step | 主なtest/evidence |
|---|---|---|---|
| USR-01 | coordinated topologyでAgent Teamsを選び、実team/task/memberとstream/hookを2 Unit以上で証明 | 1、3〜6、8〜10 | `t234`〜`t240`、Teams live index |
| USR-02 | independent topologyでUltra Codeを選び、実workflow run/task/agentを2 Unit以上で証明 | 1、3〜5、7〜10 | `t234`〜`t240`、Ultra live index |
| USR-03 | unknown topology reasonを保持してUltraへ進み、通常Agent/xhighを代替にしない | 1、3、7〜9 | profile negative fixture、`t238` |
| USR-07 | native候補のdispatch前unavailableだけを既存auto floorへ渡し、理由を保持 | 3、8、9 | `t238`、既存`t231` |
| USR-08 | `AMADEUS_USE_SWARM=1`を0.1.x legacy Dynamic Workflowとして維持し、新driverと混同しない | 8、9 | `t239`/`t240`、`t199` |
| USR-09 | 新旧env競合をprovider/capture/worktree開始前に拒否 | 8、9 | no-side-effect integration fixture |
| USR-10 | crash後はfresh probe/session/captureを使い、旧team/task/workflow evidenceを採用しない | 2〜5、9 | `t237`/`t240` resume failure injection |

## 計画逸脱ガード

実装中に次のいずれかが必要になった場合は、同じPRへ黙って追加せず作業を停止する。

1. U-01のdriver literal、selection/fallback/legacy表、registration cardinalityの変更。
2. U-02のC-08 verdict、lease/fencing、resume semantics、C-11のmerge/referee semanticsの変更。
3. Ultra Code exact state mappingを得られない状態での代替証拠や成功条件の緩和。
4. Codex/Kiro provider source、Windows保証、credentialed GitHub Actions job、新runtime dependencyの追加。
5. 1 Unit = 1 Bolt = 1 PRを崩す分割またはscope拡張。

## Review gate

PART 2へ進む前に、本計画のEntry gate、generic capture correction、Step順、Test strategy、Story-to-step traceabilityについてユーザー承認を得る。承認前はapplication code、test、config、surface discovery、`code-summary.md`を作成・変更しない。実装完了後は`amadeus-architecture-reviewer-agent`の独立レビューを最大2 iteration行う。
