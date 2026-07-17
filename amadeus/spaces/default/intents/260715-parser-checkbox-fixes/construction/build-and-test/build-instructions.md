# Build Instructions — parser-checkbox-fixes

- ランタイム: Bun(TypeScript 直接実行、ビルド成果物なし)
- 生成物同期: `bun scripts/package.ts`(dist 5ツリー)+ `bun run promote:self`(self-install)
- ドリフト検査: `bun run dist:check` / `bun run promote:self:check`(両修正とも正本 `packages/framework/core/tools/` 編集 → 全ツリー再生成済み)
- 依存導入: `bun install --frozen-lockfile`(typecheck には node_modules の bun-types/tsc が必要 — 未導入ツリーでは exit 127/TS2688 になる点に注意)
