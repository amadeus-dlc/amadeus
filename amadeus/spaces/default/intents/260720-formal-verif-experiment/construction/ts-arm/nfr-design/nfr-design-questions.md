# NFR Design 質問 — ts-arm

本質問は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` の判断を閉じる。

## Q1. universe executor

- A. streaming mixed-radix iteratorで5,760/160を別coverage proofにする
- B.全caseをheap配列にする
- C. random samplingへ縮約する
- X. その他

[Answer]: A — closed key bijectionを正本にする。（E-FVEAD2 / E-FVEU6FD）
**Basis:** `performance-requirements.md` Operation and memory bounds

## Q2. runtime freeze

- A. one-time immutable snapshot receiptとOS read-only sandboxを使う
- B.毎run timer外で全量rehashする
- C. latest dependencyを取得する
- X. その他

[Answer]: A — Bun/lockfile/fast-check/source treeをcontent identityへbindする。（E-FVEAD3）
**Basis:** `tech-stack-decisions.md` Runtime freeze

## Q3. claim recovery

- A. dead owner確認後のatomic RESUMED successorで所有権移転する
- B. same claimを無条件再利用する
- C. live owner中に並行実行する
- X. その他

[Answer]: A —同一runの二重実行を禁止する。（E-FVEDP2）
**Basis:** `reliability-requirements.md` Failure and recovery

