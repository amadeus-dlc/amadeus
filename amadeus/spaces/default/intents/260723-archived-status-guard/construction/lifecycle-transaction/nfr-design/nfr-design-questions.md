# NFR Design Questions — lifecycle-transaction

## Q1: トランザクション設計方針

Guided mode を継続し、次の NFR 設計を採用するか。

- `LifecycleLockAuthority`、`JournalStore`、`AuditCommitPort`、`IntentStatusTransitions`、`ActiveCursorPort`を分離し、単一preflight callback内で順序制御する。
- journal の `FFF → TFF → TTF → TTT` を唯一のforward-recovery状態機械とし、rollbackを追加しない。
- operationId、HUMAN_TURN shard/timestamp、immutable audit payloadをjournalで固定し、再実行時に同一性を照合する。
- 7 failure境界へtest-side failing portを注入し、各100回の収束とaudit event正確1件を検証する。
- 8-process concurrencyは既存workspace lockで直列化し、分散lock、database、queue、daemonを追加しない。
- fatal diagnosticはworkspace-relative journal pathと期待値・観測値を返し、外部monitoring基盤は追加しない。

- [x] A. 上記設計を採用する（推奨）
- [ ] B. component boundary を変更する
- [ ] C. recovery state machine を変更する
- [ ] D. 並行性・観測性の設計を変更する
- [ ] X. その他

[Answer]: A
[Rationale]: 推奨選択として承認
[Respondent]: user
[Timestamp]: 2026-07-23T09:29:44Z
