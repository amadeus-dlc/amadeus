# Domain Entities — u8-e2e-acceptance

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## E1: 実測記録(新規成果物)

`<record>/construction/u8-e2e-acceptance/` 配下の実測レポート群(S5)。消費者: build-and-test の verdict・intent 完了判定・ミラー Issue の状態行(価値対応は unit-of-work-story-map.md、契約面は component-methods.md C4/C5/C8)。

## E2: audit イベント列

formal-model-check ステージイベント(components.md C8 の検証到達面)・advisories 消費の痕跡(C4)・CP1/CP2 の発火記録(C5)。所在: 実 intent の audit shard(改変禁止 — append-only)。

## E3: 反例トレース

u7 AsImplemented 変種の TLC 反例出力(S3)。#1838 の実測バグの形式的再現として record へ保存(services.md の運用ループの実証)。
