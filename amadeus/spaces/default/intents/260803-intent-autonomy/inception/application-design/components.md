# コンポーネント設計

## 上流入力と設計境界

本設計は次を正本として使用する。

- `requirements-analysis/requirements.md`: #2095 → #2096 → #2067 の順序、FR-AUT / GRT / DEC / LMC / QRP / STP / OBS / HAR、58件のIssue受け入れ条件
- `codekb/amadeus/architecture.md`: 共通orchestrator、runtime graph、audit、plugin composition、harness adapterの現行境界とGAP-01〜13
- `codekb/amadeus/component-inventory.md`: 現行のgrant、plugin、audit、7 package face / 6 host directory / 5 self-install faceの所有箇所

対象はBunで起動する短命CLIのモジュラーモノリスである。新しい常駐プロセス、外部サービス、AWS資源、データベース、GUI、harness固有の監視loopは追加しない。

## モジュール構成

「モジュール」は、小さいインターフェースの背後に複数の不変条件を隠す深いモジュールとして定義する。既存ファイルを薄い転送層へ分割しない。

| ID | モジュール | 主な配置候補 | 所有責務 | 所有しない責務 |
|---|---|---|---|---|
| M00 | Canonical Workflow Contract | 新規`amadeus-workflow-contract.ts` | 複数domain / harnessを跨ぐwire value、strict schema、error / result envelope | domain behavior、状態遷移、巨大な汎用`types.ts` |
| M01 | Workflow Graph Compiler | `amadeus-graph.ts`、`amadeus-runtime.ts` | core stageと信頼検証・source正規化済みPlugin contributionのgraph正規化、Monitor schema検証、canonical graph revision生成 | source trust判定、cycle判定、品質意味論、grant |
| M02 | Loop Monitor Core | 新規`amadeus-loop-monitor.ts` | cycle照合、epoch、threshold、bounded history、再生可能なpending Judge予約、route disposition、idempotency、generic停止latchの純粋状態遷移 | route IDの品質意味論、reviewer / sensorの意味、LLM呼出し、mode / grant、WorkflowResult、harness |
| M03 | Quality Repair Loop Plugin | 新規`plugins/quality-repair-loop/` | blocking obligationの正規化、T / T+1 bounded進捗projection、initial / collecting / strict / threshold分類、singleton Judge route constraint、mode別activation設定のaudit replay | generic cycle algorithm、gate認可、外部Plugin manifest標準 |
| M04 | Intent Grant | 新規`amadeus-intent-grant.ts`を中心に既存grant経路を置換 | Intent-scoped grantの発行・置換・行使・revoke・complete、回答選択後のoption / scope / effect束縛、modeとの原子的遷移、legacy診断 | 質問の回答選択、workflow loop、外部権限付与 |
| M05 | Auto Decision | 新規`amadeus-auto-decision.ts` | 事前裁定方針、norm / 過去裁定、solo election、recommendationの解決順、decision ID、review queue | grantの有効性、質問表示、任意route生成 |
| M06 | Workflow Coordinator | `amadeus-orchestrate.ts`、`amadeus-state.ts` | M01〜M05の順序付け、局所review cycleからPluginへのhandoff、Monitor / 非Monitor別の原子的park / resume、M08完了証拠を要求するterminal result envelope | Monitor algorithm、品質policy、runner再起動 |
| M07 | Audit / Status Projection | `amadeus-audit.ts`、Event Registry、OTel、status / replay | canonical event永続化、projection再構築、completed Intentへの限定review追記、人間 / machine表示 | 認可判断、Monitor判定 |
| M08 | Harness Descriptor Registry / Completion Validator | 新規`packages/framework/harness/registry.ts`と各native adapter | 7 package face、6 host directory、5 self-install face、5 autonomy/live対象、credential-attested authorization、revision / environment / trace-bound live receiptの完了検証 | Core algorithm、quality policy、live実行、credential保存 |
| M09 | Verification Kit | `tests/unit`、`tests/integration`、`tests/harness`、opt-in live driver | 共通fixture、replay corpus、5harness contract、raw live receipt生成、projection drift | Intent完了判定、本番状態変更、credential管理 |

## 外部シームとAdapter

外部シームは実際に複数Adapterが存在する箇所だけに置く。

| シーム | インターフェース | Adapter | 理由 |
|---|---|---|---|
| S01 Judge | `JudgePort.invokeOnce(request)` | invocation IDで冪等なnative model invocation、決定論的test fake | 実行環境とtestで実装が変わる。pending requestを同一identityで再開する |
| S02 Harness native invocation | `HarnessRuntimeAdapter` | Claude Code、Codex、Cursor、OpenCode、Kimi Code。Kiro / Kiro IDEはregistryに残る | native hook / skill / agent capabilityが実際に異なる |
| S03 Plugin source normalization | `normalizeContribution(source)` | 初期first-party descriptor adapter、将来#2065 external manifest adapter | authoring形式とCore内部SPIを分離する |
| S04 Live authorization | `LiveAuthorizationPort.authorize(input)` | 初期5harnessのcredential-attested environment adapter、決定論的test fake | secretを保存せず、実環境の認可provenanceだけをsafe metadataへ変換する |

filesystem、audit shard、runtime graph scratchは既存のlocal-substitutable dependencyであり、新しい公開portを増やさない。テストでは既存の一時workspace / in-memory backendを使い、モジュール外部インターフェースから検証する。

## 状態所有

| 状態 | 正本 | Materialized view / scratch | 更新owner |
|---|---|---|---|
| autonomy mode | Intent audit | `amadeus-state.md`表示projection | M04 reducer / M07 append |
| Intent grant / exercise reservation | Intent audit | state / status projection | M04 reducer / M07 append |
| graph revision | canonical compiled runtime graph content | gitignored `runtime-graph.json` | M01 |
| Monitor epoch / history / latch | Intent audit | bounded runtime checkpoint | M02 reducer / M07 append |
| quality obligation / progress / none opt-in | normalized audit evidence | Pluginのbounded projection | M03 reducer / M07 append |
| auto decision / review queue | Intent audit | status projection | M05 reducer / M07 append |
| harness capability | descriptor registry | package / setup / self-install projection | M08 |
| live completion evidence | revision / package / registry digest付きreceipt | Intent completion projection | M08 validator / M07 append、M09 raw receipt producer |

scratch消失時はauditから再構築できなければならない。scratch単独の存在、更新時刻、自然言語文面をidentityまたは認可根拠にしない。

## 横断不変条件

1. M02は`grant`、`autonomy mode`、`reviewer`、`sensor`という語彙を入力schemaに持たない。
2. M03はM02の公開インターフェースだけを使い、cycle matcherをforkしない。
3. M04はmode変更・grant生成・human provenanceを一transactionで確定し、不正な中間状態を露出しない。
4. M06は未宣言route、未知schema、壊れたcontribution、sensor script errorを成功へ変換しない。
5. M07だけがcanonical eventをappendし、各モジュールはappend予定のeffectを返す。
6. M08へharnessを追加してもM02〜M05は変更しない。
7. `failed` resultは現在のCLI呼出しだけを終端し、active Intentのworkflowは`running`のままにする。
8. PR、merge、GitHub review、外部runnerの状態はCore完了判定へ入力しない。
9. Quality Repair Pluginは`semi / full`でstage開始前に必須検証し、`none`では人間provenance付きopt-inがない限り起動しない。
10. grant行使は永続予約後、commit・自動裁定・既存workflow effect eventを1つの原子的transactionへまとめ、audit外の後続副作用を残さない。
11. Monitor停止ではresume condition充足、latch解除、`WORKFLOW_UNPARKED`を単一transactionで確定し、非Monitor停止では存在しないlatch解除を要求しない。
12. M06はM08の検証済み5harness完了証拠なしに`completed`を生成しない。
13. Judge予約はrequest全体をauditへ残し、pending中は新規invocationを作らず同じIDで`invokeOnce`する。
14. 自動裁定candidateは実際のselected option、scope、effectを束縛し、選択前の汎用candidateを行使しない。
15. Quality Judgeのallowed routesは初回Tで`[replan]`、replan後Tで`[repair-stalled]`のsingletonとし、Judgeが収束順序を変更できない。
16. live成功receiptはprotected authorization event、environment、trace、attestationと一致しなければ完了証拠にしない。

## 要件追跡

| 要件群 | 主owner | 協調owner |
|---|---|---|
| FR-LMC / NFR-DET / NFR-PERF | M00、M01、M02 | M07、M09 |
| FR-QRP | M03 | M02、M06、M09 |
| FR-AUT / FR-GRT | M04 | M06、M07 |
| FR-DEC | M05 | M04、M06、M07 |
| FR-STP | M06 | M02〜M05、M07 |
| FR-OBS | M07 | M04〜M06 |
| FR-HAR | M08、M09 | M01、M06 |

## CLI利用者向け表示面

GUIは作らない。既存のCLI / skill表示を拡張し、次だけを一貫して表示する。

- status: 自律レベル、workflow実行状態、nullable grant、停止理由、resume condition、未確認自動裁定数
- `REPAIR_STALLED`: 「非生産的な修復ループを検出したため一時停止した」およびmode別grant説明
- legacy standing grant: 新認可には使われないことと`semi / full`への移行方法
- live smoke skip: 実行環境上のskipであってIntent完了のpassではないこと


## Reviewer remediation status

| Cycle | 指摘 | 設計上の解消 |
|---|---|---|
| Cycle 1 / Iteration 1 | mode遷移とIntent完了が閉じていない | 人間commandとsystem completionを分離し、none↔semi、full発行・置換・revokeを原子的transition化 |
| Cycle 1 / Iteration 1 | resume / grant exercise / latch audit / Plugin activation / decision query /公開型 / 依存方向の欠落 | M00〜M09の公開契約、永続reservation、mode別activation、原子的resume、query API、一方向importへ具体化 |
| Cycle 1 / Iteration 2 | grant candidateとM05 producerの循環 | M04のoccurrence認可とM05のpureな回答選択を分離し、選択後にoption専用candidateを生成 |
| Cycle 1 / Iteration 2 | M02が完全なWorkflowResultを生成不能 | M02はgeneric MonitorLatchだけを返し、M06がmode / grantと合成する |
| Cycle 1 / Iteration 2 | 非Monitor停止のresume不能 | `REPAIR_STALLED`だけMonitor resumeを要求し、他reasonはcondition検証後に直接unparkする |
| Cycle 1 / Iteration 2 | 5harness receiptがIntent完了へ未接続 | M08のCompletionCheckをM06 complete-intent分岐の必須入力にし、不足時はAWAITING_HUMANへpark |
| Cycle 1 / Iteration 2 | Quality event identityとnone opt-in replay不足 | snapshotをIntent / Monitor / stage / graph revisionへ束縛し、opt-in / outをM03 reducerでaudit再生 |
| Cycle 1 / Iteration 2 | effect成功・receipt未記録のcrash window | grant行使・自動裁定・既存workflow eventを単一M07 transactionへ統合し、audit外副作用を廃止 |
| Cycle 2 / Iteration 1 | Judge予約をcrash後に再構築不能 | MonitorProjectionへ完全なpending requestを持たせ、audit replayとS01 invokeOnceを追加 |
| Cycle 2 / Iteration 1 | generic routeのcontinue / latch判定不能 | Monitor manifestへroute dispositionを追加し、M02はdisposition、M03はroute意味論を所有 |
| Cycle 2 / Iteration 1 | grantが実際のselected optionへ未束縛 | occurrence認可→M05選択→option専用candidate→reserve / revalidateへ順序変更 |
| Cycle 2 / Iteration 1 | live receiptのJudge / election実測不足 | ValidatedLiveReceiptの型とvalidatorでJudge=trueとelection / loud degradationを必須化 |
| Cycle 2 / Iteration 1 | completed表示とgrant / workflow正本が分離 | M08証拠、M04 grant completed / workflow null、M06 completionを単一transaction化 |
| Cycle 2 / Iteration 1 | completed reviewの追記先Intentが不定 | append inputへIntent UUIDを追加し、指定sealed shard内のdecision / human turnを検証 |
| Cycle 2 / Iteration 2 | Judgeが品質収束routeを任意選択可能 | M03がT / replan状態からsingleton constraintを生成し、M02がmanifest subsetとして強制 |
| Cycle 2 / Iteration 2 | reservationからselected candidateを復元不能 | full candidate・digest・projection revisionを保存し、M04内部再検証へ変更 |
| Cycle 2 / Iteration 2 | T未満 / 初期progress状態がない | audit再生可能なbounded projectionとinitial / collecting / strict / threshold unionを追加 |
| Cycle 2 / Iteration 2 | live receiptに認可環境provenanceがない | protected authorization eventとenvironment / trace / attestation exact-match validatorを追加 |

上記修正は各reviewer cycleのiteration上限到達後に反映した。人間が再度fresh reviewer cycleでのredoを選択済みであり、新cycleでvalidated `READY`を得るまで本stageはincompleteとする。

## Historical Reviewer Finding — Cycle 1 / Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T07:33:18Z
- **Iteration:** 1
- **Scope decision:** none

状態遷移、再開、二相行使、監査再生および公開型契約に実装不能な欠落がある。

### Findings

- BLOCKER | component-methods.mdのGrantCommandはissue / replace / revoke / completeだけでnone↔semiの人間起点mode変更を表現できず、planGrantTransitionは自動的なIntent完了にもVerifiedHumanTurnを要求する。FR-AUT-003〜006およびGrant状態遷移contractを実装できず、M04の状態機械が閉じていない。
- BLOCKER | component-dependency.mdのF04はresume condition評価、WORKFLOW_UNPARKED、latch解除を記述するが、M06/M07の公開インターフェースには条件評価、人間retry検証、原子的unparkを行う操作がない。停止後の再開と監査再生を開発者が推測しなければならない。
- BLOCKER | ADR-006が要求する二相行使について、ReservedGrantExerciseの永続化・再生・commit/abort契約と、audit append後に適用する既存effectの冪等性receiptが定義されていない。append後・effect適用前のcrashで副作用の欠落または重複が起こり得て、FR-GRT-007およびNFR-DET-002を満たせない。
- BLOCKER | MonitorEffectのlatched分岐だけaudit予定eventを返さない一方、M07だけがcanonical eventをappendする設計である。LOOP_JUDGE_COMPLETED、停止latch、判定根拠をどのownerが生成するか不明で、FR-LMC-009のcanonical audit replay契約を実装できない。
- BLOCKER | Quality Repair Pluginのsemi/full自動有効化、noneでの人間provenance付きopt-in、欠落・破損時の開始前fail-closedを所有するAPIまたは状態遷移がない。services.mdはtrusted contributionを一律compileするため、FR-QRP-002〜003のmode境界が未設計である。
- BLOCKER | FR-OBS-001〜002が要求するactive/completed Intentの自動裁定一覧・詳細取得APIがなく、M07は汎用status投影とreview追記しか公開していない。AutoDecisionも質問、選択肢、回答、decider、basis、grant、evidence、degradationを含む型として未定義である。
- BLOCKER | component-methods.mdはCompiledMonitor、JudgeRequest、JudgeResult、AutonomyProjection、ReservedGrantExercise、WorkflowAdvanceInput/Effect、MachineStatus、NativeHarnessCapabilitiesなど中核公開型を未定義のまま参照している。stageが要求するinput/output型とerror契約が解決せず、各境界を推測なしに実装できない。
- FOLLOW-UP | component-dependency.mdは依存DAGを宣言する一方、依存マトリクスにはM01↔M03、M02↔M07、M04↔M07、M05↔M07、M06↔M07の相互型依存があり、「型はowner moduleからexportする」と組み合わせると循環importになる。type-only依存として許容するのか、domain別contract所有へ分離するのかを明記する必要がある。

## Historical Reviewer Finding — Cycle 1 / Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T07:49:40Z
- **Iteration:** 2
- **Scope decision:** none

前回8件への修正は反映されたが、更新後の公開契約に実行順序と状態所有の新たな実装不能箇所が残る。

### Findings

- BLOCKER | services.mdとcomponent-dependency.mdはM04のgrant予約後にM05を呼ぶが、reserveGrantExerciseが要求するDecisionCandidateの公開producerはM05のresolveAutoDecisionである。一方AutoDecisionInputはcandidateもrequestedEffectも受け取らないため、記述された順序では予約できず、順序を逆転してもM05がcandidate.effectを構築できない。
- BLOCKER | M02のapplyJudgeResultはCompiledMonitor、MonitorProjection、JudgeResultしか受け取らないのに、latched分岐でintentUuid、autonomyMode、workflow state、grantを必須とする完全なWorkflowResultを返す。必要情報を取得できず、M02がmode / grantを所有しないというcomponents.mdの境界にも違反する。
- BLOCKER | Park / resumeシーケンスは全reasonでM02 planMonitorResumeとLOOP_LATCH_CLEAREDを必須化しているが、AWAITING_HUMAN、NORM_CONFLICT、USER_PARKEDはMonitor外で生成され、対応するCompiledMonitorやMonitorProjectionが存在しない。非Monitor停止を再開する公開経路が実装できない。
- BLOCKER | FR-HAR-003の5harness成功receipt完了ゲートがproduction完了経路へ接続されていない。M06のTerminalInvocationStateはCompletionEvidenceを持たずcompletedを直接指定でき、依存規則はM06からM09へのproduction importを禁止するため、receipt不足でもprojectWorkflowResultがcompletedを生成できる。
- BLOCKER | M03のQualityRouteInputはprogress、history、replanAttemptedしか持たないのに、planQualityRouteはdeliveryId、intentUuid、stageInstanceId、graphRevision等を必須とするMonitorEventを返す。またQualityEvidenceSnapshot自体にもIntent UUID、Monitor ID、graph revisionの束縛がなく、FR-QRPのepoch分離とcross-intent混入拒否を実装できない。
- BLOCKER | none modeのopt-inはAuditEventPlanを生成するだけで、それをQualityPluginSettingへ再生するreducerまたは状態ownerが定義されていない。次のCLI invocationや別cloneでは人間provenance付きopt-inを復元できず、FR-QRP-002およびFR-HAR-004を満たせない。
- BLOCKER | 二相行使は既存effect適用後にcanonical effect eventをreceiptとして得る順序であり、effect成功後・receipt append前のcrash windowが残る。target側のeffectId重複排除またはeffectとreceiptの原子的commit契約がないため、再開時の再適用でNFR-DET-002が禁じる重複副作用を起こし得る。

## Historical Reviewer Finding — Cycle 2 / Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T08:04:46Z
- **Iteration:** 1
- **Scope decision:** none

前cycleの7件は反映済みだが、Judge再生、route意味論、認可束縛、完了・review永続化に新たな実装不能箇所が残る。

### Findings

- BLOCKER | M02はLOOP_JUDGE_STARTEDを記録するが、MonitorProjectionにpending Judge予約がなく、replayMonitorもJudgeRequestを返さない。Judge呼出し後のcrashから同じinvocationを再構築する公開経路が存在せず、FR-LMC-008の二重判定防止と再開契約を実装できない。
- BLOCKER | MonitorManifestはallowedRoutesのID集合しか持たないのに、applyJudgeResultはadvancedとlatchedを判別してMonitorLatchを生成する必要がある。routeの継続・停止意味論を表すmetadataがなく、advanced結果にはselectedRouteも含まれないため、generic M02もM06もrepair / replan / repair-stalledを型安全に適用できない。
- BLOCKER | grant予約用DecisionCandidateはM05が回答を選ぶ前のrequestedEffectから生成され、selectedOptionIdを含まない。commit時も同じcandidateだけを再検証するため、選択肢ごとにscope・不可逆性・必要権限が異なる質問で、実際に選ばれた回答をgrant範囲へ束縛できずCON-004とNFR-SAF-003を満たせない。
- BLOCKER | ValidatedLiveReceiptはLiveReceiptをoutcome="passed"へ絞るだけで、judgeObserved=trueおよびelectionOutcomeがelectedまたはloud-degradationであることを型・validator契約として要求しない。M08の完了評価はpassed receipt 5件だけでCompletionEvidenceを生成でき、FR-HAR-003が必須とするJudgeとelection/degradationの実測なしにIntentを完了できる。
- BLOCKER | Intent完了シーケンスはM08 CompletionEvidenceからM06 projectWorkflowResultへ直結するが、M04 planIntentCompletionによるactive grantのcompleted化とworkflow stateのnull化を同一transactionへ組み込む手順がない。projectWorkflowResultはWorkflowResultしか返さないため、表示上completedでもcanonical autonomy projectionがrunning / active grantのまま残り得る。
- BLOCKER | M07のappendCompletedDecisionReviewはdecisionId、choice、humanしか受け取らず、追記先のintentUuidを持たない。decisionIdはIntent UUIDを含む決定論的digestで逆引きできず、completed Intentの封印済みaudit shardを一意かつ安全に選択できないため、FR-OBS-003〜004の限定追記を実装できない。

## Historical Reviewer Finding — Cycle 2 / Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T08:17:05Z
- **Iteration:** 2
- **Scope decision:** none

前回6件は直接修正されたが、品質収束、grant crash recovery、live完了証拠に実装・安全性の残存欠陥がある。

### Findings

- BLOCKER | FR-QRP-010は初回thresholdでreplan、replan後の次回thresholdでrepair-stalledを決定論的に要求するが、M02のJudgeRequestはMonitorManifestの全routeを許可する。M03が計算するQualityRoutePlan.routeはJudgeのallowedRoutesへ接続されず、返却routeも閉集合所属しか検証しないため、Judgeが初回にrepair-stalledまたは再度repairを選べて収束contractを破れる。
- BLOCKER | reservation後のcrash recoveryに必要なselected option、question / occurrence、scope、effectの束縛がReservedGrantExerciseから失われる。replayGrantExercisesはIDだけのreservationを返し、commitOrAbortGrantExerciseもcandidateではなくcaller提供のrevalidated:booleanだけを受けるため、再起動後に同一candidateを再検証できず、FR-GRT-007とNFR-DET-002を満たせない。
- BLOCKER | classifyQualityProgressはMonitor threshold Tを受け取らず、QualityProgressにもinitial / insufficient-history状態がない。最初のsnapshotやT未満のnon-progress列に対して、strict-progress / fixed-point / churn / regression-cycleのいずれかを誤って返す必要があり、requirements.mdのT+1比較窓とT-1ではrouteを発火しない決定論的最小contractを実装できない。
- BLOCKER | ValidatedLiveReceiptは観測fieldを厳格化したが、LiveReceiptには認可済み実行環境のissuer、authorization identity、または検証可能なtrace provenanceがない。validateLiveReceiptは構造的に作成されたpassed値と実際のM09 opt-in live実行結果を区別できず、FR-HAR-003が要求するcredentialを持つ認可済み環境からの証拠なしにCompletionEvidenceを生成できる。
- FOLLOW-UP | JudgeReservationはrequestだけを永続化し、JudgePort.invokeOnceが同一結果を返すためのdurable result receiptまたはprovider側idempotency契約は示されていない。canonicalな二重判定防止と物理的な二重model invocation防止の保証範囲をFunctional Designで明確化する必要がある。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T08:30:14Z
- **Iteration:** 1
- **Scope decision:** none

現在のApplication DesignはIssue canonical契約に対して実装可能で、主要境界・不変条件・5 harness完了条件が整合している。

### Findings

- FOLLOW-UP | JudgePort.invokeOnce は、外部呼び出し成功後・結果永続化前のクラッシュ時に物理的な二重呼び出しを防げない。保証を同一 invocationId に対する正規判断は一件に限定するか、provider側冪等性または永続的な結果receiptをFunctional Designで契約化する。
