# Build Instructions — 260814-t245-origin-fixture

上流入力: `construction/t245-origin-fixture/code-generation/code-generation-plan.md` / `code-summary.md`(本 intent の変更はテスト 1 ファイルのみ、プロダクトコード非変更)。

## 依存インストールとビルド

- `bun install`(Bun 1.3.13)
- `bun run build` — packager が全ハーネス dist とセルフインストール面を再生成(本 intent は `packages/framework/` 非変更のため追跡ファイルは不変)

## 環境

- 追加の env 不要。`TEST_TIME_FACTOR` は CI 既定 2(project.md CI/CD)
- 修正後の t245 は実 `origin` リモート・ネットワークに依存しない(fixture 自己完結)
