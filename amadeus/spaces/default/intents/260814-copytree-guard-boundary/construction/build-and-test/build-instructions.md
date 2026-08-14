# Build Instructions — 260814-copytree-guard-boundary

上流入力: `construction/copytree-guard-boundary/code-generation/code-generation-plan.md` / `code-summary.md`(テストハーネス 3 ファイル + 新規テスト 1 本、プロダクトコード非変更)。

## 依存インストールとビルド

- `bun install` / `bun run build`(packages/ 非変更のため追跡ファイル不変)

## 環境

- 追加 env 不要。新規テストは `dist/{claude,kiro,kiro-ide}` の存在を前提(既存 tui 系テストと同一前提。`bun run build` で生成)
