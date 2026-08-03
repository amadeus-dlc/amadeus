# Unit of Work — Codex Duration Bounds

## Upstream Inputs

本Unit分解は `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md` を入力とする。`user-stories` stageはスコープ上SKIPのため、利用者成果とAcceptance Scenarioを `unit-of-work-story-map.md` でstory相当として対応付ける。

## Decomposition Contract

- Unit境界は1 Issue = 1 Unit = 1 Bolt = 1 [Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)。
- 各Unitは対象Issueに必要なcore、影響adapter、決定的test、package/self-install投影、日英documentationを同じ受入境界で完了する。
- 実装は既存Bun/TypeScript modular monolithにembeddedし、独立service、database、daemon、AWS resourceを追加しない。
- `packages/framework/core/` と `packages/framework/harness/<name>/` が正本。`dist/` とself-install treeは生成し、直接編集しない。
- 共通の完了条件はTDDのred/green証跡、影響する7 package面/5 self-install面の整合、`bun scripts/package.ts --check`、`bun run promote:self:check`、適用されるlint/typecheck/testの通過である。

## Unit 1 — execution-observability-baseline

| 項目 | 内容 |
|---|---|
| Issue | [#1602](https://github.com/amadeus-dlc/amadeus/issues/1602) |
| 相対複雑度 | XL |
| Deployment | 既存CLI/hookへembedded。全7 package面と影響する5 self-install面を同期 |
| 直接依存 | なし |
| 主要要件 | FR-01、FR-06、FR-07、FR-08、NFR-03〜06、AC-01、AC-06 |

### Responsibilities

- C1 Execution Contractのroot/child/attempt identity、clock source、measurement quality、availability型を定義する。
- C2 Execution Lifecycle Coordinatorの単一writer境界とaudit-first lifecycleを導入する。後続budget/pool用の未使用APIは先行実装しない。
- C6とC7によりstate/runtime graph/OTelとnative adapter factsを同一ID・durationで相関する。
- 固定workload、observed SHA、harness/model capability、開始・終了条件、duration/attemptを記録するbaselineを作る。

### Boundaries and Constraints

- Stop/retry hard budget、question/review budget、Unit poolの最終policyは所有しない。
- legacy値は `legacy-unknown`、部分取得は `incomplete`、native欠測は `unavailable` として推測しない。
- core内で囲める実行はmonotonic clock、不正wall durationはdurationなしの `invalid` とする。

### Completion Evidence

- resume/compact/Redo、parent/root、duplicate begin/finish、clock異常の決定的test。
- 7 harness capability matrixと影響adapter fixture。欠測はskipではなく期待値とする。
- baseline結果が後続Unitのcontrolとして再利用可能である。

## Unit 2 — convergence-budgets

| 項目 | 内容 |
|---|---|
| Issue | [#1998](https://github.com/amadeus-dlc/amadeus/issues/1998) |
| 相対複雑度 | L |
| Deployment | Stop/continuationと既存retry経路へembedded |
| 直接依存 | `execution-observability-baseline` |
| 主要要件 | FR-02、FR-03、FR-04A、FR-06〜08、NFR-01〜07、AC-02、AC-03 |

### Responsibilities

- C3 Convergence PolicyとC2のatomic reserveにより、Stop continuationとrecoverable retryのhard capを実行前に永続化する。
- `retryClass` / `effectStatus` / `causeCode` / `sourceSurface` のversioned allowlistをcoreが所有する。
- audit noise、resume、compact、worker ID変更でcounterをresetできないことを固定する。
- #1602 baselineと同じworkloadでcontrol/treatmentを比較する。

### Boundaries and Constraints

- 新しい汎用retry subsystemは作らず、Stop/continuationとswarmの既存retry経路だけを対象とする。
- auth/permission/config/validation、canonical write、effect-possible/unknown、未知causeは自動retryしない。
- question/follow-up/reviewへの配線はUnit 3、FIFO/slotはUnit 4の所有とする。

### Completion Evidence

- 全counter kindで再利用する `cap-1` / `cap` / `cap+1` property test。
- allowlistのpositive/negative matrixと、開始前拒否でattemptをmintしないtest。
- terminationがreason、consumed/cap、last durable progress、next actionを保持する。

## Unit 3 — interaction-budgets

| 項目 | 内容 |
|---|---|
| Issue | [#1999](https://github.com/amadeus-dlc/amadeus/issues/1999) |
| 相対複雑度 | M |
| Deployment | orchestratorのquestion/follow-up/reviewer dispatch境界へembedded |
| 直接依存 | `convergence-budgets` |
| 主要要件 | FR-04、FR-04A、FR-06〜08、NFR-01〜03、NFR-07、AC-04 |

### Responsibilities

- C4がprimary question、ambiguity follow-up、review iterationのstable instanceをtyped C2 requestへ変換し、C2がC3を評価してdispatch直前にreserveする。C4はC3を直接importしない。
- `stageInstanceId`、question/follow-up/review instance ID、idempotency keyでresume・再描画・crash replayを同一処理とし、新しい意味上の反復だけを消費する。
- reviewer cap到達後は新しいreviewを始めず、未解決findingを既存approval boundaryへ渡す。

### Boundaries and Constraints

- 人間approvalの授権、gate semantics、questionの内容は変更しない。
- Codex専用gateを追加せず、共有C2/C3契約とharness-native renderingを分離する。

### Completion Evidence

- question/follow-up/reviewそれぞれのcap境界、resume/compact、duplicate rendering、失敗済みdispatchのcounter test。
- #1602/#1998のID・budgetを使い、独自counterやadapter predicateを作らないconformance。

## Unit 4 — bounded-unit-pool

| 項目 | 内容 |
|---|---|
| Issue | [#1919](https://github.com/amadeus-dlc/amadeus/issues/1919) |
| 相対複雑度 | L |
| Deployment | `amadeus-swarm.ts`のreferee/driver境界へembedded |
| 直接依存 | `convergence-budgets` |
| 主要要件 | FR-03、FR-04A、FR-05〜08、NFR-01〜07、AC-03、AC-05 |

### Responsibilities

- C5にimmutable projection/cap/DAG/outcomeからFIFO、active slot、Unit attempt、queue-entry semantics、exactly-once releaseのID非保有proposalを計算する純粋契約を実装する。
- C2の `reserveExecution` と `commitPoolTransition` だけがqueue-entry/sequence/attempt/slot IDをmintし、budget/attempt/slotとsettle/requeue/cancel/terminateを原子的に確定する。
- local terminal failureではtransitive dependentを取消し独立Unitを継続、systemic/unknown failureでは新規dispatchを停止する。
- #1602 baselineと同じworkloadでmaximum active、attempt、queue順、terminationを比較する。

### Boundaries and Constraints

- Unit 3のInteraction Budget Adapterをimportしない。`amadeus-swarm.ts` はUnit 1から成長したC2だけへmutation requestを送り、C2がUnit 2のC3とUnit 4のC5を内部評価する。
- priority queue、動的cap、driver別pool、worker IDでのattempt resetは対象外。

### Completion Evidence

- deterministic FIFO、active不変条件、retry requeue、duplicate settle/release、DAG cancellation、batch resultのmodel/property test。
- native driverはdispatch/result factだけを供給し、pool predicateを複製しないconformance。

## Cross-Unit Acceptance

| 不変条件 | 検証するUnit |
|---|---|
| 相関IDとdurationの正本性 | Unit 1で導入、全Unitで回帰 |
| counter/attemptの単調性 | Unit 2で導入、Unit 3/4で再利用 |
| harness-neutral predicate | 全Unit |
| package/self-install driftなし | 全Unit |
| 固定workload control/treatment | Unit 1がcontrol、Unit 2〜4がtreatment |
| `in-progress` は実着手の1 Issueだけ | 全Unitのdelivery receipt |

4 Unit受入後は統合workloadと4契約の同時成立を検証し、package/promote後にIntentをparkしてfresh Codex sessionからresumeする。これdogfoodでありCodex専用semanticsではない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:24:44Z
- **Iteration:** 1
- **Scope decision:** none

4 Unitの機械可読DAGは構文上有効で、重複・未宣言参照・自己依存・循環はない。Unit名、主要コンポーネント、技術依存、story対応も概ね整合している。一方、実装時の依存方向とqueue identity/stateの所有境界が成果物間で矛盾し、さらにUnits GenerationがDelivery Planningの順序決定を取り込んでいるため、開発者が一意に実装できる状態ではない。

### Findings

- Major | component-dependency.md「Dependency Direction」「Dependency Matrix」「Circular Dependency Prohibitions」、components.md C4、component-methods.md「Interaction Budget Adapter」、unit-of-work.md Unit 3/4 | MermaidではWorkflow engineがConvergence PolicyとBounded Unit Poolへ直接依存する一方、matrixと本文はC2だけがC3/C5を評価すると定義している。またC4はcomponents上「C3のtyped wrapper」だが、公開methodではC2のreserveExecutionを呼ぶ。実装者はEngine/C4からPolicy/Poolを直接importするか、C2経由にするか判断できない。Action: 正準経路を Engine/C4 → C2 → C3/C5 → C2 commit に統一するか、別経路を採るなら単一writer・atomic reserveを維持する具体的境界を全図・matrix・Unit責務へ反映する。
- Major | components.md「C2/C5所有境界」、component-methods.md「Bounded Unit Pool」、unit-of-work.md Unit 4 | C2が全canonical ID採番を所有する一方、C5のdecideInitialEnqueueとUnit 4責務はqueue-entry identityをC5側で生成するよう読める。また「純粋decision」であるacquireNext(batchId, idempotencyKey)にはqueue projection、cap、DAGなど判定入力がなく、snapshot(batchId)はC5が永続状態を読むように見える。hidden I/Oを持たせるか公開契約を変更するか実装者の推測が必要。Action: queue-entry IDのmint主体を一つに固定し、C5へimmutableなpool projection/cap/DAGを入力する純粋関数契約と、C2によるatomic commit・replay receiptの形を明記する。
- Major | unit-of-work-dependency.md「Parallel Development Opportunities」「Rebase and Label Boundary」、stage定義「Units Generation」 | Stage 2.7は技術topologyだけを生成し、実装順・critical pathを決めてはならないが、成果物は実着手順 #1602 → #1998 → #1999 → #1919 とrebase/label運用をDelivery Planningのpolicyとして先取りしている。上流FR-07の制約を参照すること自体は可能だが、本成果物がdelivery sequenceを確定するのはstage責務違反。Action: 本書はDAG、依存理由、技術的並列可能集合に限定し、実着手順と経済的直列化はStage 2.8へ委譲する。FR-07は「Delivery Planningが満たす上流制約」としてのみ参照する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:29:30Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の3件はすべて解消済み。正準経路は Engine/C4 → C2 → C3/C5 に統一され、C5はimmutable projection/cap/DAGを入力とするID非保有の純粋proposal契約、canonical ID採番とatomic commitはC2に一本化されている。Unit dependency成果物はcycle-freeな技術topologyと並列可能集合に限定され、delivery sequence・critical path・rebase・label判断をStage 2.8へ明示的に委譲している。YAML DAGは4 Unitを一意に宣言し、未宣言参照・自己依存・循環がない。新たなblocking矛盾は認められない。

### Findings

- None
