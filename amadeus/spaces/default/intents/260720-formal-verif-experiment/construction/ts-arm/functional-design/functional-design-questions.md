# Functional Design 質問 — ts-arm

本質問は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` の既決事項だけを確認する。

## Q1. Arm Sの判定構成

- A. closed universe宣言、直積全域性総当たり、fast-check不変条件、submittedAt / receivedAt brand境界を組み合わせる
- B. 既存回帰testだけを再実行する
- C. fast-checkのrandom samplingだけにする
- X. その他

[Answer]: A — 直積の全cellを重複・欠損なく検査し、sequence不変条件を固定seed / 100 runsで補完する。既存回帰test名やfixture期待値はblind freeze前に入力しない。（E-FVERA1R / E-FVEAD2）
**Basis:** `requirements.md` FR-3/FR-4、`unit-of-work.md` ts-arm完成境界

## Q2. 二つの時刻型の境界

- A. `SubmittedAt`と`ReceivedAt`を別opaque brand / parserにし、per-voter resolutionとlatenessへ別々にしか渡せない
- B. 両方ともplain stringとして共用する
- C. runtime field名だけで区別する
- X. その他

[Answer]: A — submittedAtは投票者別resolution、receivedAtはtally後latenessだけに使用し、逆接続をcompile-time negative testとruntime propertyで拒否する。（E-FVERA1R）
**Basis:** `requirements.md` FR-3/NFR-4、`component-methods.md` timestamp domain

## Q3. frontend成果物の要否

- A. frontend/UIなしとして生成しない
- B. property test viewerを追加する
- C. universe explorerを追加する
- X. その他

[Answer]: A — `services.md` はlocal non-interactive CLIとmachine-readable resultだけを定義するため、optional `frontend-components.md` は生成しない。（E-FVEAD3）
**Basis:** `services.md` service stance、`components.md` 配置境界
