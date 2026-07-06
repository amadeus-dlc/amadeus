# Build Instructions

Unit: guide-ops（Test Strategy: Minimal、refactor scope = docs 系）

## ビルド手順

本 Intent の変更は docs/guide/ の文書新設 + index 更新であり（[code-summary.md](../guide-ops/code-generation/code-summary.md)）、コンパイル対象を持たない。ビルド相当の検証は repo 標準検証の型検査・lint である。

```sh
npm run typecheck
npm run lint:check
```

## 結果

いずれも `npm run test:all` の一部として pass した。詳細は [build-test-results.md](build-test-results.md) を参照する。
