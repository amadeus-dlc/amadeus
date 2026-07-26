# Build Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(6 unit 分)

## ビルド

本プロジェクトはビルド成果物を持たず、Bun 直接実行。ビルド相当は配布物生成と型検査:

1. `bun scripts/package.ts` — dist/ 6 ハーネス再生成
2. `bun run promote:self` — セルフインストール4面同期
3. `bun run typecheck` — strict `tsc --noEmit`(tsconfig + tests)
4. `bun run lint` — Biome

## ドリフト検査(blocking)

- `bun run dist:check` / `bun run promote:self:check` — 正本と生成物の一致(code-summary 6件のうち5件が配布正本を触るため必須)

測定 ref: worktree-bugfix HEAD(origin/main の全6修正マージ済み、merge commit 68e3db211)。
