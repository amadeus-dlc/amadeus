# NFR Design Questions: grant-authorization-domain

## 入力と回答方針

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を入力とし、ユーザーの包括指示により推奨案を採用した。

## Q1. Projection architecture

- A. audit event配列を入力にするpure queryと、filesystem/lock adapterを分離する（推奨）
- B. state CLI内へ全判定を埋め込む
- X. その他

[Answer]: A（E-1466-ND-U1-Q1、ユーザーの包括指示「質問は全部推奨」により採用）

## Q2. Lock design

- A. route/commitはworkspace outer→owner intent inner、revokeはowner innerを使用する（推奨）
- B. 新しいdatabase lockを導入する
- X. その他

[Answer]: A（E-1466-ND-U1-Q2、ユーザーの包括指示「質問は全部推奨」により採用）

## Q3. Performance strategy

- A. one-pass projection/selectionとtransaction内snapshot再利用を採用する（推奨）
- B. cache/indexを追加する
- X. その他

[Answer]: A（E-1466-ND-U1-Q3、ユーザーの包括指示「質問は全部推奨」により採用）

## Q4. Failure strategy

- A. expected invalidityはtyped value、I/O/state corruptionだけ例外にする（推奨）
- B. すべて例外とstderrで扱う
- X. その他

[Answer]: A（E-1466-ND-U1-Q4、ユーザーの包括指示「質問は全部推奨」により採用）

## 曖昧性分析

- remote service、network、AWS resourceは存在しないため、circuit breakerやmulti-AZを導入しない。
- transaction snapshotはcache正本ではなく、同一lock内で読み取った監査projectionの再利用である。
- operation counterはtest seamでありproductionの永続metricsを追加しない。
