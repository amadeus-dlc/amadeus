# 要件定義 — Amadeus長時間実行の計測・停止・反復・並列実行の有界化

## Intent分析

利用者が解決したいのは「Codexを速くする」ことだけではなく、Amadeusの長時間実行を全supported harnessで測定可能かつ決定的に有界にすることである。Codexは長時間化を強く観測した一次dogfood面であり、正しさ・停止性・予算・終了理由は共有core契約として扱う。

本要件は `intent-statement` と `scope-document` の承認済み境界、brownfieldの `business-overview`・`architecture`・`code-structure`、再確認済みの `team-practices` を統合したものである。対象は [Issue #1602](https://github.com/amadeus-dlc/amadeus/issues/1602)、[#1998](https://github.com/amadeus-dlc/amadeus/issues/1998)、[#1999](https://github.com/amadeus-dlc/amadeus/issues/1999)、[#1919](https://github.com/amadeus-dlc/amadeus/issues/1919) の4件で、順序は `#1602 → #1998 → #1999 → #1919` とする。

要件の明確性はStandard、変更種別はbrownfield `self-feature`、影響範囲は共有core・影響harness adapter・全distribution投影にまたがるsystem-wide、複雑度は高い。作業深度は既定のStandard、テスト戦略はComprehensiveとする。

## 利用者と価値

| 利用者 | 必要な価値 |
|---|---|
| Amadeus workflow利用者 | 正常な長時間処理と非収束を区別し、待つ・再計画する・安全に終端する根拠を得る |
| core／adapter保守者 | 同一workloadの実行由来、試行、時間、終了理由を相関し、共有不変条件を決定的に検証する |
| Codex利用者・保守者 | 共通の正しさ契約に加え、固定workloadで改善前後をdogfoodする |

## Functional Requirements

### FR-01 — 論理実行と試行の相関（#1602）

1. 1つのstage instanceをroot logical operationと定義する。共有coreは `STAGE_STARTED` をcommitする前にroot `operation_id` をmintし、そのstageがapproved、completed、rejected、parked、または安全停止するまで同じIDを維持しなければならない。
2. stage配下のagent dispatchとtool invocationは、それぞれ独立したchild logical operationとする。共有coreは各childへ `operation_id`、`parent_operation_id`、`root_operation_id` をmintし、harness adapterがcanonical IDを独自生成してはならない。native側IDは追加のfactとして保持できる。
3. rootまたはchild operationを実際に開始する各試行には、一意な `attempt_id` をmintしなければならない。retryは同じ `operation_id` の新しい `attempt_id` とし、同一試行の再記録はidempotency keyにより二重計上してはならない。
4. compact、process再起動、session resumeは同じstage instanceを継続するためrootと未終端childの `operation_id` を維持する。明示的なRedo、terminal後の再実行、reject後の新revisionは新しいrootをmintし、`supersedes_operation_id` で直前rootへtraceする。
5. rootの開始は `STAGE_STARTED`、childの開始はdispatch／invocation受理、終了は対応する成功・失敗・取消eventである。開始eventのない終了、二重終了、終了後のattempt追加を拒否しなければならない。
6. state、canonical audit、runtime graph、OTelは、同じroot／parent／operation／attempt識別子で同一workloadを相関できなければならない。canonical auditを耐久正本、runtime graphをその投影、OTelをmachine-local telemetryとして扱う。
7. 実行由来情報は、少なくともstage、agent、tool、harness、harness version、model、model version、開始・終了時刻、duration、termination reasonを表現できなければならない。
8. native surfaceから取得できない由来情報は、値を推測せず `unavailable` として記録しなければならない。移行前の記録は `legacy-unknown`、途中までしか得られなかった記録は不完全状態として、取得済み値と区別できなければならない。
9. 共有coreが開始と終了を囲めるin-process／spawn lifecycleは単調時計を必須とし、`clock_source=core-monotonic`、`measurement_quality=monotonic` を記録する。coreが囲めないnative／remote実行はadapterが `native-monotonic`、`native-wall`、`unavailable` のいずれかを供給し、wall fallbackは `measurement_quality=wall-fallback` として単調計測と区別する。
10. wall fallbackで終了時刻が開始時刻より前、clock sourceが不明、または片側時刻が欠ける場合はdurationを算出せず `measurement_quality=invalid` と計測errorを記録する。負のdurationまたは終了前の完了扱いを許可してはならない。

### FR-02 — 単調な停止budget（#1998）

1. Stop hookとswarmの決定的な停止budgetはstage instanceまたはUnit instanceへ結び付け、session再開・監査行追加・非遷移イベントによって減算、巻戻し、resetされてはならない。
2. 進捗signatureはstageの同一性と実際の状態遷移から導出し、audit row count、status表示、補助的なtool activityを進捗として扱ってはならない。
3. 実行可能回数の上限をhard capとする。現在値がcap未満のときだけ次試行をatomicにreserveしてcounterを1増やし、その後に実行する。cap回目は実行可能だが、実行後も継続が必要なら次の開始判定で拒否し、counter最終値をcapのままharness中立なtermination reasonとともに記録して終端しなければならない。
4. 所見減少や同じ修正の反復を評価する意味論的収束判定は、再計画を促す補助signalとして使用できる。ただし、決定的hard capを解除、延長、reset、置換してはならない。
5. #1998で実証されたaudit noiseによる上限回避と、swarm retryによる回避を回帰テストとして固定しなければならない。

### FR-03 — 既存実行制御経路における回復可能エラーの有界な自動復旧（#1998／#1919）

1. 本要件の自動復旧対象は、#1998のStop／continuation評価と#1919のswarm Unit dispatch・worker起動・結果収集に既に存在するretry経路だけとする。任意tool、approval／gate、GitHub mutation、release／publish、canonical audit/state writeを新たな自動retry対象へ拡張してはならない。
2. 共有coreは `retry_class`、`effect_status`、`cause_code`、`source_surface` からなる分類schemaとversioned allowlistを所有し、adapterはnative errorをこのfactへ正規化する。再試行の可否は共有coreだけが決定し、adapterまたはLLMが独自に昇格してはならない。
3. 初期allowlistは、(a) worker processが開始していないことを確認できる `worker-spawn-unavailable`、(b) state mutationを行わないread-only probeの `read-only-probe-timeout` に限定する。どちらも `effect_status=no-effect-confirmed` が必要である。
4. `effect_status` が `effect-possible` または `unknown` の失敗、validation／configuration error、authentication／authorization／permission error、canonical write failure、human rejection／cancel、未知の `cause_code` は明示的な非対象とする。
5. allowlistの追加・変更は共有registry、決定的negative／positive conformance、影響adapterのmappingを同じ変更で更新し、通常のPull Request reviewを通さなければならない。promptだけで分類を追加してはならない。
6. allowlist対象だけを、停止budgetとは別のdurableなretry budget内で自動再試行しなければならない。各試行は新しい `attempt_id` と同じ `operation_id` を持ち、成否をauditへ記録する。
7. retry budgetは再開・adapter差分・補助イベントでresetされてはならない。
8. 未知のエラー、state不整合、canonical write失敗、retry budget超過は自動継続せず、共有termination reasonと回復手順を残して安全停止しなければならない。

### FR-04 — 質問・follow-up・reviewの反復予算（#1999）

1. システムはstage instanceごとに、primary question、ambiguity follow-up、review iterationのdurable counterを別々に持たなければならない。
2. 各counterは、対応するquestion表示、follow-up表示、review dispatchの直前にatomic reserveする。現在値がcap未満の場合だけ1増やして処理を開始し、cap回目は実行可能とする。同じsession内外の再開、compact、再描画、回答修正で減ってはならない。
3. 各counterのdefaultとhard capはNFRで確定し、設定値がhard capを超えることを拒否しなければならない。
4. cap到達後に次の処理が必要となった場合、そのcap+1処理は開始せずcounterも増やさない。未解決事項、最終成果物、counter最終値=cap、termination reasonを記録し、安全な再計画または人間判断へ戻さなければならない。
5. reviewerのNOT-READYが上限に達した場合、無限再reviewせず、未解決findingを明示して既存の人間approval boundaryへ進めなければならない。
6. prompt guidanceは「ANY ambiguity」「8–12+」のような非有界な要求を避け、共有budgetと例外条件を参照しなければならない。

### FR-04A — 全budget共通の境界遷移

| 開始前counter | 判定 | 処理 | 開始後counter | 終了理由 |
|---:|---|---|---:|---|
| `0..cap-2` | `counter < cap` | reserve後に実行 | `counter+1` | 処理結果による |
| `cap-1` | `counter < cap` | cap回目をreserve後に実行 | `cap` | 処理結果による |
| `cap` | `counter >= cap` | cap+1回目を開始せず拒否 | `cap` | budget exhausted |

この遷移をStop continuation、recoverable retry、question、follow-up、review、Unit attemptへ共通適用する。失敗した実行済み試行も1回として数え、開始前に拒否したcap+1要求は数えない。

### FR-05 — 有界なswarm Unit pool（#1919）

1. swarmはFIFO待ち行列、active slot hard cap、Unitごとのdurable attempt countを共有契約として持たなければならない。
2. queued Unitはactive slotへ数えてはならず、active Unit数はどの観測時点でもhard capを超えてはならない。
3. Unit完了・失敗・取消時はslotを一度だけ解放し、次のqueued UnitをFIFO順で開始しなければならない。
4. 同一Unitの再試行は同じUnitのattempt budgetを消費し、別Unitまたは新sessionとして偽装して上限を回避してはならない。
5. Unit attempt budget超過時は、そのUnitを共有termination reasonで終端し、残るUnitを継続できるかを決定的なpolicyで判定しなければならない。
6. 各harness driverは共有pool状態を別実装してはならず、native workerの起動・完了・失敗を共有contractへ変換しなければならない。

### FR-06 — 共有coreとharness capability（全Issue）

1. budget、counter、termination reason、相関ID、conformance predicateは共有coreが単一の定義を所有しなければならない。
2. harness adapterはnative payloadを共有factへ正規化し、取得不能なfactをcapabilityとして明示しなければならない。共有predicateをadapterへ複製してはならない。
3. Application Designでarchitect leadがdeveloperのsource evidenceを用い、全supported harnessをinventoryしなければならない。adapterがFR-01〜FR-05のfieldをread／writeする、または共有execution／budget／pool APIをinvokeする場合、そのadapterを「影響あり」と判定し、判定根拠とowner pathをdesign artifactへ列挙する。
4. inventoryで未判定のadapterが1つでも残る場合、Application DesignとIntent completionをblockingする。native factが取得不能でも、`unavailable` capabilityとそのconformanceが明示されていれば「判定済み」と扱う。
5. 影響adapterの決定的conformanceはblockingとする。native providerやCLIが必要なlive journeyはcapability依存とし、未実行を決定的検証の成功へ混同してはならない。全supported harnessのpackage／self-install／distribution driftは影響判定にかかわらずblockingとする。
6. Codex専用blocking gateを追加できるのは、Codex固有のnative lifecycle／hook欠陥を共有predicateへ写像できず、共通conformanceでは検出不能であることを再現可能な証拠で示した場合だけとする。
7. Codexで問題が顕著であること、またはCodexが一次dogfood対象であることだけを、専用policy・専用termination semantics・専用hard capの根拠にしてはならない。

### FR-07 — Bolt deliveryとIssue hygiene

1. 4 Issueを1 Intent内で管理し、1 Issue = 1 Bolt = 1独立Pull Requestとしなければならない。
2. 実装順は `#1602 → #1998 → #1999 → #1919` とし、前段Boltの受入・着地前に後段Boltを実着手してはならない。
3. 着手中Issueだけに `in-progress` を付与し、完了時に除去してから次のIssueへ付け替えなければならない。現在の対象は #1602だけである。
4. 各Bolt着地後、後続worktreeを最新baseへrebaseし、共有conformanceを再実行して改善を後段へ波及させなければならない。
5. 対象Issueに既存Pull Requestが見つかった場合は重複実装せず、そのPull Requestの収束へdelivery planを変更しなければならない。

### FR-08 — Baseline、treatment、統合dogfood

1. #1602は固定workload、固定入力、observed SHA、harness／model capability、開始・終了条件を記録したbaselineを生成しなければならない。
2. #1998、#1999、#1919は同一workloadでcontrolとtreatmentを比較し、duration、attempt数、反復counter、最大active slot、termination reasonを報告しなければならない。
3. 具体的な時間・停止・質問・review・swarm上限は、#1602 baselineと現行既定値を基にNFR Requirementsで固定default・hard cap・境界値として確定しなければならない。
4. 数値をLLMが実行時に無制約で決定してはならない。設定可能な値もhard capの範囲内でなければならない。
5. 4 Bolt受入後、統合workloadで4契約が同時成立することを確認し、package／promote後にIntentをparkしてfresh Codex sessionでresumeし、更新済み配布面をdogfoodしなければならない。

## Non-Functional Requirements

### NFR-01 — 決定性と停止性

- 同じ初期state、設定、event列に対して、counter、queue順、termination reason、合否predicateは同じ結果を返す。
- hard capの境界値 `cap-1`、`cap`、`cap+1` と、resume／compact／audit noise後の値を決定的に検証する。
- retry、question、follow-up、review、Unit attemptのcounterはいずれも単調非減少とする。

### NFR-02 — 信頼性と回復性

- allowlist対象の一時的エラーはworkflow全体を直ちに停止させず、有界retry内で自動復旧する。
- canonical audit/state mutationの不整合はfail-closed、advisory hookと入力adapterの不正payloadは既存契約どおりworkflow拘束を避ける。ただし、どちらも観測可能なreasonを残す。
- 部分成功後の再実行はidempotentで、operation・attempt・counter・slotを重複させない。

### NFR-03 — 観測可能性とprivacy

- 実行時間、ID、counter、reason、capability availabilityは機械可読schemaで取得できる。
- prompt本文、回答本文、secret、credential、不要な個人情報をtelemetryへ保存しない。
- telemetry exporter境界でも既存redaction contractを適用する。
- 欠測値を0・空文字・成功へ潰さず、取得不能とlegacyを区別する。

### NFR-04 — 性能評価

- 絶対時間目標と許容分位点は#1602 baseline後に確定する。それ以前に根拠のない閾値を置かない。
- performance結果は固定workloadのcontrol／treatmentを同じ測定手順で比較し、wall-clock driftやprovider差分を注記する。
- 全harnessへ同一の改善率を要求しないが、共通の正しさと停止性の合否は免除しない。

### NFR-05 — Testability

- fake executor、injectable clock、counter、latch、deterministic queueを公開seamとして使い、live modelなしで境界値を再現できる。
- 挙動変更はTDDで進め、失敗ケース注入により新しいgate／capが実際に赤くなることを示す。
- deterministic core、影響adapter conformance、package/self-install/distribution driftをblockingで検証する。
- live journeyはcapabilityがある場合に実施し、skip理由を明示する。

### NFR-06 — Maintainabilityとdistribution integrity

- 正本は `packages/framework/core/` と `packages/framework/harness/<name>/` に置き、`dist/` とself-install treeを直接編集しない。
- 共有contractはdeep moduleとして公開面を狭くし、harness固有差分をnative fact変換へ限定する。
- core変更後はpackage、全harness distribution、self-install、日英documentation、関連testを同じ変更で同期する。
- typecheck、Biome、coverage、complexity、dist、promote:self、distribution driftのうち変更面に適用される検査を通す。

### NFR-07 — Usability

- budget超過や安全停止時の表示は、終了理由、消費値／上限、最後に成立した進捗、推奨する次の行動を示す。
- 回復可能エラーの自動再試行は無言で行わず、現在のattemptと残budgetを短く通知する。
- harness間で同じ概念へ異なる名称を使わず、共有語彙を表示する。

## Acceptance Scenarios

### AC-01 — 相関と欠測

Given 1つのstageからagentとtool childが開始され、toolの最初の試行が一時失敗し2回目が成功する、When state・audit・runtime graph・OTelを照合する、Then 1つのroot、2つのchild `operation_id`、tool配下の2つの一意な `attempt_id` がparent/rootで相関し、取得不能なmodel versionは `unavailable` として成功値と区別される。Given compactまたはsession resume、Then同じrootを維持する。Given明示Redo、Then新rootと `supersedes_operation_id` をmintする。

### AC-02 — audit noiseによる停止回避の禁止

Given 同一stageで非遷移audit eventだけが追加される、When Stop判定をhard capまで反復する、Then counterはresetされず、cap到達時に同じtermination reasonで終端する。

### AC-03 — 回復可能エラー

Given workerが未開始で `worker-spawn-unavailable`、`no-effect-confirmed`、retry counter=`cap-1`、When次のattemptが成功する、Then cap回目を実行してworkflowは継続し全attemptを記録する。Given counter=`cap`、未知cause、effect不明、またはcanonical write failure、Then新attemptをmintせず安全停止する。

### AC-04 — 対話予算

Given stage instanceがquestion、follow-up、reviewの各counterを持つ、When resumeやcompactを挟んで反復する、Then counterは維持され、開始前counter=`cap-1`のcap回目は実行されて最終値=`cap`となり、その後のcap+1要求は実行も加算もされず、未解決事項とtermination reasonが残る。

### AC-05 — Unit pool

Given hard capより多いUnitがFIFO queueにある、When workerが完了・失敗・retryする、Then active数は常にcap以下、queued順は決定的、retryは同じUnit attemptを消費し、slotは一度だけ解放される。

### AC-06 — Harness統一性

Given 同じ共有contractを複数harness adapterへ入力する、When conformanceを実行する、Then capabilityがあるfactは同じpredicateで評価され、ないfactは `unavailable` となる。Codex専用gateは例外証拠がない限り生成されない。

### AC-07 — Delivery propagation

Given Bolt 1が着地する、When Bolt 2を開始する、Then Bolt 2のbaseはBolt 1着地後の最新mainであり、#1602の計測contractを使って#1998のcontrol／treatmentを比較できる。同じ条件を後続Boltへ繰り返す。

## Constraints

1. Bun-only TypeScript monorepoであり、常駐service・database・AWS account・IaCを新設しない。
2. 既存のcanonical audit/state transition、fatal latch、人間approval boundaryを弱めない。
3. AIはPull Requestを自発的にmergeせず、release／publishを実行しない。
4. `dist/` とself-install projectionを独立正本として編集しない。
5. #1602 baseline前に具体的なbudget値を固定しない。
6. 4 IssueはすべてMustであり、Intent完了時に除外しない。
7. 現在は #1602だけを `in-progress` とし、後続Issueへ早期付与しない。

## Assumptions

| ID | Assumption | Rationale | Validation owner |
|---|---|---|---|
| A-01 | 4 Issueを同じ固定workloadで比較できる | いずれもworkflow反復と実行時間へ影響する | #1602 Boltで検証 |
| A-02 | 共有coreでcounterとqueueを所有できる | Reverse Engineeringで現行責務がcore中心と確認された | Application Designで検証 |
| A-03 | harness native surfaceごとに取得可能な由来情報が異なる | Codex payloadにも欠測があり、他harnessも同一とは限らない | adapter inventoryで検証 |
| A-04 | 現行のdefault値はbaseline比較の入力として利用できる | 数値をゼロから捏造せず既存運用との連続性を保つ | NFR Requirementsで検証 |

## Out of Scope

- Codex製品本体、model provider、network性能の変更。
- 全supported harnessで同じ時間短縮率を達成すること。
- 全harnessのlive model journeyをblockingにすること。
- 4 Issueと無関係なprompt改稿、runtime最適化、swarm機能追加。
- LLMによる無上限の意味論的停止判定、動的priority queue、動的hard cap。
- prompt本文、回答本文、secret、credentialのtelemetry保存。
- 再現可能な例外証拠のないCodex専用安全policyまたはblocking gate。

## Deferred Decisions

次は要件の曖昧さではなく、証拠を得て後続ステージで確定する設計・NFR判断である。

1. duration、Stop、question、follow-up、review、active slot、Unit attempt、recoverable retryの具体的defaultとhard cap。
2. model／harness versionを各native surfaceから取得するadapter別手段。
3. 共有termination reasonの正確なenum名と、既存event vocabularyとの移行方法。
4. Unit失敗後に残るqueueを継続できるpolicyの具体的判定表。
5. Application Designのadapter inventoryで影響ありと確定した集合に対し、capabilityがある非Codex harnessのlive journey対象部分集合。

これらはそれぞれ#1602 baseline、Application Design、NFR Requirementsで確定し、実装担当者またはLLMが無根拠に決めてはならない。

## Open Questions

未解決の要件質問はない。Q1〜Q5はすべて回答済みであり、Deferred Decisionsは必要な一次証拠と確定ステージを持つ。

## Traceability

| Requirement | Source | Primary evidence |
|---|---|---|
| FR-01, NFR-03 | #1602、Q1 | 相関schema、availability、固定workload baseline |
| FR-02 | #1998、takt比較コメント | audit noise／swarm retry回避のnegative test |
| FR-03, NFR-02 | ユーザー指摘「回復可能エラーで止まるのは困る」、Q2 | allowlist、retry境界、unknown／exhaustion test |
| FR-04 | #1999、Q3 | 3種counterのcap境界・resume test |
| FR-05 | #1919、Q4 | FIFO、active cap、Unit attempt境界test |
| FR-06 | Intent／Scopeのharness裁定 | shared predicateとadapter capability conformance |
| FR-07 | ユーザーのIssue運用裁定 | label、PR、rebase receipt |
| FR-08, NFR-04 | Success Metrics、Q5 | control／treatment、統合dogfood |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T03:42:44Z
- **Iteration:** 1
- **Scope decision:** none

中核方針と上流トレーサビリティは強いが、実行境界、retry対象、counter境界、対象adapterの確定条件が未定義で、実装・QAが一意に判断できない。

### Findings

- Major | FR-01.1〜FR-01.3、AC-01 | 論理実行と親実行境界が定義されず、operation_idの共有・継続・再mintを一意に判定できない。開始終了、親子、mint主体、resume等の継続規則と再実行判定を明記する。
- Major | FR-03、Traceability FR-03 | 回復可能エラーの自動復旧が4 Issueに必要なretry経路へ限定されず、横断機能としてscope拡張し得る。#1998または#1919の既存retry経路へ限定し、対象面と対象外を列挙する。
- Major | FR-03.1〜FR-03.5、AC-03 | allowlistの分類、分類キー、判定主体が未確定で、adapterごとに異なるQA判定を許す。共有分類schema、adapter fact、非対象例、変更管理境界を定義する。
- Major | FR-02.3、FR-04.2〜FR-04.4、NFR-01、AC-04 | cap到達時終端とcap+1拒否が混在し、消費時点と最終counter値が曖昧である。許可条件、消費時点、cap回目とcap+1回目、最終値を状態遷移表で固定する。
- Major | FR-06.3、NFR-05 | 影響adapterの判定規則、確定stage、owner、未判定時の扱いがない。inventory確定先、責任者、判定基準、対象一覧、未判定時のblocking規則を追加する。
- Minor | FR-01.6、NFR-04 | 可能な限り単調時計という条件がテスト不能で、fallbackと計測品質が未定義である。clock source、fallback条件、measurement quality、clock異常時の期待結果を定義する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T03:45:15Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の6件はすべて解消され、実行境界、retry対象と分類、counter遷移、adapter inventory、duration計測が実装・QA可能な粒度で確定しており、新たなblocking findingはない。

### Findings

- None
