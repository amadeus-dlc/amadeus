# build instructions（260706-model-overlay）

上流入力: [code-generation-plan.md](../model-overlay/code-generation/code-generation-plan.md)、[code-summary.md](../model-overlay/code-generation/code-summary.md)

## 適用判断

本 Intent の変更は Bun / TypeScript のスクリプト群（dev-scripts/ とエンジン tool 1 件）であり、ビルド産物を生成しない。型検査をビルド相当として扱う。

## 手順

1. `npm run typecheck`（`tsc --noEmit`。エンジン tool と dev-scripts を含む repo 全体）

## 期待結果

exit 0（型エラーなし）。
