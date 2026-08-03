# コンポーネント設計 — Codex Duration Bounds

## Upstream Inputs

本設計は `requirements.md`、brownfieldの `architecture.md` と `component-inventory.md`、および `team-practices.md` を入力とする。observed SHAは `6d84d06cb`。新しい常駐service、database、AWS resourceは導入せず、既存のBun/TypeScript modular monolithを維持する。

## 設計原則

- policy、ID、counter、termination reason、conformance predicateは `packages/framework/core/` が所有する。
- `packages/framework/harness/<name>/` はnative payloadを共有factへ正規化し、取得不能値を `unavailable` として返す。predicateを複製しない。
- audit eventをdurable正本とし、`amadeus-state.md`、runtime graph、OTelは再構築可能なprojectionとする。
- canonical write failureとstate不整合はfail-closed、advisory hookの不正payloadは観測可能にfail-openとする。
- 1 Issue = 1 Bolt = 1 PR。moduleは最初の実利用時に段階抽出する。

## コンポーネント一覧

| ID | コンポーネント | 責務 | 公開面 | 初回Bolt | 見積り |
|---|---|---|---|---|---:|
| C1 | Execution Contract | operation/attempt identity、parent/root、clock quality、capability、termination reasonの型と純粋predicate | `beginRootProposal`、`beginChildProposal`、`attemptFromConfirmation`、`finishAttempt`、`classifyMeasurement` | #1602 | 本体180–260行、test350–500行 |
| C2 | Execution Lifecycle Coordinator | 全canonical mutationとID採番の単一writer。per-intent lock内のaudit-first begin/atomic reserve/dispatch/interaction/pool transition、projection barrier、idempotency、legacy境界 | `startOperation`、`reserveExecution`、`reserveInteraction`、`claimDispatch`、`confirmDispatch`、`issueStartPermit`、`commitInteractionTransition`、`commitPoolTransition`、`finishOperation` | #1602 | 本体220–320行、test350–550行 |
| C3 | Convergence Policy | Stop continuationとrecoverable retryの非resettable hard budget、共通reserveの純粋判定 | `evaluateBudget`、`classifyRetry`、`terminationForBudget` | #1998 | 本体180–280行、test300–450行 |
| C4 | Interaction Budget Adapter | question/follow-up/reviewのstable instanceをC2のatomic reserve requestへ変換 | typed C2 reserve wrapperのみ | #1999 | 本体80–150行、test200–320行 |
| C5 | Bounded Unit Pool | immutable projection/cap/DAGからFIFO、active slot、Unit attempt、exactly-once releaseの純粋proposalを計算 | `decideInitialEnqueue`、`decideAcquire`、`decideAfterAttempt`、`foldProjection` | #1919 | 本体220–340行、test350–550行 |
| C6 | Execution Projections | auditからstate/runtime graph/OTelへ同一ID・duration・reasonを投影し、必須projection receiptを返す | `projectRequired`、`projectTelemetry`、`rebuildRequired` | #1602以降 | 既存面差分180–300行、test300–500行 |
| C7 | Harness Capability Adapters | native factの正規化とavailability宣言、許可済みdispatch／interaction／取消、およびeffect照会 | `dispatch`、`queryDispatchEffect`、`deliverInteraction`、`queryInteractionEffect`、`requestCancellation`、`queryCancellation` | #1602以降 | 各面20–100行、test各50–180行 |
| C8 | Distribution Conformance | 7 package面、5 self-install面、docs/testのdrift阻止 | package/check既存command | 各Bolt | test/fixture150–300行 |

見積りはUnits Generationで再測定する。既存の `amadeus-stop.ts` 1,095行、`amadeus-orchestrate.ts` 5,444行、`amadeus-swarm.ts` 914行へpolicyを直書きせず、変更理由を凝集した狭いcore APIへ抽出する。

## 所有境界

### C1/C2 — Execution ContractとLifecycle

- root operationはstage instance。agent/tool invocationはchild operation。
- resume、compact、process restartは同じrootを保持する。明示Redo、terminal後の再実行、rejected revisionは新rootをmintし、`supersedes_operation_id`を持つ。
- attempt IDはC2がnative dispatch前のatomic reserve event内でmintする。C1は`confirmDispatch`のcommitted receiptからAttemptStartを構築するだけで採番しない。reservation消費時刻、claim取得時刻、native受付時刻、実開始時刻を別factとし、開始前拒否はattemptを増やさないがcommit済みreservationはnative未開始でもbudgetを消費する。
- native開始はcanonical reserve eventに対するstate/runtimeの必須projection receiptをC2が検証して発行する`StartPermit`を必要とする。OTelはbarrier外である。projection失敗時は同じsinkを再帰的に通さず`projection-blocked`をauditへ直接記録し、rebuild後に同じkeyでpermitを再評価する。
- `claimDispatch`はdispatch所有権だけを`reserved→claimed`へ遷移させる。native handle受付後に`confirmDispatch`が`dispatch-confirmed`、`nativeAcceptedAt`、利用可能なら`startedAt`をcommitする。claim後crashはC7のeffect照会で`no-effect-confirmed`だけを`dispatch-not-started`へ閉じ、`effect-possible | unknown`は`dispatch-effect-unknown`へ安全終端する。
- core内で囲める区間はmonotonic clockを必須とする。native adapterは `native-monotonic | native-wall | unavailable` を返し、wall clock逆行は `invalid` とする。
- legacy recordの過去値を推測しない。更新後最初のexecution boundaryで新rootを開始し、移行前の値は `legacy-unknown`、一部だけ取得済みなら `incomplete`、native取得不能なら `unavailable` として区別する。

### C3/C4 — Convergence Policy

- C3は副作用を持たず、`current < cap` ならreserve可能というdecisionを返す。C2だけが同一lock内でprojection読取、C3判定、reserve event appendを行い、処理開始を許可する。
- `current == cap` の次要求は開始せず、counterをcapのまま保ってtyped terminationを返す。
- counter kindは `stop-continuation`、`recoverable-retry`、`question`、`follow-up`、`review`、`unit-attempt`。active slotは別のcapacity resourceだが同じreserve規則を使う。
- retry allowlistはcore schemaで管理し、adapterは `retry_class`、`effect_status`、`cause_code`、`source_surface` の4fieldだけを正規化する。再試行可否はcoreのversioned allowlistだけが決める。

### C5 — Bounded Unit Pool

- queue順はqueue-entry sequenceによるFIFO。`queue_entry_id` は `unit_id` と別identityであり、initial entryとretry entryを区別する。queuedはactiveへ数えない。
- slotはUnit attempt開始前に取得し、success/failure/cancelのどれでも一度だけ解放する。
- retryは同じUnit identityでattemptを消費しつつ、新しいqueue-entry identityを持つ。sessionやworker IDの変更で上限を回避できない。
- pool stateの正本もaudit event列である。C2がauditからimmutable projectionを作り、capとDAGを添えてC5へ渡す。C5はinitial enqueue、acquire、settle+release、retry requeue、dependency cancellation、batch terminationの純粋proposalを返し、canonical IDを採番せずI/Oも行わない。
- C2だけがproposal受理後に `queue_entry_id`、sequence、slot ID、attempt IDをmintする。`commitPoolTransition` はstate transitionとqueue-entry IDを1 transactionで確定し、worker開始時は `reserveExecution` がbudget、attempt、slotを同時確定する。`amadeus-swarm.ts` はC2だけへmutation requestを送る。

## Harness Adapter Inventory

package正本の7面を全数分類した。全7面が共有CLIまたはhook lifecycleを通じてFR-01〜FR-05のfield/APIへ触れるため「影響あり」。未分類は0。native factがない面は明示的 `unavailable` capabilityでconformanceする。

| Package面 | Owner path | 影響 | Native capabilityと制約 | Blocking conformance |
|---|---|---|---|---|
| Claude | `packages/framework/harness/claude/settings.json.example`、`manifest.ts` | あり | core hookを直接起動。SessionStart/End、Stop、tool/subagent lifecycleあり。model/versionは未供給ならunavailable | shared hook fixture、package drift |
| Codex | `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts`、`amadeus-codex-hook-runtime.ts` | あり | StopとPostCompactあり。SessionEndはnative不在で次回start時にinferred。model/versionは未供給ならunavailable | adapter fixture、shared predicate、package/self-install drift |
| Cursor | `packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts`、`amadeus-cursor-adapter.ts` | あり | documented dedicated eventsだけ正規化。Stop blockはadvisory、未登録tool identityはunavailable | adapter fixture、package/self-install drift |
| Kiro CLI | `packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts`、`amadeus-kiro-hook-runtime.ts` | あり | `stop_hook_active` とtranscript不在、resume sourceに制約。取得不能factはunavailable | CLI fixture、package drift |
| Kiro IDE | `packages/framework/harness/kiro-ide/hooks/*`、`manifest.ts` | あり | Kiro共通adapter、`.kiro.hook` wiring。CLIとの差はwiring capability | IDE fixture、package drift |
| OpenCode | `packages/framework/harness/opencode/plugin/amadeus-opencode-plugin.ts`、`lib/amadeus-opencode-vocab.ts`、`manifest.ts` | あり | stdin adapterなし。prompt pluginと共有CLIのみ。native Stop/session/tool factsの非提供部分はunavailable | plugin fixture、package/self-install drift |
| Kimi | `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts`、`amadeus-kimi-adapter.ts` | あり | content-block prompt、path別名、TodoList、role lifecycleを正規化。曖昧なStopはno-op capability | adapter fixture、package/self-install drift |

`kiro` と `kiro-ide` は同じ `.kiro` harness typeを共有しても、package/wiring面が別なので別行でconformanceする。Codex専用blocking gateは追加しない。Codex固有の再現可能なnative lifecycle欠陥が共有factへ写像不能と判明した場合だけ、別ADRとred testを要求する。

## Public Contract Shape

```ts
type Fact<T> =
  | { state: "available"; value: T }
  | { state: "unavailable"; reason: string }
  | { state: "legacy-unknown" }
  | { state: "incomplete"; value?: Partial<T>; missing: string[] };

type ClockSource = "core-monotonic" | "native-monotonic" | "native-wall";
type MeasurementQuality = "monotonic" | "wall-fallback" | "invalid";

interface DurationMeasurement {
  clockSource: Fact<ClockSource>;
  measurementQuality: MeasurementQuality;
  durationMs?: number;
  measurementError?: string;
}

interface ExecutionIdentity {
  operationId: string;
  rootOperationId: string;
  parentOperationId?: string;
  supersedesOperationId?: string;
  attemptId?: string;
}

interface ReserveRequest {
  rootOperationId: string;
  kind: "stop-continuation" | "recoverable-retry" | "question" | "follow-up" | "review" | "unit-attempt";
  subjectId: string;
  idempotencyKey: string;
  cap: number;
}

type TerminationReasonCodeV1 =
  | "budget-exhausted" | "retry-not-allowlisted" | "retry-effect-unknown"
  | "retry-policy-version-unknown" | "budget-policy-mismatch"
  | "dispatch-effect-unknown" | "state-inconsistent" | "canonical-write-failed";

interface TerminationReasonV1 {
  schemaVersion: 1;
  reasonCode: TerminationReasonCodeV1;
  budget: Fact<{ consumed: number; cap: number }>;
  lastDurableProgress: string;
  recommendedNextAction: string;
  rootOperationId: string;
}

type ReserveResult =
  | { kind: "reserved"; receiptId: string; value: number; cap: number; attemptId?: string; slotId?: string; dispatchState: "reserved" | "claimed" | "dispatch-confirmed" | "terminal" }
  | { kind: "exhausted"; value: number; cap: number; termination: TerminationReasonV1; summaryId?: string };

type ExecutionRefusal =
  | { kind: "canonical-write-failed"; persisted: false; termination: TerminationReasonV1 }
  | { kind: "state-inconsistent" | "invalid-request"; persisted: boolean; termination: TerminationReasonV1 };

type InteractionKeyMaterial =
  | { kind: "question"; intentUuid: string; stageInstanceId: string; stageRevision: number; questionCatalogId: string }
  | { kind: "follow-up"; parentInteractionId: string; ambiguityKey: string; ordinal: number }
  | { kind: "review"; stageInstanceId: string; stageRevision: number; artifactSetId: string; ordinal: number };

type RetryClassification =
  | { kind: "retryable"; ruleId: "RR-V1-WSU-DISPATCH" | "RR-V1-WSU-WORKER-START" | "RR-V1-ROPT-STOP" | "RR-V1-ROPT-RESULT"; version: 1 }
  | { kind: "non-retryable"; reasonCode: "retry-not-allowlisted" }
  | { kind: "unsafe-unknown"; reasonCode: "retry-policy-version-unknown" | "retry-effect-unknown" };
```

全projectionは `Fact<T>`、`clockSource`、`measurementQuality` を別fieldのまま保持する。clock source不明、片側時刻欠落、wall逆行は `measurementQuality=invalid`、durationなし、`measurementError`ありとする。C2がsemantic ordinalとcanonical IDを同じlock内で確定する。idempotency fingerprintは意味入力、outcome、reasonを含み、観測時刻と計算済みdurationを除外するため、finish retryは最初にcommit済みのmeasurementを再利用する。

poolのinitial順序はKahn法のtopological layer順、同一layer内は既存`unitId`のUTF-8 bytewise昇順とする。追加の`planOrder`は要求しない。canonical `UnitOutcome`は`succeeded | failed | cancelled | dependency-unsatisfied | batch-unsafe | dispatch-not-started | dispatch-effect-unknown | worker-unresponsive | cancel-unconfirmed`だけを使う。Issueの着地順 #1602→#1998→#1999→#1919 はdelivery policyであり、poolのtie-breakerへ混入させない。

## Security and Compliance

- IDはUUIDv7等のopaque値とし、prompt、回答、credential、path本文を埋め込まない。
- telemetryにはID、duration、counter、reason、availabilityだけを載せ、既存redactionを通す。
- adapterのunknown inputはcapability unavailableまたは既存advisory dropへ落とし、権限やcanonical writeを自動retryしない。
- 外部service、個人データstore、network egressは追加しないため、新規AWS/compliance controlはN/A。ただしaudit retentionと既存repository access controlは維持する。

## Traceability

| Component | Requirements | Issue |
|---|---|---|
| C1/C2/C6/C7/C8 | FR-01、FR-06、FR-08、NFR-03〜06 | #1602 |
| C3 | FR-02、FR-03、FR-04A、NFR-01〜02、NFR-07 | #1998 |
| C4 | FR-04、FR-04A | #1999 |
| C5 | FR-05、FR-04A | #1919 |
| 全体 | FR-07、FR-08 | #1602→#1998→#1999→#1919 |


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:01:37Z
- **Iteration:** 1
- **Scope decision:** none

modular monolith維持、7 package面／5 self-install面のinventory、共有core優先、Codex専用gateを原則禁止する判断は妥当である。しかし、正準schemaが要件と不一致であり、atomic reserveのwriter境界が成果物間で矛盾し、Unit失敗後の決定的継続policyも未確定であるため、開発者が一意に実装できない。

### Findings

- Major | components.md Public Contract Shape／component-methods.md Execution Contract／requirements.md FR-01.8〜10 | Availabilityが要件のlegacy-unknownと不完全状態を表現せず、MeasurementQualityは要件上直交するclock_sourceとmeasurement_qualityを単一enumへ混同している。要件準拠の独立fieldと状態unionへ修正し、全projection contractへ反映すること。
- Major | component-methods.md Convergence Policy／requirements.md FR-03.2〜4 | RetryFactsが正準schemaのretry_classとsource_surfaceを欠き、別語彙を採用している。retry_class、effect_status、cause_code、source_surfaceをそのまま共有contractとして定義し、versioned allowlistへ接続すること。
- Major | components.md C2/C3／component-methods.md Lifecycle・Policy／services.md Orchestration Pattern／component-dependency.md Dependency Direction | atomic reserveのcanonical writerが矛盾している。Budget、attempt、pool slotを同一lockで原子的に確定する単一writer境界を選び、reserve receipt/idempotency keyを型に含め、sequence・matrix・methodを統一すること。
- Major | requirements.md FR-05.5・Deferred Decisions 4／component-methods.md Bounded Unit Pool／services.md Bounded swarm | Unit attempt budget超過後に残りのqueued Unitを継続するか停止するかの決定的policyが未定義である。失敗種別・依存DAG・batch状態に基づく継続判定表、batch-level termination結果、queueへ与える作用を公開contractへ追加すること。
- Major | component-methods.md Interaction Budget Adapter／requirements.md FR-04.2〜4・NFR-02 | question/follow-up/review methodに表示／dispatch単位のidempotency keyがなく、同一処理の再送と新iterationを区別できない。安定したsubject/iteration identityと既存receipt再取得の契約を明記すること。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:05:15Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の指摘のうち、Fact<T>、retry schema、Unit失敗後policy、interaction idempotencyは公開method上ほぼ解消された。しかし、ADRと所有境界に旧契約が残り、attempt採番・receipt消費の責務が二重化し、単一writer方針に対するpool mutation APIも閉じていない。実装者がtransaction境界と正準語彙を推測する必要があるためREADYではない。

### Findings

- Major | components.md C1/C2所有境界・Public Contract Shape／decisions.md ADR-04・ADR-05 | 旧legacy/unavailable語彙とcause/effect記述を、legacy-unknown/incompleteおよびretryClass/effectStatus/causeCode/sourceSurfaceへ統一すること。
- Major | component-methods.md Execution Contract・Execution Lifecycle Coordinator／components.md ReserveResult | attempt ID採番とreceipt消費責務をC2のlock内commitへ一本化し、C1はreceiptからAttemptStartを構築する純粋処理にすること。
- Major | component-methods.md Bounded Unit Pool／component-dependency.md／services.md | queue-entry identityをUnit identityから分離し、initial enqueue/requeue/settle+release/dependency cancellation/batch terminationをC2のtyped writer APIとidempotency規則で原子的にcommitできるよう閉じること。

## Review Reconciliation

2026-08-02T04:11:08Z にiteration 2の3指摘を以下のとおり整合した。reviewerの上限2回に達したため追加reviewは行わず、required-sections、upstream-coverage、answer-evidence、成果物横断scanで検証する。

- legacyの正準状態を `legacy-unknown` / `incomplete` / `unavailable`に統一し、retry factを `retryClass` / `effectStatus` / `causeCode` / `sourceSurface` に統一した。
- attempt IDのmintとdispatch claimをC2のatomic commitに一本化し、C1はcommitted receiptからAttemptStartを構築する純粋変換とした。
- `queue_entry_id` を `unit_id` から分離し、C5の全状態遷移をC2の `commitPoolTransition` だけが永続化する閉じたwriter契約にした。
