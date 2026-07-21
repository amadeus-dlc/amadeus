# NFR Requirements 質問 — tla-arm-toolchain

本質問は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` の既決境界を確認する。

## Q1. TLC実行profile

- A. TLA+ tools 1.7.4 / OpenJDK 26.0.1 / workers=1 / heap 256–1024 MiB / timeout 120秒を固定する
- B. worker数を自動調整する
- C. depth limit到達をNOT_DETECTEDにする
- X. その他

[Answer]: A — 固定点完走とqueue=0を要求し、timeout / partial explorationはHARNESS_ERRORとする。（E-FVEAD2）
**Basis:** `requirements.md` FR-4/NFR-1、`business-rules.md` BR-05/BR-07/BR-18

## Q2. artifact取得境界

- A. 固定HTTPS URL / SHA-256 / redirect allowlist / 128 MiB capで取得し、runはofflineに分離する
- B. run中にlatest jarを自動取得する
- C. checksum不一致でもversion表示が合えば使う
- X. その他

[Answer]: A — acquisitionだけnetworkを許し、cacheをrun前に毎回再hashする。（E-FVEAD3）
**Basis:** `requirements.md` NFR-3、`business-rules.md` BR-01〜04

## Q3. runtime stack

- A. Bun / TypeScript adapter、OpenJDK 26.0.1、TLA+ tools 1.7.4、array argvを使う
- B. container runtimeを追加する
- C. shell scriptだけでparseする
- X. その他

[Answer]: A — repo-local scripts/testsに限定し、framework / dist / self-installへ追加しない。（E-FVEAD3）
**Basis:** `technology-stack.md` current stack、`requirements.md` Out of Scope
