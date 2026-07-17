# Unit Test Instructions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../code-generation/code-generation-plan.md`(検証列・統制)、`../code-generation/code-summary.md`(出荷物・検証結果・レビュー)。2026-07-17。

## 対象と手順

本 Bolt はコード変更ゼロ(code-summary.md — E-1049-CG0 Q1=A で plugin 実装なし)のため、**新規 unit テストは存在しない**(AC-3a のテスト2系は「配線確定分」への条件付き要件で、配線0につき対象なし)。既存 unit 層の非退行のみを検証する:

- 実行: `bash tests/run-tests.sh --ci`(unit 層は同ランナーに包含)
- 実測: unit 層 210 files 全 pass(--ci サマリの scope×size 行列より。0 fail)

## 将来の配線 intent への引き継ぎ

配線が確定した場合の unit テスト設計は functional-design(reconstruct 純関数・fs トークン禁止 — fs-tests-integration-first)と #1126(ライブ語彙実測)に従う。
