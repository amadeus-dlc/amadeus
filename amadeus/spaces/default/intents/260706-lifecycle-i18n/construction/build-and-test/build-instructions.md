# Build Instructions

Unit: u001-lifecycle-i18n（Test Strategy: Minimal、refactor scope、docs 変更）

## ビルド対象

本 Intent の変更は docs/amadeus/ 配下の対訳ペア（lifecycle 6+6 ファイル、逆方向リンク 4 ファイル）と Intent record のみであり、ビルド生成物はない（[code-summary.md](../u001-lifecycle-i18n/code-generation/code-summary.md) の変更一覧を参照）。型検査・lint・parity 検査が「ビルド検証」に相当し、いずれも `npm run test:all` に含まれる。

## 実行方法

```sh
npm run test:all
```

結果は [build-test-results.md](build-test-results.md) に記録する。
