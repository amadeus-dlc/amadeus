# Build Instructions

Unit: feature-diff（docs 系 refactor、Minimal）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../feature-diff/code-generation/code-generation-plan.md) と [code-summary.md](../feature-diff/code-generation/code-summary.md) を参照）である。

## ビルド手順

本 Intent の変更は docs/amadeus 直下の文書 2 件のみでコンパイル対象を持たない。ビルド相当は repo 標準検証の型検査・lint である。

```sh
npm run typecheck && npm run lint:check
```

## 結果

いずれも `npm run test:all` の一部として pass した。詳細は [build-test-results.md](build-test-results.md) を参照する。
