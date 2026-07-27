# Build Instructions

上流入力(consumes 全数): requirements.md、code-generation-plan.md、code-summary.md — 検証コマンド集合(requirements Constraints)と実装面(code-summary の変更ファイル)から本手順を導出。

## ビルド(生成物同期)

正本(`packages/framework/core/` / `scripts/`)変更後の同期手順:

1. `bun scripts/package.ts` — 7ハーネス全 dist 再生成(claude/codex/cursor/opencode/kimi/kiro/kiro-ide)
2. `bun run promote:self` — セルフインストール5面の反映

検証: `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 を確認済み — build-test-results.md 参照)

## 静的検査

- `bun run typecheck`(tsc --noEmit ×2 プロジェクト)
- `bun run lint`(Biome、フォーマッタ無効)
