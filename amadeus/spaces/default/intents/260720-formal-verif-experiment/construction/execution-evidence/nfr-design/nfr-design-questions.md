# NFR Design 質問 — execution-evidence

本質問は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` の境界を、実装可能な設計判断へ閉じる。

## Q1. durable publish の可視化点

- A. transaction directory の exclusive rename を可視化点とし、parent directory sync 後だけ成功を返す
- B. payload ごとの rename 完了時に成功を返す
- C. ledger entry の書込みだけを成功条件にする
- X. その他

[Answer]: A — bundle と runner/store ledger entry を同一 transaction に束ね、rename 後・parent sync 前の応答喪失は transaction identity の再照合へ収束させる。（E-FVEU3FD1）
**Basis:** `reliability-requirements.md` Commit and recovery、`business-logic-model.md` Atomic evidence publish

## Q2. suite deadline の配分

- A. injected monotonic clock から残時間を算出し、各 subprocess timeout を残時間以下に切り詰める
- B. cell ごとに120秒へ reset する
- C. timeout 回避のため cell を並列化する
- X. その他

[Answer]: A — suite 全体の120秒を唯一の budget とし、deadline 到達後は未起動 cell を spawn しない。（E-FVEAD1 / E-FVEAD2）
**Basis:** `performance-requirements.md` Time budgets、`scalability-requirements.md` Scaling behavior

## Q3. executable と path の検証位置

- A. `ExecutionPolicy` が command 作成前に executable identity、cwd、入出力 path、environment を一括検証する
- B. subprocess 起動後に receipt だけを検査する
- C. shell と OS の既定解決へ委ねる
- X. その他

[Answer]: A — 不正な実体や path を spawn 前に拒否し、検証済みの array argv と allowlisted environment だけを process port へ渡す。（E-FVEAD3）
**Basis:** `security-requirements.md` Execution isolation、`tech-stack-decisions.md` Selected stack
