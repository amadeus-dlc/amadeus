# unit-test instructions（260706-docs-consistency）

上流入力: [code-generation-plan.md](../docs-consistency/code-generation/code-generation-plan.md)、[code-summary.md](../docs-consistency/code-generation/code-summary.md)

## 適用判断

不適用とする。専用の unit-test 工程は実施しない。

## 根拠

本 Intent は新規の実行コードを追加していない（文書のみ）。決定論的な受け入れ検証は integration 側の横断 grep（リンク切れ + Operation 矛盾表現 5 文字列）と標準検証が担う。
