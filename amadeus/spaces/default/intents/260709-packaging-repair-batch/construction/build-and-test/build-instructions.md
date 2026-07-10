# Build Instructions — packaging-repair-batch

> 上流: 各 unit の `../<unit>/code-generation/code-summary.md` と `../code-generation/code-generation-plan.md`。本バッチは `scripts/`(package.ts / release-version-sync.ts)と `tests/` のみを変更し、core / dist は非接触。

## 手順

1. 依存導入: `bun install --frozen-lockfile`(worktree では node_modules が無いことがある — #709 の t92 赤の条件差として実測済み)
2. dist 再生成: 不要(scripts/ は dist 出荷対象外 — promote:self:check exit 0 で確認済み)
3. ドリフト検査: `bun run dist:check` / `bun run promote:self:check`(exit 0 必須)
4. 型検査: `bun run typecheck`(tsc --noEmit ×2 構成)
5. lint: `bun run lint`(Biome、error 0 必須・既存 warning は許容)
