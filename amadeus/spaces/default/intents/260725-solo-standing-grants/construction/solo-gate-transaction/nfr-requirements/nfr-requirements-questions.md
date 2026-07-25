# NFR Requirements Questions: solo-gate-transaction

## 入力と回答方針

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を入力とし、ユーザーの包括指示により推奨案を採用した。

## Q1. Transaction performance

- A. wire parseとstate commitを1回に限定し、fallback後のbody/reviewer/sensor再実行を0回にする（推奨）
- B. fallback時にstage全体を再実行する
- X. その他

[Answer]: A（E-1466-NFR-U2-Q1、ユーザーの包括指示「質問は全部推奨」により採用）

## Q2. Protocol security

- A. carrier all-or-none、strict JSON、mode isolationをmutation前にfail-closedにする（推奨）
- B. malformed wireをbest effortで解釈する
- X. その他

[Answer]: A（E-1466-NFR-U2-Q2、ユーザーの包括指示「質問は全部推奨」により採用）

## Q3. Reliability

- A. audit/state byte deltaとinvocation countをblocking invariantにする（推奨）
- B. console messageだけで結果を判定する
- X. その他

[Answer]: A（E-1466-NFR-U2-Q3、ユーザーの包括指示「質問は全部推奨」により採用）

## Q4. Lock hierarchy

- A. U1のworkspace outer lock → receipt owner intent inner lockをtransport/commitにも適用する（推奨）
- B. conductorごとに別lockを導入する
- X. その他

[Answer]: A（E-1466-NFR-U2-Q4、ユーザーの包括指示「質問は全部推奨」により採用）

## Q5. Fallback後のhuman approval target

- A. opaque `target_intent_id`とsession-local presence reservationでreceipt ownerをhuman commitまで保持する（推奨）
- B. active-intent cursorをownerへ書き換える
- C. run-stage carrierへIntent Idを追加する

[Answer]: A（E-1466-NFR-U2-Q5、ユーザーの包括指示「質問は全部推奨」により採用）

## 曖昧性分析

- 「高速」はwall clockだけで定義せず、process invocation、parse、mutation、ritual再実行の回数で判定する。
- protocol errorとexpected fallbackを別のtyped outcomeとして測定する。
- remote availability SLAは対象外であり、local process・filesystem transactionの終端性を対象とする。
- `target_intent_id`とpresence reservationは認可証拠ではなくtransaction targetであり、trusted UserPromptSubmitが実human promptからmintするfresh `HUMAN_TURN`要件を代替しない。
