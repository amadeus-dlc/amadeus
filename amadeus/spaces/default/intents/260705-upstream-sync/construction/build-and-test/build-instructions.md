# build instructions（260705-upstream-sync）

上流入力: [code-summary.md](../upstream-sync/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## ビルド手順

本 Intent はエンジン TS（Bun 直接実行）、skill 文書、パリティ基準データの変更であり、ビルド成果物を生成する工程はない。型検査がビルド相当の検証である。

## 検証コマンド

- `npm run typecheck`（tsc --noEmit。test:all の先頭で実行される）
- `npm install` 済みの環境で追加セットアップは不要（mise.toml の node = "24" に従う）
