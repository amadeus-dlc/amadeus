# Requirements — Intent-scoped Autonomy

## 上流入力と正本

本要件の正本は、次の3 Issueと承認済み質問回答である。

1. [#2095](https://github.com/amadeus-dlc/amadeus/issues/2095): 宣言的Loop Monitor Core
2. [#2096](https://github.com/amadeus-dlc/amadeus/issues/2096): first-party Quality Repair Loop Plugin
3. [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067): Intent-scopedな自律レベルと監査可能な自動裁定
4. `requirements-analysis-questions.md`: Issue間および既存contractとのGAP-01〜22に対する人間の裁定

上流成果物は次のように使用した。

- `intent-statement`: Intent終端への到達、Issue Fidelity Rule、対象利用者、初期成功条件を継承した。
- `scope-document`: In Scope / Out of Scope、#2095 → #2096 → #2067の依存順、5harness境界を継承した。
- `business-overview`: 利用者価値と、現行mode・grant・Walking Skeletonとの差分を継承した。
- `architecture`: Core、Plugin、Autonomy integration、audit、harness adapterの現行責務を継承した。
- `code-structure`: Core/setup/package/self-installへ分散するharness集合と、生成物を直接編集しない制約を継承した。
- `team-practices`: 本stageの明示的な追加入力には含まれていない。適用可能なteam normはruntimeの`rules_in_context`経由で遵守し、本要件から上書きしない。

Issueに明記済みの振る舞いは再裁定しない。Issueにない実装上の自由度はApplication Designへ送るが、Issue contractを拡張する機能は追加しない。

## Intent分析

### 目的

実在する人間がIntentに束縛して与えた認可、既存scope、norm、host/tool permissionを越えずに、AI-DLCを選択された自律レベルで前進させる。品質不備を承認扱いせず健全になるまで修復し、非生産的な修復だけを監査可能・再開可能に停止する。`full`の第一目的は外部PRやmergeを待たずIntent終端へ到達することである。

### 要求分類

| 項目 | 判定 |
|---|---|
| Type | 既存workflow engine、Plugin、audit、harness面を変更するsystem-wide enhancement / migration |
| Scope | Core、runtime graph、state、audit、Plugin composition、status、5harness adapter、tests |
| Complexity | 高い。複数の永続状態、認可、再開、品質収束、harness parityが交差する |
| Execution depth | Intentで選択済みのStandardを維持する |
| Test strategy | Comprehensive。決定論的contract testsとopt-in live smokeを含む |

### 成功条件

- #2095、#2096、#2067の全受け入れ条件が検証済みである。
- GAP-01〜22が本要件または後続design/test oracleへ追跡できる。
- `full`が認可境界内でIntent終端まで進み、品質不備や通常gateで不要に人間へ戻らない。
- 非生産的ループは同一fingerprintでLLMを再実行せず、安全に停止・再開できる。
- Claude Code、Codex、Cursor、OpenCode、Kimi Codeで同じCore contractが成立する。
- 新しいharnessの追加がLoop MonitorまたはAutonomy algorithmのforkを要求しない。

## 利用者シナリオ

### USR-01: 対話を維持する

利用者が`none`を選んだ場合、gateと質問は人間が裁定し、Quality Repair Pluginは既定offである。人間がIntent設定で明示opt-inした場合だけ品質修復を自動化し、gateや質問の裁定権は増えない。

### USR-02: phase単位で自動進行する

利用者が対象Intentを`semi`へ変更すると、phase内gateは自動承認され、質問とphase境界では人間を待つ。品質不備はPluginが修復する。`semi`にはgrantを発行しない。

### USR-03: Intent終端まで自動進行する

利用者が`full` grantのscopeと事前裁定方針を確認すると、stage / phase gate、Walking Skeleton、質問がgrant範囲で自動裁定され、品質修復を経てIntent終端まで進む。新しい権限、不可逆操作、scope外操作、waiverは自動承認しない。

### USR-04: teamの子Intentへ自律レベルを設定する

実在する人間は対象Intentを明示して、子Intentを`semi`へ変更または`full` grantを発行できる。space全体へ効く一括権限は作らず、各認可を対象Intentのaudit provenanceへ束縛する。

### USR-05: 非生産的な品質修復から再開する

fixed point、churn、regression cycleが最初にthresholdへ達した時点では、品質修復を直ちに停止せずreplanする。少なくとも1回replanした後もstrict progressがなく、さらに`T`個のnon-progress snapshotが連続した場合だけ、Intentは`parked / REPAIR_STALLED`となり、Intent-level workflow実行状態が`suspended`になる。`full`ではgrant認可状態を`active`のまま保持し、`none / semi`ではgrantは`null`のままである。evidence変化または人間の明示retryで再開する。

### USR-06: 自動裁定を後から確認する

利用者はactive / completed Intentの自動裁定履歴を閲覧する。solo electionまたはagent recommendationの判断を`accept / flag`すると、実在する`HUMAN_TURN`に基づく`AUTO_DECISION_REVIEWED`が記録される。完了済みIntentはrollbackされない。

### USR-07: legacy状態から安全に移行する

既存の`unset / gated / autonomous`は`none`へ移行し、明示的人間操作なしに`full`へ昇格しない。既存standing delegation grantはaudit/replay用に保持するが、新contractで認可に使わず、自動変換しない。

### USR-08: Plugin contributionを保守する

Plugin保守者は、Core algorithmを変更せず、正規化済み内部SPIへMonitor、evidence provider、route rule、任意のrequired outputを寄与する。壊れたcontributionはcompile / preflightでfail-closedになり、未知routeを実行できない。

### USR-09: 新しいharness adapterを追加する

harness実装者は単一descriptor registryへnative capabilityと配線を追加し、既存のLoop Monitor / Autonomy algorithmをforkせず、共通contract suiteとopt-in live smokeで適合性を証明する。

### USR-10: 外部runnerから安全に再開する

runner利用者はresult envelopeの`outcome`、`retryable`、`resume_condition.status`を機械的に読み、条件未充足時は再起動せず、条件充足後だけ同じIntentを再開する。Coreの完了判定にrunner実装を混ぜない。

### シナリオ追跡

| Scenario | 主な要件 | 検証面 |
|---|---|---|
| USR-01 | FR-AUT-001〜004、FR-QRP-002〜003 | mode / opt-in contract integration |
| USR-02 | FR-AUT-005、FR-QRP-001〜013 | phase gate matrix + quality repair integration |
| USR-03 | FR-AUT-006〜007、FR-GRT-001〜009、FR-DEC-001〜007 | full Intent E2E + grant audit replay |
| USR-04 | FR-AUT-009、FR-GRT-005 | target Intent authorization integration |
| USR-05 | FR-LMC-008〜010、FR-QRP-009〜011、FR-STP-003〜006 | crash / latch / resume integration |
| USR-06 | FR-DEC-006〜007、FR-OBS-001〜007 | active / completed review UX + seal test |
| USR-07 | FR-AUT-008〜010、NFR-SAF-004 | migration fixtures |
| USR-08 | FR-LMC-007、FR-LMC-011、FR-QRP-012 | Plugin schema / compile contract |
| USR-09 | FR-HAR-001〜007 | descriptor generation + harness contract / live smoke |
| USR-10 | FR-STP-005〜007 | result truth-table contract test |

## 機能要件

### A. 自律レベルと移行

- **FR-AUT-001:** Engineが受理する自律レベルは`none / semi / full`だけとし、未指定時は`none`とする。
- **FR-AUT-002:** headless / non-interactive起動、harness種別、環境変数の存在だけで自律レベルを昇格してはならない。
- **FR-AUT-003:** modeのupgrade / downgradeとgrantの発行 / revokeを実行できるのは、物理的に存在する`HUMAN_TURN`へprovenanceを束縛できる人間操作だけとする。
- **FR-AUT-004:** `none`ではstage / phase gateと質問を人間が裁定する。
- **FR-AUT-005:** `semi`ではphase内gateを自動承認し、phase境界と質問を人間が裁定する。Quality Repair Pluginを自動有効化する。
- **FR-AUT-006:** `full`ではgrant範囲内のstage / phase gateと質問を自動裁定し、Quality Repair Pluginを自動有効化してIntent終端まで進む。
- **FR-AUT-007:** Walking Skeletonは通常のmode規則に従い、`full` grantだけが自動承認できる。
- **FR-AUT-008:** 旧`unset / gated / autonomous`はすべて`none`へfail-closedに移行し、自動的な`full` grantを生成しない。
- **FR-AUT-009:** teamの子Intentへmodeまたはgrantを設定する操作は対象Intent UUIDを必須とし、space全体へ効くauthorizationを作らない。
- **FR-AUT-010:** 現行standing delegation grantの新規認可経路を廃止する。既存eventはaudit/replayで読める状態を維持するが、live authorizationには使用せず、検出時に移行診断を返す。

### B. Intent-scoped grant

- **FR-GRT-001:** `full` grantはIntent UUIDへ束縛し、TTLと行使回数budgetを持たない。
- **FR-GRT-002:** grantはIntent完了、人間のrevoke、または人間が選択した新modeへの置換まで有効とする。upgradeは新grantを発行し、downgrade / revokeは即時反映する。
- **FR-GRT-003:** `Request Changes`はgrantを暗黙にrevokeまたはsuspendしない。
- **FR-GRT-004:** grantの認可ライフサイクル`active / revoked / completed`と、Intent-levelのworkflow実行状態`running / suspended / null`を直交させる。active / parked Intentではgrantの有無にかかわらずworkflow実行状態が存在し、completed Intentでは`null`とする。`none / semi`ではcurrent grantを`null`、`full`ではcurrent grantを必須とする。`full`の`active grant + suspended workflow`を表現できなければならない。
- **FR-GRT-005:** grantのcanonical sourceは対象Intentのauditとし、per-clone gitignored stateを正本にしない。
- **FR-GRT-006:** grant発行前に、scope、正規化済み事前裁定方針、principalを人間へ表示し、明示確認を得る。
- **FR-GRT-007:** 自動裁定の副作用前に`candidate → validate/reserve → GRANT_EXERCISED → apply`の順序を守る。検証失敗時は`GRANT_EXERCISED`を記録しない。
- **FR-GRT-008:** audit主体を`principal / decider / actor / basis`で表現し、法的代理人メタファーを必須にしない。
- **FR-GRT-009:** grantの発行、置換、行使、revoke、Intent完了、実行suspend / resumeを再生可能にする。正確なEvent名はEvent Registry設計で閉じる。

#### Grant状態と遷移contract

workflow実行状態はIntent-levelであり、grant objectの子fieldではない。合法なcurrent-state組合せは次だけとする。

| autonomy mode | current grant認可状態 | workflow実行状態 | 合法性・意味 |
|---|---|---|---|
| `none` | `null` | `running / suspended` | grantなし。人間裁定または明示opt-in品質修復を実行 / 停止できる |
| `semi` | `null` | `running / suspended` | grantなし。phase内自動進行と品質修復を実行 / 停止できる |
| `full` | `active` | `running` | grant範囲でworkflowを進行できる |
| `full` | `active` | `suspended` | grantを保持したまま停止理由の解消を待つ |
| 任意 | `revoked / completed`の履歴record | `running / suspended` | 終端grantはaudit履歴にだけ残り、current authorizationには使わない |
| completed Intent | `null`または`completed`の最終record | `null` | workflow終端。再実行しない |
| その他 | 任意 | 任意 | 禁止。parser、state mutation、replayでfail-closedする |

| Trigger | Before | After | 原子性・制約 |
|---|---|---|---|
| 人間が`full` grantを発行 | mode=`none/semi`、current grant=`null`、workflow=`running/suspended` | mode=`full`、current grant=`active`、workflow状態は維持 | mode変更、grant生成、human provenance、対象Intent UUIDを同じtransactionへ記録し、`none/semi + active grant`または`full + null grant`の中間状態を観測させない |
| `AWAITING_HUMAN / REPAIR_STALLED / NORM_CONFLICT / USER_PARKED` | workflow=`running` | workflow=`suspended` | `full`ならgrant ID / 認可状態を変えず、`none/semi`ならgrantは`null`のまま |
| resume condition充足後の再開 | workflow=`suspended` | workflow=`running` | latch解除とresume eventを同じtransaction identityへ束縛する |
| terminal invocation failure | workflow=`running` | workflow=`running` | `failed` resultは現在の呼出しだけを終端し、Intent lifecycle、workflow latch、mode、grantを変更しない。failure evidenceと不変のcurrent stateを同じaudit transaction identityへ束縛する |
| 人間のrevoke | `full`、grant=`active`、workflow=`running/suspended` | 旧grant=`revoked`、mode=`none`、workflow状態は維持 | suspend中でも即時に効く。revoked recordはcurrent grantから外す |
| `full`から別modeへの置換 | grant=`active`、workflow=`running/suspended` | 旧grant=`revoked`、current grant=`null`、workflow状態は維持 | mode変更と旧grant終端を一transactionで行う |
| `full` grantのupgrade / 再発行 | 旧grant=`active`、workflow=`running/suspended` | 旧grant=`revoked`、新grant=`active`、workflow状態は維持 | 新grant発行と旧grant置換の間に両方activeまたは両方不在の観測点を作らない |
| Intent完了 | workflow=`running` | active grantがあれば`completed`、workflow=`null` | suspended中のIntentは完了できない。先にresumeまたはrevokeする |

`revoked`と`completed`は同一grant IDでは終端であり、再active化しない。`none/semi`のworkflow再開はgrantを必要としない。`full`の再認可には新しいgrant IDを必要とする。

### C. 事前裁定方針と質問解決

- **FR-DEC-001:** `full` grantは任意の「事前裁定方針」を自然言語で受け付け、selectorとpolicyへ正規化し、人間確認後にだけ有効化する。
- **FR-DEC-002:** `full`の質問は、(1)確認済み事前裁定方針、(2)norm / 過去の人間裁定からの機械的に一意な導出、(3)solo election、(4)agent recommendationの順で解決する。
- **FR-DEC-003:** 過去裁定はquestion selector、scope lineage、適用norm fingerprintが一致し、回答が一意な場合だけ適用する。複数回答または不一致は次の経路へfall throughする。
- **FR-DEC-004:** 適用可能なnorm同士が矛盾する場合、AIは優先順位を創作せず`parked / NORM_CONFLICT`とする。
- **FR-DEC-005:** solo election capabilityがない場合、複数投票を偽装せず、理由とcapabilityを記録してagent recommendationへloud degradationする。
- **FR-DEC-006:** すべての自動裁定で`AUTO_DECIDED`を記録する。decision IDはIntent UUID、安定question identity、occurrence / idempotency identity、graph revisionから決定的に導出する。
- **FR-DEC-007:** 事前裁定方針と機械的一意導出は履歴へ表示するが未確認queueへ積まない。solo electionとagent recommendationは`unreviewed`としてqueueへ積む。

### D. Loop Monitor Core

- **FR-LMC-001:** workflow-level manifestでLoop Monitorを宣言し、空cycle、重複ID、不正threshold、unknown event / route、cycle eventと重なるignore eventをcompile時にfail-closedする。
- **FR-LMC-002:** Monitor ID、cycle event、route、obligationには表示文言ではない安定識別子を使う。
- **FR-LMC-003:** cycle末尾まで一致し、自然遷移が同じcycleへ再進入する場合だけthreshold計上する。自然退出ではJudgeを発火しない。
- **FR-LMC-004:** audit noise、tool call、ファイル編集、session、compaction、別cloneのaudit追加でcycle履歴を誤リセットまたは誤計上しない。
- **FR-LMC-005:** 履歴をIntent UUID、Monitor ID、stage instance / Bolt、graph revisionへ束縛する。
- **FR-LMC-006:** graph revisionは、compile済みruntime graphのcontrol-flow、Monitor定義、Plugin contributionをcanonical化したcontent digestとする。volatile metadataは除外する。
- **FR-LMC-007:** Judgeはmanifestが宣言した閉じたroute集合以外へ遷移できない。
- **FR-LMC-008:** Judge開始後のcrash / resumeで同じinvocationを再構築し、同一delivery / invocationを二重計上・二重判定しない。
- **FR-LMC-009:** 判定、根拠fingerprint、idempotency identity、traceId / spanId、停止latch設定 / 解除をcanonical auditから再生できる。
- **FR-LMC-010:** 同一停止fingerprintでの再起動はLLMや修復処理を呼ばず、同じ機械可読結果を返す。evidence変化または人間の明示retryだけを解除候補とする。
- **FR-LMC-011:** PluginがCore algorithm変更なしにMonitor定義、evidence provider、Judge instruction / route ruleを正規化済み内部SPIへ寄与できる。
- **FR-LMC-012:** Coreへgrant、自律レベル、品質証拠の意味論を埋め込まない。

### E. Quality Repair Loop Plugin

- **FR-QRP-001:** first-party Quality Repair Loop Pluginを同梱し、#2095の内部contribution SPIへ正規化・compileする。
- **FR-QRP-002:** `semi / full`では自動有効化し、欠落・破損時は開始前にfail-closedする。`none`ではIntent設定の既定offとし、実在する人間の明示opt-inとaudit provenanceを要求する。
- **FR-QRP-003:** `none`でPluginを有効化してもgate / questionの裁定権を拡張しない。
- **FR-QRP-004:** 品質obligationは、構造化済みreviewer `BLOCKER / NOT-READY`、明示的にblocking指定されたsensor failure / incomplete、必須produces、宣言済みverification / completion conditionに限定する。
- **FR-QRP-005:** advisory sensorを暗黙にblockingへ昇格しない。sensor scriptのnon-zero / signal / exception / incompleteを成功eventとして扱わない。
- **FR-QRP-006:** reviewer表記はwire上`NOT-READY`へ正規化し、表示文言差で別fingerprintを作らない。
- **FR-QRP-007:** evidenceは未充足obligation ID、failure category、stage / Bolt / artifact、verifier identity、failure fingerprint、前回からの解消 / 追加 / 維持を含む。
- **FR-QRP-008:** audit数、session数、編集回数、表層文面差、同じobligationの言い換えを進捗とみなさない。
- **FR-QRP-009:** fixed point、churn、regression cycleを判定し、routeを`repair / replan / repair-stalled`に限定する。
- **FR-QRP-010:** threshold到達時はまず別contextまたはagentによる`replan`を試す。`replan`も同じMonitor identityとevidence履歴で監視し、進捗しない反復を`repair-stalled`へ収束させる。
- **FR-QRP-011:** Quality Repair全体へ固定retry上限を置かない。既存`reviewer_max_iterations`、Stop、swarmのbudgetは各局所loopだけに適用し、上限到達後の未解消品質obligationをPluginへ引き渡す。
- **FR-QRP-012:** Pluginの`required_outputs[]` contributionは安定output ID、stage selector、verifierを持つ。初期PluginはIssueに記載のない新規artifactを必須化しない。
- **FR-QRP-013:** 人間の`Request Changes`を品質失敗へ暗黙変換しない。

#### 品質進捗の決定論的最小contract

各completed `quality-check`は、同じIntent UUID、Monitor ID、stage instance / Bolt、graph revisionに対して、未充足obligation ID集合`U(n)`と各obligationの正規化fingerprintからsnapshotを作る。比較epochは、同じ束縛identityで直近のlatch解除またはgraph revision変更の直後から始まる。strict progressは連続無進捗countをresetするが、regression検出用の比較窓から過去snapshotを消さない。比較窓はcompile済みMonitorの正整数`threshold = T`に対する直近`T + 1` snapshotとする。

- **Strict progress:** `U(n)`が`U(n-1)`の真部分集合であり、新しいobligationが1件も追加されていない。件数が同じ、1件解消と1件追加、fingerprintだけの変化はprogressではない。
- **Fixed point:** 同じsnapshot fingerprintが`T`回連続する。
- **Churn:** 直近`T` snapshot間にstrict progressがなく、snapshot fingerprintは変化するが未充足obligation集合が単調に縮小しない。
- **Regression cycle:** 最新snapshot fingerprintが比較窓内の過去snapshotと一致し、その間に異なるsnapshotが1件以上ある。最小例は`A → B → A`である。
- **Evidence change:** latchされたsnapshotに対し、`U`が真部分集合になる、またはobligationのverifierが新しい成功証拠を出すこと。audit数、session数、編集回数、自然言語表層差はevidence changeではない。人間の明示retryはevidence changeとは呼ばず、独立したlatch解除候補として記録する。
- **不足・不正evidence:** 必須fieldまたは安定IDを欠くsnapshotはprogressに数えず、provider identityから導出した予約IDの`evidence-incomplete` obligationとしてfail-closedに正規化する。

`T-1`まではthreshold routeを発火せず、`T`到達時に初回は`replan`を要求する。`replan`の正規化plan digestと、その後のquality snapshotを同じepochへ監査記録するが、plan文面またはdigestの変化をprogressに数えない。replan後にstrict progressがあれば連続無進捗countをresetして`repair`を継続する。strict progressがないまま、再び`T`個のnon-progress snapshotが連続した時点で、distinct planの有無にかかわらず決定論的に`repair-stalled`を返す。この停止条件は総retry回数の固定capではなく、strict progressのたびにresetされる連続無進捗thresholdである。同率・判定不能・evidence不足もnon-progressとして数え、成功や`repair`を創作しない。

最小合否例:

| Snapshot列（`T=3`の例） | 判定 |
|---|---|
| `{A,B,C} → {A,B}` | strict progress、repair継続 |
| `{A,B} → {A,B} → {A,B}` | fixed point、replan trigger |
| `{A,B} → {A,C} → {A,D}` | churn、replan trigger |
| `{A,B} → {A} → {A,B}` | regression cycle、replan trigger |
| replan後、strict progressなしでnon-progress snapshotが再び`T`個連続 | distinct planの有無にかかわらず`repair-stalled` |
| fingerprint文面だけ変化、`U`不変 | progressではない |

### F. 停止・再開・result envelope

- **FR-STP-001:** 停止理由ごとにIntent lifecycleを増やさず、既存`parked`と`AWAITING_HUMAN / REPAIR_STALLED / NORM_CONFLICT / USER_PARKED`の閉じたreason codeを使う。
- **FR-STP-002:** 新規権限、未承認の不可逆操作、scope外操作、waiver要求は`AWAITING_HUMAN`とし、具体的な停止条件と必要な人間操作を構造化`resume_condition`へ記録する。
- **FR-STP-003:** `repair-stalled`では`parked / REPAIR_STALLED`とし、Intent-level workflow実行状態を`suspended`とする。`full`ではgrant認可状態を`active`のまま保持し、`none / semi`ではgrantを`null`のまま保持する。
- **FR-STP-004:** `NORM_CONFLICT`ではworkflow実行状態を`suspended`にし、norm fingerprint変化後に再開可能とする。`full`ではgrantを`active`のまま保持し、`none / semi`ではgrantを`null`のまま保持する。
- **FR-STP-005:** harness-neutral result envelopeは`outcome`、`reason_code`、`retryable`、`intent_uuid`、`autonomy_mode`、Intent-level `workflow_execution_state`、nullableなgrant object（ID / 認可状態）、`evidence_fingerprint`、構造化`resume_condition`を返す。`none / semi`のcurrent grantは`null`とする。`resume_condition`は少なくとも`kind`、`status: pending | satisfied`、条件を評価するstable identityまたはfingerprintを持つ。
- **FR-STP-006:** `retryable`は「外部runnerが同じIntentを条件付きで再開可能」を意味する。`parked=true`、`completed=false`、terminal invocation `failed=false`とする。`failed`は現在の呼出しだけの結果であってIntent lifecycleの終端ではなく、workflowを`running`のまま維持する。人間は新しい専用操作を使わず、既存の通常のAmadeus起動で同じactive Intentを継続できる。
- **FR-STP-007:** 外部runner / schedulerはresult envelopeを読んでプロセス再起動を判断する。Coreは常駐supervisorやharness固有polling loopを持たない。

#### Result / retryable真理値表

| outcome | reason_code | workflow state | retryable | resume_condition | runnerの扱い |
|---|---|---|---:|---|---|
| `completed` | `null` | `null` | `false` | `null` | 再起動しない |
| `parked` | `AWAITING_HUMAN` | `suspended` | `true` | 対象人間操作が来るまで`pending`、provenance検証後`satisfied` | `satisfied`後だけ再開 |
| `parked` | `REPAIR_STALLED` | `suspended` | `true` | evidence fingerprint変化または人間retryまで`pending` | `satisfied`後だけ再開 |
| `parked` | `NORM_CONFLICT` | `suspended` | `true` | applicable norm fingerprint変化まで`pending` | `satisfied`後だけ再開 |
| `parked` | `USER_PARKED` | `suspended` | `true` | 実在する人間のunpark / retryまで`pending` | `satisfied`後だけ再開 |
| `failed` | `null` | `running` | `false` | `null` | 外部runnerは同じ呼出しを自動再試行しない。Intent lifecycle、workflow latch、mode、grantは変更せず、人間による既存の通常起動から同じactive Intentを継続できる |

上表以外の`outcome / reason_code / retryable`組合せはschema validationで拒否する。`retryable=true`は「今すぐ再起動してよい」ではなく「同じIntentを条件付きで再開できる」を意味する。runnerは`retryable=true AND resume_condition.status=satisfied`の場合だけ再起動してよい。`failed`の`retryable=false`はrunnerによる自動再起動を禁止するだけであり、active Intentをpark、suspend、完了、失敗終端へ遷移させない。

### G. 自動裁定review、status、observability

- **FR-OBS-001:** active / completed Intentの自動裁定をread-onlyで一覧・詳細表示できる。
- **FR-OBS-002:** 表示には質問、選択肢、選択回答、decider、basis、grant ID、evidence、degraded capabilityを含む。
- **FR-OBS-003:** `accept / flag`は実在する`HUMAN_TURN`に基づく`AUTO_DECISION_REVIEWED`を記録する。
- **FR-OBS-004:** completed Intentのaudit sealは維持し、`AUTO_DECISION_REVIEWED`だけを限定追記できる。成果物、workflow lifecycle、過去の裁定eventを変更しない。
- **FR-OBS-005:** `flag`はcompleted Intentをrollbackせず、contract不備なら`self-fix`、仕様追加・変更なら`self-feature`を提案する。新Intentを自動作成しない。
- **FR-OBS-006:** human-readable / machine-readable statusに、自律レベル、Intent-level workflow実行状態、nullableなgrant ID / 認可状態 / scope、suspended reason、事前裁定方針数、未確認自動裁定数、stop reason、resume conditionを表示する。
- **FR-OBS-007:** 新しいevent / attributeは既存Event RegistryとOTel射影へ登録し、別telemetry schemaを作らない。

### H. Harness、packaging、verification

- **FR-HAR-001:** 初期live対象はClaude Code、Codex、Cursor、OpenCode、Kimi Codeとする。
- **FR-HAR-002:** 5harnessすべてで同一の決定論的Core contract suiteを実行し、mode、grant、Monitor、quality repair、停止 / 再開、auditを検証する。
- **FR-HAR-003:** 各harnessにopt-in live smokeを用意し、Judge invocationとsolo electionまたはloud degradationを実測する。live receiptは実装revision / package digestへ束縛した適合性証拠として保存できるが、未実行・不足・未収集をCore Intent完了の待機条件にしてはならない。
- **FR-HAR-004:** session / process / compaction / 別cloneを跨いでgrant、review queue、Monitor history、停止latchが維持されることを検証する。
- **FR-HAR-005:** harness集合の正本を単一descriptor registryとする。registryは既存の7 package face（`claude / codex / cursor / opencode / kimi / kiro / kiro-ide`）、それらが写像される6 host directory（`.claude / .codex / .cursor / .opencode / .kimi-code / .kiro`）、5 self-install face（`claude / codex / cursor / opencode / kimi`）を別field / capabilityとして表現し、Core capability、setup、package projection、self-install projectionを生成または検証する。今回のautonomy contract / live smoke対象はdescriptor flagで選ぶ現行5harnessだけとし、Kiro / Kiro IDEはpackage faceと非退行検証へ残すが、今回のlive対応済みとは扱わない。
- **FR-HAR-006:** 「adapter追加だけ」は、新harness追加時にLoop Monitor / Autonomy algorithmのforkが不要であることを意味する。native triggerやcapabilityのadapter記述は許容する。
- **FR-HAR-007:** package / promote drift guardを通し、`dist/`またはpromoted suffixを手編集しない。

## 非機能要件

### 決定性・冪等性

- **NFR-DET-001:** 同じcanonical graph、audit corpus、clock input、evidenceから同じMonitor照合、decision ID、route、result envelopeを得る。
- **NFR-DET-002:** crash境界、session再開、compaction、audit shard mergeで重複eventまたは重複副作用を発生させない。
- **NFR-DET-003:** identityへ自然言語表示、ファイル更新回数、audit行数を使用しない。

### 安全性・セキュリティ

- **NFR-SAF-001:** 未知schema、未知route、壊れたPlugin、失効・不正provenance、legacy grant、norm conflictはfail-closedする。
- **NFR-SAF-002:** synthetic `HUMAN_TURN`を生成せず、人間専用のmode変更、grant操作、review、retry、waiverをagentが代行できない。
- **NFR-SAF-003:** `full`でもIntent、scope、norm、host/tool permissionを越えず、外部権限を付与しない。
- **NFR-SAF-004:** 既存standing grantから新`full` grantへの自動変換を禁止する。

### 信頼性・再開性

- **NFR-REL-001:** canonical stateはversion-controlledなIntent audit / recordへ置き、per-clone scratchを正本にしない。
- **NFR-REL-002:** 同一fingerprint停止の再実行はLLMを呼ばず短絡し、無駄な費用・時間を抑える。
- **NFR-REL-003:** stop reasonとresume conditionは人間とrunnerの双方が解釈でき、再開後も同じgrant provenanceを追跡できる。

### 保守性・拡張性

- **NFR-MNT-001:** 汎用cycle機構、品質policy、自律認可をCore / Plugin / Autonomy integrationへ分離する。
- **NFR-MNT-002:** 外部Plugin manifest形式#2065へ直接依存せず、正規化済み内部contribution modelを安定境界とする。
- **NFR-MNT-003:** harness固有コードへMonitorまたはquality policyを複製しない。
- **NFR-MNT-004:** 新stage、scope-grid行、stage runnerを追加しない。

### 観測性・UX

- **NFR-UX-001:** ユーザー向け主要語彙を「自律レベル、grant、grant scope、事前裁定方針、自動裁定、grant行使、停止理由」に絞る。
- **NFR-UX-002:** `REPAIR_STALLED`では「非生産的な修復ループを検出したため一時停止した」と明示し、`full`では「grantを保持している」、`none / semi`では「grantは使用していない」とmode別に表示する。
- **NFR-UX-003:** legacy standing grantを検出した場合、認可に使われない理由と、`semi / full`への移行方法を明示する。
- **NFR-OBS-001:** audit eventとOTel射影から、cycle、Judge、route、grant、decision、review、stop / resumeを相互参照できる。

### 性能・容量

- **NFR-PERF-001:** event delivery時のMonitor更新は、現在epochの全auditを毎回再走査せず、対象Monitor数と比較窓`T + 1`に比例するbounded stateで処理する。
- **NFR-PERF-002:** crash / resume時のaudit再構築は、対象Intentの関連event数に対して線形を上限とし、無関係なaudit noiseの増加でJudge / LLM呼出回数を増やさない。
- **NFR-PERF-003:** Comprehensive testで、threshold境界の小corpus、session / cloneを跨ぐ複数shard corpus、既存test fixture群で最大の関連audit corpusを測定対象にし、既存の同等audit replay baselineより計算量classを悪化させない。根拠のないwall-clock SLOは作らない。

### 情報保護

- **NFR-PRV-001:** 事前裁定方針、質問、回答、evidence、statusは既存Intent audit / Event Registry / OTelのaccess control、redaction、retention contractを継承し、別の非保護storeを作らない。
- **NFR-PRV-002:** credential、secret、bearer token、未redactのhost/tool payloadをgrant、decision、evidenceへ保存しない。identityとfingerprintにはredaction後のcanonical valueまたは安全なdigestを使う。

## 制約

- **CON-001:** 実装順は#2095 → #2096 → #2067統合とする。
- **CON-002:** CoreはGitHub、PR、review、merge、convergenceを知らず、それらをIntent完了条件にしない。
- **CON-003:** 外部runner / scheduler、常駐supervisor、harness固有polling loopを実装しない。
- **CON-004:** 新規host / cloud / tool permission、不可逆操作、scope外操作、norm / 安全性 / 品質waiverをgrantで認可しない。
- **CON-005:** 時間・費用budgetをgrantまたは品質進捗の意味へ混ぜない。
- **CON-006:** #1717は現行5harnessに必要なlive E2E policy / adapter capabilityだけをblockerとし、Kiroを含むIssue全体の完了を要求しない。
- **CON-007:** #2065の外部Plugin形式、#1241の一般的外部待機、#1902 / #1971のPR integrationをblockerにしない。
- **CON-008:** 人間の`Request Changes`はactive Intent / scope内の修復入力として扱い、暗黙にgrantを止めない。

## 前提

- **ASM-001:** 5harnessは共通Coreを実行し、違いはnative invocation、hook / skill配線、capability adapterに閉じる。
- **ASM-002:** normとhost/tool permissionは本Intent外で既に解決可能な形式を持ち、本Intentはwaiver機構を追加しない。
- **ASM-003:** reviewer、sensor、produces、verification / completion conditionには安定IDを付与または導出できる。
- **ASM-004:** 外部runnerはmachine-readable result envelopeを読めるが、その実装と運用policyは本Intentに含めない。
- **ASM-005:** live model / tool credentialがない環境では、その環境でのlive smoke実行を理由付きで明示skipできる。skipはpassではないが、Core Intent終端も妨げない。credentialを持つ認可済み環境で得たreceiptは同一implementation revision / package digestへ束縛した任意の適合性証拠として扱う。

## 対象外

- 外部runner / schedulerの実装、常駐supervisor、外部プロセス再起動
- GitHub / PR review / merge / convergenceの待機・制御
- 新しいhost / cloud / tool permissionの付与
- norm、安全性、品質基準のwaiver自動承認
- 完了済みIntentの自動rollback
- `self-fix` / `self-feature` Intentの自動作成
- 外部Plugin manifest形式の確定
- 新しいAI-DLC stage、scope-grid行、stage runner
- 時間・費用budgetの一般化
- Kiroを含む#1717全体
- 任意LLMによるworkflow graphの自由な書き換え
- PR未mergeを理由にしたIntent未完了化

## 検証oracle

| Oracle | 合否contract |
|---|---|
| `V-SCHEMA` | canonical fixtureのacceptと、unknown / malformed / illegal combination fixtureのfail-closedを固定する |
| `V-UNIT` | pure identity、cycle matcher、progress classifier、route validation、state transitionの境界表を決定論的に検証する |
| `V-INTEGRATION` | engine、state、Plugin、audit、statusを接続し、正常・停止・再開・人間入力経路を検証する |
| `V-REPLAY` | crash、session、process、compaction、clone / shard merge後の再構築と重複抑止を検証する |
| `V-MIGRATION` | legacy mode / standing grant fixtureが昇格せず、診断され、audit replay可能であることを検証する |
| `V-HARNESS-CONTRACT` | 5harnessへ同じCore fixture / expected resultを投影しbyte-equivalentなcontract結果を得る |
| `V-HARNESS-LIVE` | 各harnessのopt-in実行でJudgeとsolo electionまたはloud degradationを記録する。実行時のreceiptは同一implementation revision / package digestへ束縛する。未実行またはskipをpassには数えず、同時にCore Intent完了のblockerにもしない |
| `V-UX-SNAPSHOT` | human / machine status、review queue、result envelope、移行診断の必須fieldと用語を固定する |
| `V-DRIFT` | 単一descriptorから7 package face、6 host directory、5 self-install faceと今回の5harness contract / live subsetが一意に導出され、package、promote、descriptor projectionのcheck modeがcleanであることを検証する。Kiro / Kiro IDEの既存package projectionが欠落した場合はfailとする |

## Issue受け入れ条件追跡

### #2095 — Loop Monitor Core

| AC | 判別可能な要約 | 要件 | Oracle | Disposition |
|---|---|---|---|---|
| 2095-AC01 | workflow manifestを検証しruntime graphへ決定的compile | FR-LMC-001、006 | V-SCHEMA、V-UNIT | In |
| 2095-AC02 | threshold到達前後の境界 | FR-LMC-003 | V-UNIT | In |
| 2095-AC03 | cycle自然退出ではJudge非発火 | FR-LMC-003 | V-UNIT | In |
| 2095-AC04 | ignore / noise / resume / compaction / cloneで誤計上なし | FR-LMC-004 | V-UNIT、V-REPLAY | In |
| 2095-AC05 | 宣言外routeを拒否 | FR-LMC-007 | V-SCHEMA、V-UNIT | In |
| 2095-AC06 | Judge crash境界で二重実行・二重Eventなし | FR-LMC-008〜009 | V-REPLAY | In |
| 2095-AC07 | 同一停止fingerprintはLLMなしで同じ結果 | FR-LMC-010 | V-INTEGRATION、V-REPLAY | In |
| 2095-AC08 | evidence変化 / 明示retryの解除を監査 | FR-LMC-010、FR-STP-005〜006 | V-INTEGRATION、V-REPLAY | In |
| 2095-AC09 | PluginがCore変更なしでMonitor / providerを寄与 | FR-LMC-011 | V-SCHEMA、V-INTEGRATION | In |
| 2095-AC10 | 新stage / scope-grid / runnerを追加しない | FR-LMC-012、NFR-MNT-004 | V-DRIFT | Constraint |
| 2095-AC11 | 5harnessで同じCore contract tests | FR-HAR-001〜002 | V-HARNESS-CONTRACT | In |
| 2095-AC12 | 5harnessでJudge opt-in live smoke | FR-HAR-003 | V-HARNESS-LIVE | In |
| 2095-AC13 | future harnessはadapter接続だけでMonitor fork不要 | FR-HAR-005〜006 | V-HARNESS-CONTRACT | In |
| 2095-AC14 | package / promote drift guard | FR-HAR-007 | V-DRIFT | In |

### #2096 — Quality Repair Loop Plugin

| AC | 判別可能な要約 | 要件 | Oracle | Disposition |
|---|---|---|---|---|
| 2096-AC01 | first-party Plugin同梱 | FR-QRP-001 | V-INTEGRATION、V-DRIFT | In |
| 2096-AC02 | contributionを#2095 SPIへcompile | FR-QRP-001 | V-SCHEMA、V-INTEGRATION | In |
| 2096-AC03 | `semi/full`自動、`none`任意有効化 | FR-QRP-002〜003 | V-INTEGRATION | In |
| 2096-AC04 | `semi/full`でPlugin欠落・破損をpreflight拒否 | FR-QRP-002 | V-SCHEMA、V-INTEGRATION | In |
| 2096-AC05 | 新stageを追加しない | NFR-MNT-004 | V-DRIFT | Constraint |
| 2096-AC06 | reviewer / sensor / produces / condition失敗を正規化 | FR-QRP-004〜007 | V-UNIT、V-INTEGRATION | In |
| 2096-AC07 | `Request Changes`を品質失敗へ変換しない | FR-QRP-013 | V-INTEGRATION | In |
| 2096-AC08 | audit / edit / 文面差を進捗と誤認しない | FR-QRP-008、品質進捗contract | V-UNIT | In |
| 2096-AC09 | fixed point / churn / regressionを検出 | FR-QRP-009、品質進捗contract | V-UNIT | In |
| 2096-AC10 | threshold時はreplanを先行し、別案があれば継続 | FR-QRP-010、品質進捗contract | V-UNIT、V-INTEGRATION | In |
| 2096-AC11 | 修復不能は`parked / REPAIR_STALLED` | FR-QRP-010、FR-STP-003 | V-INTEGRATION | In |
| 2096-AC12 | `full`ではgrant activeのままworkflow suspended。grantのない`none/semi`もworkflow suspended | FR-GRT-004、FR-STP-003 | V-UNIT、V-INTEGRATION | In — Issue間矛盾をGAP-01/12としてmode別に閉じる |
| 2096-AC13 | 同一fingerprint再実行をLLMなしで短絡 | FR-LMC-010 | V-INTEGRATION、V-REPLAY | In |
| 2096-AC14 | evidence変化 / 人間retryで再開 | FR-LMC-010、FR-STP-005〜006 | V-INTEGRATION、V-REPLAY | In |
| 2096-AC15 | statusへ停止理由と再開条件 | FR-OBS-006 | V-UX-SNAPSHOT | In |
| 2096-AC16 | 5harness同一contract tests | FR-HAR-002 | V-HARNESS-CONTRACT | In |
| 2096-AC17 | 5harness opt-in live smoke | FR-HAR-003 | V-HARNESS-LIVE | In |
| 2096-AC18 | session / process跨ぎでMonitor state維持 | FR-HAR-004 | V-REPLAY | In |

### #2067 — Intent-scoped Autonomy

| AC | 判別可能な要約 | 要件 | Oracle | Disposition |
|---|---|---|---|---|
| 2067-AC01 | modeは`none/semi/full`のみ、既定`none` | FR-AUT-001 | V-SCHEMA、V-INTEGRATION | In |
| 2067-AC02 | headless起動でmode非変更 | FR-AUT-002 | V-HARNESS-CONTRACT | In |
| 2067-AC03 | 人間だけがupgrade / downgrade / revoke | FR-AUT-003 | V-INTEGRATION | In |
| 2067-AC04 | grantはIntent UUID束縛、TTL / 消費回数なし | FR-GRT-001 | V-SCHEMA、V-INTEGRATION | In |
| 2067-AC05 | grant正本はIntent audit | FR-GRT-005 | V-INTEGRATION、V-REPLAY | In |
| 2067-AC06 | synthetic `HUMAN_TURN`を生成しない | FR-AUT-003、NFR-SAF-002 | V-INTEGRATION | In |
| 2067-AC07 | 副作用前に`GRANT_EXERCISED` | FR-GRT-007 | V-INTEGRATION、V-REPLAY | In |
| 2067-AC08 | mode表どおりstage / phase gateと質問を処理 | FR-AUT-004〜006 | V-INTEGRATION | In |
| 2067-AC09 | Walking Skeletonも同じmode規則 | FR-AUT-007 | V-INTEGRATION | In |
| 2067-AC10 | 自然言語方針を正規化し人間確認後grantへ含める | FR-GRT-006、FR-DEC-001 | V-INTEGRATION、V-UX-SNAPSHOT | In |
| 2067-AC11 | 方針未指定時も一意norm / 過去裁定を利用 | FR-DEC-002〜003 | V-UNIT、V-INTEGRATION | In |
| 2067-AC12 | norm conflictは`NORM_CONFLICT`で停止 | FR-DEC-004、FR-STP-004 | V-INTEGRATION | In |
| 2067-AC13 | election不可時にrecommendationへloud degradation | FR-DEC-005 | V-HARNESS-CONTRACT、V-HARNESS-LIVE | In |
| 2067-AC14 | `semi/full`品質不備を#2096で自動修復 | FR-QRP-001〜013 | V-INTEGRATION | In |
| 2067-AC15 | #2095で非生産ループを検知し安全停止 / 再開 | FR-LMC-001〜012、FR-STP-003〜006 | V-UNIT、V-INTEGRATION、V-REPLAY | In |
| 2067-AC16 | principal / decider / actor / basisをRegistry登録 | FR-GRT-008、FR-OBS-007 | V-SCHEMA、V-UX-SNAPSHOT | In |
| 2067-AC17 | 全自動裁定で`AUTO_DECIDED` | FR-DEC-006 | V-INTEGRATION、V-REPLAY | In |
| 2067-AC18 | election / recommendation queueをactive / completedで閲覧 | FR-DEC-007、FR-OBS-001〜002 | V-UX-SNAPSHOT | In |
| 2067-AC19 | `accept/flag`がreal turnとreview eventを記録 | FR-OBS-003〜004 | V-INTEGRATION、V-REPLAY | In |
| 2067-AC20 | rollbackせず`self-fix/self-feature`を提案 | FR-OBS-005 | V-UX-SNAPSHOT | In |
| 2067-AC21 | statusとresult envelopeがcontractを満たす | FR-STP-005〜006、FR-OBS-006 | V-SCHEMA、V-UX-SNAPSHOT | In |
| 2067-AC22 | 5harness Core contract suite | FR-HAR-002 | V-HARNESS-CONTRACT | In |
| 2067-AC23 | 5harness opt-in live smoke | FR-HAR-003 | V-HARNESS-LIVE | In |
| 2067-AC24 | 5harnessでelectionまたはloud degradationをlive検証 | FR-HAR-003 | V-HARNESS-LIVE | In |
| 2067-AC25 | session / process跨ぎでgrant / queue / latch維持 | FR-HAR-004 | V-REPLAY | In |
| 2067-AC26 | future harnessはadapterだけで同contract | FR-HAR-005〜006 | V-HARNESS-CONTRACT、V-DRIFT | In |

## GAP解決追跡

| GAP | 承認済み解決 | 主な要件 |
|---|---|---|
| 01 | grant認可状態と実行可否を直交 | FR-GRT-004 |
| 02 | 外部権限等は`AWAITING_HUMAN` + structured resume condition | FR-STP-002 |
| 03 | Core / Plugin / Autonomy integrationを分離 | FR-LMC-012、FR-QRP-001、FR-GRT-009 |
| 04 | 明示blocking sensorだけobligation化 | FR-QRP-004〜005 |
| 05 | reviewer上限後にPluginへhandoff | FR-QRP-011 |
| 06 | replanも同じMonitor履歴で監視 | FR-QRP-010 |
| 07 | `required_outputs[]`の宣言contract、初期追加artifactなし | FR-QRP-012 |
| 08 | selector / scope / norm fingerprint一致かつ一意時だけ過去裁定利用 | FR-DEC-003 |
| 09 | `retryable`を同一Intentの安全な再開可能性として固定 | FR-STP-006 |
| 10 | `none` opt-inはIntent設定・既定off・人間provenance | FR-QRP-002〜003 |
| 11 | 5harness contract / live / degradation / persistenceで完了判定 | FR-HAR-002〜004 |
| 12 | `semi`はgrantなし | FR-AUT-005 |
| 13 | legacy modeはすべて`none`へ安全移行 | FR-AUT-008 |
| 14 | completed auditへreview eventだけ限定追記 | FR-OBS-004 |
| 15 | deterministic decision ID tuple | FR-DEC-006 |
| 16 | canonical runtime graph content digest | FR-LMC-006 |
| 17 | sensor error / incompleteを成功扱いしない | FR-QRP-005 |
| 18 | reviewer wireを`NOT-READY`へ正規化 | FR-QRP-006 |
| 19 | grant lifecycleとexecution suspend / resumeを再生可能化 | FR-GRT-004、FR-GRT-009 |
| 20 | 既存capは局所loop限定、品質cycleは固定capなし | FR-QRP-011 |
| 21 | single harness descriptor registryとalgorithm fork不要境界 | FR-HAR-005〜006 |
| 22 | standing grantを廃止し、target Intentの`semi / full`へ統合 | FR-AUT-009〜010、NFR-SAF-004 |

## Open Questions

要求レベルの未決事項はない。以下は要求を変更しないApplication Designの責務である。

- Event Registry内の正確なevent名とattribute名
- runtime graph canonicalizationのbyte-level形式
- internal Plugin contribution schemaのTypeScript表現
- target Intentを指定するCLI / harness UXの具体的表現
- legacy standing grant診断の具体的codeと表示文面
- completed audit sealへの限定writer実装位置

## Reviewer remediation status

| Review | 指摘 | Builder反映 |
|---|---|---|
| Iteration 1 | Issue ACの全数追跡なし | 58 ACを安定ID、要件、検証oracle、scope dispositionへ接続 |
| Iteration 1 | grant状態遷移が閉じていない | mode別合法状態、禁止状態、trigger、原子的遷移を追加 |
| Iteration 1 | `retryable`がreason別に不定 | 全outcome / reasonの真理値表と`resume_condition.status`を追加 |
| Iteration 1 | 品質停止判定が不定 | obligation集合、strict progress、比較窓、fixed point / churn / regression、threshold合否例を追加 |
| Iteration 2 | grantなしmodeでsuspend不能 | Intent-level workflow実行状態をgrantから分離し、`none/semi`のgrant=`null`停止・再開・status・replayを追加 |
| Iteration 2 | 表層的に異なるreplanが永久継続可能 | replan後の連続`T` non-progressでplan差に関係なく`repair-stalled`とする決定論的収束条件を追加 |
| Cycle 1 / Iteration 2 follow-up | terminal failure遷移が監査不能 | failure resultと不変のworkflow stateを同一audit transaction identityへ束縛 |
| Cycle 2 / Iteration 1 | terminal failureが回復不能 | `failed`を呼出し単位へ限定し、Intentを`running`のまま維持 |
| Cycle 2 / Iteration 2 | 未承認のfailed専用操作と不正な終端状態 | 専用操作を削除し、既存の通常起動だけで継続するcontractへ戻した |
| Cycle 2 / Iteration 2 | 初回full grant発行に不正な中間状態 | mode変更、grant生成、human provenanceを同一transactionへ固定 |

上記修正は最初のreviewer cycleのiteration上限到達後に反映した。人間がfresh reviewer cycleでのredoを選択済みであり、新cycleでvalidated `READY`を得るまで本stageはincompleteとする。

## Historical Reviewer Finding — Cycle 1 / Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T06:23:37Z
- **Iteration:** 1
- **Scope decision:** none

GAP-01〜22の表面的な対応付けは揃っているが、Issue受け入れ条件の追跡、状態遷移、retryable、品質停止判定がテスト可能な契約として閉じていない。

### Findings

- BLOCKER | requirements.mdは#2095・#2096・#2067を正本とし「全受け入れ条件を検証」を成功条件にする一方、各Issue受け入れ条件からFR/NFR・対象外・検証oracleへの対応表がない。リンクと機能領域単位の要約だけでは、Issue Fidelity Ruleへの適合も要件の欠落も判定できず、開発者とQAが「全条件を満たした」ことを証明できない。各Issueの受け入れ条件を安定IDまたは判別可能な要約で列挙し、要件ID・検証先・scope dispositionへ追跡可能にする必要がある。
- BLOCKER | GAP-01/GAP-19はFR-GRT-004とFR-GRT-009で解消済みとされるが、認可状態active/revoked/completedと実行状態running/suspendedの合法な組合せおよび遷移が閉じていない。現状ではrevoked+runningやcompleted+suspendedの可否、suspended中のrevoke、Intent完了時の実行状態、置換の原子性を開発者が推測する必要があり、result envelopeとaudit replayの期待結果をQAが一意に判定できない。合法状態・禁止状態・遷移トリガ・遷移後状態を表で固定する必要がある。
- BLOCKER | GAP-09はFR-STP-006で解消済みとされるが、retryableの値がoutcome/reason codeごとに定義されていない。「同じIntentを安全に再開可能」という説明とparked/completed/failedの補助値だけでは、AWAITING_HUMAN、REPAIR_STALLED、NORM_CONFLICT、USER_PARKED、completed、terminal failureに対して外部runnerが再起動すべきか一意に決められない。FR-STP-007がrunner判断をこのenvelopeへ依存させるため、全outcome/reasonの真理値表とresume_condition充足前後の扱いが必須である。
- BLOCKER | FR-QRP-007〜010はfixed point、churn、regression cycle、進捗、evidence変化を停止・再開の主要判定に使うが、それぞれの観測可能な判定条件、比較窓、thresholdの供給元、同率・不足証拠時の挙動が定義されていない。この差は修復継続かREPAIR_STALLEDかを変え、利用者の時間・費用と安全停止に直結するためApplication Design任せにはできない。決定論的な最小判定契約と合否例を要件または明示したIssue受け入れ条件へ固定する必要がある。
- FOLLOW-UP | System-wideかつaudit履歴をsession・clone横断で処理する機能だが、性能・容量・スケーラビリティの測定対象や許容値がない。数値根拠がない場合でも、測定面、対象corpus規模、退行を許さない基準を定めるとComprehensive test strategyを実行可能にできる。
- FOLLOW-UP | FR-DEC-001、FR-OBS-002、FR-OBS-006は自然言語の事前裁定方針、質問・選択肢・回答・evidenceをaudit/statusへ載せるが、既存のアクセス制御・redaction・保持契約を継承するのかが明記されていない。新しい機密情報面を作らないこと、または必要な表示制限を明示すべきである。
- FOLLOW-UP | USR-01〜07からFRへの明示的な追跡がなく、対象利用者に挙げたPlugin保守者・将来harness adapter実装者・外部runner利用者のシナリオもない。各シナリオを主要FRと検証面へ対応付け、顧客価値のない孤立要件がないことを確認できるようにするべきである。

## Historical Reviewer Finding — Cycle 1 / Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T06:32:25Z
- **Iteration:** 2
- **Scope decision:** none

前回4 BLOCKERの主要な補強は確認できたが、grantを持たないmodeの停止契約とreplan収束条件に実装不能・非収束の矛盾が残る。

### Findings

- BLOCKER | `semi`はFR-AUT-005でgrantを発行せず、`none`の明示opt-inもgrantを必要としない一方、両modeで有効なQuality Repair Pluginが`repair-stalled`へ到達すると、FR-STP-003と2096-AC12はgrantを`active + suspended`にするよう要求している。grantが存在しない`semi`および`none`ではこの状態を生成できず、result envelopeのgrant ID・認可状態・実行状態も一意に決まらない。Plugin停止を全modeで成立させるには、workflow実行状態をgrant状態から分離するか、mode別に`grant=null`時の停止・再開・status・replay契約を明示する必要がある。
- BLOCKER | 品質進捗contractはsnapshot分類を具体化したが、進捗しないreplanの収束を「Judgeが前回と異なる実行可能planを返せない場合」に依存させている。plan identity、意味的同一性、実行可能性の判定contractがなく、未充足obligationが一切減らなくても表層的に異なるplanを生成し続ければ永久にreplanできる。これはGAP-06の解消、FR-QRP-010の`repair-stalled`収束、Intentの安全停止成功条件に反する。正規化したplan同一性と有限な比較履歴、またはdistinct planの有無にかかわらず連続無進捗で停止する決定論的条件が必要である。
- FOLLOW-UP | Result真理値表の`failed`行はactive grantを`active + suspended`へ移すが、Grant状態遷移表にterminal failureトリガがなく、どのaudit transactionで遷移を再生するかが明示されていない。状態表または失敗行のどちらかへ遷移根拠を追加するとFR-GRT-009を一意に検証できる。

## Historical Reviewer Finding — Cycle 2 / Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T06:46:25Z
- **Iteration:** 1
- **Scope decision:** none

58件のIssue ACとGAP-01〜22の追跡は揃っているが、品質停止、terminal failure、live smoke完了条件、harness集合に実装・合否を変える矛盾が残る。

### Findings

- BLOCKER | USR-05はfixed point・churn・regression cycleの検出時点で直ちに`parked / REPAIR_STALLED`へ停止すると規定する一方、FR-QRP-010と品質進捗contractは初回thresholdでは`replan`し、その後さらに`T`個のnon-progress snapshotが続いた場合だけ停止すると規定している。同じ証拠列に対して再計画か即時停止かが分かれ、顧客が期待する修復機会とQAの合否が一意にならない。USR-05を二段階の収束contractへ一致させる必要がある。
- BLOCKER | terminal `failed`はGrant状態遷移表とResult真理値表でworkflowを`suspended`へ変更する一方、`retryable=false`、`resume_condition=null`であり、再開遷移はresume condition充足時にしか定義されていない。さらにsuspended Intentは完了できず、revokeやmode変更でもworkflow状態は維持されるため、active Intentが回復不能になる。terminal failure後の人間による回復・中止・Intent終端のいずれかを合法遷移と監査contractとして閉じる必要がある。
- BLOCKER | scope-documentの完了境界、FR-HAR-003、V-HARNESS-LIVE、4件のIssue AC追跡は5harnessのopt-in live smoke実測を必須とする一方、ASM-005はcredentialがない環境でlive smokeを明示skip可能としている。skip済みでもIntent完了できるのか、別環境での実測証拠が完了前に必須なのかが未定義で、QAが出荷可否を判定できない。skipのテスト実行上の扱いとIntent完了oracleを分離して固定する必要がある。
- BLOCKER | codekbは既存の7 package face・6 host directory・5 self-install faceと、本Intentのlive対象5harnessを同一視しないよう明示しているが、FR-HAR-005の単一descriptor registryがどの集合を正本化するかを定義していない。Kiro/Kiro IDEをregistryへ保持するのか対象外として別管理するのか、既存配布面の非退行を何で検証するのかが不明で、実装者がpackage/setup面を削除・分断し得る。registryの全face/host集合と、今回contract/live検証する5harness subsetを明示的に分離する必要がある。

## Historical Reviewer Finding — Cycle 2 / Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T06:53:08Z
- **Iteration:** 2
- **Scope decision:** none

前回4 BLOCKERは解消されたが、terminal failure対応が未承認の新機能と不正な終端状態を導入し、初回full grant遷移にも原子性の欠落が残る。

### Findings

- BLOCKER | `close-failed`はIntentをfailed終端、workflow=`null`、active grantを`revoked`へ遷移させるが、FR-GRT-004と合法状態表はworkflow=`null`をcompleted Intentにしか許可せず、その他をfail-closed対象としている。failed Intentの合法状態、result/status、audit replay、review surfaceも定義されていないため、遷移先が自身のschema contractに違反しQAも終端後を判定できない。failed終端を正式な状態として閉じるか、既存の合法な終端へ統合する必要がある。
- BLOCKER | `retry-failed`と`close-failed`は人間向けの新しい操作、attempt identity、cursor解放、grant終端を導入するが、承認済み質問回答、GAP-01〜22、FR ID、利用者シナリオ、58件のIssue AC追跡のいずれにも根拠・対応がない。terminal failureの回復方法には複数の materially different な選択肢があり、Issue Fidelity Rule上、reviewer指摘だけを根拠に一案を暗黙採用できない。新GAPとして人間裁定し要件・oracleへ追跡するか、Issueで既定された既存操作へ限定する必要がある。
- BLOCKER | 初回`full` grant発行の遷移表はcurrent grantなしからactive grantへの変更だけを記し、autonomy modeを`none/semi`から`full`へ同一transactionで変更する契約がない。合法状態表は`none/semi + active grant`と`full + null grant`をともに禁止するため、modeとgrantを別々に更新すると必ず不正な観測点が生じる。初回発行のBefore/After modeと、mode変更・grant生成・human provenanceの原子的記録を明示する必要がある。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T07:15:23Z
- **Iteration:** 1
- **Scope decision:** none

58件のIssue AC、GAP-01〜22、状態遷移、品質収束、停止・再開、5harness完了境界が一貫して追跡・検証可能であり、実装開始を妨げる欠落はない。

### Findings

- FOLLOW-UP | FR-QRP-011が局所reviewer上限後のPlugin引き渡しを定めているため、Application Designでは修復後の再reviewを新しい局所cycleとして扱う際のinvocation/iteration identity、前cycleとのaudit linkage、反復fixtureを明示すると、局所上限を維持しながら固定総capなしで進むことをより直接的に検証できる。
