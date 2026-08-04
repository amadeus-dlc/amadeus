# Scalability Design — loop-monitor-runtime

## 入力とscaling unit

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。分散サービスやauto-scaling infrastructureは導入せず、短命CLI / per-clone auditモデルの内側で水平なpartitionabilityを確保する。

scaling unitは`Intent UUID + Monitor ID + stage instance + graph revision`である。epochはcausal chainのpartition境界にせず、自然退出後も`chainHeadDeliveryId`を引き継ぐ。

## Partitioningとclone収束

各cloneは自身のMonitor関連event partitionへappendし、cross-clone global sequence allocatorを置かない。同一identity / payloadはmerge時に1件へ畳み込み、同じpredecessorの異なるsuccessorはclone順で直列化せずfork `CONFLICT`とする。

この方式はclone数を増やしても単一coordinatorを要求しない。収束はcontent identityとcausal predecessorだけで決まり、wall clock、shard path、arrival orderを使わない。別Intentまたは別graph revisionのpartitionは独立にreplayできる。

## Capacity limits

`CompiledMonitor.runtimeLimits.maxPendingDeliveries`はCore compile policyが決め、harnessごとの差替えを許さない。上限到達後はpayload drop、best-effort継続、追加Judgeを禁止して`INCOMPLETE`へparkする。

Monitor数の増加は対象workflow eventにbindingされたMonitorだけへfan-outする。全Monitor / 全audit shardの無条件scanをhot pathへ置かない。checkpointとper-partition replay indexによりresume workをactive Monitor関連eventへ限定する。

## Evolutionと検証

manifest、provider schema、route rule、graph revisionの変更は新しいcompiled revisionを生成する。異revisionを同一projectionへ追記せず、旧revisionのaudit factはimmutableに保持する。将来のharness追加はM09 registry contributionで行い、Loop Monitor Coreの分岐を増やさない。

検証は2 clone以上の同一delivery収束、異successor conflict、successor-before-predecessor、複数Intent isolation、epoch境界のchain継承、pending上限、graph revision isolationを含む。同じinput setはclone数と到着順にかかわらず同じprojectionまたは同じtyped conflictへ収束しなければならない。
