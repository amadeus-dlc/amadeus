# Build Instructions

Unit: docs-codekb-guards（Test Strategy: Minimal、bugfix scope）

## ビルド手順

本 Intent の変更は Bun + TypeScript のエンジンツール・validator・eval であり、コンパイル成果物を生成しない。ビルド相当の検証は型検査である。

```sh
npm run typecheck
```

## 前提

- Node.js、npm、Bun が導入済みであること（`mise` 管理）。
- 依存は `npm install` で解決する（`package-lock.json` はコミットしない運用）。

## 結果

`npm run typecheck`（`tsc --noEmit`）はエラーなしで通過した。詳細は [build-test-results.md](build-test-results.md) を参照する。
