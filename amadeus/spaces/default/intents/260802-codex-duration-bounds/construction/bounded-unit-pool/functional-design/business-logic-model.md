# Business Logic Model — bounded-unit-pool

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 目的と境界

`unit-of-work` の #1919 Unitを、`unit-of-work-story-map` のDAGと #1602／#1998のexecution／budget契約上へ載せる。`requirements` FR-05／FR-04A、`components` C2／C5、`component-methods` のBounded Unit Poolとfailure table、`services` のbounded swarm flowを正とする。C5はimmutable projectionからID非保有proposalを返し、C2だけがmutationと採番を行う。

## Initial Enqueue

1. C2はUnit IDの一意性、全dependency参照の存在、self-edgeなし、cycleなしを検証する。不正時は`invalid-unit-plan`でmutation前に拒否する。
2. C2はcanonical auditからPoolProjectionをfoldする。
3. Kahn法でindegree 0のtopological layerを反復確定し、同一layerでは既存`unitId`のUTF-8 byte列をunsigned bytewise昇順に比較する。filesystem／map列挙順を使わない。
4. その順に未登録Unitごとに、C5がinitial enqueue proposalを返す。
5. C2はper-intent lock内で`queueEntryId`と単調なsequenceをmintし、Unitごとの安定idempotency keyでcommitする。
6. replayは既存receiptを返し、二重enqueueしない。`queueEntryId`と`unitId`は別identityとする。

## Acquire と Dispatch

1. `activeCount < activeCap`の間だけacquireを評価する。
2. C5は依存が満たされたqueued entryのうち最小sequenceを選ぶ。queuedはactiveへ数えない。
3. C2はunit-attempt budget、attempt ID、slot ID、queueからactiveへの遷移を1 transactionでreserveする。
4. required projection receiptから`StartPermit`を得てclaim済みreservationを持つcallerだけがworkerをdispatchし、native handle取得後に共通C2 `confirmDispatch`をcommitする。同じclaimのreplayではC7 `queryDispatchEffect`で照会し、証拠なしに再dispatchしない。
5. dispatch／worker start／result collectionのallowlisted transientだけは #1998のretry budgetを通せる。

claim後・dispatch確認前にcrashした場合、C7がattempt ID／native correlation keyでeffectを照会する。no-effect-confirmedなら元attemptを`dispatch-not-started`でsettle・releaseし、budget内で再queueできる。effect possible／unknown／照会不能なら`dispatch-effect-unknown`のsystemic failureとして新規dispatchを停止し、drainingへ移る。`claimed`をworker開始済みと推測しない。

## Settle・Release・Requeue

worker結果を同じUnit attemptへ相関し、C5へimmutable outcomeを渡す。C5はsettleとslot releaseを常に同じproposalに含める。retryableかつbudget残ありなら、同じUnitを新しいqueue entryとしてFIFO末尾へ戻す。C2はsettle、exactly-once release、新entry採番を1 event batchでcommitする。

完了、失敗、取消のいずれでもslotは一度だけ解放する。同じresultのreplayは既存receiptを返す。releaseだけ成功してsettleが欠落する中間状態を作らない。

## Terminal Failure 継続

| Failure | Pool safety | Action | Batch result |
|---|---|---|---|
| local failure／attempt exhausted | healthy | transitive dependentを`dependency-unsatisfied`で取消し、独立UnitはFIFO継続 | `partial-failure` |
| unknown effect／state inconsistency／canonical write／auth・config | unsafe／unknown | 新規dispatch停止、queuedを`batch-unsafe`で終端、activeは結果回収のみ | `terminated` |
| human cancel／abort | healthy | queuedをcancelし、activeへ取消要求後の実結果を記録 | `cancelled` |
| 全Unit成功 | healthy | queue／activeが空で終了 | `completed` |

aggregateの進行phaseと最終resultは分離する。phaseは`open | draining | terminal`、final resultはterminalになるまで未設定とする。local failureは`hasLocalFailure=true`を立ててもphaseはopenのまま独立Unitを継続する。全Unitがterminalになった時点で `terminated > cancelled > partial-failure > completed` の優先順位によりfinal resultを一意に確定する。

## Bounded Reconciliation と Late Result

`claimed`未確認、worker無応答、cancel無応答は、NFR Requirementsで値を決めるversioned `reconciliationCap`の範囲で照会／取消確認を行う。各照会も同じUnit attemptへ耐久化し、session変更でresetしない。

- no-effect-confirmed: `dispatch-not-started`をsynthetic terminal outcomeとしてsettle／releaseし、retry可能なら末尾へrequeueする。retry不可／budget exhaustedなら同outcomeでterminalにし、local failureとしてdependentだけを取消す。
- effect possible／unknownまたはreconciliation exhausted: `dispatch-effect-unknown`／`worker-unresponsive`をsynthetic terminal outcomeとしてsettle／releaseし、batchをdrainingへ移して新規dispatchを止める。
- human cancelの無応答: `cancel-unconfirmed`でsettle／releaseし、final result候補をcancelledとする。
- synthetic terminal後のlate result: `late-result-observed`をauditへ追加するだけで、Unit outcome、counter、slot、final resultを再遷移させない。

synthetic outcomeとslot releaseはC2の`commitPoolTransition`同一event batchでcommitする。`record-reconciliation`、`late-result-observed`も同じclosed command unionを使う。C7はdispatch effect、取消要求、取消結果照会を公開する。systemic／cancel draining中は新規acquireがないため、unknown native workerが遅れて現れてもactive capを使った追加dispatchは生じない。

## Deterministic Scheduling

同じevent列、検証済みDAG、unitId、capに対してC5はKahn layer＋unitId UTF-8 bytewise順で同じproposalを返す。priorityやLLM判断でFIFOを変更しない。同一sequenceは存在せず、retry entryは新sequenceで末尾へ入る。active最大値、Unit attempt、queue順、termination reasonをcanonical eventから再現できる。

## Unit間接続と測定

#1602のoperation／attempt、#1998のreserve／retry classificationを再利用する。maximum active、attempt、queue order、terminationを同じfixed workloadでcontrol／treatment比較する。active capとUnit attempt capの具体値はNFR Requirementsで決める。

## Revision 1 Reconciliation

存在しない`planOrder`を削除し、Kahn layer＋既存unitIdのUTF-8 bytewise順へ固定した。dispatch confirmation、reconciliation、synthetic outcome、late resultをC2の公開commandへ、effect／cancel照会をC7へ接続し、全reconciliation分岐をclosed `UnitOutcome`へ写像した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:02:40Z
- **Iteration:** 1
- **Scope decision:** none

required-sections と upstream-coverage は通過し、linter／type-check／answer-evidenceは非該当。一方、dispatchのクラッシュ窓、batch状態と最終結果の混同、active Unitの終端保証、initial enqueueの決定性が未解決である。

### Findings

- Critical | business-logic-model.md「Acquire と Dispatch」、domain-entities.md「ActiveSlot」、component-methods.md「Execution Lifecycle Coordinator」 | reserved→claimedを耐久化してからnative dispatchするため、claim commit直後・worker起動前のcrashではreplayがalready-dispatchedとして再dispatchを禁止する。workerが存在しないままslotとUnit attemptがactiveに残り、poolが永久停止する。Action: attempt IDをidempotency keyとする再実行可能なdispatch/outbox契約、またはclaimed → dispatch-started → worker-confirmedと期限付きreconciliationを定義し、各crash cut-pointで重複workerなし・orphan slotなしを検証する。
- Major | business-logic-model.md「Terminal Failure 継続」、business-rules.md BR-UP-21、domain-entities.md「UnitPoolAggregate」「PoolTransitionProposal」 | local failure時には独立Unitを継続しながらbatch resultをpartial-failureとする一方、全Unit terminal時だけresult確定としており、Aggregateのstatusは進行状態と最終結果を同じunionへ混在させている。Action: lifecycle phase（open | draining | terminal）とfinal resultを分離し、local failure flag、最終result確定条件、複数failure/cancel時の優先順位を完全な遷移表で定義する。
- Major | business-logic-model.md「Terminal Failure 継続」、business-rules.md BR-UP-19〜21、domain-entities.md「Lifecycle 不変条件」 | systemic failureではactiveを結果回収のみ、human cancelでは取消要求後の実結果まで記録とするが、worker消失・取消無応答・結果永久欠落時のterminal化規則がない。全Unit terminalを要求するためbatchが永遠にdrainingとなり得る。Action: bounded reconciliation/abort期限、synthetic terminal outcome、late result処理、slot releaseとの原子性を定義し、worker無応答とcancel無応答の決定的testを追加する。
- Major | business-logic-model.md「Initial Enqueue」「Deterministic Scheduling」、domain-entities.md「関係」 | 未登録Unitを列挙する順序、DAGの欠落参照・重複・cycleを拒否する主体と結果が未定義である。論理的に同じDAGでも列挙順によりsequenceとFIFOが変わり得る。Action: enqueue前のDAG完全検証とtyped refusalを定義し、明示的Unit順またはtopological order＋安定tie-breakerでinitial sequenceを確定する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:09:43Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1のうちphase/result分離は解消済み。claim crashとbounded reconciliationは概念上改善されたが、公開APIと状態遷移が閉じていない。DAG検証は追加された一方、決定順序の入力が上流成果物に存在しない。required-sectionsとupstream-coverageは3成果物すべてPASS、linter/type-check対象コード断片はない。

### Findings

- Major | business-logic-model.md「Acquire と Dispatch」「Bounded Reconciliation」、business-rules.md BR-UP-12A/24、domain-entities.md ActiveSlot/ReconciliationRecord、component-methods.md Execution Lifecycle Coordinator/Harness Capability Port | dispatch-confirmed、reconciliation記録、synthetic outcome、late-result観測をcommitする公開commandがない。既存PoolTransitionCommand unionにも含まれず、adapterにはattempt IDによるeffect照会・cancel確認契約がない。特にnative dispatch後・handle保存前のcrashではeffectを判定できる保証がなく、実装者がmutation/APIを発明する必要がある。Action: C2のtyped mutation、adapterの照会・取消契約、attempt IDのnative correlation/idempotency、各crash cut-pointのcommit境界を公開契約として定義する。代替としてdurable outbox契約へ統一する。
- Major | business-logic-model.md「Bounded Reconciliation」、domain-entities.md Unit | synthetic outcomeの状態閉包がない。not-startedはUnit statusに存在せず、no-effect-confirmedかつretry不可／budget exhausted時のterminal statusとfinal-result寄与が未定義。またdispatch-effect-unknownとdispatch-unknownが混在する。Action: reconciliation全分岐をcanonical Unit outcomeへ写像し、retry不可時を含むterminal遷移表と単一enumを定義する。
- Major | business-logic-model.md「Initial Enqueue」「Deterministic Scheduling」、BR-UP-06A/06B、domain-entities.md Unit、consumed unit-of-work.md / unit-of-work-story-map.md | 必須のplanOrderに供給元がない。上流Unit planにもC5の公開inputにも存在しないため、承認済み入力をそのまま渡すとinvalid-unit-planとなるか、実装者が値を捏造する。またtopological levelの算出法も一意に定義されていない。Action: UnitPlanの正準schemaへplanOrder、その採番・承認・永続化ownerを追加し、level算出をKahn layer等の一意なalgorithmで固定する。既存入力だけを使うなら、利用可能な安定tie-breakerへ設計を変更する。
