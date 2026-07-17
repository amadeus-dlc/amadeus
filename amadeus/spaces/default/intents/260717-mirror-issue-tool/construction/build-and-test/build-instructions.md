# Build Instructions — 260717-mirror-issue-tool

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(amadeus-mirror-cli)

## ビルド

本 unit(amadeus-mirror-cli)はビルド工程を持たない — bun 直接実行の TypeScript(code-generation-plan.md の実装目録どおり単一ファイル)。ビルド相当の検証は型検査で行う:

- `bun run typecheck`(tsc -p tsconfig.json && tsc -p tsconfig.tests.json)— Bolt 1 実測 exit 0(code-summary.md)

## 依存導入

- `bun install --frozen-lockfile`(worktree 初回のみ。lockfile 変更なし)
