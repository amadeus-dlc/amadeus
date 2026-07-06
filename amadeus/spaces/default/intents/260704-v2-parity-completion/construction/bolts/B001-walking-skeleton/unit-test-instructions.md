# Unit Test Instructions：B001 walking skeleton

1. `npm run test:all`（リポジトリ標準検証一式。validator、examples、diff チェックを含む）
2. `npm run test:it:promote-skill`（昇格の整合検証）
3. エンジン smoke（読み取り専用）: `bun .claude/tools/aidlc-version.ts`、`bun .claude/tools/aidlc-directive.ts`
