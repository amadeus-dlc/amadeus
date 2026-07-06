# Build Instructions

Unit: engine-validator-alignment（code-generation-plan.md の Step 1〜9 に対応する検証手順）

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
- 修正対象（code-summary.md 記載のエンジン 4 ファイルと validator 2 ファイル、正準ソース）に型エラーがないこと。

## トラブルシューティング

- sandbox 環境で `git init` を伴う eval（parity）が `Operation not permitted` で fail する場合は、sandbox 外で再実行する。
