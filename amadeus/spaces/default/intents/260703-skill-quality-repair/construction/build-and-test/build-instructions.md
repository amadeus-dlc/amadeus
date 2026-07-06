# Build Instructions

Unit: skill-quality-repair（単一 unit、refactor scope、Test Strategy: Minimal）

## 前提

- Bun ランタイムと Node.js / npm（`mise` 管理）。
- 依存導入は `npm install` のみ。ローカルサービスや環境変数の追加設定は不要である。

## ビルド

本 Intent の変更対象は skill の Markdown、references、TypeScript 検査スクリプトであり、コンパイル成果物を持たない。ビルドは型検査で代替する。

```sh
npm run typecheck
```

## ビルド検証

- `npm run typecheck` が exit 0 で終了すること。
- 変更した TypeScript（`dev-scripts/issue-ref-contract.ts`、`dev-scripts/check-issue-ref-contract.ts`）が型検査対象に含まれること。

## トラブルシューティング

- `bun: command not found` → `mise trust && mise install` を実行する。
- promote 済み skill と source の差分エラー → `.agents/skills/amadeus-*` を直接編集せず、`bun run dev-scripts/promote-skill.ts <skill> --replace` で再同期する。
