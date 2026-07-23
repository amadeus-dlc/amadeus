# NFR Design Questions — guard-integration

## Q1: ガード統合の設計方針

Guided mode を継続し、次の NFR 設計を採用するか。

- `ArchivedIntentGuard`を共通domain componentとし、selector、next、unpark adapterがtyped rejectionを既存public shapeへ写像する。
- `RegistryPathBoundary`、`LifecyclePreflight`、`IntentStatusParser`を再利用し、guardごとの独自status readやlockを作らない。
- `next`はstage resolution前に短絡returnし、selector/unparkはmutation前にnon-zero終了する。
- AST/symbol graph corpus analyzerでcursor、directive、marker、status sinkの迂回をfail closedに検出する。
- 8-process archived fixture、1x/2x corpus growth gate、100-pair latency/RSS benchmarkを既存CIへ組み込む。
- cloud、database、daemon、external monitoring、force/implicit-unarchive optionは追加しない。

- [x] A. 上記設計を採用する（推奨）
- [ ] B. guard component boundary を変更する
- [ ] C. corpus analyzer 設計を変更する
- [ ] D. 性能・並行性設計を変更する
- [ ] X. その他

[Answer]: A
[Rationale]: 推奨選択として承認
[Respondent]: user
[Timestamp]: 2026-07-23T10:14:52Z
