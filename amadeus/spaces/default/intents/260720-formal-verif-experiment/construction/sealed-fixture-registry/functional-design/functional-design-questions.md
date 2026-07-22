# Functional Design 質問 — sealed-fixture-registry

本質問は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` の既決事項だけを確認する。

## Q1. D-COUNTの閉じ方

- A. 7 predicateを各々独立falling proofで立証し、1件でも不能なら根拠ある5 root clusterへ全体を縮約する
- B. 立証できた件数をそのまま6件として使う
- C. 当初の7件を証拠なしで固定する
- X. その他

[Answer]: A — 各predicateに独立red/green proofを要求し、非対称な6件を作らない。5件へ縮約する場合は成功指標とmatrix分母も同時に訂正する。（E-FVERA1R）
**Basis:** `requirements.md` FR-1、`unit-of-work.md` sealed-fixture-registry完成境界

## Q2. promotionの実行権限

- A. Registryは検証とmanifest生成を所有し、Coordinatorのpermission receiptを受けた時だけpromotionする
- B. 全fixtureがsealされた時点で自動promotionする
- C. arm authorが任意にpromotionする
- X. その他

[Answer]: A — 両arm freezeとskeleton passをCoordinatorが検証したpermission receiptを必須とし、Registryは時機を独自判断しない。（E-FVEUG2 / E-FVEAD3）
**Basis:** `component-methods.md` `promoteFixtureManifest`、`components.md` Blind公開state machine

## Q3. frontend成果物の要否

- A. frontend/UIなしとして生成しない
- B. fixture registry viewerを追加する
- C. disclosure dashboardを追加する
- X. その他

[Answer]: A — `services.md` はnon-interactive local CLIだけを定義し、sealed recordとmanifestはmachine-readable artifactとして扱う。（E-FVEAD3）
**Basis:** `services.md` service stance、`components.md` 配置境界
