# build instructions（260706-docs-consistency）

上流入力: [code-generation-plan.md](../docs-consistency/code-generation/code-generation-plan.md)、[code-summary.md](../docs-consistency/code-generation/code-summary.md)

## 適用判断

本 Intent は文書（docs/amadeus と steering）だけを変更し、ビルド産物を生成しない。型検査をビルド相当として扱う。

## 手順

1. `npm run typecheck`（test:all 内で実行される。TS 実装への変更はない）

## 期待結果

exit 0。
