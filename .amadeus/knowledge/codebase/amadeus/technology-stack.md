# 技術スタック：amadeus

## 言語とランタイム

- TypeScript（strict）。実行は Bun に任せ、`tsc --noEmit` は型検査だけに使う。
- スクリプトと validator はすべて Bun 前提の `.ts` である（dev-scripts 規則）。
- 成果物と skill 本文は日本語 Markdown である。

## 主要ライブラリ

- 実行時依存はない。devDependencies は `typescript` と `@types/bun` だけである。
- Node.js 標準 API（`node:fs`、`node:path`、`node:crypto`）と Bun API（`Bun.spawnSync` ほか）だけを使い、外部パッケージを増やさない方針である。
- real provider の e2e と examples 生成は、`dev-scripts/run-{codex,claude}-{corporate,personal}.sh` の wrapper 経由で codex / claude CLI を起動する（runner 名で CLI 種別を判別）。
- CI は GitHub Actions（`.github/workflows/ci.yaml`）で `npm run test:all` を実行する。
