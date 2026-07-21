# Functional Design 質問 — tla-invalid-timestamp-skeleton

本質問は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` の既決事項だけを確認する。

## Q1. walking-skeletonの対象

- A. frozen Arm T × sealed #1252 invalid-timestampだけを専用integration harnessで実証する
- B. 両arm × 全fixtureを最初から実行する
- C. Arm Sだけを先に実行する
- X. その他

[Answer]: A — risk-firstの1セルでfreeze→reveal→deterministic verdict→evidence→stop/passを実証し、成功前に残fan-outやArm Sを開始しない。（E-FVERA3R / E-FVEUG2）
**Basis:** `requirements.md` FR-8、`unit-of-work.md` U5完成境界

## Q2. skeleton pass条件

- A. 同一frozen inputの2回実行がともにDETECTEDでcounterexample identity一致し、freeze / injection / command / CI / raw evidenceが相互参照できる
- B. 1回でもnon-zero exitならpassとする
- C. artifactが存在すればverdict不問でpassとする
- X. その他

[Answer]: A — `HARNESS_ERROR`、`NOT_DETECTED`、非決定、証跡欠損を全てfailureにし、failure後のtransitionを0件にする。（E-FVERA3R / E-FVEAD2）
**Basis:** `requirements.md` FR-4/FR-8/NFR-1、`component-methods.md` exploration契約

## Q3. frontend成果物の要否

- A. frontend/UIなしとして生成しない
- B. skeleton result viewerを追加する
- C. CI dashboardを追加する
- X. その他

[Answer]: A — `services.md` はnon-interactive local CLIとmachine-readable evidenceだけを定義するため、optional `frontend-components.md` は生成しない。（E-FVEAD3）
**Basis:** `services.md` service stance、`components.md` 配置境界
