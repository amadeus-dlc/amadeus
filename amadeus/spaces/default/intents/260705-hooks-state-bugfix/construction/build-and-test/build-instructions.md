# Build Instructions

Unit: hooks-state-bugfix（単一 unit、bugfix scope、Test Strategy: Minimal）

## 前提

- Bun ランタイムと Node.js / npm（`mise` 管理）。依存導入は `npm install` のみ。

## ビルド

変更対象はエンジン TypeScript（tools / hooks）と検証スクリプトであり、コンパイル成果物を持たない。ビルドは型検査で代替する。

```sh
npm run typecheck
```

## ビルド検証

- `npm run typecheck` が exit 0 で終了すること（amadeus-state.ts / amadeus-utility.ts / amadeus-lib.ts / hooks / 新規 eval を含む）。

## トラブルシューティング

- `.agents/skills/amadeus-*` と source の差分エラー → promote-skill.ts で再同期する。engine ファイルの parity エラー → parity-map.json の engineFileExceptions 宣言と skills/ 正準ソース反映を確認する。
