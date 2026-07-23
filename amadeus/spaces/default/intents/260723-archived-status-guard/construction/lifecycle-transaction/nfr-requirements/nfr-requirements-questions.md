# NFR Requirements Questions — lifecycle-transaction

Leader approval evidence: ユーザー承認 2026-07-23T09:00:02Z

## Q0. Interaction mode

このUnitのNFR Requirements質問へどの形式で回答しますか。

A. Guided — 1問ずつ回答する（推奨）
B. All-at-once — 全質問へまとめて回答する
X. Other (please specify)

[Answer]: A — Guided（2026-07-23T08:54:51Z）

## Q1. Transaction latency budget

10,000 audit rows・10,000 registry entriesのfixtureで、lock取得後の処理時間をどうしますか。

A. archive/unarchive p95 ≤ 500ms、3-step recovery p95 ≤ 750ms（推奨）
B. 通常処理p95 ≤ 1s、recovery p95 ≤ 2s
C. latency目標はN/Aとしcorrectnessだけを検証
X. Other (please specify)

[Answer]: A — archive/unarchive p95 ≤ 500ms、3-step recovery p95 ≤ 750ms（2026-07-23T08:56:30Z）

## Q2. Recovery reliability target

7つのfailure境界に対する回復目標をどうしますか。

A. 各境界100回の障害注入で全件収束、auditはoperationIdごとに正確に1件（推奨）
B. 各境界10回で全件収束
C. 各境界1回のtestだけを要求
X. Other (please specify)

[Answer]: A — 各境界100回の障害注入で全件収束、auditはoperationIdごとに正確に1件（2026-07-23T08:57:13Z）

## Q3. Tamper and replay security

journal、audit、HUMAN_TURNの改変・replayへどう対応しますか。

A. schema・flag topology・全payload・shard/timestampを照合し、不一致や重複をfail-closed（推奨）
B. operationId一致だけでrecoveryを続行する
C. 不一致時は最新状態からjournalを自動再生成する
X. Other (please specify)

[Answer]: A — schema・flag topology・全payload・shard/timestampを照合し、不一致や重複をfail-closed（2026-07-23T08:57:55Z）

## Q4. NFR plan

performance、security、scalability、reliability、tech stackを、回答済み目標と既存Bun/TypeScript stackで生成します。

A. Approve Plan（推奨）
B. Revise Plan

[Answer]: A — Approve Plan（2026-07-23T09:00:02Z）
