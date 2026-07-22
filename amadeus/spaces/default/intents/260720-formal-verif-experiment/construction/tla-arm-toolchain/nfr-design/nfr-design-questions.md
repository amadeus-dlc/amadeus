# NFR Design 質問 — tla-arm-toolchain

本質問は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` の設計判断を閉じる。

## Q1. acquisition と run

- A. network許可acquisitionとnetwork-denied runを別adapter/capabilityに分離する
- B. run中にcache missを取得する
- C. 同一adapterへfetch portを残す
- X. その他

[Answer]: A — verified cache identityだけをoffline runnerへ渡す。（E-FVEAD3）
**Basis:** `security-requirements.md` Offline execution controls

## Q2. TLC parser

- A. 1.7.4専用incremental state machineでclosed marker grammarをparseする
- B. exit 0だけで完走とする
- C. substring検索でcounterexampleを推定する
- X. その他

[Answer]: A — queue=0、EXHAUSTED、stats、warning 0を同一runへ結合する。（E-FVEAD2）
**Basis:** `reliability-requirements.md` Run and parser reliability

## Q3. profile expansion

- A. fixed profile identityからの逸脱をrejectし全cell新revisionへ委譲する
- B. runtimeでworkers/depthを調整する
- C. cell単位でboundsを変える
- X. その他

[Answer]: A — exhaustive-small universeを混在させない。（E-FVEAD2）
**Basis:** `scalability-requirements.md` Growth policy

