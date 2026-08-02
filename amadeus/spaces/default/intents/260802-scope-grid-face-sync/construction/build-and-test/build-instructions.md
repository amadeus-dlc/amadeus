# Build Instructions — 260802-scope-grid-face-sync

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## ビルド手順

本 intent の変更(code-generation-plan.md Step 3-8 / code-summary.md の FR 対応表)はデータ同期+TypeScript センサー拡張+テストであり、専用ビルドは不要。検証に必要な手順:

1. `bun install --frozen-lockfile`(worktree 初回のみ — node_modules 不在だと typecheck が exit 127)
2. `bun run typecheck`(tsc --noEmit)
3. `bun run lint`(Biome)
4. `bun scripts/package.ts` → dist 再生成(センサー正本を触った場合のみ — code-summary.md FR-7 で実施済み)
5. `bun run promote:self`(self-install 5面への投影)

## ドリフト検査

- `bun run dist:check` / `bun run promote:self:check` — 正本↔dist↔self-install の同期検証(FR-7 AC)
