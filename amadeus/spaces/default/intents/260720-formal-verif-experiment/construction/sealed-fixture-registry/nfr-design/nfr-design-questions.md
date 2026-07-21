# NFR Design 質問 — sealed-fixture-registry

本質問は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` の設計判断を閉じる。

## Q1. proof と scan の実行単位

- A. revision coordinator が候補を serial 実行し、各 command/scan に個別 deadline を与える
- B. 全候補を並列実行する
- C. timeout を success として継続する
- X. その他

[Answer]: A — 7/5 の closed universe と raw receipt を維持し、失敗は seal 前に止める。（E-FVERA1R）
**Basis:** `performance-requirements.md` Bounded workload

## Q2. disclosure の capability

- A. commit 済み event と single-use grant の組を materializer が検証する
- B. sealed path を arm に渡す
- C. worktree 名だけを認可に使う
- X. その他

[Answer]: A — grant を seal/arm/freeze/worktree/destination に bind し、receipt commit で消費する。（E-FVEAD3）
**Basis:** `security-requirements.md` Disclosure authorization

## Q3. reservation の recovery

- A. durable ACTIVE claim を same revision resume または verified-stale abort だけで閉じる
- B. startup 時に全 claim を削除する
- C. free-space snapshot だけで代用する
- X. その他

[Answer]: A — immutable recordを消さず、二重claimと別revision開始を拒否する。（E-FVEUG2）
**Basis:** `reliability-requirements.md` Durable transactions、`scalability-requirements.md` Multi-revision retention

