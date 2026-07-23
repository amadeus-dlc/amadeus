# Business Logic Model — lifecycle-transaction

上流入力は `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。本UnitはFR-03、FR-04、NFR-01のprimary ownerであり、Bolt 1のstrict statusと限定transition capabilityを消費する。

Integration spot-check `LIFECYCLE-TRANSACTION-PRIMARY-1`: 正本実装は `packages/framework/core/tools/amadeus-lib.ts`。

## Preflight workflow

`withIntentLifecyclePreflight(projectDir, space, callback)`だけがworkspace lockを取得し、opaqueな`LockedLifecycleContext`を生成する。

1. workspace lockを取得する。
2. active lock tokenを生成し、project/spaceと結び付ける。
3. journal pathを読取り、存在すればschemaと状態を検証する。
4. validな未完了journalは完了済みstepを再実行せず、最初の未完了stepからrecoveryする。
5. recovery後のregistry、cursor、audit整合を検証する。
6. callbackへcontextを渡す。
7. callbackのreturn/throwにかかわらずcontextを失効させる。
8. lockを解放する。

locked helperはactive token、project、spaceを毎回照合する。callback外、別workspace、失効済みcontext、lock非保持時の呼出しはdefectとしてfail-fastする。callbackから公開wrapperを再呼出ししてlockを再取得してはならない。

## Archive transaction

preconditionは対象が一意に解決され、statusが`in-flight`、`parked`、`complete`のいずれかで、未消費HUMAN_TURNが存在すること。

1. lock内recoveryを完了する。
2. 対象、status、active cursor一致、audit shardを解決する。
3. protected verb横断の最新resolution eventより後にある、自shardの最新未消費HUMAN_TURNを選ぶ。同じshardに同一timestampのHUMAN_TURNが複数あれば開始前にfail-closedする。
4. UUID operationIdを生成し、human turnの`{shard,timestamp}`とuser inputを含むjournalをatomic writeする。
5. `INTENT_ARCHIVED`をoperationId + event typeで全shard検索し、0件なら予約HUMAN_TURNと同じshardへappendする。1件ならevent保存先shardと、intentDir、fromStatus、toStatus、operationId、userInput、humanTurnTimestampの全immutable payloadがjournalと完全一致する場合だけidempotent successとする。不一致または2件以上はcorrupt transactionとしてfail-closedする。
6. status-registry capabilityで対象を`archived`へ遷移する。
7. active cursorが対象ならatomic delete/clearする。非activeならcursor stepを完了扱いにする。
8. audit、registry、cursorが期待最終状態であることを再読込み検証する。
9. journalを削除する。

validationまたはjournal永続化前の失敗ではaudit、registry、cursorを変更しない。journal永続化後の失敗ではjournalを残し、次のpreflightが同じoperationIdと予約HUMAN_TURNで継続する。

## Unarchive transaction

preconditionは対象statusが`archived`で、未消費HUMAN_TURNが存在すること。処理順はarchiveと同じだが、eventは`INTENT_UNARCHIVED`、transitionは`archived → in-flight`、cursorは常に変更しない。unarchive後の選択は通常selectorに委ねる。

## Recovery state machine

| Durable state | Recovery action |
|---|---|
| journalなし | callbackへ進む |
| journalあり、audit未完了 | eventをoperationIdで検索し、0件append／1件marker更新／複数件fail |
| audit完了、registry未完了 | status capabilityを適用。既にtoStatusならidempotent success |
| registry完了、cursor未完了 | archiveかつtarget activeの場合だけcursorをclear |
| 全commit step完了 | 最終状態を検証しjournal削除 |

JSON破損、未知schemaVersion、対象消失、journalのfrom/to/verb矛盾、現在statusがfrom/toのどちらでもない場合は自動修復しない。journal path、operationId（読める場合）、対象、期待値、観測値、手動調査が必要なことを診断してworkspace操作を停止する。

### Journal validation decision table

| verb | fromStatus | toStatus | valid flags |
|---|---|---|---|
| archive | `in-flight` / `parked` / `complete` | `archived` | `FFF`、`TFF`、`TTF`、`TTT` |
| unarchive | `archived` | `in-flight` | `FFF`、`TFF`、`TTF`、`TTT` |

flag順は`auditCommitted`、`registryCommitted`、`cursorCommitted`。`FTF`、`FFT`、`TFT`などprefixでない組合せ、表外のverb/from/to、operationId不正、予約turn不正はrecoveryを開始せずcorrupt journalとして拒否する。

## Failure injection

production orchestrationは内部`LifecycleTransactionPorts`へ依存する。既定portは実filesystem/audit/cursor実装で、testはfailing fakeを注入する。本番コードに環境変数やtest-only分岐を追加しない。

7境界はvalidation、journal write、audit pre-validation、audit commit、registry write、cursor write、journal completion。各testは呼出前後bytes、journal step、operationId、audit event件数を比較し、再実行で期待最終状態へ収束することを確認する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:25:35Z
- **Iteration:** 1
- **Scope decision:** none

lock capability、forward recovery、operationId再利用、7 failure境界は概ね実装可能だが、audit payload整合、HUMAN_TURN identity、journal許可状態集合が未閉鎖。

### Findings

- BLOCKER — 既存audit event一件時に全immutable payload一致が必要。
- BLOCKER — lifecycle eventからhuman turn shardを再構成できない。
- MAJOR — journal step flagの許可組合せとverb/from/to行列が未定義。
- MAJOR — 同一shard内timestamp重複時のfail-closed方針が未定義。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:27:54Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4指摘は解消された。audit payload/shard、HUMAN_TURN identity、timestamp重複拒否、journal topologyが確定し、追加のarchitecture判断なしで実装・検証できる。

### Findings

- RESOLVED — 既存audit eventは保存先shardと全immutable payload完全一致を要求する。
- RESOLVED — event保存先shardとtimestampからHUMAN_TURN消費identityを再構成する。
- RESOLVED — journal flag tupleとverb/from/to行列を閉じた。
- RESOLVED — 同一shard timestamp重複をjournal作成前に拒否する。
