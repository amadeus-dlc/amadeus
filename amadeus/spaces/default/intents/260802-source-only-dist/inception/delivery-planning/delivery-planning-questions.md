# Delivery Planning 質問票 — 260802-source-only-dist

上流入力(consumes 全数): unit-of-work / unit-of-work-dependency / unit-of-work-story-map(Bolt 編成の導出元 — 既決)、requirements(順序制約 — 既決)、components(規模 — 既決)。

> E-OC1 判定: Bolt 編成・並行度・順序は DAG と規範(walking skeleton・parallel-bolts・c6)から一意導出。真に未決のユーザー判断は「u8 Bolt のゲート要否」1件のみ → Q1。Construction autonomy mode は規範により Bolt 1 出荷後のラダープロンプトで選択するため本ステージでは問わない。

## 質問

### Q1. u8(source-only 原子切替)Bolt の人間ゲート要否

- A. u8 Bolt もゲート付き(推奨)— 不可逆級切替に P4 を適用
- B. ラダープロンプトの選択に委ねる
- X. Other

[Answer]: A — u8 Bolt(Bolt 7)に人間ゲートを置く。ゲート提示にはクリーン環境検証(移行順序4)の実測結果を添付する。skeleton(Bolt 1)と合わせて2点ゲート構成。

## 裁定の記録

- Q1 ユーザー承認: 2026-08-02T18:55:00Z(AskUserQuestion「u8 Bolt もゲート付き」を選択)
- 既決事項の出典: org.md Walking Skeleton(Bolt 1 ゲート+ラダープロンプト)、DAG(unit-of-work-dependency.md)、ADR-A8 Reversibility(不可逆性の根拠)
