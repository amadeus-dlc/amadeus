# Functional Design Questions: grant-authorization-domain

## 回答方針と入力

ユーザーの包括指示「質問は全部推奨でいいよ。」に従い、推奨案を採用した。`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`を根拠とする。

## Q1. Audit ledger projection

- A. 全shardのeventを読み、発行eventをidentity、取消eventをoverlayとしてpure projectionする（推奨）
- B. state fieldへactive grantを保存する
- C. 設定fileへgrantを保存する
- X. その他

[Answer]: A（E-1466-FD-U1-Q1、2026-07-25T06:16:10Z）

## Q2. Operating mode

- A. unset/empty/solo/teamだけをcanonical resolverで受理し、未知値はfatalにする（推奨）
- B. team以外をすべてsoloにする
- X. その他

[Answer]: A（E-1466-FD-U1-Q2、2026-07-25T06:16:10Z）

## Q3. Solo candidate selection

- A. active intentに限定し、expiry降順、issued audit timestamp降順、Grant Id昇順で決定する（推奨）
- B. 最初に見つかったgrantを使う
- C. team finderと共通化して既存順序も変える
- X. その他

[Answer]: A（E-1466-FD-U1-Q3、2026-07-25T06:16:10Z）

## Q4. Gate policy integration

- A. gate存在を既存classifierで決めた後、phase/skeleton/stage coverageをeligibility predicateで評価する（推奨）
- B. grant専用gate値を追加する
- X. その他

[Answer]: A（E-1466-FD-U1-Q4、2026-07-25T06:16:10Z）

## Q5. Route receipt identity

- A. UUID v4 Route Idでexactly one receiptを引き、StageとGrant Idをcarrierへ照合する（推奨）
- B. 最新receiptを推測する
- C. Grant Idだけで照合する
- X. その他

[Answer]: A（E-1466-FD-U1-Q5、2026-07-25T06:16:10Z）

## Q6. Expected invalidity

- A. typed no-longer-authorizes outcomeを返し、fatal corruptionと区別する（推奨）
- B. 例外を投げる
- C. stderr文字列を返す
- X. その他

[Answer]: A（E-1466-FD-U1-Q6、2026-07-25T06:16:10Z）

## Q7. UI

- A. CLI/library domainでありfrontend componentは作らない（推奨）
- B. grant管理画面を追加する
- X. その他

[Answer]: A（E-1466-FD-U1-Q7、2026-07-25T06:16:10Z）

## 曖昧性分析

- ledgerは監査eventの不変履歴であり、active grantの永続状態を意味しない。
- team modeのfinderとdelegationは変更せず、solo用queryだけに完全順序を適用する。
- policyはgateの存在を変更せず、存在するgateをgrantが認可できるかだけを返す。
- receipt重複、欠落、field不一致はexpected expiry/revokeではなくprotocol corruptionとしてfail-closedにする。
