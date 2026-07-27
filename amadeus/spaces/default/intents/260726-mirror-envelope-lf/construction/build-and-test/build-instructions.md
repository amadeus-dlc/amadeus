# Build Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(fix-1498-envelope-lf)

## ビルド相当

Bun 直接実行のためビルドは配布物生成と検査: `bun scripts/package.ts`(dist 7ハーネス)→ `bun run promote:self`(self-install 5面)→ `bun run typecheck` → `bun run lint`。

## ドリフト検査(blocking)

`bun run dist:check` / `bun run promote:self:check` — gateway 正本の増幅14パス(code-summary 参照)の一致検査。
