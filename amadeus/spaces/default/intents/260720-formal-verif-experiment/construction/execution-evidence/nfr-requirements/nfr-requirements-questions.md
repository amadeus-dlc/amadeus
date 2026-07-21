# NFR Requirements 質問 — execution-evidence

本質問は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` の既決境界を確認する。

## Q1. timeoutと容量

- A. suite 120秒、D-COUNT 7なら96 cells / 5なら72 cellsをclosed上限とし、残deadlineでserial実行する
- B. cellごとに120秒へresetする
- C. cellを並列実行する
- X. その他

[Answer]: A — suite全体のdeadlineを延長せず、HARNESS_ERROR後も残時間内だけ後続cellを続ける。（E-FVEAD1 / E-FVEAD2）
**Basis:** `requirements.md` FR-4/FR-5、`business-rules.md` BR-05/BR-14/BR-15

## Q2. evidence durability

- A. single-writer lock、expected-head再確認、transaction directory atomic rename、hash-chain再読で閉じる
- B. bundleと2 ledgerを別々にappendする
- C. handwritten JSONをfallback採用する
- X. その他

[Answer]: A — bundleとrunner/store ledgerを同じtransactionでpublishし、response喪失はtransaction lookupへ収束させる。（E-FVEU3FD1）
**Basis:** `business-logic-model.md` atomic publish、`business-rules.md` BR-09/BR-10

## Q3. runtime stack

- A. Bun / TypeScript、array argv subprocess、node:fs / node:crypto、bun:testを既存範囲で使う
- B. databaseを追加する
- C. shell pipelineへ再結合する
- X. その他

[Answer]: A — shell文字列化と新規runtime dependencyを避け、filesystem content-addressed storeを維持する。（E-FVEAD3）
**Basis:** `technology-stack.md` current stack、`business-rules.md` BR-02/BR-08
