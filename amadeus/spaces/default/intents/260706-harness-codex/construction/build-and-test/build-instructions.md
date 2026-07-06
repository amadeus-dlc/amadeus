# Build Instructions

Unit: u001-harness-codex（Test Strategy: 既定、feature scope だが変更は設定ファイル + 文書）

## 上流入力

検証対象は code-generation の実装（内訳は [code-generation-plan.md](../u001-harness-codex/code-generation/code-generation-plan.md) と [code-summary.md](../u001-harness-codex/code-generation/code-summary.md) を参照）である。

## ビルド手順

本 Bolt の変更は設定ファイル（yaml 38×2）、文書 2 件、データ宣言 1 行であり、コンパイル対象を持たない。ビルド相当の検証は repo 標準検証の型検査・lint・parity である。

```sh
npm run typecheck && npm run lint:check && npm run parity:check
```

## 結果

いずれも `npm run test:all` の一部として pass した。詳細は [build-test-results.md](build-test-results.md) を参照する。
