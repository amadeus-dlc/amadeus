# NFR Requirements 質問 — experiment-contract-provenance

本質問は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` の既決境界だけを確認する。

## Q1. 性能上限の定義

- A. 新しい恣意的latency SLAを置かず、closed input cardinality、single dispatch、bounded fold、downstream 120秒timeout非延長を検証する
- B. 全commandへ一律10ms SLAを追加する
- C. network service化してthroughput SLAを置く
- X. その他

[Answer]: A — U1はlocal CLIのpure contract / coordinatorであり、外部I/O latencyを所有しない。固定cardinalityと1 command / 1 handlerを性能契約とする。（E-FVEAD2 / E-FVEUG2）
**Basis:** `requirements.md` FR-4/FR-5、`business-rules.md` BR-20〜23

## Q2. security / compliance境界

- A. local capability、allowlist、content identity、private input 0件を要求し、remote authや個人情報処理を追加しない
- B. OAuth認証を追加する
- C. cloud secret managerを追加する
- X. その他

[Answer]: A — blind比較の入力隔離と証跡完全性がsecurity境界であり、network / remote principal / regulated personal dataはOut of Scopeとする。（E-FVEDP2 / E-FVEDPS13）
**Basis:** `requirements.md` FR-3/NFR-2、`business-rules.md` BR-07〜13

## Q3. 技術スタック

- A. Bun 1.3.13 / TypeScript ESM / node:crypto / bun:test / fast-checkを既存範囲で使い、新規runtime依存を追加しない
- B. databaseとqueueを追加する
- C.別言語へ移植する
- X. その他

[Answer]: A — brownfieldの現行stackとpure port境界を維持し、identity / state machine / PBTを既存toolchainで検証する。（E-FVEAD3）
**Basis:** `technology-stack.md` current stack、`business-logic-model.md` pure contract
