# Build Instructions

Unit: u001-installer-versioning（Test Strategy: 既定、feature scope）

## ビルド対象

インストーラ（scripts/amadeus-install.ts）と eval（dev-scripts/evals/installer/check.ts）は Bun 直接実行の TypeScript でビルド生成物はない（[code-summary.md](../u001-installer-versioning/code-generation/code-summary.md)）。型検査 + lint が「ビルド検証」に相当し、`npm run test:all` に含まれる。

## 実行方法

```sh
npm run test:all           # 全段（installer eval を test:it:installer として含む）
npm run test:it:installer  # 単独実行
```

結果は [build-test-results.md](build-test-results.md) に記録する。
