# Build Instructions

Unit: parallel-policy-docs（単一 unit、refactor scope、Test Strategy: Minimal）

## 前提

- Bun ランタイムと Node.js / npm（`mise` 管理）。依存導入は `npm install` のみ。

## ビルド

変更対象は Markdown 文書のみ（team.md、memory/phases/construction.md、Intent record）であり、ビルド工程を持たない。ビルドは repo 標準検証内の typecheck（既存コードの回帰確認）で代替する。

```sh
npm run typecheck
```

## ビルド検証

- `npm run typecheck` が exit 0 で終了すること（本 Intent はコードに触れないため、既存コードの回帰がないことの確認）。
