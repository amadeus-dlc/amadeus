# Build Instructions(intent 260814-fmc-macos-provider)

上流: `construction/fmc-macos-provider/code-generation/code-generation-plan.md` と `code-summary.md` が対象変更(plugins/formal-model-check + tests)を確定している。

## コマンド

- 依存導入: `bun install`
- ビルド(未追跡 dist とセルフインストール面の再生成): `bun run build`
- 型検査: `bun run typecheck`(tsc --noEmit ×2 tsconfig)
- リント: `bun run lint`(Biome、フォーマッタ無効)

## 環境

- Bun 1.3.13 / TypeScript / ESM。JDK は `mise.toml` ピン(temurin-26.0.1+8)が供給(検証契約は major 26 — 本 intent の変更点)
- `mise trust` を初回に1回実行

## 検証(実測)

- 2026-08-14、HEAD `1d49d9a57e`: `bun run build` exit 0(追跡ファイル不変)、`bun run typecheck` exit 0、`bun run lint` exit 0
