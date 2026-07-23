# Code Summary — lifecycle-transaction

Integration spot-check `LIFECYCLE-TRANSACTION-PRIMARY-1`: 正本実装は `packages/framework/core/tools/amadeus-lib.ts`。

## 実装結果

- `amadeus-lib.ts`へstrictな`IntentStatusTransactionJournal` parser、`FFF → TFF → TTF → TTT`だけを許すforward recovery、callback-scoped lifecycle preflightを追加した。
- journalはoperation ID、verb、from/to status、対象intent、予約HUMAN_TURNのshard/timestamp、user input、3 commit flagsを固定する。各更新は既存の一意temp、file fsync、rename、parent directory fsync契約を使う。
- `INTENT_ARCHIVED`と`INTENT_UNARCHIVED`をaudit taxonomyへ追加した。専用trusted writerは予約HUMAN_TURNと同じshardへatomic appendし、operation ID検索後に保存shardと全immutable payloadを完全照合する。
- `amadeus-state.ts archive <intent-dir> --user-input <text>`と`unarchive`を追加した。archiveは`in-flight`、`parked`、`complete`から`archived`へ遷移し、対象がactive cursorなら解除する。unarchiveは`archived → in-flight`だけを許し、cursorを変更しない。
- archive/unarchiveは未消費HUMAN_TURNを必須とする。同一shard・同一timestampの重複、消費済みturn、最新resolution以前のturn、audit payload不一致、event複数、corrupt journalをfail closedにする。
- workspace lock timeout時は同じlockをERROR_LOGGEDのために再取得せず、5秒budgetで直接失敗を返す。transaction開始前なのでjournal、audit、registry、cursorは不変である。

## Reliability・並行性検証

- validation、journal write、audit commit前後、registry commit前後、cursor commit前後、journal delete前の9 failure injection subcaseを検証した。全caseが次回preflightで同じoperation IDを使い、audit正確1件、期待status/cursor、journal削除へ収束した。
- `FFF`、`TFF`、`TTF`、`TTT`の全durable topologyからforward recoveryを検証した。
- archiveの3遷移元、active/non-active cursor、unarchive cursor no-op、HUMAN_TURN欠如、timestamp重複、不正from statusを検証した。
- 8別intent・別turnの並行processは8件すべて成功した。同一intentへの8 process競合は1件だけ成功し、7件は副作用なく拒否された。
- live lock fixtureでは5秒timeout後にnon-zeroとなり、registryとaudit bytesが不変であることを確認した。

## Performance

- 条件: 10,000 audit rows、10,000 registry entries、warm-up 10回、archive/recovery/noop各100 independent child process。
- 最終full CI実測: archive p95 41.177ms（上限500ms）、`FFF` recovery p95 29.314ms（上限750ms）、noop差分RSS p95 45.984MiB（上限96MiB）。
- provenance: fixture SHA-256 `972922893aa015721a35488b00cf3c5740cc77c6c8e4eee2eb6570bd6ad051fe`、Git SHA `cb3525fa85d3fe22f945ee3c4f74c681a32b9ae6`、Bun 1.3.13、Apple M4 Max、runner `local`。

## 配布・品質

- Claude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeの6 harnessを再生成した。
- Claude、Codex、Cursor、OpenCodeの4 self-install面を同期した。
- `bun run typecheck`: pass。
- `bun run lint:check`: pass。repository既存advisory warningのみで、新規lifecycle関数のcomplexity warningはhelper分割で解消した。
- `bun run dist:check`: 6 harnessすべてpass、drift 0。
- `bun run promote:self:check`: 4 self-install面すべてpass、drift 0。
- 新規focused tests: 46 pass、0 fail。
- `bun run test:ci`: 467 files、6,733 assertions、0 failed files、0 failed assertions、wall-clock drift 0、RESULT PASS。
- audit event documentation、canonical count、emitter drift、coverage registry、complexity baselineを最終sourceと同期した。
- Git操作・commitは行っていない。

## Non-goals

- selector、`next`、`unpark`のarchived guard配線は後続guard-integration Unitの責務として変更していない。
- force option、database、distributed lock、external telemetry、新dependency、新CI jobは追加していない。
