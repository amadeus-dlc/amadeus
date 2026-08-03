# Domain Entities — interaction-budgets

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## モデル根拠

`unit-of-work`／`unit-of-work-story-map` の #1999 scope、`requirements` FR-04、`components` C2／C4、`component-methods` のreserve wrapper、`services` の共通renderer契約を正とする。

## Entity と Value Object

### InteractionInstance

stage instance内の意味上の1 interaction。`interactionInstanceId`、`stageInstanceId`、`stageRevision`、`kind`、`semanticKey`、`deliveryKey`、`status`を持つ。kindは`question | follow-up | review`、statusは`planned | reserved | claimed | delivered | dispatched | resolved | failed | unavailable | cancelled | exhausted`。

### InteractionReservation

#1998のExecutionReservationをinteraction用に参照するentity。`interactionInstanceId`、`reservationId`、`receiptId`、`idempotencyKey`、`counterValue`、`cap`、`configVersion`、`configDigest`を持つ。canonical ownerはC2であり、C4は保持しない。

### QuestionInstance

InteractionInstanceのquestion subtype。`questionCatalogId`、identity tuple digest、対象decisionを持つ。prompt本文はcanonical identityやtelemetryへ保存しない。

### FollowUpInstance

解消対象の`ambiguityKey`、`followUpOrdinal`、元interactionへの参照を持つ。別の曖昧点だけが別instanceとなる。

### ReviewIteration

`reviewIterationId`、`artifactSetId`、`ordinal`、`dispatchEvidence`、`verdict`、`findings`を持つ。verdictは`ready | not-ready | unavailable | failed`。`unavailable`は親InteractionInstanceの`unavailable`、`failed`は`failed`へ対応する。NOT-READY後の次dispatchは新entityであり、同じiterationのreplayではない。

### ArtifactSet

review対象のimmutable value object。`artifactSetId`、`stageRevision`、sorted artifact path、各content digestを持つ。artifact変更時は新IDとなり、同じiterationへ異なるsetを流用しない。

### DeliveryEvidence

`interactionInstanceId`、`deliveryKey`、`nativeDeliveryId: Fact<string>`、`deliveredAtFact`、`effectStatus`を持つ。question／follow-upの重複表示は同じdeliveryKeyへ集約し、reviewのeffect unknownはunavailableを導く。

### UnresolvedInteractionSummary

cap到達またはterminal failure時にapproval boundaryへ渡すdurable entity。`summaryId`、`interactionInstanceId`、`stageInstanceId`、`stageRevision`、`kind`、`budget: Fact<{consumed,cap}>`、`termination: TerminationReasonV1`、kind別artifact参照、`unresolvedItems`、`lastDurableProgress`、`recommendedNextAction`を持つ。question/follow-upは`finalArtifactRefs`／`finalArtifactSetId`ともoptional、reviewは`finalArtifactSetId`必須でrefsは0件以上とする。

## 関係

| Parent | Relation | Child | Constraint |
|---|---|---|---|
| StageInstance | 1:N | InteractionInstance | semantic keyはstage内で安定 |
| InteractionInstance | 0..1:1 | InteractionReservation | planned／exhausted-before-reserveはreservationなし |
| QuestionInstance | 0:N | FollowUpInstance | ambiguity keyで重複を防止 |
| ArtifactSet | 0:N | ReviewIteration | ordinalは単調増加 |
| exhausted／failed／unavailable interaction | 1:1 | UnresolvedInteractionSummary | ReserveResultまたはtransition receiptのsummaryIdで既存approval boundaryへ渡す |
| InteractionInstance | 0:N | DeliveryEvidence | 同じdeliveryKeyへ集約 |

## Lifecycle 不変条件

- `planned→reserved→claimed→delivered|dispatched→resolved`を通常経路とする。
- reserve拒否時は`planned→exhausted`で、claimedへ進まない。
- claimed後のrender／reviewer失敗は消費済みとして`failed`、effect unknown／capability欠落は`unavailable`へ終端する。
- resumeは同じentityとreservationを復元する。
- 新しい意味判断だけを新entityとし、表示差分はidentityを変えない。
- resolved／failed／unavailable／cancelled／exhaustedはterminalで、reopenしない。
- key materialからのresolve-or-createとbudget reserveはC2の同じlockで行い、instance IDをC4が事前採番しない。
- delivery、answer、review result、failed、unavailable、cancel、exhaustはC2のclosed transition commandでのみcommitする。

## Revision 1 Reconciliation

summaryのkind別optional規則とterminal cardinality、C2のatomic identity/reserve、transition receiptからのsummary参照を追加し、上流ReserveResultへ接続した。

## Harness 中立性

domain entityはCodex／Claude等のnative question形式を持たない。harness capabilityとrendererが同じInteractionInstanceを固有UIへ投影する。共有coreで表現不能な事実はavailabilityとして保持し、別gate entityを作らない。
