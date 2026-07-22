# NFR Requirements 質問 — sealed-fixture-registry

本質問は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` の既決境界を確認する。

## Q1. registry容量

- A. 1 universe revisionをD-COUNT 7または根拠ある5、各arm/fixture開示最大1、promotion最大1に閉じる
- B. 6件を許す
- C. runtimeにfixtureを無制限追加する
- X. その他

[Answer]: A — 7独立proofが不能なら根拠ある5へ縮約し、6を作らない。（E-FVERA1R）
**Basis:** `requirements.md` FR-1、`business-rules.md` BR-06/BR-07

## Q2. data safety

- A. manifest由来entry全数をsecret / personal data / external election storeの3分類でscanし、全0件だけsealする
- B. caller指定pathだけscanする
- C. scanner failureを0件と扱う
- X. その他

[Answer]: A — manifest/scan bijectionとfixed rule-set identityを要求し、match contentはreceiptへ複製しない。（E-FVEAD3）
**Basis:** `requirements.md` NFR-3、`business-rules.md` BR-13〜17

## Q3. storage stack

- A. Bun / TypeScript、Git isolated worktree、node:fs / node:cryptoのimmutable filesystem storeを使う
- B. databaseを追加する
- C. arm codeへsealed store readを渡す
- X. その他

[Answer]: A — existing stackでcontent identity、atomic publish、grant-bound materializationを実装する。（E-FVEUG2）
**Basis:** `technology-stack.md` current stack、`business-logic-model.md` reveal境界
