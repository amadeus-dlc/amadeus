# Business Logic Model — interaction-budgets

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 目的と境界

`unit-of-work` の #1999 Unitを、`unit-of-work-story-map` に従い #1602／#1998のidentityとreserve契約上へ載せる。`requirements` FR-04／FR-04A、`components` C2／C4、`component-methods` のInteraction Budget Adapter、`services` の共通communication contractを正とする。質問内容の善し悪しをpolicy化せず、表示・follow-up・review dispatchの反復回数だけを有界化する。

## Stable Instance 導出

question、follow-up、review iterationは、次のversion付きcanonical tupleをhashした`semanticKey`でC2のindexを引く。初回commit時にC2がopaqueなinstance IDをmintし、以後は同じsemanticKeyから既存IDを返す。

| Kind | Canonical identity tuple |
|---|---|
| question | `intentUuid, stageInstanceId, stageRevision, questionCatalogId` |
| follow-up | `parentInteractionInstanceId, ambiguityKey, followUpOrdinal` |
| review | `stageInstanceId, stageRevision, artifactSetId, reviewOrdinal` |

`questionCatalogId`は質問票内の安定key、`ambiguityKey`は元回答の対象fieldと曖昧さ種別、`artifactSetId`はsorted artifact pathとcontent digestから作る。tuple、semanticKey、mint済みID、revision／ordinalはC2のcanonical auditへ保存する。再描画、resume、compact、crash replayでは同じIDとidempotency keyを使う。質問本文の空白差分、harness固有message ID、session IDをidentityに使わない。

## C4 から Atomic Reserve への写像

| C4 input | C2 request field |
|---|---|
| current stage execution | `rootOperationId` |
| interaction kind | `kind: question | follow-up | review` |
| canonical tuple | `keyMaterial: InteractionKeyMaterial` |
| canonical tuple digestと`reserve` | `idempotencyKey` |
| versioned config resolver | `cap, configVersion, configDigest` |

config resolverはglobal→space→intentの既存優先順位で値を解決し、NFR Requirementsで定めるhard capを超える値をmutation前に拒否する。C2の`reserveInteraction`が同じlock内でkey materialからinstanceをresolve-or-createし、effective cap／version／digestを #1998のBudgetPolicySnapshotへ固定してreserveする。C4は事前にIDをmint／解決せず、値も保持しない。

## Question／Follow-up Reserve Flow

1. conductorは表示直前にC4へstage instanceとcanonical key materialを渡す。
2. C4はkindを`question`または`follow-up`へ正規化し、C2の`reserveInteraction`へ委譲する。
3. reserved receiptが返った場合だけ表示する。表示失敗も開始済み1回として消費する。
4. C2が`claimed`をcommit後、C7の`deliverInteraction`へ安定した`deliveryKey=interactionInstanceId`を渡す。C2の`commitInteractionTransition(mark-delivered)`でdelivery evidenceをcommitできれば`delivered`へ進む。
5. 同じinteractionの再描画は既存receiptを返し、counterを増やさない。
6. exhaustedなら新しい質問を表示せず、`InteractionReserveResult`の`summaryId`と`TerminationReasonV1`から未解決事項を既存の人間approval boundaryへ渡す。

## Review Reserve Flow

artifact review開始直前に、stage instance、revision、artifact set、ordinalのkey materialで`review` budgetを予約する。C2がresolve-or-createとreserveを同じlockで行い、claim後はstableな`reviewIterationId`／`artifactSetId`／`deliveryKey`でC7からreviewer dispatchする。resultは`commitInteractionTransition(record-review-result)`、失敗／unknownは`fail | unavailable`でcommitする。native backendがidempotent dispatchも`queryInteractionEffect`も提供できない状態でclaim後crashした場合は再dispatchせず`unavailable`へ終端する。READY／NOT-READYにかかわらずdispatch開始済みiterationは1回を消費する。NOT-READYで修正後に次iterationが必要な場合だけ新IDを使う。

上限到達後はreviewerを再dispatchしない。未解決finding、実施済みiteration、last durable progressを既存approval gateへ提示し、人間がapproveまたはrequest changesを判断する。新しいCodex専用gateは作らない。

## Delivery と Crash Recovery

| State | Question／follow-up | Review |
|---|---|---|
| `reserved` | 同じreceiptをclaim | 同じreceiptをclaim |
| `claimed`、delivery evidenceなし | 同じdeliveryKeyで再描画可。重複表示は許容するがcounter不変 | idempotent backendへ同じkeyで再送。effect不明なら`unavailable` |
| `delivered`／`dispatched` | answer bindingだけ再開 | result collectionだけ再開 |
| `resolved` | 同じanswer/resultは既存receipt | 同じresultは既存receipt |
| `failed`／`unavailable` | terminalとしてapprovalへ引渡し | finding／unavailable理由をapprovalへ引渡し |

question／follow-upは表示とcommitを原子的にできないためat-least-once deliveryとし、同じinteraction IDの重複表示を別counterへ数えない。answer binderは`commitInteractionTransition(record-answer)`で最初のanswer fingerprintだけを受理し、同じfingerprintはidempotent、異なるfingerprintは`answer-conflict`とする。reviewは重複実行を許容せず、C7のidempotent dispatchまたはeffect照会がないunknown windowを`unavailable`として閉じる。transition commandは`mark-delivered | record-answer | record-review-result | fail | unavailable | cancel | exhaust`以外を受理しない。

## Decision Table

| Situation | Instance identity | Reserve result | Action |
|---|---|---|---|
| 初回question | 新規 | reserved | 表示 |
| 同じquestionのresume／再描画 | 既存 | existing receipt | 二重消費せず必要な表示を復元 |
| 曖昧回答への新follow-up | 新規 | reserved | 表示 |
| reviewer NOT-READY後の次iteration | 新規 | reserved | 修正後にdispatch |
| cap到達後の新規interaction | 新規 | exhausted | 既存approval boundaryへ引渡し |
| canonical state unsafe | 任意 | refusal | 新規表示／dispatchを停止 |
| claim後crash（question） | 既存 | existing receipt | 同じdeliveryKeyで再描画、counter不変 |
| claim後crash（review、effect unknown） | 既存 | terminal unavailable | 再dispatchせずapprovalへ引渡し |

## Unit間接続と測定

#1602のoperation／attempt IDと #1998のBudgetSubject／ExecutionReservationをそのまま使う。question、follow-up、reviewごとのcounter、duration、termination reasonを同じfixed workloadで比較する。cap値はNFR Requirementsで決め、C4へ埋め込まない。

## Revision 1 Reconciliation

pre-minted interaction IDを廃止し、C2のatomic `reserveInteraction`へresolve-or-createを集約した。delivery/result/terminalはclosed `InteractionTransitionCommand`、native side effectはC7 capabilityへ接続し、全terminal summaryをReserveResultの`summaryId`から既存approval boundaryへ渡す。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:04:46Z
- **Iteration:** 1
- **Scope decision:** none

required-sections と upstream-coverage は3成果物すべてPASS。linter／type-check／answer-evidenceは非該当。依存方向 C4→C2→C3 に循環はないが、stable identity、非transactionalな表示・dispatchのcrash recovery、terminal state、exhaustion payloadが未確定である。

### Findings

- Major | business-logic-model.md「Question／Follow-up Reserve Flow」「Review Reserve Flow」、component-methods.md「Execution Lifecycle Coordinator」、domain-entities.md「Lifecycle 不変条件」 | 成果物は既存receiptによる表示復元を要求する一方、上流のclaimDispatchはclaim済みreplayでnative dispatchを再実行しない。claim後・表示前のcrashでは質問が失われ、表示後・完了記録前のcrashでは重複表示を避けられない。reviewer dispatchにも同じ非transactional side-effect windowがある。Action: interaction種別ごとにreserved → claimed → delivered/dispatched → resolved|failedのdurable protocol、各crash pointのreplay方針、重複を許容する場合のcounter/idempotency semantics、harness側delivery evidenceを定義し、render/reviewer失敗を含む状態遷移表とtestを追加する。
- Major | business-logic-model.md「Stable Instance 導出」、domain-entities.md「InteractionInstance」「QuestionInstance」「FollowUpInstance」「ReviewIteration」「関係」、component-methods.md「Interaction Budget Adapter」、components.md「Public Contract Shape」 | semanticKey、questionKey、ambiguityKey、artifactSetIdの構造・生成主体・永続化先がなく、resume後に同じIDを再現する方法が実装不能である。ArtifactSetも参照されるだけで定義されていない。またC4入力からC2のrootOperationId、subjectId、idempotencyKey、capへの完全な写像がない。Action: 各kindのcanonical identity tuple、mintまたは決定的導出規則、durable owner、revision/ordinal規則を定義し、C4→AtomicReserveRequestのfield-by-field mappingとversioned cap解決・hard-cap拒否を明記する。
- Major | domain-entities.md「Entity と Value Object」「関係」「Lifecycle 不変条件」、business-logic-model.md「Decision Table」 | InteractionInstance.statusはplanned | reserved | started | resolved | exhaustedしかなく、started後のrender／reviewer失敗をterminal結果として記録する本文を表現できない。ReviewIteration.verdict=unavailableと親statusの対応もなく、resume時にstartedが実行中かterminal failureか判別不能である。さらに全InteractionInstanceとReservationを1:1とする関係は、reserve前のplannedおよびreserve拒否されたexhausted instanceと矛盾する。Action: failed/unavailable/cancelled等のterminal stateと遷移event、再開判定、review verdictとの対応を定義し、Reservation cardinalityを0..1へ修正するかrefusal/exhaustion receiptを含む統一結果entityへ再設計する。
- Major | domain-entities.md「UnresolvedInteractionSummary」、business-rules.md BR-IB-11〜18、requirements.md FR-04.4・NFR-07 | exhaustion時のvalue objectに必須のterminationReasonと最終成果物参照がない。要件の最終成果物、counter最終値、termination reasonと利用者表示契約を同じdurable recordから生成できない。Action: summaryへtyped termination reason、final artifact/artifact-set reference、stage/review revision、durable record identityを追加し、question・follow-up・reviewそれぞれのexhaustion生成規則と既存approval boundaryへの受渡し契約を定義する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:11:46Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1で指摘したterminal stateとReservation cardinalityは文書上修正され、exhaustion payloadにも必要項目が追加された。required-sections／upstream-coverageは3成果物すべてPASSし、linter／type-check／answer-evidenceは非該当。しかし、stable identityのmintとreserveが循環し、delivery状態をdurable commitする公開契約も存在しない。さらにexhaustion summaryが上流のReserveResultへ接続されていない。

### Findings

- Major | business-logic-model.md「Stable Instance 導出」「C4 から Atomic Reserve への写像」「Question／Follow-up Reserve Flow」、business-rules.md BR-IB-24、component-methods.md「Interaction Budget Adapter」「Execution Lifecycle Coordinator」 | 初回interaction IDはC2がcanonical tupleからmintすると定義された一方、C4の公開methodとreserveExecutionは既にmint済みのquestionInstanceId／subjectIdを入力として要求し、flowでもconductorがinteraction instanceをC4へ渡す。C4はIDをmintできず、C2にはtupleを解決・登録するmethodがないため、ID取得→reserveが循環して初回commitを実装できない。Action: canonical tupleを受けてC2がInteractionInstanceとreservationを同一lock内でresolve-or-createするAtomicReserveRequestへ統合するか、C2の明示的なidempotent resolve APIを定義し、C4 signatures、subjectId、idempotencyKey、configVersion/configDigestを同じ契約へ反映する。
- Major | business-logic-model.md「Delivery と Crash Recovery」、domain-entities.md「DeliveryEvidence」「Lifecycle 不変条件」、component-methods.md「Execution Lifecycle Coordinator」、components.md C2 | reserved→claimed→delivered|dispatched→resolved|failed|unavailableとreplay方針は記述されたが、C2の公開mutationはreserve、claim、finishのみで、delivery evidence、answer fingerprint、review result、failed/unavailableをcanonical commitするcommand/eventがない。上流claimDispatchはclaimed replayでnative dispatchを再実行しないのに、functional designはquestion再描画やdedupe可能なreview再送を要求しており、その分岐を実行するowner/capability contractも未定義である。Action: interaction専用のdelivery/result/terminal commit APIとevent schema、C7のidempotent dispatch・effect照会capability、各crash pointで許可される再送判定を公開契約として閉じる。
- Major | domain-entities.md「UnresolvedInteractionSummary」「関係」、components.md「Public Contract Shape」、services.md「Communication Contracts」、requirements.md FR-04.4／NFR-07 | summaryには主要fieldが追加されたが、上流のexhausted ReserveResultはvalue/cap/文字列reasonしか返さず、summary identity、未解決事項、最終成果物、last progress、next actionをrendererへ渡せない。typed terminationReasonが参照する#1998のversioned unionもpass-list内では定義されず、terminal failureもsummary対象と説明しながら関係表はexhausted interactionだけを1:1としている。question/follow-upで存在しない可能性があるfinalArtifactSetIdのoptional規則もない。Action: kind別のsummary schemaとtermination reason unionを定義し、exhausted/refusal responseまたはquery receiptへsummary IDを含め、exhausted・failed・unavailableそれぞれの生成cardinalityとapproval boundaryへの受渡しを確定する。
