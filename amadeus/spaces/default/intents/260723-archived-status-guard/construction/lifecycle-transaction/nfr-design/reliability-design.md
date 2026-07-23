# Reliability Design — lifecycle-transaction

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`をforward-only recoveryとして実装する。

## Recovery state machine

| State | Action | Next |
|---|---|---|
| no journal | recoveryは何も生成せずcallbackへ進む | callback |
| `FFF` | append or verify one immutable audit event | `TFF` |
| `TFF` | apply validated status transition | `TTF` |
| `TTF` | clear active cursor for active archive、otherwise no-op | `TTT` |
| `TTT` | verify final state and remove journal | no journal |

- archive/unarchive command callbackは対象・status・HUMAN_TURNを検証した後にだけ新規operationIdと`FFF`を作る。このcommand開始機械はread-only preflight/recovery機械と分離する。
- recoveryは最初のfalse stepからのみ前進し、true stepを再commitしない。
- rollbackを行わず、同じoperationId、予約HUMAN_TURN、userInputを再利用する。
- journal削除失敗は`TTT`を残し、次回preflightが最終bytesを再検証して削除へ収束する。

## Port failure policy

- `LifecycleTransactionPorts`はjournal、audit、status transition、cursor、UUID、clockを分離し、failure injectionはtest-side fakeで行う。
- `JournalStorePort`は同一directoryへのexclusive temp write、temp file fsync/close、atomic rename、target file fsync/close、parent directory fsyncを順に実施する。各flag updateとjournal削除はこのdurable commitを完了してから次stepへ進む。
- rename前失敗は旧journalを維持してtempをbest-effort削除する。rename後fsync失敗は旧または完全な新journalだけを許容し、次回preflightがstrict parseして安全な方から再開する。partial/unknown topologyはfail closedにする。
- validation、journal write前はaudit/registry/cursor不変。journal永続化後はjournalを残し、次回preflightがforward recoveryする。
- corrupt journal、audit payload不一致、event複数、現status矛盾はavailabilityよりintegrityを優先してworkspace操作を停止する。

## Verification

- validation、journal write、audit pre-validation、audit commit、registry write、cursor write、journal completionの7境界を各100回注入する。
- audit/registry/cursorの各commit境界は、(a) durable write前失敗、(b) durable write成功後かつjournal flag update前失敗、(c) journal flag durable化後失敗の3 subcaseを持つ。(b)では次回recoveryが既存event/status/cursorを完全照合し、再append・再writeせず次flagへ進む。
- journal completionは削除前失敗、unlink後directory fsync前失敗、directory fsync後の3 subcaseを持ち、次回preflightで`TTT`再検証またはjournalなしのどちらからも同じ最終bytesへ収束する。
- 各試行は最終bytes、journal flags、operationId、予約turn、audit event正確1件を検証する。
- `FFF` active archive recoveryは750 ms以内にaudit一件、status archived、cursor未選択、journal削除へ収束する。

## Observability

- 常駐health check、circuit breaker、paging、distributed tracing、backup serviceはN/A。
- typed fatal stderrと既存audit shardをlocal observabilityの正本とし、手動調査が必要なcorruptionをsilent repairしない。
