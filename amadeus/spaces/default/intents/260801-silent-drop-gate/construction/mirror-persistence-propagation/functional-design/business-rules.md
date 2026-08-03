# Business Rules — mirror-persistence-propagation

## 適用範囲と上流トレーサビリティ

本規則は `unit-of-work.md` の U3、`unit-of-work-story-map.md` の SC-05、`requirements.md` の FR-03／04／10／15 と NFR-03／05／06／09、`components.md` の R3 Mirror Executor／R4 Mirror State Store、`component-methods.md` の failure mapping、`services.md` の既存 Amadeus Runtime Commands に適用する。

対象は `persistBlocked`、`applyTransition`、`stateFailure`、既存 transactional outbox の局所変更だけである。新しい `MirrorOperationOutcome`／`MirrorWarning` variant、daemon、queue、database、rollback、同期retryは対象外とする。

## 必須不変条件

| ID | 規則 | 検証可能な不変条件 |
|---|---|---|
| BR-01 | `persistBlocked` は `applyTransition` の結果を破棄してはならない | `ready` ならcall countは1、maintenanceなら0。生成された全 `StateResult` variantをexhaustiveに処理する |
| BR-02 | commit前失敗をbusiness成功に変換してはならない | `failed(pre-commit)` は必ず `stateFailure`、`effect=not-started` |
| BR-03 | durability不明をcommit前失敗へ畳んではならない | `failed(durability-unknown)` は必ず `stateFailure`、`effect=outcome-unknown` |
| BR-04 | failure phaseを文字列から推測してはならない | 分岐はtyped discriminantだけを使い、summaryは診断専用 |
| BR-05 | business `safety-blocked` は今回transitionがcommit済みの場合だけ返す | 今回transition由来の `ok(clean)` または `ok(outbox-pending)` のみが返却可能。既存outbox maintenanceは含めない |
| BR-06 | 今回transitionのcommit前失敗で永続bytesを変えてはならない | `ready` からtransitionへ進むinvocationの呼出開始時とreturn時でstate／audit／outbox bytesが一致する |
| BR-07 | commit後にbusiness stateをrollbackしてはならない | audit／clear失敗後もcommit済みrevisionとoutboxを保持する |
| BR-08 | prior outbox maintenanceと今回transitionを同一invocationで行ってはならない | maintenance completed／blockedのどちらも今回transition評価0回で終端。I/O failure後の再試行上限も0 |
| BR-09 | auditを重複appendしてはならない | transaction identityごとのaudit recordは最大1件 |
| BR-10 | stale outboxを破棄してはならない | append／clear失敗後も次回drain可能な完全なoutboxを保持する |
| BR-11 | 公開unionを拡張してはならない |既存 `MirrorOperationOutcome`／`MirrorWarning` variant集合が不変 |
| BR-12 | generated projectionを直接編集してはならない | canonical sourceからのみ再生成し、distribution検証へ引き渡す |
| BR-13 | 既存outbox maintenanceを今回transitionの成功へ写像してはならない | completed／blockedとも既存 `stateFailure(not-started, retryable=true)` を返し、後続invocationだけが今回transitionを開始する |
| BR-14 | audit identity一致だけで冪等成功としてはならない | digest、revision、operation identity、transition kindを含む全正本field一致時だけ `already-present` |

## 結果写像規則

| 条件 | 公開 outcome | warning classification | warning effect | retryable |
|---|---|---|---|---|
| `failed(pre-commit)` | `safety-blocked`形状の既存 `stateFailure` | `state-write` | `not-started` | `false` |
| `failed(durability-unknown)` | `safety-blocked`形状の既存 `stateFailure` | `state-write` | `outcome-unknown` | `false` |
| `ok(clean)` | 元のbusiness `safety-blocked` | 元のclassification | 元のeffect | 元の契約を維持 |
| `ok(outbox-pending)` | 元のbusiness `safety-blocked` | 元のclassification | 元のeffect | 元の契約を維持 |
| `maintenance-blocked` | 既存 `stateFailure` | `state-write` | `not-started` | `true` |
| `maintenance-completed` | 既存 `stateFailure` | `state-write` | `not-started` | `true` |

`failed` の2行は今回transitionのstate persistence failureであり、`ok` の2行だけがcommit済みbusiness outcomeを返す。maintenanceの2行はR4 entryの準備結果であり、`classification=state-write` は既存公開contract上のpersistence preparation failure、`effect=not-started` は今回transition未開始、`retryable=true` は後続invocation可能を表す。

この表の `ok(outbox-pending)` は今回transitionが生成したoutboxだけを指す。maintenanceの2行は current-transition `StateResult` を生成せず、内部reasonで `completed | blocked(audit-pending | clear-pending)` を保持する。公開callerの回復操作はどちらも明示的な後続invocationであり、文字列解析は不要である。

## R4→R3 内部結果規則

R4 entryは最初に module-internal `OperationPreparationResult` の `ready(snapshot) | maintenance-blocked(progress, snapshot, summary) | maintenance-completed(snapshot)` を返す。`progress` は `audit-pending | clear-pending` の閉集合とする。`ready` の後だけ、current-transition用 `StoreMutationResult` の `transition-written | transition-unchanged | transition-conflict | transition-invalid | transition-io-failure(phase)` を生成する。`phase` は `pre-commit | durability-unknown` である。

- `durability-unknown:` などのsummary prefixは診断互換のため残してもよいが、分岐の正本にしてはならない。
- business state rename後directory fsync失敗だけを `transition-io-failure(durability-unknown)` とする。
- outbox clear maintenance writeのfsync失敗は今回business transitionのdurability不明ではなく `maintenance-blocked(clear-pending)` とする。
- `maintenance-blocked`／`maintenance-completed` は今回transitionを評価せず、そのinvocationを `stateFailure(not-started, retryable=true)` で終える。
- callerが続行する場合は自動retryではなく新しいinvocationを開始し、outbox absentの `ready` から今回transitionを初めて1回評価する。
- non-exclusive `transition-conflict` は既存契約どおりlatest snapshotから1回再評価できる。exclusive、または2回目の競合は `failed(pre-commit)` とする。
- `transition-unchanged` はnon-exclusiveなら `ok(clean)`、exclusiveな `persistBlocked` なら `failed(pre-commit)` とする。

## Validation規則

1. `OperationPreparationResult` と `StateResult` は別の閉集合であり、maintenance結果を `StateResult.failed` へ変換してはならない。
2. `failed` は非空summaryを持つ。ただしsummaryの内容は分岐結果へ影響しない。
3. `ok` はstoreが返したsnapshotを持ち、`commit=outbox-pending` のsnapshotには完全なoutboxが存在しなければならない。
4. `commit=clean` のsnapshotにはpending outboxが存在してはならない。
5. outboxは非空のtransaction identity、digest、audit fieldsを持ち、business stateと同じatomic state commitで永続化されなければならない。
6. outbox clearはrevision-invariantなmaintenance writeであり、business transitionを再適用してはならない。
7. `persistBlocked` が受け取るreceiptにはoperation identityが存在し、business warningとoutboxが同じidentityへ結合されなければならない。
8. `already-present` の判定はtransaction identityだけでなく、digest、revision、operation identity、transition kindを含むoutbox正本fieldの完全一致を要求する。

## Commit境界ポリシー

### Commit前

- lock、read、parse、conflict、reduce、render／reparse、atomic writeのrename前で失敗した場合は `pre-commit` とする。
- state、audit、outboxへ新しいbytesやworkflow auditを残さない。
- 元のbusiness `safety-blocked` を返さず、callerへ `not-started` を伝える。

### Durability不明

- rename成功後のdirectory fsync失敗だけを `durability-unknown` とする。
- old／newのどちらがdurableかを現在のinvocationで推測しない。
- `outcome-unknown` を返し、次回read／recoveryで整合状態を確認する。

### Commit後

- audit append失敗ではbusiness stateとoutboxを保持する。
- audit append成功後のoutbox clear失敗ではauditとstale outboxを保持する。
- 次回drainはtransaction identityと全正本fieldで既存auditを検証し、完全一致時だけ重複appendせずclearへ収束する。
- pending状態を理由にrollbackや同期retryを行わない。

## 例外・競合・境界条件

- 既存CAS conflict recoveryは最新snapshotをreadして1回再評価する既存 `applyTransition` 契約として維持する。これはI/O失敗の同期retryとは区別する。
- exclusive transitionのconflict／unchangedはcommit前失敗、non-exclusive unchangedだけは `ok(clean)` であり、mode別決定を入れ替えない。
- pre-existing outboxがある場合はmaintenance-only invocationとし、新規transitionを構築・評価せず、business outcomeも返さない。
- maintenance完了後も同じinvocationでは今回transitionへ進まない。後続invocationはoutbox absentの呼出開始bytesを今回transitionのfailure-injection baselineとする。
- audit appendが `already-present` でもoutbox正本fieldの完全一致を要求する。不一致なら破損／衝突としてoutboxを保持する。
- outbox clearのwriteがdurability不明でもprior business stateとauditはcommit済みであるため、`maintenance-blocked(clear-pending)` としてstale outboxを保持し、今回transitionは未評価のままにする。

## Acceptance規則

| ID | 証跡 |
|---|---|
| AR-01 | 修正前に `persistBlocked` が `applyTransition` failureを破棄する falling proof |
| AR-02 | lockからrename前までの各failure injectionで `not-started` と全bytes不変 |
| AR-03 | directory fsync failureでtyped `outcome-unknown`、文字列解析0件 |
| AR-04 | audit append failure後の次回drainでaudit 1件、outbox clear |
| AR-05 | outbox clear failure後の次回drainでaudit重複0件、outbox clear |
| AR-06 | clean／pendingの成功経路で既存公開unionとcaller挙動が不変 |
| AR-07 | focused test、lint、typecheckがgreenで、canonical source以外を直接編集していない |
| AR-08 | 既存outboxのappend失敗／clear失敗／clear成功がmaintenance-onlyとなり、今回transition評価0回、business outcome 0件、`not-started`／`retryable=true` となる |
| AR-09 | maintenance後の明示的な別invocationだけがoutbox absentの呼出開始bytesをbaselineとして今回transitionを1回評価する |
| AR-10 | exclusive／non-exclusive別の `unchanged`／`conflict` 全組合せが決定表どおりになる |
| AR-11 | transaction identity一致・payload不一致でfail-closedとなり、outboxが保持される |

これらの証跡は `repository-adoption` が #1878 identityの削除、全体回帰、package／promotion driftと統合できる形式で残す。
