# Build Instructions — 260814-park-provenance

上流入力: `construction/park-provenance/code-generation/code-generation-plan.md` と `code-summary.md`(本 intent の唯一の unit)。

## 依存とビルド

- `bun install`(追加依存なし)/ `bun run build`(全ハーネス dist + セルフインストール再生成。`packages/framework/core/tools/` 変更後は必須。builder 実測 exit 0・追跡ファイル不変)
- 環境変数: 不要。テストの stage graph seam は `AMADEUS_STAGE_GRAPH`(未ビルド worktree では前提条件チェックが「bun run build を実行せよ」と fail-fast)

## 検証コマンド

- `bun run typecheck` / `bun run lint` / `bun run source-only:check` / `bun run distribution:check`
- 台帳: `updateModelMap --impl-only`(model-map ピン)/ `bun tests/gen-coverage-registry.ts --check`
