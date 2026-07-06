# Build Instructions

Unit: agmsg-trial-docs（Test Strategy: Minimal、docs 系 refactor）

## 適用判断

本 Intent はコードを生成しない（code-summary.md の逸脱記録を参照）ため、Intent 固有のビルド対象は存在しない。repo 標準の型検査・lint は `npm run test:all` に含まれ、成果物（Markdown のみ）が repo のビルドを壊していないことの確認をもってビルド検証とする。

## 実行方法

```sh
npm run test:all
```

結果は [build-test-results.md](build-test-results.md) に記録する。
