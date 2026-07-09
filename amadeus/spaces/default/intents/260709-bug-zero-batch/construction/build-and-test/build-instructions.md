# Build Instructions — bug-zero-batch

> 上流: 各 unit の `../<unit>/code-generation/code-summary.md` と `../code-generation/code-generation-plan.md`。本リポジトリはビルド成果物を dist/ にコミットする方式のため、「ビルド」= dist 再生成+ドリフト検査。

## 手順

1. 依存導入: `bun install --frozen-lockfile`(worktree では node_modules が無いことがある — #695 レビューで t92 赤の条件差として実測済み)
2. dist 再生成(core を変更した場合のみ): `bun scripts/package.ts` → `bun run promote:self`
3. ドリフト検査: `bun run dist:check` / `bun run promote:self:check`(exit 0 必須)
4. 型検査: `bun run typecheck`(tsc --noEmit ×2 構成)
5. lint: `bun run lint`(Biome、error 0 必須・既存 warning は許容)

## 本バッチの特記

6 Bolt 中4件(#674/#675/#676/#668)が core tools を変更し、いずれも dist 4ツリー+self-install を同一コミットで同期済み(各 PR の codex レビューで byte-identical を cmp 確認)。
