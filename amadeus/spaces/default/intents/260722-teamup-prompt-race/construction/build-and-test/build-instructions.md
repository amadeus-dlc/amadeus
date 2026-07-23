# Build Instructions — 260722-teamup-prompt-race

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1384-watcher-arming/code-generation/)。

## ビルド手順

本 intent の変更は `scripts/team-up.sh`(bash、repo ローカル開発支援ツール)+ tests/ のみで、コンパイル対象の TS 正本(packages/framework/)には触れない(code-summary の非交差宣言どおり)。ビルドに相当する検査は以下:

1. `bash -n scripts/team-up.sh` — 構文検証(exit 0 必須)
2. `bun run typecheck` — リポ全体の TS 型検査(tsc --noEmit。新規テスト TS を含む)
3. `bun run lint` — Biome(tests/ スコープ)
4. `bun run dist:check` / `bun run promote:self:check` — 配布物・セルフインストール非交差の確認(本 intent は非交差が期待値)

## 前提

- Bun ^1.3、リポジトリルートで実行。追加の環境変数・セットアップ不要(code-generation-plan の検証節どおり)
