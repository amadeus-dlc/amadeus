# NFR Design 質問 — full-matrix-suite

本質問は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` の判断を閉じる。

## Q1. schedule state

- A. U3 SuiteResultManifest後にU7 terminalをcommitし、両store再読後だけ次ordinalへ進む
- B. memory counterだけで進む
- C. terminalを先に書く
- X. その他

[Answer]: A — crash時もresultなしterminalを許さない。（E-FVEAD1）
**Basis:** `reliability-requirements.md` Schedule and resume

## Q2. host fairness

- A. cpuset/memory exclusive leaseとResourcePolicyIdentityを両armで固定する
- B. host loadを無視する
- C. arm別resourceを使う
- X. その他

[Answer]: A — telemetry driftはincompleteにする。（E-FVEAD1）
**Basis:** `performance-requirements.md` Resource controls

## Q3. median

- A. complete measured 5値だけをsortしindex2、position raw値を残す
- B. warmup/timeoutを含める
- C.順序補正する
- X. その他

[Answer]: A —3対2偏りを表示し補正しない。（E-FVEAD1）
**Basis:** `performance-requirements.md` Benchmark budget

