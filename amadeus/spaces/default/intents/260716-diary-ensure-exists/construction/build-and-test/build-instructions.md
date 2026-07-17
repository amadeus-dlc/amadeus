# Build Instructions — 260716-diary-ensure-exists

## 上流入力(consumes 全数)

`code-generation-plan.md`(変更目録: 正本4+registry)、`code-summary.md`(AC 閉包表)、requirements.md FR-4。

## ビルド手順

正本編集(core/tools + core/amadeus-common)後の生成物同期:

- `bun scripts/package.ts`(dist×6 再生成)+ `bun run promote:self`(self-install ×2)
- `bun run typecheck`(tsc --noEmit)/ `bun run lint`(Biome)
- `bun run dist:check` / `bun run promote:self:check`(同期検証)

前提: `bun install --frozen-lockfile` 済み worktree。
