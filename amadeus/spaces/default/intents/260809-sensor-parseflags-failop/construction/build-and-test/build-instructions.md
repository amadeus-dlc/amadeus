# Build Instructions — 260809-sensor-parseflags-failop

上流入力(consumes 全数): code-generation-plan.md(実装ステップと検証手順の宣言元)/ code-summary.md(実装面・検証実測の正本)。

## ビルド手順

## ビルド

- `bun install --frozen-lockfile`
- `bun run build`(dist 全ハーネス+self-install 再生成。追跡ファイル drift なしを `git status --porcelain` で確認)
- `bun run typecheck` / `bun run lint`

対象は `packages/framework/core/tools/` のため全ハーネス dist へ自動投影される(coreDirs walk)。ローカル環境要件は Bun のみ。
