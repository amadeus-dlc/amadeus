# Build Instructions — 260814-t99-copytree-race

上流入力: `construction/t99-copytree-race/code-generation/code-generation-plan.md` / `code-summary.md`(変更はテストインフラ 2 ファイルのみ、プロダクトコード非変更)。

## 依存インストールとビルド

- `bun install`(Bun 1.3.13)
- `bun run build` — 本 intent は `packages/framework/` 非変更のため追跡ファイル不変

## 環境

- 追加 env 不要。`TEST_TIME_FACTOR` は CI 既定 2
