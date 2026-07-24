# Scope Document — 260722-tla-plugin

上流入力(consumes 全数): intent-statement(読了・依拠)、feasibility-assessment(読了 — GO判定と R1〜R4 を順序決定に反映)、constraint-register(読了 — T1〜T5/O1〜O4/G1〜G3 を境界条件として採用)

## スコープ境界(In / Out)

### In(本intentに含む — すべて Must、Q2裁定)

| # | Capability | 成功指標との対応 |
|---|---|---|
| C1 | formal-model-check ステージの plugins/ バンドル新設(compose/doctor/drop のライフサイクル通過) | 指標5 |
| C2 | FormalElection の .tla 外部ファイル化(バイト同一性検証+既知欠陥での 7/7 再現確認) | 指標1 |
| C3 | run-model-check.ts — TLC 実行コアの汎用化(fail-closed 契約保持、ローカル macOS + CI Linux/Docker の両経路) | 指標2 |
| C4 | ci.yml 統合(Linux ランナー + 既成 Docker イメージ digest 固定、workflow_dispatch 専用)+ formal-verification.yml 退役 | 指標3 |
| C5 | 完備性 sensor 新設(モデル⇔実装対応のドリフト検出、落ちる実証+正当データ両側実測) | 指標4 |

### Out(Won't — 明示除外)

- 実験専用資材(arm-s系・eligibility系・run-skeleton-ci.ts)の退役・整理(将来intent)
- 監査ロック・provenance 等の新規 .tla モデル書き起こし(将来intent)
- Linux ネイティブ sandbox provider(nsjail 等)の実装 — CI は Docker 経由で充足
- 形式検証の日常 CI への一律義務化(既決態勢に反するため恒久除外)
- リリース・バージョン面の変更(release.yml 一本 — Mandated)

## 優先順位と実行順序(Q1裁定: risk-first)

1. **Walking skeleton(最初の Bolt・ゲート付き)**: C1+C2 の薄い E2E — plugin compose → graph 解決 → formal-model-check ステージ実行 → 外部化 .tla の TLC 完全探索1回。R3(plugin E2E 未実証)と R4(モデル同一性)をここで潰す
2. C3 の完全化(両経路・fail-closed 契約の落ちる実証)
3. C4(CI 統合+退役)
4. C5(完備性 sensor+両側実測)

## 制約の継承

constraint-register の全制約(T1〜T5、O1〜O4、G1〜G3)を本スコープの境界条件として継承する。特に: CI は Linux + Docker digest 固定(T1)、opt-in 依存の文書化(O1)、workflow_dispatch 専用(O2)、落ちる実証の両側(G3)。

## 期限

なし(Q3裁定)— 品質ゲート優先で進行する。
