# Swarm Driver Architecture Decision Records

## 上流コンテキスト

本ADR集は`requirements`、brownfieldの`architecture`・`component-inventory`、`team-practices`、およびApplication DesignのQ1〜Q7を根拠とする。`stories`は実行計画でSKIPされている。各ADRはQ&Aで推奨案が選択済みであり、Application Design gateでまとめて確定する。

## ADR-001 — Driver選択をengineとrefereeの間の共通toolへ置く

**Status:** Proposed（Q1でOption A選択、stage gate待ち）  
**Decision scope:** FR-01〜FR-10、FR-15、NFR-01、NFR-06

### Context

現行engineは`invoke-swarm` eligibilityを決定的に判定し、`amadeus-swarm.ts`はworktreeと収束を決定的に判定する。一方、driver選択と外部CLI probeはハーネスproseに分散しており、新しい5値、`auto`表、hard error、legacy互換を各ハーネスで複製するとdriftしやすい。

### Options

- Option A — 共通driver tool: 純粋selectorを共通化でき、既存engine/refereeの責務を維持できる。conductorとのCLI seamが1つ増える。可逆性は高い。
- Option B — engineへ統合: directive時点で完結するが、read-only engineが外部CLI/auth I/Oを持ち、決定的routingと環境依存probeが混ざる。可逆性は低い。
- Option C — refereeへ統合: prepareと近いが、stateless verdict surfaceがAI dispatcherとstate ownerを兼ねる。既存テスト境界への影響が大きい。可逆性は中程度。

### Decision

Option Aを採用する。`packages/framework/core/tools/amadeus-swarm-driver.ts`を唯一の公開入口とし、harness conductorは`invoke-swarm`後にこれを呼ぶ。engine directiveはdriver-neutralのまま、refereeはprepare/check/finalizeを維持する。

### Consequences

- Positive: selector、legacy、probe schema、audit fieldが共通正本になる。
- Positive: env不正と明示probe failureをworktree作成前に止められる。
- Positive: 通常stage subagent、single-Unit、対話conductorへ影響しない。
- Negative: conductorがdriver toolとrefereeの2つのJSON contractを順序制御する必要がある。
- Negative: package manifest、全harness SKILL、dist/self-installを同時更新する必要がある。

### Alternatives Rejected

Option Bはengineの決定的・read-only境界を壊すため却下した。Option Cはrefereeをloop ownerに変え、lying-conductor guardとAI dispatchを同じcomponentへ混在させるため却下した。

### Security / Compliance impact

外部CLI/auth I/Oはadapter内に閉じ、engine/refereeへcredentialを渡さない。新しいAWS resource、network service、credential storeは不要。auditは既存lockとredaction規則を使う。

### Reversibility

高い。公開envとcheckpoint contractを維持したまま、将来driver tool内部をlibrary化できる。engine/refereeへの移動は責務変更を伴うため別ADRとする。

## ADR-002 — Native driverはbatch coordinator processを使う

**Status:** Proposed（Q2でOption A選択、stage gate待ち）  
**Decision scope:** FR-11〜FR-15、NFR-10

### Context

Unitごとの独立processは既存floorとほぼ同じで、Agent Teams、Dynamic Workflow、Codex multi-agent、Kiro subagentのnative協調能力を証明できない。batchは同時実行可能なready Unitsの一時的グループであり、domain上のUnit親ではない。Kiroは同時subagent最大4件という固有限界を持つ。

### Options

- Option A — batch coordinator: Claude Agent Teams、Claude Ultra Code、Codex Ultraはbatchごと1 process、Kiroは2〜4 Unitのbalanced waveごと1 process。native delegationを直接証明できる。coordinator failureの影響半径はbatch。
- Option B — Unit別process: isolationは単純だが、既存floorとの差がprocess flag程度になりnative協調の価値を失う。
- Option C — adapter自由: provider最適化はしやすいが、process数・evidence・再開の共通受入条件が定まらない。

### Decision

Option Aを採用する。各Unitはrefereeが作る別worktreeを使う。coordinatorはUnit manifestからnative child/taskへ1対1で割り当てる。Kiroは入力順を保持し、wave数を`ceil(n / 4)`、基本件数を`floor(n / wave数)`として余りを先頭から配る。これにより5件は3+2、9件は3+3+3、13件は4+3+3+3となり、1件だけのwaveを作らない。Unit内部をさらにAgent Team化することは対象外とする。

### Consequences

- Positive: native driverとfloorをprocess topologyとevidenceで区別できる。
- Positive: Unit間の共有task/messageが必要なClaude batchをAgent Teamsへ写像できる。
- Positive: Kiroで5件以上でもUnitをdropしない。
- Negative: coordinatorがbatch全体のsingle failure domainになる。
- Negative: 複数worktreeを安全にchild processへ渡すmanifestとpermission設定が必要になる。

### Alternatives Rejected

Option BはFR-11〜FR-14のnative証明を弱め、特にCodex Ultraを単純`codex exec` floorと区別できないため却下した。Option CはNFR-01とNFR-10の決定性を損なうため却下した。

### Security / Compliance impact

各native childへ割り当てたworktreeだけを書込対象とし、main checkoutの直接編集を禁じる。coordinator processへ渡すenvとadditional directoriesをallowlistする。Kiroのtrusted agentsは必要最小集合に限定する。

### Reversibility

中程度。Kiro wave sizeはadapter policyとして変更可能。batch coordinatorからUnit processへ戻すとnative evidence contractが変わるため、公開driver semanticsの再承認が必要。

## ADR-003 — Preflightとruntime native evidenceを二段階に分ける

**Status:** Proposed（Q3でOption A選択、stage gate待ち）  
**Decision scope:** FR-05、FR-06、FR-10〜FR-14、FR-23、NFR-02

### Context

CLI存在、auth、flag、trustを確認してもnative childが実際に起動したとは限らない。一方、毎batchでfull live canaryを別起動すると費用と副作用が増え、本dispatchとの環境差も生じる。`auto` fallbackをdispatch後に許すと、部分変更したworktreeへ別driverを重ねる危険がある。

### Options

- Option A — 二段階: preflightは起動可能性、dispatch後verifierは実利用証明。fallbackはpre-dispatchだけ。境界が明確でfail-closed。
- Option B — full live canary: native surfaceを早期実証できるが、1 batchでnative coordinatorを2回起動し、費用とstate cleanupが増える。
- Option C — preflightだけ: 安価だがenv/flag設定だけを成功証拠にしてfalse positiveを生む。

### Decision

Option Aを採用する。preflightはCLI、auth、mode/trust、非破壊handshakeをbatchごと1回検査する。明示driverの失敗はhard error、`auto`の候補失敗だけが固定表でfallbackできる。coordinator dispatch後はnative evidence verifierを必須にし、欠落時はbatch failureとして同attemptを終了する。別driverへfallbackしない。

### Consequences

- Positive: worker作成前hard errorと実行後のnative保証を両立する。
- Positive: fallback後の重複編集、silent floor、skip-as-passを防ぐ。
- Negative: preflight成功後にruntime evidence failureとなる可能性は残る。
- Negative: provider event schema変更を検出するlive fixtureの保守が必要。

### Alternatives Rejected

Option Bはprobeのためだけにreal workflow/teamを作り、batchあたり1回というFR-05の意図を超えるため却下した。Option CはFR-11〜FR-14の「設定や自己申告だけでは不可」に反するため却下した。

### Security / Compliance impact

handshakeはtemp directory・non-destructive・最小tool permissionで行う。provider raw outputを保存せず、diagnostic codeだけを残す。dispatch failureでもcredentialやpromptをstderr/auditへ出さない。

### Reversibility

高い。probe checkの追加・削除、timeout調整はcontract内で可能。post-dispatch fallbackを許す変更はworktree integrityを変えるため別ADRを要求する。

## ADR-004 — Atomic attempt checkpointとauditを併用する

**Status:** Proposed（Q4でOption A選択、stage gate待ち）  
**Decision scope:** FR-18、FR-20、FR-21、NFR-03、NFR-05

### Context

driver選択後からmerge完了前までのcrashでは、同じbatchへ新attemptを結び、確定済みUnitだけを再利用する必要がある。audit replayだけでは全shard読取と中間state再構築が必要で、worktree scanだけではdriver選択・evidence・attempt相関を失う。

### Options

- Option A — checkpoint + audit: checkpointを即時再開、auditを追跡・再構築に使う。二重writeの整合管理が必要。
- Option B — audit replayのみ: 正本が1つだが、毎回全shardをmergeしてincomplete transitionを解釈する必要がある。
- Option C — worktree scanのみ: 実装は少ないが、native evidenceと未完了attemptを復元できない。

### Decision

Option Aを採用する。`<record>/.amadeus-swarm-driver/batch-<n>.json`をgitignored checkpointとする。execution IDはbatch lifecycleで維持し、resumeごとに新attempt IDを発行する。

既存のaudit-first atomicityに合わせ、各transitionを閉じた`AttemptTransition` variantとし、一意なtransition IDとpre/post digestを付ける。同じaudit lock内で`SWARM_DRIVER_TRANSITION` intentを先にappendし、その後checkpointをatomic replaceする。checkpoint write前のcrashでauditだけが残った場合、そのrowは成功の正本ではなくtransition intentであり、resumeがcheckpointの`lastTransitionId`/digestと照合してidempotentに再適用または破棄し、`SWARM_DRIVER_RECONCILED`を記録する。

stateは`probing → selected → prepared → dispatched → evidence-verified → referee-running → succeeded|failed-resumable|failed-terminal`の単方向とする。crash・外部process中断・check/finalize/merge失敗はfailed-resumableへ、入力不正・再試行しても同じになるpolicy違反はfailed-terminalへ分類する。通常resumeはfailed-resumableから新attemptの`probing`へ遷移する。hard crashでactive checkpointが残った場合だけ、期限切れlease、旧ownerのprocess start identity非生存、旧process groupの停止を確認し、`active-attempt-recovered`でfailed-resumableへmaterializeしてからresumeする。succeededとfailed-terminalは再開しない。

checkpointは固定TTLのleaseと単調増加fencing tokenを持つ。全transitionとreconcile eventへbatch、lease ID、fencing tokenを含め、現行tokenと一致しない旧writerを拒否する。recovery claimはaudit lock下のcompare-and-setとして取得し、旧ownerのlivenessが不明、ownerが生存、またはattempt由来process groupを停止できない場合はfail-closedとする。これによりpaused processとhard crashを区別し、復帰した旧processとのsplit-brainを防ぐ。

referee codeは閉じたterminality表で分類する。`CHECK_NOT_CONVERGED`、`CHECK_PROCESS_FAILED`、`FINALIZE_PROCESS_FAILED`、`MERGE_FAILED`、`REFEREE_AUDIT_FAILED`はfailed-resumable、`PROTECTED_SPEC_BINDING_INVALID`、`LYING_CONDUCTOR_DETECTED`、`BATCH_BINDING_MISMATCH`、`ENVELOPE_SCHEMA_INVALID`はfailed-terminalである。未知codeはschema errorとして拒否し、merge failureをterminalへ読み替えない。

terminal successは、referee envelopeのschema version、execution/attempt ID、finalize invocation ID、batch ID、plan/worktree manifest digest、merge完了flag、Unitごとのmerge前後commit、result digestがcheckpointと一致し、対応auditが存在する場合だけmaterializeする。これにより古いattemptや別planのfinalize結果を誤適用しない。

### Consequences

- Positive: crash直後に全audit shardを再生せず再開できる。
- Positive: execution/attemptからselection、evidence、referee結果まで追跡できる。
- Positive: providerの未完了sessionを成功扱いしない。
- Negative: audit-firstのphantom intent rowをreconcileする失敗注入testが必要。
- Negative: schema migration policyが必要になる。

### Alternatives Rejected

Option Bは再開hot pathを複雑にし、複数clone shardのmerge不確実性を増やすため却下した。Option CはFR-18とFR-20の相関情報を保持できないため却下した。

### Security / Compliance impact

checkpointはID、enum、hash、Unit/worktree、stateだけを持ち、prompt、credential、生eventを禁止する。record-localかつgitignoredである。auditはversion control対象だが同じredacted fieldだけを記録する。

### Reversibility

中程度。checkpointはephemeral cacheなので削除してaudit+worktreeから保守的に再開できる設計にする。schema version変更時は旧checkpointを成功へ推測せず、再probeする。

## ADR-005 — Provider eventを閉じたversioned eventへ正規化する

**Status:** Proposed（Q5でOption A選択、stage gate待ち）  
**Decision scope:** FR-11〜FR-14、FR-18、FR-19、NFR-02、NFR-04〜NFR-06

### Context

Claude stream-json、Codex JSONL/hooks、Kiro session metadataは形式が異なり、message本文やprovider応答を含み得る。共通toolが全raw schemaを解析するとprovider差分と機密性が中央moduleへ漏れる。adapterごとの独自auditはevent taxonomyを分裂させる。

### Options

- Option A — closed normalized event: adapterがprovider固有schemaを吸収し、共通verifier/auditはID・enum・Unitだけを見る。adapter更新が必要だが境界が深い。
- Option B — common raw parser: 1箇所で見えるが巨大conditionとsecret exposure riskが増える。
- Option C — adapter独自audit: provider追加は容易だが追跡queryとredactionが不統一になる。

### Decision

Option Aを採用する。normalized schema v1はnative state、coordinator start/stop、native child start/stop、native coordination markerをclosed unionで表す。全eventをschema version、driver、source、execution/attempt、attempt nonce hash、plan/wave digest、native run IDへ束縛する。coordinator exit 0、予定Unitとchildの全単射、全childのstartとcompleted stop、driver固有の独立source AND条件を満たした場合だけsuccessとする。driver toolだけがcheckpointと`SWARM_DRIVER_*`/`SWARM_NATIVE_EVIDENCE`/`SWARM_DEGRADED`を記録し、refereeは既存の収束eventだけを記録する。

未知eventをschemaへ透過保存しない。件数とdiagnostic codeだけを保持し、必須evidenceが構成できなければfail-closedとする。

### Consequences

- Positive: provider raw outputとcredentialがcheckpoint/auditへ流れない。
- Positive: verifier、runtime summary、test fixtureがprovider非依存になる。
- Positive: driver event ownershipとreferee event ownershipが明確になる。
- Negative: adapterごとにschema version fixtureとparser更新が必要。
- Negative: providerがstable machine-readable surfaceを提供しない場合はdriverをsuccessにできない。

### Alternatives Rejected

Option BはNFR-06の保守性とFR-19の機密性を同時に悪化させるため却下した。Option Cはexecution ID横断の監査と共通redactionを壊すため却下した。

### Security / Compliance impact

normalized unionにfree-form message、command全文、env値を定義しない。adapter parserはsize limit、line limit、UTF-8 validationを持ち、unknown fieldをdropする。audit schema validatorがsecret-like keyを拒否する。

### Reversibility

高い。schema v2を追加しadapterごとに移行できる。raw event保存へ戻す変更はsecurity reviewを必要とする。

## ADR-006 — Native証跡sourceとCodex Ultraの意味を明示する

**Status:** Proposed（requirements OQ-01/OQ-02の解消、stage gate待ち）  
**Decision scope:** FR-11〜FR-14、FR-23、制約8、OQ-01〜OQ-04

### Context

外部CLIのmarketing name、effort level、設定flagだけではnative delegationを証明できない。特にCodex公式`exec --json`はthread/turn/item/errorを公開するが、公開item一覧だけではchild agent利用を必ずしも識別できない。Claude Ultra Codeもxhigh effortだけではDynamic Workflow実行を証明しない。Kiroの非対話出力は人向け表示へ依存し得る。

### Decision

各driverの受理証跡を次のAND条件へ固定する。

| Driver | Native state source | Stream/hook source | 最小証明 |
|---|---|---|---|
| Claude Agent Teams | 一意teamのconfig `members` + shared task list | Claude stream-json/hook event | members≥2、Unit task全件、全childのstart/completed stop、同一team相関 |
| Claude Ultra Code | Dynamic Workflow run/task state | Claude stream-json/hook event | workflow run ID、native task/agent≥2、Unit全件、全childのstart/completed stop |
| Codex Ultra | resolved modelのUltra受理handshake | Codex thread JSONL + attempt専用SubagentStart/Stop hook | model ID、reasoning=ultra、thread ID、child agent≥2、Unit全件、全childのcompleted stop |
| Kiro subagent | persisted parent/child session metadata | coordinator stream/process result | parent ID、child session≥2、Unit全件、予定wave一致、全childのcompleted stop |

`codex-ultra`はAmadeusの「Ultra reasoningを受理した1 coordinatorからnative multi-agentへ2 Unit以上を委譲する」契約名とする。存在しない`--ultra` flagや特定model slugは仮定しない。`model_reasoning_effort="ultra"`を明示し、resolved model IDとUltra受理をhandshakeで確認する。通常`xhigh`、Ultra非対応modelへのdowngrade、Unitごとの`codex exec`、child agentなしは`codex-ultra`ではない。

provider field pathはimplementationの最初のresearch fixtureでlocal CLI実出力から固定し、versioned fixtureへredactして保存する。fixture capture自体はprompt/credential/provider responseを除去し、IDをsynthetic値へ置換する。stable pathを確認できないdriverは明示時hard error、`auto`時pre-dispatch fallbackとし、Intent完了前のmacOS live proofで最終確認する。証跡を取れなければscopeへ戻り、同名driverをfloorで成功扱いしない。

### Consequences

- Positive: OQ-01/OQ-02のexit条件を具体的なsource、相関、件数で判定できる。
- Positive: Codexの架空flagへ依存せず、floorとの差をUltra受理とnative delegationの両方で証明できる。
- Positive: external CLI schema driftがfalse successではなく明示failureになる。
- Negative: Claude Ultra CodeとKiroのstable field path確定にはcredentialed local fixtureが必要。
- Negative: CLI更新でfixture/parserの更新が必要になる可能性が高い。

### Alternatives Rejected

version文字列、effort level、env設定、prompt内の「delegated」自己申告だけを証跡にする案はFR-11〜FR-14に反するため却下した。process treeだけの証明もUnit割当とnative surfaceを示せないため却下した。

### Security / Compliance impact

fixtureは非機密taskだけで生成し、raw transcriptをcommitしない。hookはattempt nonceがあるときだけID/enumを記録する。Claude/Kiroのuser-global stateを読む場合はexecution由来のsession/team IDへscopeを限定する。

### Reversibility

中程度。providerが公式の専用evidence API/eventを追加した場合はadapter sourceを置換できる。最小件数とUnit全件相関を緩める変更はnative保証を下げるため再承認が必要。

## ADR-007 — 0.1.xでは旧変数を警告付きcompatibility shimとして残す

**Status:** Proposed（requirementsで確定、stage gate待ち）  
**Decision scope:** FR-04、FR-16、FR-17、FR-26、NFR-07

### Context

`AMADEUS_USE_SWARM`はハーネスごとに意味が異なり、Codex/Kiroでは`1`がloud-degradeを示す。新しい`AMADEUS_SWARM_DRIVER`へ単純変換すると既存0.1.xの挙動を変える。一方、両変数を長期維持するとselector contractが複雑化する。

### Decision

0.1.xでは新変数未設定かつ旧変数設定時だけlegacy互換表を適用し、現行ハーネス別意味をそのまま再現する。各解決試行でstderr warningとauditを出す。新旧が両方存在する場合は値にかかわらずhard errorとし、優先順位を推測しない。

| Harness | 新旧とも未設定 | 旧=`1`、新未設定 | 旧=その他、または空 | 新旧が共存 |
|---|---|---|---|---|
| Claude Code | 新`auto` selector | 現行dynamic workflowをlegacy modeで実行。surface unavailable時だけ現行Task floorへloud-degrade | 旧swarm無効、現行Task floor | hard error |
| Codex | 新`auto` selector | 現行Unit別`codex exec` floor + `SWARM_DEGRADED` | 旧swarm無効、現行`codex exec` floor | hard error |
| Kiro CLI | 新`auto` selector | 現行Unit別Kiro subagent floor + `SWARM_DEGRADED` | 旧swarm無効、現行Kiro floor | hard error |
| Kiro IDE | 新`auto` selector | 現行Unit別Kiro subagent floor + `SWARM_DEGRADED` | 旧swarm無効、現行Kiro floor | hard error |

旧値の「その他」には未認識値と空文字を含み、legacy semanticsではinvalid inputではなくswarm無効として扱う。旧=`1`は新native driverへのaliasではなく`LegacyExecutionPlan`であり、conductorが現行挙動を実行して`record-legacy`する。

0.2.0では旧変数read、compatibility branch、warning、legacy-only tests、暫定docsを同時削除する。削除は今回の実装対象外とし、日本語のGitHub Issueへ受入条件付きで記録する。

### Consequences

- Positive: 0.1.x利用者の実行方式はwarning以外変わらない。
- Positive: 新変数の明示driver semanticsへ旧値を誤変換しない。
- Negative: 0.1.x中はlegacy fixtureと分岐を維持する必要がある。
- Negative: 毎attemptのwarningは意図的にnoisyになる。

### Alternatives Rejected

旧`1`を各ハーネスの新native driverへ読み替える案は後方互換を破るため却下した。新変数を優先して競合を無視する案は誤設定を隠すため却下した。0.1.xで即削除する案はmigration windowがないため却下した。

### Security / Compliance impact

warning/auditへ旧envの生値を出さず、設定有無と`enabled`判定だけを記録する。不正値の診断もcredential-like環境全体をdumpしない。

### Reversibility

削除時期が明確な一時ADRである。0.2.0 Issueを完了すればこのADRはSupersededとなる。期限延長は別の明示決定を必要とする。

## ADR-008 — Release criterionをmacOSとGitHub Actions Linuxに限定する

**Status:** Proposed（Requirements Q7/Q8で確定、stage gate待ち）  
**Decision scope:** FR-23〜FR-25、NFR-08、NFR-09、NFR-11、NFR-12

### Context

手元のcredentialed native CLI環境はmacOSで、CIはGitHub Actions Linuxである。Windowsの実行・検証環境はなく、新driverのnative process、hook、path挙動を保証できない。

### Decision

- macOS: deterministic suite、package/dist/self-install、4 driverの2 Unit以上native live proofを必須とする。
- GitHub Actions Linux: fake CLIを用いたunit/integration/E2E/failure injection、package/dist/self-installを必須とする。credentialed liveは不要。
- Windows: release criterion外かつ未検証と文書化する。既存Windows codeを目的なく変更せず、新driver対応済みと表現しない。

### Consequences

- Positive: 利用可能な環境で再現可能な完了条件になる。
- Positive: credentialをCIへ追加せずnative保証をlocal evidenceで満たせる。
- Negative: Windows利用者には新driver保証を提供できない。
- Negative: local macOS live evidenceの保存・再実行手順が必要。

### Alternatives Rejected

未検証Windowsをbest-effort対応と表記する案はfalse assuranceになるため却下した。credentialed CI matrixはsecret管理と費用を増やし対象外要件に反するため却下した。

### Security / Compliance impact

GitHub Actionsへprovider credentialを追加しない。local live fixtureは非機密repo/taskで実行し、raw transcriptやtokenをcommitしない。

### Reversibility

高い。将来Windows runnerとcredentialなしfixtureを追加して検証後、対象platformを拡張できる。今回の既存Windows非回帰姿勢は維持する。

## 決定間の整合性

| Invariant | ADR |
|---|---|
| engineはeligibility、driver toolは選択/dispatch、refereeは収束を所有 | ADR-001、ADR-005 |
| native driverはbatch coordinator、Unit worktreeは分離 | ADR-002 |
| fallbackは`auto`のpre-dispatchだけ | ADR-003、ADR-007 |
| successはnative evidence + referee convergence + mergeのAND | ADR-003、ADR-004、ADR-006 |
| raw provider outputとcredentialを永続化しない | ADR-004〜ADR-006 |
| 旧変数は0.1.x shim、0.2.0でIssue経由削除 | ADR-007 |
| macOS live + Linux deterministic、Windows対象外 | ADR-008 |

新しいAWS resource、GUI、Unit内部Agent Team、custom driver/plugin SDKはどのADRでも導入しない。

## Review

### Iteration 1

**Verdict:** NOT-READY

独立reviewerは、native evidenceの独立source/完了相関、Kiroの末尾1 Unit wave、audit-first reconcile、referee envelope、resume state、legacy互換matrix、adapter/DAG/`LaunchInput`の7点を指摘した。全件を5成果物へ反映した。

### Iteration 2

**Verdict:** NOT-READY（reviewer_max_iterations到達）

前回7点の解消は確認された。残件は、hard crash後のactive checkpoint recovery、audit型のbatchとdiscard表現、referee failure terminality、floor/legacy説明の4点だった。

### Iteration 2後の解消

- active checkpointへ期限付きlease、process start identity、process group確認、fencing token、`active-attempt-recovered` transitionを追加した。
- `AttemptTransitionBase`と`ReconciliationResult`へbatch、lease ID、fencing tokenを追加し、reconcile actionへ`discarded`を追加した。
- referee error codeからfailed-resumable/failed-terminalへの閉じた対応表を追加し、merge failureを再開可能へ統一した。
- 新selectorのfloorと0.1.x legacyを独立execution modeとして統一した。

reviewer反復上限後の修正であるため、独立したREADY判定は追加していない。最終センサー、TypeScript code block構文、Mermaid構文、whitespace検査を再実行したうえでApplication Design gateへ提示する。
