# Functional Design Questions — lifecycle-transaction

Leader approval evidence: ユーザー承認 2026-07-23T08:22:24Z

## Q0. Interaction mode

このUnitのFunctional Design質問へどの形式で回答しますか。

A. Guided — 1問ずつ回答する（推奨）
B. All-at-once — 全質問へまとめて回答する
X. Other (please specify)

[Answer]: A — Guided（2026-07-23T08:19:16Z）

## Q1. Completed journal retention

transactionが全stepを完了した後、journalをどう扱いますか。

A. 最終状態を検証してjournalを削除し、audit eventを永続証跡とする（推奨）
B. `completed: true` marker付きでjournalを残す
C. 完了journalを履歴directoryへ移動する
X. Other (please specify)

[Answer]: A — 最終状態を検証してjournalを削除し、audit eventを永続証跡とする（2026-07-23T08:19:49Z）

## Q2. LockedLifecycleContext lifetime

opaque lock capabilityをいつまで有効にしますか。

A. `withIntentLifecyclePreflight`のcallback実行中だけ有効にし、return/throw後は失効させる（推奨）
B. workspace lock解放後も同じprocess内なら再利用可能にする
C. project/space単位でglobal cacheする
X. Other (please specify)

[Answer]: A — `withIntentLifecyclePreflight`のcallback実行中だけ有効にし、return/throw後は失効させる（2026-07-23T08:21:03Z）

## Q3. Failure injection seam

7つのdurable境界へ障害を注入するテストシームをどう設けますか。

A. filesystem/audit/cursor操作を内部portとして注入し、failing fakeはtest側だけに置く（推奨）
B. production codeに環境変数で分岐するfailure modeを追加する
C. 実filesystem permissionだけで全境界を再現する
X. Other (please specify)

[Answer]: A — filesystem/audit/cursor操作を内部portとして注入し、failing fakeはtest側だけに置く（2026-07-23T08:21:54Z）

## Q4. Functional Design plan

次の設計境界で成果物を生成しますか。

- preflight lock取得直後にjournal recoveryを完了してからcallbackを実行
- contextはcallback中だけ有効で、終了時に失効
- validate → journal → audit → registry → cursor → final verify → journal delete
- HUMAN_TURNをprotected verb横断で一意予約
- operationIdでlifecycle auditを冪等化
- journal corruptionは自動修復せずfail-closed
- 7 failure境界は内部portとtest fakeで検証
- frontend/UI成果物は生成しない

A. Approve Plan（推奨）
B. Revise Plan
X. Other (please specify)

[Answer]: A — Approve Plan（2026-07-23T08:22:24Z）
