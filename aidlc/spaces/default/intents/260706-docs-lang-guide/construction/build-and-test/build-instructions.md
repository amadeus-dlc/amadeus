# Build Instructions

Unit: docs-lang-guide（Test Strategy: Minimal、refactor scope = docs 系）

## ビルド手順

本 Intent の変更は docs/amadeus 配下の文書新設と既存文書への参照追記であり、コンパイル対象・実装コードを持たない。ビルド相当の検証は repo 標準検証に含まれる型検査・lint である。

```sh
npm run typecheck
npm run lint:check
```

## 結果

いずれも `npm run test:all` の一部として pass した。詳細は [build-test-results.md](build-test-results.md) を参照する。
