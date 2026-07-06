# Build Instructions

Unit: pr-gate-discipline（Test Strategy: Minimal、refactor scope = docs 系）

## 上流入力

検証対象は code-generation の実装 6 変更である。内訳は [code-generation-plan.md](../pr-gate-discipline/code-generation/code-generation-plan.md) と [code-summary.md](../pr-gate-discipline/code-generation/code-summary.md) を参照する。

## ビルド手順

本 Intent の変更は、知識文書（`.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md`）の新設、ルール文書 3 件（team.md、phases/construction.md、stage-protocol.md）への最小追記、parity-map.json の既存エントリ理由統合であり、コンパイル対象・実装コードを持たない。ビルド相当の検証は repo 標準検証に含まれる型検査・lint・parity である。

```sh
npm run typecheck
npm run lint:check
npm run parity:check
```

## 結果

いずれも `npm run test:all` の一部として pass した。詳細は [build-test-results.md](build-test-results.md) を参照する。
