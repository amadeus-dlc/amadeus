# build instructions（260706-adr-vocab）

上流入力: [code-generation-plan.md](../adr-vocab/code-generation/code-generation-plan.md)、[code-summary.md](../adr-vocab/code-generation/code-summary.md)

## 適用判断

本 Intent は文書（docs 退役・語彙正準化・規範統合）と skill 文言だけを変更し、ビルド産物を生成しない。型検査をビルド相当として扱う。

## 手順

1. `npm run typecheck`（test:all 内で実行される）

## 期待結果

exit 0（型エラーなし。TS 実装への変更はないため既存どおり pass する）。
