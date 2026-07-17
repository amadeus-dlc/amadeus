# Build Instructions — s13-label-clarity

- Bun 直接実行(ビルド成果物なし)。生成物同期: `bun scripts/package.ts` + `bun run promote:self`、検査: `bun run dist:check` / `bun run promote:self:check`
- 依存導入: `bun install --frozen-lockfile`(typecheck の tsc に必要)
