# Build Instructions — 260801-cg-plan-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(4 unit: dag-integrity / issuance-guard / approve-reconciliation / docs-sync)

- 各 unit の code-generation-plan.md が宣言した検証列(typecheck / lint / dist:check / promote:self:check)を統合断面で再実行するのが本ステージのビルド面。code-summary.md の着地コミット(#1928/#1939/#1948/#1954 squash)が統合対象。

## 手順

1. `bun install`(lockfile 準拠)
2. `bun run typecheck`(tsconfig + tsconfig.tests の strict `tsc --noEmit`)
3. `bun run lint`(Biome、formatter 無効)
4. 正本(packages/framework/core/)変更時: `bun scripts/package.ts` → `bun run promote:self` → `bun run dist:check` / `bun run promote:self:check`(7ハーネス dist+self-install の drift 0 を確認)

## 実測(統合断面 764661954、全4 PR マージ後の origin/main 系譜)

typecheck / lint / dist:check / promote:self:check 全 exit 0。
