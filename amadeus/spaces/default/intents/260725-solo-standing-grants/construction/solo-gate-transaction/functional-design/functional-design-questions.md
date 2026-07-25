# Functional Design Questions: solo-gate-transaction

## 回答方針と入力

ユーザーの包括指示に従い推奨案を採用した。`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`を根拠とする。

## Q1. Route carrier

- A. `standing_grant_id`と`standing_grant_route_id`のall-or-none pair（推奨）
- B. Grant Idだけ
- C. grant専用gate値
- X. その他

[Answer]: A（E-1466-FD-U2-Q1、2026-07-25T06:22:16Z）

## Q2. Route atomicity

- A. protected receipt append成功後だけcarrierをemitする（推奨）
- B. carrierを先にemitする
- X. その他

[Answer]: A（E-1466-FD-U2-Q2、2026-07-25T06:22:16Z）

## Q3. Commit boundary

- A. state approval lock内、approval mutation前にexact receipt/grantを再検証する（推奨）
- B. route結果を信頼する
- X. その他

[Answer]: A（E-1466-FD-U2-Q3、2026-07-25T06:22:16Z）

## Q4. Fallback wire

- A. grant-backed approveだけstrict JSON `await-approval`を返す（推奨）
- B. stderr sentinel
- C. 非zero exit
- X. その他

[Answer]: A（E-1466-FD-U2-Q4、2026-07-25T06:22:16Z）

## Q5. Fallback execution

- A. 既存成果物を保持し、approval promptだけへ戻る（推奨）
- B. stage body/reviewer/sensorを再実行する
- X. その他

[Answer]: A（E-1466-FD-U2-Q5、2026-07-25T06:22:16Z）

## Q6. Per-unit behavior

- A. uncovered unitにはcarrierを付けず、all-covered最終gateだけを対象にする（推奨）
- B. 各unit body開始時に自動承認する
- X. その他

[Answer]: A（E-1466-FD-U2-Q6、2026-07-25T06:22:16Z）

## Q7. UI

- A. CLI/core transactionでありfrontend componentは作らない（推奨）
- B. UIを追加する
- X. その他

[Answer]: A（E-1466-FD-U2-Q7、2026-07-25T06:22:16Z）

## 曖昧性分析

- `await-approval`はstage実行失敗ではなく、同じgateをhuman authorizationへ戻すoutcomeである。
- carrier pairのmalformed shapeはroute/commit raceではなくprotocol errorである。
- valid carrierのreceipt/grantがcommit時に不一致・失効した場合はhuman fallbackであり、ERROR_LOGGEDを発生させない。
- human/team approve branchのstdout/stderr、authorization順序、audit順序は変更しない。

## Q8. Route-intent binding

- A. Route Idをspace全intentからexact lookupし、receipt所有intentへtransactionをpinする（推奨）
- B. Intent Idをcarrierへ追加する
- C. record targetをcarrierへ追加する
- X. その他

[Answer]: A（E-1466-FD-U2-Q8、2026-07-25T06:37:48Z、重要設計ゲートでユーザー承認）
