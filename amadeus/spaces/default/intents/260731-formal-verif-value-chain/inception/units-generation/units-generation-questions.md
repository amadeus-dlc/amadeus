# Units Generation — 質問票

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

## Q1. FR-E(e2e 受け入れ実測)の Unit 化の形

component-dependency の E2E ノードを独立 Unit にするか、build-and-test ステージへ折り込むか。

A. 検証専用 Unit として最終 Unit 化(推奨)
B. build-and-test へ折込
X. Other (please specify)

[Answer]: A. 検証専用 Unit(最終 Unit u8-e2e-acceptance)— 2026-07-31 ユーザー直接裁定

## 裁定の記録

- Q1 はユーザーの直接回答(AskUserQuestion 経由)。ソロモードにつき選挙不要 — 根拠種別: ユーザー直接裁定(1問1行)。他の Unit 境界は component-dependency.md の依存グラフと units-generation:c1(1 Unit = deployable Bolt)からの機械的導出=執行クラス。
- ユーザー承認: 2026-07-31T10:24:11Z
