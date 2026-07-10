# Build Instructions — t92-worktree-hermeticity

> 上流: `../u709-t92-skip-guard/code-generation/code-summary.md` と `../code-generation/code-generation-plan.md`。本 intent はテストファイル1件(tests/integration/t92.test.ts)のみの変更で、core / dist / 本番センサーは非接触。

## 手順

1. 依存導入: `bun install --frozen-lockfile`(未 install worktree が本バグの発火条件そのもの — #709)
2. dist 再生成: 不要(tests/ は dist 出荷対象外 — dist:check / promote:self:check exit 0 で確認済み)
3. ドリフト検査: `bun run dist:check` / `bun run promote:self:check`(exit 0 必須)
4. 型検査: `bun run typecheck` / lint: `bun run lint`
