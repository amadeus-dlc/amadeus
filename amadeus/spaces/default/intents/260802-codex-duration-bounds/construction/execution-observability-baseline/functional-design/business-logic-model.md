# Business Logic Model — execution-observability-baseline

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 目的と境界

`unit-of-work` の #1602 Unitを、`unit-of-work-story-map` の先行Boltとして実行可能な処理へ具体化する。`requirements` のFR-01／FR-06／FR-08、`components` のC1／C2／C6／C7、`component-methods` のExecution Contract／Lifecycle／Projection、`services` のnormal executionを正とする。共有coreが識別子と耐久状態を所有し、Codexを含むharness adapterはnative factだけを提供する。Codex専用gateは追加しない。

## Root Operation 開始アルゴリズム

1. Engineはstage instanceの安定キーと開始種別をC2へ渡す。
2. C2はper-intent lock内でcanonical auditをfoldし、同じidempotency keyの既存receiptを検索する。
3. 既存receiptがあれば同じ`operationId`を返し、新しいeventを追加しない。
4. 新規開始ならC1でidentity chainを検証し、C2がopaqueな`operationId`をmintして`STAGE_STARTED`と同じtransactionでcommitする。
5. compact、process再起動、session resumeは同じstage instanceのrootを再取得する。Redo、terminal後の再実行、reject後の新revisionだけは新rootをmintし、`supersedesOperationId`を記録する。
6. commit receiptに対応するstate/runtime必須projection receiptからC2が`StartPermit`を発行した後だけstageのnative処理を開始する。canonical writeに失敗した場合は`persisted:false`のrefusalを返し、同じjournalへ失敗記録を試みない。

## Child・Attempt 処理シーケンス

agent dispatchとtool invocationは、それぞれ親operationを持つchild logical operationとする。C2がchildの`operationId`、`rootOperationId`、`parentOperationId`をcommitする。実行直前にC2のatomic reserveを通し、`attemptId`をmintしたreservationを`reserved`へ置く。dispatcherは`claimDispatch`を一度だけ`claimed`へ遷移させたcallerだけがnative処理を開始する。

`claimed`はdispatch権の取得であり、native開始の証明ではない。native呼出がhandle／tool call ID／worker IDを返した直後、C2は`dispatch-confirmed`をcommitする。recoveryは次表で処理する。

| Durable state | Native evidence | Recovery |
|---|---|---|
| `reserved` | なし | 同じreservationをclaim可能。attemptは予約時点で消費済み |
| `claimed` | no-effect-confirmed | 元attemptを`dispatch-not-started`で終端し、後続Unitのrecoverable-retry budgetから新attemptを予約可能 |
| `claimed` | effect possible／unknown／照会不能 | 元attemptを`dispatch-effect-unknown`で終端し、新規dispatchを安全停止 |
| `dispatch-confirmed` | 同じnative handle | 再dispatchせずresult collectionだけを再開 |
| terminal | 任意 | 同じfinish key／同じpayloadなら既存receipt、異payloadならconflict |

adapterがnative照会に対応しない場合はunknownであり、`claimed`を実行済みにも未実行にも推測しない。retryが必要な場合は同じoperationの新しいattemptを予約する。開始前のbudget拒否はattemptを増やさず、reservationをcommitしたattemptはnative未開始でも消費する。

## Idempotency Key と Finish 遷移

key tupleはversion付きcanonical encoderで作り、値の連結を各callerに任せない。

| Operation | Stable tuple |
|---|---|
| root start | `intentUuid, stageSlug, stageInstanceId, revision, root-start` |
| child start | `rootOperationId, parentOperationId, childKind, semanticSubjectId, childOrdinal` |
| reserve | `operationId, budgetKind, subjectId, semanticAttemptOrdinal` |
| claim／confirm | `reservationId, claim`／`attemptId, dispatch-confirm` |
| attempt finish | `attemptId, finish` |
| operation finish | `operationId, finish` |

各requestはcanonical payload fingerprintを伴う。同じkey・同じfingerprintは既存receipt、同じkey・異なるfingerprintは`idempotency-conflict`でfail-closedとする。fingerprintは意味入力、outcome、reasonを含み、観測時刻と計算済みdurationを除外する。attemptは`reserved→claimed→dispatch-confirmed→terminal`または`claimed→terminal(dispatch-effect-unknown|dispatch-not-started)`へ進む。開始eventのないfinish、terminal後の新attempt、child非terminal中のoperation正常完了を拒否する。二重finishは同じoutcome／termination reasonだけをidempotentに受理し、最初のreceiptのmeasurementを返す。

## 終了・計測・投影

開始時と終了時に利用可能なmonotonic clockを優先する。両端が同一monotonic domainなら`monotonic`、wall fallbackなら`wall-fallback`、片側欠落・clock不明・wall逆行なら`invalid`とし、invalidを0msへ丸めない。C2はattempt終了、operation終了、termination reasonをauditへcommitする。

canonical event後、C6がstateとruntime graphへ同期投影し、OTelへbest-effort投影する。sinkは同じevent identityをidempotency keyに使う。native開始許可は、canonical start／reserve commitに加えて必須state・runtime projection barrierが成功した`StartPermit`でのみ成立する。barrier失敗時はauditを巻き戻さず、native開始を禁止し、audit writerへ`projection-blocked`を直接追記してpending rebuildを残す。同じ故障sinkを再帰的に通してterminationを成立させない。rebuild commandがauditからstate/runtimeを再構築した後、同じkeyでpermitを再評価する。OTel dropはbarrier外でありworkflow成功に偽装しない。

## Baseline 生成

固定workload開始前に`BaselineRun`を作り、`workloadId`／`workloadVersion`、入力のcanonical digest、`observedGitSha`、開始条件、期待終了条件、harness名／version、model／version、capability snapshot、clock availabilityをroot operationへ結び付ける。root／child／attemptごとに`ExecutionOrigin{stage,agent,tool}`とoperation kindを保持する。取得不能値はすべて`Fact`で保持する。workload入力を確定してからrootを開始し、全attempt終了後に実終了条件、duration、attempt数、measurement quality、termination reasonを集約する。

baselineはcanonical audit event列を耐久正本とし、決定的projectorが`<record>/construction/execution-observability-baseline/evidence/baseline-manifest.json`へ機械可読投影する。manifestはroot／child／attemptのidentity、origin、environment fact、duration、outcome、terminationを列挙する。statusは次の全域規則で一意に決める。

| Condition | Status |
|---|---|
| workload ID/version/input digest不一致、または1件以上のattemptが非terminal | `invalid` |
| identity、workload、observed SHA、開始・終了条件がavailableで、全attempt terminal | `complete` |
| 上記必須値とterminal条件を満たし、欠測がmodel名/version、harness native version、capability、clock availabilityだけ | `complete-with-gaps` |
| root/workload/input digest/observed SHA/開始・終了条件のいずれか欠測 | `invalid` |

後続control／treatmentは同じworkload ID／version／input digestを必須とする。

## Revision 1 Reconciliation

Application Designへ`confirmDispatch`、`issueStartPermit`、required projection receipt、C7 effect照会を昇格した。claim取得とnative開始を分離し、baselineのorigin／availability／statusを全域化したため、iteration 2の公開契約不整合を解消する。Codex固有gateは追加していない。

## 主要シナリオ

| Scenario | Expected flow | Durable result |
|---|---|---|
| 通常stage | root開始→child開始→attempt claim→終了 | 同じrootで全child／attemptを相関 |
| tool transient後retry | 同じchild operationでattemptを追加 | attemptごとのdurationとoutcome |
| compact／resume | 既存rootと未終端childを再取得 | ID重複なし、継続時間を相関 |
| 明示Redo | 新rootを開始 | 旧rootを`supersedesOperationId`で参照 |
| canonical write失敗 | dispatch前に停止 | native side effectなし、安全停止理由 |
| native fact欠落 | `Fact`の非available状態へ正規化 | 不明値を成功値や0へ変換しない |

## Unit間接続

本Unitのoperation／attempt／measurement契約を後続の`convergence-budgets`、`interaction-budgets`、`bounded-unit-pool`が再利用する。後続Unitは独自IDや独自counterを作らず、同じC2 reservationとprojectionを使う。具体的な時間閾値は本Unitのbaseline取得後、NFR Requirementsで決める。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:02:40Z
- **Iteration:** 1
- **Scope decision:** none

required-sections と upstream-coverage は全3成果物で通過し、linter／type-checkは非該当。C1、C2、C6、C7およびFR参照は解決したが、baseline記録、dispatch crash境界、finish遷移、projection barrier、idempotency keyに実装を一意化できない欠落がある。

### Findings

- Major | business-logic-model.md「終了・計測・投影」「Unit間接続」、domain-entities.md「Aggregate と Entity」、unit-of-work.md Unit 1、requirements.md FR-01.7〜10／FR-08.1 | 固定workload、固定入力、observed SHA、harness/model capability、開始・終了条件を保持するbaselineモデルと生成手順がない。LogicalOperation／ExecutionAttemptにもharness version、model version、termination reasonなどの実行由来属性または関連entityが定義されていない。Action: baseline run/observationのentity、必須field、root/attemptとの関連、永続化先、欠測状態、取得順序、完了判定を追加し、FR-01.7〜10とFR-08.1の全項目を機械可読にtraceする。
- Major | business-logic-model.md「Child・Attempt 処理シーケンス」、component-methods.md「Execution Lifecycle Coordinator」 | claimedをdurable commitした直後、native dispatch前にprocessが落ちると、実行は開始されていないのにreplayはalready-dispatchedとして再dispatchを禁止する。予約が永久に未完了となるcrash windowと回復規則が未定義。Action: reserved → claimed → dispatch-confirmed等の状態とcrash recovery表を定義し、開始有無を確認不能ならunknown-effectとして安全停止、no-effect-confirmedの場合だけ後続Unitの有界retryへ渡すなど、決定的な終端・再開規則を明記する。
- Major | business-logic-model.md「終了・計測・投影」、business-rules.md「Transaction と Idempotency 規則」、domain-entities.md「Identity と Lifecycle 不変条件」、requirements.md FR-01.5 | finish処理がcommitするとしか定義されず、開始eventのない終了、二重終了、同一keyで異なるoutcome、terminal後のattempt追加をどう拒否・再送処理するか不明。Action: attempt／operationごとのfinish状態遷移表、idempotency key、payload fingerprint、既存receipt返却条件、conflict error、terminal outcomeとtermination reasonを定義する。
- Major | business-logic-model.md「終了・計測・投影」、business-rules.md BR-EO-08／BR-EO-11／BR-EO-20、services.md「Orchestration Pattern」「Reliability and Operations」 | audit commit後のstate/runtime同期projectionが失敗した場合、commit receiptでnative処理を開始してよいのか、fail-closedにするのかが確定していない。安全停止eventも同じ故障projectionを再度通るため、暗黙の失敗ループになり得る。Action: canonical commit、必須projection barrier、開始許可receiptを分離し、projection失敗時はauditを巻き戻さず開始を禁止する等の一意な規則、再構築手順、失敗ループを避けるtermination記録経路を定義する。
- Major | business-logic-model.md「Root Operation 開始アルゴリズム」、business-rules.md BR-EO-09、domain-entities.md ExecutionReservation | stage instanceの安定キーとidempotency keyの生成・scopeが未定義で、resume/compactは同一root、Redo/revisionは新rootという境界を実装できない。Action: root、child、reservation、claim、finishごとに、intent/stage instance/revision/subject/semantic attemptを用いた安定key tupleと、新revision時の変更規則、同一key・異payload時の拒否規則を定義する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:10:08Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の5論点には記述が追加されたが、いずれも公開契約または永続schemaまで閉じていない。特にdispatch crash recoveryとprojection barrierは、Functional DesignとApplication Designが正反対の実行許可条件を持つため実装不能である。required-sectionsとupstream-coverageは全3成果物でPASSし、linter／type-checkは非該当。

### Findings

- Major | business-logic-model.md「Child・Attempt 処理シーケンス」、business-rules.md BR-EO-11A、domain-entities.md ExecutionReservation、component-methods.md「Execution Lifecycle Coordinator」「Harness Capability Port」 | claimedとdispatch-confirmedを分離した状態表は追加されたが、C2の公開APIにはdispatch-confirmedをcommitするmethodがなく、HarnessCapabilityPortにもnative effectを照会するmethodがない。さらに上流契約はclaimed済みをalready-dispatchedとして無条件に再dispatch禁止とするため、新しい回復表と矛盾する。Action: confirmDispatchと、native handle照会結果をno-effect-confirmed | effect-possible | unknownへ正規化するportを公開契約へ追加し、claim直後、native受付直後、confirm直前の各crashで一意に終端・再開できるtransaction/receiptを定義する。
- Major | business-logic-model.md「終了・計測・投影」、business-rules.md BR-EO-11C、domain-entities.md StartPermit／ProjectionReceipt、component-methods.md「Projection Interfaces」、services.md「Orchestration Pattern」 | Functional Designはstate/runtime projection成功済みのStartPermitだけがnative開始を許可するとする一方、servicesはcanonical receiptだけで開始しprojectionは後続、Projection Interfaceもreceiptを返さないvoidである。C2の公開methodにもStartPermit発行・再評価契約がない。Action: canonical receipt、必須projection receipt、StartPermitの生成・永続化・replay APIをApplication Designまで反映し、projection失敗時のpending-rebuildと非再帰的projection-blocked記録を公開契約として閉じる。
- Major | business-logic-model.md「Baseline 生成」、domain-entities.md BaselineRun／ExecutionEnvironmentSnapshot／BaselineManifest、requirements.md FR-01.7〜10／FR-08.1 | Baseline entityは追加されたが、FR-01.7必須のstage／agent／tool由来をLogicalOperationまたはmanifest schemaが保持していない。取得不能値はFactという処理規則に対しobservedGitSha等は非Fact fieldであり、必須field欠測時がcomplete-with-gapsかinvalidかも状態判定が全域で定義されていない。Action: root/child/attempt単位のstage・agent・tool・harness・model・clock・termination schema、各fieldのavailability型、許容gap集合、必須欠測・digest不一致・未終端を網羅するstatus決定表を定義する。
- Major | business-logic-model.md「Idempotency Key と Finish 遷移」、domain-entities.md ExecutionReservation／LogicalOperation、component-methods.md ExecutionLifecycleCoordinator | key tupleは列挙されたが、semanticSubjectId、childOrdinal、semanticAttemptOrdinalの生成主体・永続field・C2 request shapeがない。加えて同一payload fingerprintのみ再送と同一outcome／termination reasonなら二重finishを受理が併記され、finish時刻・duration・measurementをfingerprintへ含めるかで同じ再送がreceipt返却にもconflictにもなり得る。LogicalOperationにもterminal outcome／termination reasonがない。Action: versioned typed key materialをC2がlock内で導出・永続化する契約、ordinalの再送／新attempt判定、fingerprint対象field、attempt/operation terminal payloadとreceiptの完全な遷移表を定義する。
