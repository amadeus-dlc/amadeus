# Build Instructions

Unit: engine-validator-gap（code-generation-plan.md の Step 1〜9 に対応する検証手順）

## 前提

- ランタイム：bun（`package.json` の Build System として検出済み）
- 依存関係の導入：`npm install`（既存環境では導入済み）
- 追加の環境変数、設定ファイル、ローカルサービスは不要。

## ビルドコマンド

本リポジトリはトランスパイル成果物を持たず、型検査がビルド相当の検証になる。

```bash
npm run typecheck
```

## ビルド検証

- `npm run typecheck` が exit 0 で完了すること。
- 修正対象（code-summary.md 記載の `amadeus-state.ts`、`lifecycle-v2.ts`（source と昇格先）、eval 2 ファイル）に型エラーがないこと。

## トラブルシューティング

- 昇格先 `.agents/skills/amadeus-validator/` と source `skills/amadeus-validator/` が乖離した場合は、手動同期せず `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` を再実行する。
