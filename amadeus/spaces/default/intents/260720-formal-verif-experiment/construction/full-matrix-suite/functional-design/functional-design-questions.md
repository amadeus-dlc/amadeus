# Functional Design 質問 — full-matrix-suite

本質問は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` の既決事項だけを確認する。

## Q1. benchmark反復とtimeout

- A. armごとにfull-suite warmup 1回、measured 5回、suite単位timeout 120秒とする
- B. cellごとに5回測定する
- C. warmupを中央値へ含める
- X. その他

[Answer]: A — canonical input set全体を1 suiteとして1 warmup + 5 measuredし、5 durationのsort後index 2を中央値にする。全raw sampleを保存する。（E-FVEAD1 / E-FVEAD2）
**Basis:** `component-methods.md` benchmark契約、`requirements.md` FR-5

## Q2. canonical input set

- A. `HEALTHY_BASELINE`を先頭にpromoted manifestのcanonical alias順でD-COUNT件を続ける
- B. armごとに検出しやすい順へ並べる
- C. filesystem列挙順を使う
- X. その他

[Answer]: A — 両armへ同じmanifest hashとordered subjectsを渡し、順序・件数・input hash driftを拒否する。（E-FVERA1R / E-FVEUG2）
**Basis:** `component-methods.md` canonical input set、`unit-of-work.md` U7完成境界

## Q3. frontend成果物の要否

- A. frontend/UIなしとして生成しない
- B. benchmark dashboardを追加する
- C. matrix viewerを追加する
- X. その他

[Answer]: A — `services.md` はnon-interactive local CLIとraw JSON evidenceだけを定義するため、optional `frontend-components.md` は生成しない。（E-FVEAD3）
**Basis:** `services.md` service stance、`components.md` 配置境界
