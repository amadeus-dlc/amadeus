# Build Instructions — eoc1-gate-check

## 上流入力(consumes 全数)

`../eoc1-gate-guard/code-generation/code-generation-plan.md`(変更目録)、`../eoc1-gate-guard/code-generation/code-summary.md`(AC 閉包表)、requirements FR-4。

## ビルド手順

正本編集後 `bun scripts/package.ts`+`bun run promote:self`(8コピー同期)→ `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bun tests/complexity-gate.ts --check`。
