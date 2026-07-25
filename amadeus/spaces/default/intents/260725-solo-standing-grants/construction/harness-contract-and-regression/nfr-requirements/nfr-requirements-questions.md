# NFR Requirements Questions: harness-contract-and-regression

## 入力と回答方針

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を入力とし、ユーザーの包括指示により推奨案を採用した。

## Q1. Distribution performance

- A. canonical generation 1回とmanifest由来の全harness検証で重複作業を抑える（推奨）
- B. 各generated copyを個別編集する
- X. その他

[Answer]: A（E-1466-NFR-U3-Q1、ユーザーの包括指示「質問は全部推奨」により採用）

## Q2. Supply-chain security

- A. canonical sourceのみ編集し、生成物drift 0とprotected-event mint guardをblockingにする（推奨）
- B. generated copy差分を許容する
- X. その他

[Answer]: A（E-1466-NFR-U3-Q2、ユーザーの包括指示「質問は全部推奨」により採用）

## Q3. Cross-harness reliability

- A. 6 harnessでdirective/state/audit/presence reservationの意味論をgolden比較する（推奨）
- B. conductor文面だけを比較する
- X. その他

[Answer]: A（E-1466-NFR-U3-Q3、ユーザーの包括指示「質問は全部推奨」により採用）

## Q4. Verification order

- A. generate後の同一working treeでfocused→type→full→driftを実行する（推奨）
- B. generation前のtest結果を完了根拠にする
- X. その他

[Answer]: A（E-1466-NFR-U3-Q4、ユーザーの包括指示「質問は全部推奨」により採用）

## Q5. Session identity capability gap

- A. stable host session IDがないharnessはnative adapter完成までfail-closedとし、共有keyへ退化させない（推奨）
- B. workspace共通session keyで代用する
- X. その他

[Answer]: A（E-1466-NFR-U3-Q5、ユーザーの包括指示「質問は全部推奨」により採用）

## 曖昧性分析

- 「全harness」はcompiled manifestが列挙する現在の6 harnessを指し、固定手書きlistとの二重正本を作らない。
- UI renderingの一致ではなく、directive、report flags、hook presence routing、state outcome、audit/state deltaの意味論一致を要求する。
- test時間の新SLAは設けず、重複generation・重複suite invocationの回数を固定する。
- Kiro IDEとOpenCodeの現adapter gapを既存能力と誤認せず、実装とfixtureを完了条件に含める。
