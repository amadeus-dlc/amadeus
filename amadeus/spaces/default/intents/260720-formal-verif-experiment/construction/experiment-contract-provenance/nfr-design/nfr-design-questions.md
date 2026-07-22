# NFR Design 質問 — experiment-contract-provenance

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。

## Q1. provenance store commit方式

- A. immutable transaction objectを先にdurable化し、別のcontent-addressed HEAD pointerをatomic更新する
- B. mutable ledger fileをin-place更新する
- C. databaseを追加する
- X. その他

[Answer]: A — crash時はold/new HEADのどちらかへ収束し、transaction objectを上書きしない。（E-FVEU1NFR）
**Basis:** `reliability-requirements.md` atomic recovery、`business-logic-model.md` appendBatch

## Q2. authorization設計

- A. state + command固有proof validator registryを使い、共通capabilityを新設しない
- B.全command共通tokenを追加する
- C. process userだけで許可する
- X. その他

[Answer]: A — start/freeze/reveal/skeleton/promotionの既決proofをcommand別に検証する。（E-FVEDP2）
**Basis:** `security-requirements.md` command-specific proof、`business-logic-model.md` state fold

## Q3. deployment形態

- A. repo-local Bun/TypeScript moduleとfilesystem adapterに限定する
- B. remote service化する
- C. queue workerへ分割する
- X. その他

[Answer]: A — network / database / daemonを追加せずport境界を維持する。（E-FVEAD3）
**Basis:** `tech-stack-decisions.md` selected stack、`scalability-requirements.md` closed capacity
