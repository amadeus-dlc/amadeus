# Build Instructions：implicit

## 前提

- Bun がインストール済みである。
- repo root で `npm install` 相当は不要である（実行時依存なし、devDependencies は typescript と @types/bun のみ）。

## 手順

このリポジトリの成果物は TypeScript スクリプトと Markdown 契約であり、ビルドは型検査で代替する。

```sh
npm run typecheck
```

`tsc --noEmit` が exit 0 であればビルド成功として扱う。
