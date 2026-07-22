# NFR Requirements 質問 — ts-arm

本質問は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` の既決境界を確認する。

## Q1. 全域性とPBT

- A. core 5,760 cases + identity validation 160 casesを全数実行し、fast-check seed=20260720 / runs=100を追加する
- B. random sampleだけ実行する
- C. coreとidentityを同じ分母へ混ぜる
- X. その他

[Answer]: A — closed universeの全域性を正本とし、PBTは独立invariant補強として扱う。（E-FVEAD2 / E-FVEU6FD）
**Basis:** `requirements.md` FR-4/NFR-1、`business-rules.md` closed universe

## Q2. timeoutとruntime

- A. suite残時間と120秒の小さい方、Bun / fast-check lockfile identity、offline実行を固定する
- B. timeoutを無制限にする
- C. CIでlatest fast-checkを取得する
- X. その他

[Answer]: A — runtime / dependency / seed / boundsをfreezeし、driftは新revisionにする。（E-FVEAD2 / E-FVEAD3）
**Basis:** `requirements.md` NFR-1/NFR-3、`technology-stack.md` current stack

## Q3. blind境界

- A. public contractとopaque subjectだけを入力とし、TLA / fixture期待値 /先行evidenceへアクセスしない
- B. TLA counterexampleを学習入力にする
- C. regression名から期待verdictを推測する
- X. その他

[Answer]: A — Arm S authoring input allowlistと禁止path scanを維持する。（E-FVEDP2）
**Basis:** `requirements.md` FR-3、`business-rules.md` blind boundary
