# Security Test Instructions — 260809-sensor-parseflags-failop

上流入力(consumes 全数): code-generation-plan.md(実装ステップと検証手順の宣言元)/ code-summary.md(実装面・検証実測の正本)。

## 比例選定の根拠と担保面

**比例選定**: 本修正自体がセキュリティ性質(検証系入力面の fail-open 封鎖 — parse-don't-validate)であり、その検証は t520/t521 の負例アーム(不正形の loud 拒否)が担う。追加の専用セキュリティ試験(DAST 等)は対応 NFR・攻撃面の実測がなく新設しない(c3/c4)。依存追加ゼロ(新規モジュールは自前実装のみ)のため dependency audit の差分もなし。

## 参照

- 結果の正本: build-test-results.md(本ステージ内)
