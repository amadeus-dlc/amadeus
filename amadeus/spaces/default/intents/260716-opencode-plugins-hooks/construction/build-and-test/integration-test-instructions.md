# Integration Test Instructions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../code-generation/code-generation-plan.md`(検証列・統制)、`../code-generation/code-summary.md`(出荷物・検証結果・レビュー)。2026-07-17。

## 対象と手順

新規 integration テストなし(コード変更ゼロ — code-summary.md)。既存 integration 層の非退行と docs ゲート面を検証:

- 実行: `bash tests/run-tests.sh --ci` — integration 層 142 files 全 pass(0 fail)
- docs 変更の検知面: t174 系 docs ゲート(legacy refs / 言語切替リンク)を含む全層 green を実測 — docs/guide/harnesses/opencode.md(en/ja)の更新が既存 docs 検査を破っていないことの機械確認

## 将来の配線 intent への引き継ぎ

配線確定時の integration テストは実 FS・spawn 面を `// size:` 宣言付きで tests/integration/ へ置く(ADR-4 / fs-tests-integration-first)。一時状態 fixture の明示包含(E-SDG-IC C1)も設計時に含める。
