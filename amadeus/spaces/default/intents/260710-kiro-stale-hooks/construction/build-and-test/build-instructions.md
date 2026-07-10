# Build Instructions — 260710-kiro-stale-hooks

## 依存インストール

- `bun install --frozen-lockfile`(実測 exit 0)

## ビルド(生成物同期)

本リポジトリはコンパイル型ビルドを持たず、「ビルド」= 配布ツリーの生成同期:

- `bun scripts/package.ts` — `dist/<harness>/` を core/harness から再生成
- `bun run promote:self` — セルフインストール(`.claude/` / `.codex/` / `.agents/` / `CLAUDE.md`)へ昇格

## ビルド検証

- `bun run dist:check` — dist ドリフトガード(#719 修正後は `.kiro.hook` の dist 混入も ORPHAN で検出)
- `bun run promote:self:check` — セルフインストール同期ガード
- `bun run typecheck` / `bun run lint`

## トラブルシューティング

- typecheck が `fast-check` 不在で落ちる場合は `bun install --frozen-lockfile` 未実行(worktree の node_modules 陳腐化)
