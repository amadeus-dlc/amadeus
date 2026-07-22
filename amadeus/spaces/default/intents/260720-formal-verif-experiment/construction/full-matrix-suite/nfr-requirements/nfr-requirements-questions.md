# NFR Requirements 質問 — full-matrix-suite

本質問は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` の既決境界を確認する。

## Q1. benchmark容量

- A. 2 arms × (warmup 1 + measured 5) suites、D-COUNT 7なら96 cells / 5なら72 cells、suite timeout 120秒とする
- B. cell単位で5回測る
- C. warmupをmedianへ含める
- X. その他

[Answer]: A — canonical full suiteを単位にし、5 measured valuesのindex 2をmedianとする。（E-FVEAD1）
**Basis:** `requirements.md` FR-5、`business-rules.md` BR-03/BR-17

## Q2. schedule fairness

- A. input hash由来first arm、warmup opposite→first、measured交互順、3対2残存偏りをraw表示する
- B.常にTを先行する
- C.順序補正scoreを加える
- X. その他

[Answer]: A — scheduleを開始前にidentity化し、position別raw値を保存して補正しない。（E-FVEAD1）
**Basis:** `business-logic-model.md` schedule、`business-rules.md` BR-05

## Q3. runtime stack

- A. Bun / TypeScript orchestrator、U3 evidence、U4/U6 frozen arms、Git numstatを使う
- B. benchmark serviceを追加する
- C. databaseへmatrixを保存する
- X. その他

[Answer]: A — local serial benchmarkとcontent-addressed recordに限定する。（E-FVEAD3）
**Basis:** `technology-stack.md` current stack、`requirements.md` Out of Scope
