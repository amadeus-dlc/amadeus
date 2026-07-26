# Build Instructions — 260725-worktree-ref-fixes

上流入力(consumes 全数): `amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-summary.md`

- `code-generation-plan.md` Step 7-8 の配布同期・検証手順、`code-summary.md` の変更ファイル一覧を本手順の対象面として引用した。

## ビルド手順

本リポジトリはトランスパイル不要(Bun 直接実行)。ビルドに相当するのは配布物の再生成と drift 検査である。

1. `bun scripts/package.ts` — dist 6 面(claude/codex/cursor/kiro/kiro-ide/opencode)の再生成
2. `bun run promote:self` — self-install 4 面(.claude/.codex/.cursor/.opencode)の再投影
3. `bun run dist:check` / `bun run promote:self:check` — 乖離ゼロの機械確認(いずれも exit 0 を要求)

## 静的検査

- `bun run typecheck`(tsc --noEmit、strict)— 実測 exit 0(2026-07-26T01:31Z、HEAD a84ff821c)
- `bun run lint`(Biome)— 実測 exit 0
