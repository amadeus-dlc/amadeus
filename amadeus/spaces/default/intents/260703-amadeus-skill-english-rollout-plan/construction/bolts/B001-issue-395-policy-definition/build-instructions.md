# Build Instructions：B001 #395 方針確定

## 前提

- Bun がインストール済みである。
- Node.js と npm が利用できる。
- repo root で実行する。

## 手順

この Bolt の変更は文書、ルール、Amadeus DLC 成果物である。

ビルドは型検査で代替する。

```sh
npm run typecheck
```

`tsc --noEmit` が exit 0 であればビルド成功として扱う。
