# Domain Entities — mirror-persistence-propagation

## 境界と上流トレーサビリティ

本モデルは `unit-of-work.md` の U3 entity boundary、`unit-of-work-story-map.md` の SC-05、`requirements.md` の commit境界別契約、`components.md` の R3／R4 ownership、`component-methods.md` の内部 `OperationPreparationResult`／`StateResult` と公開 outcome mapping、`services.md` の existing runtime／transactional outbox data ownershipを具体化する。

新しい永続entityや公開API entityは作らない。既存 `MirrorStateSnapshot`、`MirrorAuditOutbox`、`MirrorOperationReceipt`、`MirrorWarning`、`MirrorOperationOutcome` を再利用し、追加する概念はR3／R4内部の結果分類だけとする。

## Entity一覧

| Entity／Value Object | 所有境界 | 永続性 | 役割 |
|---|---|---|---|
| `OperationPreparationResult` | R4→R3 | 非永続・module-internal | prior outbox maintenanceを今回transitionより前の別invocation境界として表す |
| `StoreMutationResult` | R4→R3 | 非永続・module-internal | `ready` 後の今回transition結果だけをtyped discriminatorで表す |
| `StateResult` | R3 Mirror Executor | 非永続・内部 | 今回transitionのcommit前失敗／durability不明／clean／outbox pendingを閉じた状態で表す |
| `MirrorStateSnapshot` | R4 Mirror State Store | state document | business state、revision、receipt、warning、transactional outboxのaggregate root |
| `MirrorAuditOutbox` | R4 Mirror State Store | snapshot内 | commit済みbusiness mutationをauditへ冪等投影する証跡 |
| `MirrorOperationReceipt` | 既存 mirror runtime | snapshot内 | operation identityとprepared contextを保持し、warning／outboxを同じoperationへ結合する |
| `MirrorWarning` | 既存公開contract | snapshot／outcome | classification、effect、summaryでcallerへfailure意味を伝える |
| `MirrorOperationOutcome` | 既存公開contract | 非永続return | business outcomeまたはstate persistence failureを既存variantで返す |
| `MirrorTransition` | R3→R4 command | 非永続 | reducerへ渡す単一の状態変更意図 |
| Transaction identity | R4 value object | outbox／audit | auditの重複防止とstale outbox収束を結び付ける |

## `StateResult` の構造

`StateResult` は `ready` 後に評価された今回business operationの閉じた内部結果であり、次の排他的な形だけを持つ。maintenance結果はこの型へ入れない。

| kind | 判別値 | 必須属性 | 禁止属性 |
|---|---|---|---|
| `failed` | `phase=pre-commit` | 非空summary | snapshot、commit |
| `failed` | `phase=durability-unknown` | 非空summary | snapshot、commit |
| `ok` | `commit=clean` | snapshot | phase、summary |
| `ok` | `commit=outbox-pending` | outboxを持つsnapshot | phase、summary |

`phase` と `commit` は内部制御用のtyped discriminantである。summaryは表示／診断用、snapshotはstoreが確定したstateの読み取り専用値とし、callerが後からmarkerを上書きしない。

## `OperationPreparationResult` の構造

| kind | 必須属性 | 今回transitionの状態 |
|---|---|---|
| `ready` | outboxなしsnapshot | このinvocationで1回だけ評価可能 |
| `maintenance-blocked` | `progress=audit-pending | clear-pending`、summary、snapshot | 未構築・未評価 |
| `maintenance-completed` | outboxなしlatest snapshot | 未構築・未評価 |

maintenanceの2variantは既存 `stateFailure(classification=state-write, effect=not-started, retryable=true)` へ写像し、そのinvocationを終端する。内部reasonは `prior-outbox-maintenance-blocked:<progress> | prior-outbox-maintenance-completed` とし、公開unionへ露出しない。後続invocationは新しい `OperationPreparationResult.ready` から今回transitionを初めて評価する。

## `StoreMutationResult` の構造

R4→R3のmodule-internal結果は次の閉集合とする。これは公開 `MirrorOperationOutcome`／`MirrorWarning` のvariantを増やさない。

| kind | 必須属性 | 今回transitionの状態 |
|---|---|---|
| `transition-written` | snapshot | commit済み |
| `transition-unchanged` | snapshot | 変更不要。modeで成功／失敗を決定 |
| `transition-conflict` | actualRevision | 未commit |
| `transition-invalid` | issues | 未commit |
| `transition-io-failure` | `phase=pre-commit | durability-unknown`、summary | phaseに従う |

`transition-io-failure.phase` はR4のatomic adapterが設定する。business state rename後のdirectory fsyncだけが `durability-unknown` である。outbox clear maintenance writeのfsync失敗は `OperationPreparationResult.maintenance-blocked(clear-pending)` であり、`StoreMutationResult` を生成しない。summary prefixは診断表示に残せるが、制御分岐には使わない。

## Aggregateと関係

`MirrorStateSnapshot` が aggregate rootであり、revisionごとのbusiness state、operation receipt、warning、0または1件の `MirrorAuditOutbox` を所有する。

- `MirrorOperationReceipt.operationId` は `persistBlocked` のbusiness warningとtransition audit contextを結ぶ。
- `MirrorAuditOutbox.transactionId` は intent identity、event identity、operation identity、transition kind、revision、digestから決定的に導出される。
- outboxのdigestはcommit対象business snapshotに結合し、異なるbusiness stateのauditへ流用できない。
- `MirrorWarning` はoutcome内の値であり、failure phaseそのものを永続stateへ追加しない。公開callerは既存 `classification` と `effect` を読む。
- `MirrorOperationOutcome` は `StoreMutationResult`／`StateResult` を露出せず、R3で既存variantへ射影される。

関係のテキスト表現は次のとおりである。

`MirrorStateSnapshot` → `OperationPreparationResult` → (`ready` の場合だけ) `MirrorTransition` → `StoreMutationResult` → `StateResult` → `MirrorOperationOutcome`

`MirrorStateSnapshot` 1 ─ 0..1 `MirrorAuditOutbox` ─ 1 transaction identity ─ 0..1 audit record

`MirrorOperationReceipt` 1 ─ operation identity ─ `MirrorWarning`／`MirrorAuditOutbox`

## Lifecycle

### StateResult

1. 呼出開始時にpreparationを行う。既存outboxがなければ `ready`、あればmaintenanceする。
2. `maintenance-blocked`／`maintenance-completed` は今回transitionを構築・評価せず、`stateFailure(not-started, retryable=true)` でinvocationを終端する。
3. 後続invocationが必要な場合はcallerが明示的に新しく開始する。outbox absentの `ready` だけが今回transitionを1回評価する。
4. `ready` 後、commit point前のtyped failureで `failed(pre-commit)` に終端する。
5. business state rename後fsyncのtyped failureで `failed(durability-unknown)` に終端する。
6. `transition-written` のsnapshotに今回outboxがなければ `ok(clean)`、あれば `ok(outbox-pending)` に終端する。
7. `transition-unchanged` はnon-exclusiveなら `ok(clean)`、exclusiveな `persistBlocked` なら `failed(pre-commit)` に終端する。
8. `transition-conflict` はnon-exclusiveの初回だけlatest snapshotから1回再評価し、exclusiveまたは再競合なら `failed(pre-commit)` に終端する。

同一 `StateResult` が別variantへ遷移することはない。再処理は新しい store invocationと新しい結果値を生成する。

### Transactional outbox

| 状態 | 内容 | 次の許可遷移 |
|---|---|---|
| absent | pending auditなし | business commitと同時にpending、またはabsent維持 |
| pending-audit | business state commit済み、audit未確認 | audit append後pending-clear、失敗なら自己維持 |
| pending-clear | audit存在、outboxのみ残存 | clear後absent、失敗なら自己維持 |
| cleared | snapshot上はabsent、auditは永続 | 終端。別business transitionだけが新outboxを作る |

実装上 `pending-audit` と `pending-clear` は同じoutbox shapeを共有してよい。audit側のtransaction identityに加え、digest、revision、operation identity、transition kindを含む全正本fieldの一致により、次回drainがappendとclearのどちらから再開すべきかを決める。identity一致・payload不一致は破損／衝突としてfail-closedにし、outboxを保持する。

## 属性制約

### `MirrorAuditOutbox`

- `transactionId`: 非空かつ同じbusiness transitionに対して決定的。
- `digest`: outboxを除いたcommit済みbusiness snapshotのdigest。
- `fields`: transaction identity、revision、transition kind、digest、trigger boundary、operation identityを保持する。
- snapshotには最大1件だけ存在する。既存outboxがあればmaintenance-only invocationでdrainし、新規transitionは別invocationで開始する。
- auditの `already-present` はtransaction identityと全正本fieldが一致する場合だけ成立する。

### `MirrorWarning`

- state persistence failureは `classification=state-write`。
- pre-commitは `effect=not-started`。
- durability unknownは `effect=outcome-unknown`。
- current-transitionの `failed` は `retryable=false`、maintenance-only outcomeは `retryable=true` とする。どちらも同一invocation内の自動retryは行わない。
- summaryは非空だが、phase判定の正本ではない。

### `MirrorOperationOutcome`

- public unionのvariantとserialization shapeは変更しない。
- `StateResult.failed` は既存 `stateFailure` outcomeへ `retryable=false` で写像する。
- 今回transition由来の `StateResult.ok` だけが元のbusiness `safety-blocked` outcomeへ写像される。
- `OperationPreparationResult.maintenance-blocked`／`maintenance-completed` は `stateFailure(not-started, retryable=true)` へ写像し、今回transitionのbusiness outcomeを返さずinvocationを終える。
- pending outboxの存在を「state更新が失われた」と表現しない。business commitとaudit収束待ちを内部で分離する。

## 整合性と所有権

- R3は結果写像を所有し、R4のatomic write／outbox algorithmを複製しない。
- R4はpreparation、commit point、typed durability phase、`OperationPreparationResult`、`StoreMutationResult`、outbox生成・drain・clearを所有し、business outcomeを生成しない。
- reducerはbusiness stateのpure transitionだけを所有し、I/O failureを認識しない。
- 公開callerは `MirrorOperationOutcome` だけを消費し、内部 `OperationPreparationResult`／`StateResult` やstore snapshotへ依存しない。
- test adapterはR4のportsを差し替えてfailure pointを決定的に注入する。production codeにtest専用分岐を置かない。
- canonical entity定義だけを変更し、generated harness projectionは後続の `repository-adoption` で再生成する。

## Entity acceptance

- 4つの `StateResult` shapeすべてにconstructor／mapping testがあり、欠落caseを型検査で検出できる。
- `ok(outbox-pending)` はoutboxなしsnapshotを受理しない。
- pre-commit／durability-unknownの公開写像はsummaryを変えても不変である。
- 既存outboxのappend失敗／clear失敗／clear成功はいずれもmaintenance-onlyとなり、今回transition評価0回、business outcome 0件、`not-started`／`retryable=true` になる。
- maintenance後の明示的な別invocationだけが、outbox absentの呼出開始bytesをbaselineとして今回transitionを1回評価する。
- `transition-unchanged`／`transition-conflict` はexclusive／non-exclusive別の決定が固定される。
-同一transaction identityかつ全正本field一致のdrainを複数回実行してもaudit recordは1件以下である。
- transaction identity一致・payload不一致ではoutboxをclearせずfail-closedになる。
- outbox clear失敗後のsnapshotを再読すると、同じoutbox identityからclearへ収束できる。
-既存公開outcomeのconsumer testとserialization／codec testが回帰しない。
