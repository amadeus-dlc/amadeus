# unit-test instructions（260706-adr-vocab）

上流入力: [code-generation-plan.md](../adr-vocab/code-generation/code-generation-plan.md)、[code-summary.md](../adr-vocab/code-generation/code-summary.md)

## 適用判断

不適用とする。専用の unit-test 工程は実施しない。

## 根拠

本 Intent は新規の実行コード・関数を追加していない（文書と skill 文言のみ）。決定論的な受け入れ検証は integration 側の横断 grep 4 項目と既存 lint（rename-leftovers 等）が担う。
