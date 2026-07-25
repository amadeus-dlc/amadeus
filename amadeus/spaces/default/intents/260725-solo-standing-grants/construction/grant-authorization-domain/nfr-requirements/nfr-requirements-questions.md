# NFR Requirements Questions: grant-authorization-domain

## 入力と回答方針

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を入力とし、ユーザーの包括指示により推奨案を採用した。

## Q1. Performance target

- A. audit projectionを総event数に対して線形、100,000 event fixtureを5秒以内にする（推奨）
- B. 新しいindex databaseを導入する
- X. その他

[Answer]: A（E-1466-NFR-U1-Q1、2026-07-25T06:40:49Z）

## Q2. Security posture

- A. forged provenance、cross-intent、substitution、duplicate identityをすべてfail-closedにする（推奨）
- B. malformed eventをbest effortで認可する
- X. その他

[Answer]: A（E-1466-NFR-U1-Q2、2026-07-25T06:40:49Z）

## Q3. Reliability target

- A. deterministic fixtureとaudit-first atomicityをblocking invariantにする（推奨）
- B. sleep-based race testを許す
- X. その他

[Answer]: A（E-1466-NFR-U1-Q3、2026-07-25T06:40:49Z）

## Q4. Technology

- A. Bun/strict TypeScript/既存filesystem lockだけを使用する（推奨）
- B. 新しいservice/databaseを導入する
- X. その他

[Answer]: A（E-1466-NFR-U1-Q4、2026-07-25T06:40:49Z）

## Q5. Space-wide receiptの競合境界

- A. 既存workspace-level intent registry lockをouter、receipt owner intent lockをinnerとしてroute receipt appendとcommitを直列化する（推奨）
- B. 新しいRoute Id専用lockを追加する
- C. carrierへintent fieldを追加する

[Answer]: A（E-1466-NFR-U1-Q5、ユーザーの包括指示「質問は全部推奨」により採用）

## 曖昧性分析

- 5秒はCIでの退行検出上限であり、ユーザー向けSLAではない。
- event数は全intent・全shardの監査block数を指す。
- 可用性はremote service SLAではなく、local filesystem error時にmutationしない性質で定義する。
- outer lockの取得順は常にworkspace → receipt owner intentとし、逆順を禁止する。
