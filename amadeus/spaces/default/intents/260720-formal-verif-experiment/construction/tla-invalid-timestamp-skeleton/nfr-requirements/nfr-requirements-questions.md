# NFR Requirements 質問 — tla-invalid-timestamp-skeleton

本質問は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` の既決境界を確認する。

## Q1. skeleton反復

- A. #1252を同一CompositionHeadでlocal exactly 2回、CI artifact exactly 2 attempts実行し、全てDETECTED / 同一counterexampleを要求する
- B. 1回成功でpassする
- C. 失敗時に別fixtureへ切り替える
- X. その他

[Answer]: A — risk-first skeletonは決定論性とCI traceが揃う場合だけpassする。（E-FVERA3R / E-FVEAD2）
**Basis:** `requirements.md` FR-8/NFR-1、`business-rules.md` BR-06〜16

## Q2. composition境界

- A. healthy baselineへArm T owned diff、その後#1252 patchを適用した専用commitを固定しmainへmergeしない
- B. main worktreeへ直接patchする
- C. injectionを先にArm T authorへ開示する
- X. その他

[Answer]: A — freeze後に限定開示し、HEAD/tree/cleanを各run直前に再検証する。（E-FVEUG2）
**Basis:** `business-logic-model.md` composition、`business-rules.md` BR-01〜05

## Q3. runtime stack

- A. Bun / TypeScript harness、Git worktree、verified Java/TLC、existing CI artifactを使う
- B. deployment環境を追加する
- C. databaseへevidenceを保存する
- X. その他

[Answer]: A — repo-local integration harnessとrecord evidenceに限定する。（E-FVEAD3）
**Basis:** `technology-stack.md` current stack、`requirements.md` Out of Scope
