# Build Instructions

Unit: evaluator-vocabulary（単一 unit、refactor scope、Test Strategy: Minimal）

## 前提

- Bun ランタイムと Node.js / npm（`mise` 管理）。依存導入は `npm install` のみ。

## ビルド

変更は文書・SKILL・eval fixture の語彙読み替えのみで、ビルド工程を持たない。repo 標準検証内の typecheck（eval fixture 変更の回帰確認）で代替する。

```sh
npm run typecheck
```

## ビルド検証

- `npm run typecheck` が exit 0 で終了すること。
