# Business Logic Model — mirror-persistence-propagation

## 目的と上流トレーサビリティ

本設計は U3 `mirror-persistence-propagation` の #1878 修正境界を定義する。`persistBlocked` が `applyTransition` の結果を1回だけ検査し、commit前の失敗を成功へ変換せず、commit後の state／audit／outbox を既存の収束機構へ接続する。

入力は `unit-of-work.md` の U3 境界、`unit-of-work-story-map.md` の SC-05 と Unit 内 acceptance dependency、`requirements.md` の FR-03／FR-04／FR-10／FR-15・NFR-03／05／06／09、`components.md` の R3／R4 責務、`component-methods.md` の `persistBlocked`／`applyTransition` 契約、`services.md` の同期 in-process 実行境界である。公開 `MirrorOperationOutcome`／`MirrorWarning` の variant、新規 service、同期 retry、rollback は追加しない。

## 内部状態モデル

R4へのentryは、今回transitionを作る前に module-internal `OperationPreparationResult` を返す。既存outboxのmaintenanceと今回transitionの結果を同じ型へ混在させない。

| `OperationPreparationResult` | 意味 | 今回transition |
|---|---|---|
| `ready(snapshot)` | 呼出開始時に既存outboxなし | このinvocationで1回だけ評価可能 |
| `maintenance-completed(snapshot)` | prior outboxのappend／clearが完了 | 評価禁止。maintenance-only invocationとして終端 |
| `maintenance-blocked(progress, snapshot, summary)` | prior outboxが `audit-pending | clear-pending` のまま | 評価禁止。maintenance-only invocationとして終端 |

`ready` の後だけ、`applyTransition` は今回operationをR3内部の閉じた `StateResult` へ正規化する。分類はtyped fieldだけで行い、summary prefixや例外messageを解析しない。

| `StateResult` | commitの意味 | `persistBlocked` の公開写像 |
|---|---|---|
| `failed(pre-commit)` | 今回transitionのcommit point未到達 | `stateFailure`、`state-write`、`not-started`、`retryable=false` |
| `failed(durability-unknown)` | rename後directory fsync失敗でdurabilityを確定不能 | `stateFailure`、`state-write`、`outcome-unknown`、`retryable=false` |
| `ok(clean)` | 許可された変更不要でstate writeが発生していない | 元のbusiness `safety-blocked` |
| `ok(outbox-pending)` | 今回business stateとembedded outboxはcommit済み。audit append成否にかかわらずclearは次回maintenanceへ分離 | 元のbusiness `safety-blocked`。次回invocationでmaintenance |

current-transition用の module-internal `StoreMutationResult` は `transition-written`、`transition-unchanged`、`transition-conflict`、`transition-invalid`、`transition-io-failure(phase)` の閉集合だけを持つ。既存outbox maintenanceは `OperationPreparationResult` が所有し、`StoreMutationResult`／`StateResult` へ変換しない。R4 atomic adapterはbusiness state rename前、rename後directory fsync、outbox maintenance writeをtyped fieldで区別する。

## `persistBlocked` 処理フロー

1. R4のpreparationを1回呼ぶ。
2. `ready` の場合だけ `mark-safety-blocked` transitionを構築し、`applyTransition` へ1回渡す。
3. `maintenance-completed` の場合は今回transitionを構築・評価せず、既存 `stateFailure(classification=state-write, effect=not-started, retryable=true)` を内部reason `prior-outbox-maintenance-completed` とともに返す。callerによる後続invocationだけが今回operationを再要求できる。
4. `maintenance-blocked` の場合も今回transitionを構築・評価せず、同じ公開fieldを内部reason `prior-outbox-maintenance-blocked:<progress>` とともに返す。append／clearの違いは内部診断とtest evidenceで保持し、callerの回復操作はどちらも「後続invocation」で統一する。
5. `StateResult.failed(pre-commit)` は `not-started`、`failed(durability-unknown)` は `outcome-unknown` へ写像する。どちらも同一invocation内retryは0回である。
6. `StateResult.ok` だけが元のbusiness `safety-blocked` を返す。

maintenance-only invocationは今回business operationの成功を返さない。`retryable=true` は今回transitionが未開始で、callerが後続invocationを明示的に行えることを示す。公開unionは増やさず、文字列解析を制御に使わない。

## Commit境界別の処理

| 呼出種別／失敗点 | 内部判定 | 副作用契約 | 後続処理 |
|---|---|---|---|
| outboxなし、lock〜rename前 | `failed(pre-commit)` | 呼出開始時からstate／audit／outbox bytes不変 | `not-started`、retryable=false |
| outboxなし、rename後directory fsync | `failed(durability-unknown)` | byte invarianceを主張しない | `outcome-unknown`、retryable=false |
| 今回state commit後audit append失敗または成功 | `ok(outbox-pending)` | commit済みstateと今回outboxを保持。current invocationではclearしない | business outcomeを返し、次回maintenance |
| prior outboxのappend／clear未完了 | `maintenance-blocked` | prior transactionの許可済み収束だけが進み得る。今回transitionは未開始 | `not-started`、retryable=true |
| prior outboxのclear完了 | `maintenance-completed` | prior transactionだけが収束。今回transitionは未開始 | `not-started`、retryable=true |

FR-10の呼出開始時bytes不変は、`ready` から今回transitionへ進むinvocationにそのまま適用する。maintenance-only invocationはprior transactionの収束を所有し、同じinvocationで今回transitionを開始しないため、今回transitionのpre-commit failureとmaintenance副作用を同居させない。

## Outbox収束アルゴリズム

1. 呼出開始snapshotにoutboxがなければ `ready(snapshot)` を返す。
2. outboxがあればtransaction identityを用いてaudit appendを試みる。
3. 同一identityのauditがある場合、digest、revision、operation identity、transition kindを含む全正本field一致時だけ `already-present` とする。
4. identity一致・payload不一致またはappend失敗ならoutboxを保持し、`maintenance-blocked(audit-pending)` を返してinvocationを終える。
5. append済みならrevisionを増やさずoutboxだけをclearする。clear失敗なら `maintenance-blocked(clear-pending)` を返してinvocationを終える。
6. clear成功なら `maintenance-completed(latestSnapshot)` を返してinvocationを終える。今回transitionは評価しない。
7. callerが今回operationを続ける場合は新しいinvocationを開始する。その呼出はoutbox absentの `ready` から始まり、今回transitionを初めて評価する。自動retryは行わない。

この分離により、auditのat-most-once、outboxのeventual clear、呼出開始時bytes不変を同時に満たす。

## データ変換と決定表

| 観測 | 条件 | 制御結果 |
|---|---|---|
| `ready` | outboxなし | 今回transitionを1回評価 |
| `maintenance-blocked` | audit／clear未完了 | `stateFailure(not-started, retryable=true)`、business outcome禁止 |
| `maintenance-completed` | prior outbox clear済み | `stateFailure(not-started, retryable=true)`、business outcome禁止 |
| `transition-io-failure(pre-commit)` | `ready` 後 | `stateFailure(not-started, retryable=false)` |
| `transition-io-failure(durability-unknown)` | `ready` 後 | `stateFailure(outcome-unknown, retryable=false)` |
| `transition-written` | business state＋embedded outboxをatomic commit | 常に`ok(outbox-pending)`。audit append成功時もclearは次回maintenance |
| `transition-unchanged` | non-exclusive／exclusive | `ok(clean)`／`failed(pre-commit)` |
| `transition-conflict` | `persistBlocked` のexclusive transition／その他の既存non-exclusive caller | 本Unitでは即時`failed(pre-commit)`／既存callerだけ1回再評価（本Unitのcall-count対象外） |
| `transition-invalid` | 全mode | `failed(pre-commit)` |

## Acceptanceシナリオ

- `ready` からの各pre-commit failureで `not-started`、元business outcome不返却、呼出開始時からstate／audit／outbox bytes一致を検証する。
- directory fsync失敗で `outcome-unknown` を返し、typed phaseだけで分岐する。
- 今回transitionはbusiness state＋embedded outboxを一回のatomic writeでcommitし、audit appendの成否にかかわらずoutboxを保持してreturnする。後続maintenanceでaudit 1件以下／outbox clearへ収束する。
- prior outboxのappend失敗、append成功後clear失敗、clear成功の3経路すべてで今回transitionの評価回数が0、business outcomeが0、`not-started`／`retryable=true` になる。
- maintenance-only invocationの後、明示的な後続invocationがoutbox absentの `ready` から今回transitionを1回だけ評価する。
- 同一transaction identityでpayload fieldが不一致ならfail-closedでoutboxを保持する。
- consumer／serialization testで公開union不変と `retryable` による回復判断を固定する。

実装はcanonical sourceとfocused failure-injection testを所有する。generated projectionの再生成と全harness drift検証は `repository-adoption` に引き渡す。

## Revision Cycle 2 Resolution

- prior outboxを処理したinvocationは成功・失敗を問わずmaintenance-onlyで終端し、今回transitionを同じinvocationで評価しない。
- maintenance結果は既存 `stateFailure(not-started, retryable=true)` へ写像し、append／clearの進捗は内部reasonとtest evidenceで保持する。公開unionは追加しない。
- 今回transitionへ進むinvocationは呼出開始時にoutbox absentであるため、FR-10のbytes不変をbaselineの読み替えなしで検証できる。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:23:57Z
- **Iteration:** 1
- **Scope decision:** none

commit境界の基本方針は妥当だが、既存outbox処理と現在のtransitionを区別できず偽成功を生む結果型、および上流契約との矛盾が残る。

### Findings

- 既存outboxのdrain未完了と、現在のbusiness transitionがcommit済みでaudit待ちの状態が、同じ `ok(outbox-pending)` に畳まれている。business-logic-modelは既存outboxのappend失敗時に新規transitionを進めない一方、persistBlockedは全ての `ok(outbox-pending)` を現在のbusiness `safety-blocked` へ写像するため、現在のtransitionが未commitでも成功を返し得てBR-05／FR-04に違反する。既存outboxによるblocked／maintenance-completed境界を別の判別値で表し、公開写像とfailure-injection acceptanceを定義する必要がある。
- 既存outboxを正常にdrainした後は「conflict／再read境界を返す」と記載されているが、閉じた4状態の `StateResult` にその結果を表すvariantがない。また同一invocationで再評価するのかcallerへ返すのかも未確定である。drainがaudit／outbox bytesを変更した後に現在のtransitionがpre-commit failureとなれば、FR-10の呼出前後bytes不変とも衝突する。drain専用結果、invocation境界、再評価回数、bytes比較の開始点を一意に定義しなければ実装・テストできない。
- `unchanged` の意味が成果物間で矛盾する。business-logic-modelの決定表はoutboxなしの `written／unchanged` を `ok(clean)` とする一方、business-rulesはexclusive transitionの `conflict／unchanged` をcommit前失敗としている。component-methodsも `WriteOutcome.written` とio-failureしか写像を定義していない。transition種別ごとに全 `WriteOutcome` variantから `StateResult` への閉じた決定表を示さない限り、`unchanged` から偽の `safety-blocked` を返す実装とfailureを返す実装の双方が成立する。
- failure phaseの導出契約が上流と不整合である。component-methodsは `WriteOutcome.io-failure` の `durability-unknown:` prefixを解析してphaseを決めるが、3つのFunctional Design成果物はsummary／message解析を禁止し、atomic adapterのtyped fieldを要求している。内部公開範囲と所有者を含むtyped `WriteOutcome` shapeを定義してcomponent-methodsとの矛盾を解消し、state commitのdirectory fsync失敗とoutbox-clear maintenance writeのfsync失敗を型で区別する必要がある。
- outbox収束は同一transaction identityのauditを見つければ `already-present` としてclearするが、既存auditのdigest、revision、operation identity、transition kindがoutbox payloadと一致しない場合の規則がない。identity衝突または破損時に不一致auditを成功扱いしてoutboxを消すと監査証跡を失う。全フィールド一致時だけ冪等成功とし、不一致はfail-closedでoutboxを保持する規則と受入テストが必要である。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:29:44Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の5件は型と決定表へ反映されたが、既存outbox maintenanceを同一invocationで行う設計が上流のbyte invarianceと公開failure意味を破る。

### Findings

- FR-10はcommit前failure時のstate／audit／outboxを「呼出前bytesと同一」と要求するが、更新後設計は既存outboxを同一invocationでdrainし、`maintenance-completed` 後のsnapshotを新しい比較baselineへ読み替えている。maintenanceでaudit append／outbox clearした後に今回transitionがpre-commit failureとなれば、返却結果は `failed(pre-commit)` なのに呼出前bytesから変化する。AR-09もこの弱いbaselineを検証するため上流要求を満たさない。maintenance完了時はいったん別境界でreturnして次invocationでtransitionを開始するか、呼出前不変条件の例外をrequirementsで明示承認する必要がある。
- `maintenance-blocked(clear-pending)` はprior transactionのaudit appendまで成功してoutbox clearだけ失敗し得るが、公開側では副作用0のcurrent-transition failureと同じ `stateFailure(classification=state-write, effect=not-started, retryable=false)` に畳まれる。公開callerはprior auditが進行済みでoutboxが残る状態を判別できず、`state-write` も実際のaudit／maintenance failure locusと一致しない。既存公開unionを維持するなら、利用可能な既存判別fieldへの正確な写像とcaller recovery契約を定義し、append失敗／append成功後clear失敗それぞれのconsumer・serialization acceptanceを追加するか、maintenanceを今回operationの公開結果境界から分離する必要がある。
