# Performance Design — intent-autonomy-runtime

## 入力と性能オラクル

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceであり、時間・費用SLOを追加しない。

性能オラクルは、interactionごとにcurrent Intent projection、compiled policy / norm / effect registryをbounded lookupし、全audit履歴や全過去裁定をscanしないこと、same parked conditionでLLM / election / recommendationを0回にすることである。

## Projectionとindex

M07はcurrent mode、current grant、active policy digest、workflow state、legacy diagnostic、last projection revisionをIntent単位へ投影する。grant / policyの履歴はcanonical auditへ残すが、hot pathはcurrent pointerとcontent identity indexだけを読む。

suspended projectionはreason、resume condition fingerprint、nullable latch identityを含むcommit済みpark envelopeへの1参照を持つ。same-fingerprint再起動はこの参照のexact comparisonだけで判定し、過去のpark履歴や全auditをscanしない。

DecisionPolicyはselector / scope / option ruleのcompiled indexを持ち、question occurrenceのcanonical selectorから候補だけを取得する。norm / historyはscope lineage、selector、norm fingerprintが一致するindexed factだけを評価し、自由文検索や類似度検索を使わない。

`DecisionOptionEffectRegistry`はoption ID + registry revisionのexact lookupでeffect schemaを返す。unknown option、payload mismatch、norm driftはfull scanへfallbackせずhuman / conflict routeへ閉じる。

## Decision-chain cost control

confirmed policyが一意ならelection / recommendationを呼ばない。norm / historyが一意なら後段を呼ばない。solo electionはcapability available時だけ、agent recommendationはcapability unavailable時だけ1回呼ぶ。複数手段を並列に起動して後から選ばない。

gateはnone / semi / fullのmode tableとoccurrence classificationだけで判定し、question chainへ送らない。semi gateとgrant gateはreview queueへ投影しないため、completed review用indexを増やさない。

## Verification

policy / norm / history件数、parked再起動、legacy record件数、harness cohortを増やし、current interactionのread setが該当Intent / selector / registry revisionに限定されることを検査する。parked同一fingerprintでdecision-chain invocation 0、policy hitでelection / recommendation 0を要求する。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:30:35Z
- **Iteration:** 1
- **Scope decision:** none

mode/grant authority、legacy standing grantの非権威化、effect safety、grant exercise、terminal failure、per-Intent isolationは実装可能に閉じており、具体的な循環依存もない。一方、park開始時のreason・resume condition・workflow suspended状態を原子的に公開する契約が欠落している。

### Findings

- BLOCKER | park開始のatomic contractが定義されていない。`reliability-design.md`と`business-logic-model.md`はresume時のcondition satisfaction・optional latch clear・`WORKFLOW_UNPARKED`を同一transactionにする一方、`AWAITING_HUMAN`、`REPAIR_STALLED`、`NORM_CONFLICT`、`USER_PARKED`への遷移時に、park reason、closed resume condition、optional Monitor latch、`workflow_execution_state=suspended`を同一canonical transactionでcommitする規則がない。crash境界でreasonだけ存在する状態またはsuspendedだが再開条件がない状態を実装上排除できず、same-fingerprint再起動の外部decision 0件も保証できない。park開始event plan、transaction identity、replay時の合法状態を明記する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:32:41Z
- **Iteration:** 2
- **Scope decision:** none

反復1のBLOCKERは解消済み。`ParkTransitionPlan`がreason、closed resume condition、nullable latch、mode/grant、expected revisionを一体化し、M07の単一transactionでpark envelopeとsuspended projectionを公開する。部分状態は`ILLEGAL_STATE`へ閉じられ、crash/replay時にも自動decisionを再開しない。mode/grant authority、legacy grant非権威化、effect safety、exercise・park・failureのatomicity、per-Intent isolationは実装可能かつ相互整合しており、具体的な循環依存はない。

### Findings

- None
