# Requirements — Pi Coding Agent Harness

## Intent Analysis

`intent-statement`と`scope-document`が定義する目的は、PiでAmadeusのskillを単に起動可能にすることではなく、監査、human gate、決定論的継続、全subagent経路、doctor、二重配布、実機検証を含む正式ハーネス契約を成立させることである。

Brownfieldの技術根拠としてCodeKBの`business-overview`、`architecture`、`code-structure`を使用する。`team-practices`成果物は本workflowでskipされ未生成であり、代わりにproject memoryの既存規範を適用する。変更種別は`self-feature`、複数componentにまたがるStandard complexityである。

## Functional Requirements

### Harness and Resource Discovery

| ID | Requirement | Pass criteria | Source |
|---|---|---|---|
| FR-HAR-001 | システムはPi用authored harnessを`packages/framework/harness/pi/`に持たなければならない | manifest schemaが通り、必要なskill、extension、question annex、driver、package metadataがcandidate treeに存在する | M1、CodeKB `code-structure` |
| FR-HAR-002 | Pi 0.83.0以上はproject trust承認後にAmadeusのcontext、orchestrator skill、標準session skills、stage runnersを検出しなければならない | clean fixtureでresource一覧が期待集合と一致し、`/skill:amadeus --status`がengine directiveを返す | M1、M9 |
| FR-HAR-003 | Pi harnessはmanifestのcanonical `stageEntry`を使用しなければならない | 独自のstage path推測がなく、全stage runner discovery testが通る | CodeKB `architecture` |

### Extension Lifecycle and Audit

| ID | Requirement | Pass criteria | Source |
|---|---|---|---|
| FR-LIF-001 | Pi extension adapterはsession、input、agent、tool、compaction eventを共通hook contractへ正規化しなければならない | Pi 0.83.0からcaptureした各fixtureについて、期待するcanonical eventと属性が一致する | M2 |
| FR-LIF-002 | session開始・終了はaudit shardとstateへ相関可能なsession identityを記録しなければならない | start/resume/shutdown fixtureで欠落・重複eventが0件 | M2 |
| FR-LIF-003 | ユーザー回答1件はHUMAN_TURNを正確に1回だけmintしなければならない | duplicate deliveryを含むfixtureでcount=1、回答なしでcount=0 | M3、Q1 |
| FR-LIF-004 | engine continuationはPiのrunが完全にsettleした後に高々1回だけ起動しなければならない | `agent_end`後にretry/compaction/queueが続くfixtureでは早期continuation=0、`agent_settled`後の必要なcontinuation=1 | M3、CodeKB risk |
| FR-LIF-005 | compaction後もactive intent、current stage、missionを再解決できなければならない | manual/threshold/overflow compaction fixture後の次turnでstate identityとnext directiveがcompaction前と整合する | M2 |
| FR-LIF-006 | tool call lifecycleはaudit、applicable sensor、state validationを既存coreと同じ条件で起動しなければならない | read/write/bash相当のfixtureで期待hook集合が一致し、不適用sensorは発火しない | M2 |

### Human Gates and Failure Semantics

| ID | Requirement | Pass criteria | Source |
|---|---|---|---|
| FR-GAT-001 | 質問・承認ゲートはユーザー回答なしにadvanceしてはならない | no-input journeyでstage stateがawaiting approvalのまま、GATE_APPROVEDが0件 | M3、Q1 |
| FR-GAT-002 | gate、audit、state、continuation、subagentの必須能力が欠落・非互換ならworkflow-changing operationをfail-closedしなければならない | 各能力のnegative fixtureがnon-zero/typed blocked resultを返し、stage pointerと成果物を変更しない | Q1=A |
| FR-GAT-003 | fail-closed状態でもstatusとdoctorのread-only診断は利用可能でなければならない | 同じnegative fixtureでstatus/doctorが終了し、原因と修正手順を出力する | Q1=A |
| FR-GAT-004 | single-agentまたはadvisory modeへの無音縮退を行ってはならない | 必須能力を除去したjourneyで成功eventがなく、明示的な診断がある | Q1=A |

### Subagents and Construction Swarm

| ID | Requirement | Pass criteria | Source |
|---|---|---|---|
| FR-SUB-001 | Pi driverはsupport agentとreviewer agentを公開CLIまたはSDK sessionで起動しなければならない | persona、task、workspace、roleがchildへ渡り、resultがparentへ戻るcontract testが通る | M4、scope Q1=A |
| FR-SUB-002 | 各childはparent id、child/session id、agent role、start、terminal statusをauditへ記録しなければならない | success/failure/cancel/timeoutの各fixtureでparent-child chainが完全 | M4 |
| FR-SUB-003 | Construction swarmは既存fixed-width poolの1〜4を使用しなければならない | pool=1/2/4で上限超過がなく、0/5はvalidation error | M4、CodeKB `architecture` |
| FR-SUB-004 | childのfailure、timeout、cancellationを成功へ変換してはならない | 各terminal fixtureでparentがtyped non-successを受け、dependent unitを開始しない | M4、Q1=A |
| FR-SUB-005 | support/reviewerとConstruction swarmは共通driver contractを共有しなければならない | role以外のspawn/result schemaが同一で、重複driver実装がない | M4 |

### Doctor, Installation, and Distribution

| ID | Requirement | Pass criteria | Source |
|---|---|---|---|
| FR-DOC-001 | Pi doctorはPi version、Bun、project trust、skills、extensions、package resources、subagent driverを検査しなければならない | healthy fixtureは全check pass、各欠落fixtureは該当checkだけfail | M5 |
| FR-DOC-002 | Pi doctorはCodex/Claude固有configやhookを要求してはならない | healthy Pi-only fixtureでCodex/Claude要件由来のfailure=0 | M5 |
| FR-DOC-003 | Pi 0.83.0未満を正式対応として受理してはならない | 0.82.x fixtureはactionable version failure、0.83.0以上はpass | M5、W2 |
| FR-DST-001 | setup CLIは`--harness pi`でfresh/update/idempotent installを行わなければならない | candidate Nのfresh install後、N→N+1 fixtureで管理対象の追加・変更をN+1へ一致させ、旧checksumのままの廃止管理対象だけを削除し、利用者管理・非管理fileをbyte単位で保持する。同一N+1の再installはdiff=0。利用者が変更した管理対象との競合はtyped conflictでfail-closedし、全更新をatomic rollbackして部分適用=0 | M6 |
| FR-DST-002 | 同一の生成物はPi Packageとしてlocal pathとgit sourceからproject-local installできなければならない | `pi install -l`のlocal/git fixtureで同じresource集合を検出 | M7 |
| FR-DST-003 | setup CLIとPi Package経路は同一candidate contentを持たなければならない | normalized file manifestとsha256集合が完全一致 | M7、M8 |
| FR-DST-004 | `dist/pi/`、self-install、plugin projection、setup payloadはauthored sourceから決定的に再生成されなければならない | package/promote checkを連続2回実行してdiff=0 | M8 |
| FR-DST-005 | 分散したharness registryへのPi登録漏れを自動検出しなければならない | いずれか1 registryからPiを除去したmutation fixtureでparity testがfail | CodeKB technical debt |

### Dogfood, Live Tests, and Documentation

| ID | Requirement | Pass criteria | Source |
|---|---|---|---|
| FR-VAL-001 | macOSとLinuxのTUI dogfoodでskill、lifecycle、gate、doctor、support/reviewer、swarmを縦断しなければならない | checklist全項目pass、canonical audit chainに欠落なし | M9、Q2=B |
| FR-VAL-002 | `pi -p`またはRPCを使うopt-in live journeyを少なくとも1本提供し、正式完了時には対応環境上のPi実機green記録を少なくとも1件残さなければならない | 日常CIでは`AMADEUS_PI_*_LIVE=1`またはprovider/auth不足を理由付きskipできるが、正式完了証拠はskip不可。macOSまたはLinuxでPi 0.83.0以上、live flag、provider/authを備えたrunがexit 0となり、Pi version、OS、provider識別子、検証commit、canonical audit assertionのgreenを記録する | M9 |
| FR-VAL-003 | Pi利用者文書は前提、trust、二重導入、起動、失敗、doctor、更新、uninstall、対象外を説明しなければならない | 日英guideの必須section検査とlink checkが通る | M10 |
| FR-VAL-004 | 保守者文書は全registration point、event mapping、driver、test、generated inventoryを説明しなければならない | porting checklistとmachine registryの集合が一致 | M10、CodeKB debt |

## Non-functional Requirements

| ID | Attribute | Requirement and measurable target | Verification | Source |
|---|---|---|---|---|
| NFR-REL-001 | Determinism | 同じsourceとconfigから2回生成したPi配布物のnormalized sha256集合は100%一致する | package parity | M8 |
| NFR-REL-002 | Idempotency | duplicate native event、install、continuation requestでcanonical mutationは高々1回 | property/contract tests | M3、M6、M7 |
| NFR-REL-003 | Failure transparency | 捕捉した必須operation failureのsilent successは0件 | no-silent-drop fixture、negative journeys | M3、Q1=A |
| NFR-SEC-001 | Trust | installer/extensionはPi project trustを自動承認または迂回しない | fresh project negative test | M1、M5、scope constraint |
| NFR-SEC-002 | Secrets | provider token、API key、prompt本文、home絶対pathをaudit/diagnostic fixtureへ平文出力しない | redaction tests | Derived — provider/authと診断境界に対するproject security guardrail |
| NFR-SEC-003 | Supply chain | Pi Packageが任意コードを実行すること、source、pin/update/uninstall手順を文書化する | documentation sensor/review | M7、M10 |
| NFR-PERF-001 | Adapter overhead | model call・network・filesystem I/Oを含まない同一core hook fixtureで、Pi adapterのmedian wall timeは`packages/framework/harness/kimi` adapterのmedianの2倍または+100msの大きい方を超えない。同一host/processで各adapterを10回warm-up後、100回ずつ交互測定した単一系列のmedianで判定する | fixed-baseline isolated benchmark | Derived — formal harness品質のため今回追加するadapter退行上限 |
| NFR-SCL-001 | Concurrency | subagent同時実行数は設定値1〜4を越えず、queue中unitを欠落させない | pool stress test | M4 |
| NFR-CMP-001 | Compatibility | 正式保証はPi Coding Agent 0.83.0以上のmacOS/Linux。native Windowsは未対応としてdoctor/docsで明示する | version/OS matrix tests | Q2=B、W2 |
| NFR-MNT-001 | Maintainability | Pi固有event/path/package知識をharness overlayに閉じ、core変更は既存registration seamに限定する | dependency/callsite review | M1、M8、CodeKB `architecture` |
| NFR-TST-001 | Testability | すべてのnative event mappingはversion付きcaptured fixtureを持ち、live modelなしで再生可能 | fixture inventory parity | M2、M9 |
| NFR-USA-001 | Diagnosability | doctorの各failureはcheck id、観測値、期待値、1つ以上の修正手順を出す | snapshot/structured result tests | M5 |

## User Scenarios

| ID | Scenario | Expected outcome |
|---|---|---|
| SCN-001 | 新規macOS/Linux projectへsetup CLIで導入 | trust後にskill/extensionが検出され、doctorがpassする |
| SCN-002 | Pi Packageをlocal/git sourceから導入 | SCN-001と同じresource/hash集合になる |
| SCN-003 | gateへ回答 | HUMAN_TURN=1、GATE_APPROVED=1、次directive=1 |
| SCN-004 | 回答せずsessionを終了 | gate stateを保持し、承認event=0 |
| SCN-005 | support/reviewerを実行 | role付きchild resultがparentへ戻る |
| SCN-006 | pool=4で複数unitを実行 | 最大4、dependency順を維持し全terminal outcomeを記録する |
| SCN-007 | extensionまたはdriverを除去 | workflowは変更せず停止し、doctor/statusが修正方法を示す |
| SCN-008 | Pi 0.82.xで起動 | 正式workflowを拒否し、0.83.0以上への更新を案内する |
| SCN-009 | native Windowsで起動 | 未対応platformを明示し、正式成功を報告しない |

## Constraints

- CON-001: Bun-only TypeScript monorepoを維持し、常駐service/databaseを追加しない
- CON-002: `dist/`とroot self-install surfaceを手編集しない
- CON-003: common state machine、audit schema、gate semanticsをPi都合でforkしない
- CON-004: Piの公開CLI/Extension API/SDKだけを使用し、private moduleへ依存しない
- CON-005: macOS/Linuxだけを初回正式保証とし、native Windowsを暗黙サポートしない
- CON-006: npm registryへの公開資格情報や公開operationを今回の完了条件に含めない
- CON-007: adapterやregistry slotだけを未配線で先行着地させない

## Assumptions

| ID | Assumption | Rationale | Falsification response |
|---|---|---|---|
| ASM-001 | Pi 0.83.0の公開eventは必要lifecycleを観測できる | local型定義でsurfaceを確認済み | live captureで不足したら非公開APIへ逃げずscope change |
| ASM-002 | 子Piは公開CLIまたはSDK sessionで非対話実行できる | print/RPC/SDK surfaceと公式exampleが存在 | walking skeletonで成立しなければM4を再承認 |
| ASM-003 | setupとPi Packageは同一candidate treeを共有できる | packaging manifest/projection seamが既存 | Application Designで専用package対dist projectionをADR化 |
| ASM-004 | provider/model資格情報は利用者環境が供給する | Amadeusはmodel providerを配布しない | 日常CIでは理由付きskipを許すが正式完了の代替にはしない。完了判定者が対応環境と資格情報を用意できなければ、FR-VAL-002の実機green記録が得られるまでworkflowを未完了のまま保持する |

## Out of Scope

- `@earendil-works/pi-agent-core`単体を利用する独立SDK埋め込みAPI
- Pi 0.83.0未満とnative Windowsの正式保証
- 公開npm registryへの実公開
- Pi本体、provider/model、汎用plan/todo/MCP/permission機能の変更
- cloud deployment、常駐service、database
- Pi対応と無関係な既存ハーネスのbehavior変更

## Traceability and Verification Matrix

| Scope Must | Requirements | Primary evidence |
|---|---|---|
| M1 | FR-HAR-001〜003 | manifest/resource/stage discovery tests |
| M2 | FR-LIF-001〜006 | captured fixture contract tests |
| M3 | FR-GAT-001〜004、FR-LIF-003〜005 | gate/continuation negative journeys |
| M4 | FR-SUB-001〜005 | driver/pool/swarm tests |
| M5 | FR-DOC-001〜003 | doctor positive/negative matrix |
| M6 | FR-DST-001 | setup install/update/idempotency |
| M7 | FR-DST-002〜003 | Pi Package local/git + parity |
| M8 | FR-DST-004〜005、NFR-REL-001 | package/promote/registry drift guards |
| M9 | FR-VAL-001〜002 | TUI dogfood + opt-in live journey |
| M10 | FR-VAL-003〜004 | guide/link/registry checks |

Scope Must coverageは10/10、functional requirementは30件、non-functional requirementは12件である。各requirementはpass criteriaまたは測定targetを持つ。

## Open Questions

Materialな未解決要件はない。`pi -p`とRPCのどちらをlive driverに採用するか、Pi Packageを専用workspace packageと`dist/pi` projectionのどちらで表現するか、native eventから共通hookへの詳細mappingはApplication DesignでADRとして決定する。これらは承認済みbehaviorを変えない実装選択である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T09:34:12Z
- **Iteration:** 1
- **Scope decision:** none

上流の顧客価値とM1〜M10は概ね具体的な機能要件へ展開されている。一方、live journeyの完了条件が上流より弱く、更新導入と性能要件の合否契約も未確定であるため、現状では開発・QAが同じ完了判定を共有できない。

### Findings

- BLOCKER | FR-VAL-002とASM-004は、前提不足時の理由付きskipを許容し、決定的テストのみをblockingにしている。これは、intent-statement Success Metric 7およびscope-document Definition of Done 5の「ローカルPi実機でlive journeyがgreen」という必須証拠を満たさなくても完了可能にする矛盾である。CIでのskip可否と正式完了条件を分離し、少なくとも対応環境で1件の実機green記録を必須証拠として明記する必要がある。
- BLOCKER | FR-DST-001は「fresh/update/idempotent install」を要求する一方、pass criteriaは同一内容の2回目installと無断上書きだけを検証しており、M6のupdate契約をテストできない。旧candidateから新candidateへの更新時に、管理対象ファイルの変更・追加・削除、利用者管理ファイルの保持、競合時の結果をどう扱えば合格かを定義する必要がある。
- BLOCKER | NFR-PERF-001の基準である「最も近い既存native adapter」が特定されておらず、選択次第で許容値が変わるため再現可能な合否判定になっていない。比較対象adapterを固定するか決定的な選択規則を定め、測定回数・集計方法を含む単一のpass/fail契約にする必要がある。
- FOLLOW-UP | Traceability and Verification MatrixはM1〜M10から機能要件への順方向対応のみで、NFR-SEC-002やNFR-PERF-001など追加コストを伴う非機能要件の上流ニーズが追跡できない。各NFRにもsourceを付与し、承認済みニーズ由来か、今回追加したscopeかを判別可能にするべきである。
- NIT | 「functional requirementは42件」という集計は、記載されたFR 30件と一致しない。誤った完全性表示を30件へ修正する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T09:36:18Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のBLOCKER 3件はすべて解消され、live green証拠、N→N+1更新、性能基準に再現可能な合否契約が定義された。

### Findings

- None
