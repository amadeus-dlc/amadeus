# Build Instructions — 260727-install-doc-mismatch

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 本書のビルド対象・検証コマンドは code-generation-plan.md の Step 4/6 と code-summary.md の検証節から導出した。

## 依存インストール

- `bun install`(Bun 前提。lockfile 変化なし — code-summary.md の申告どおり worktree 初回のみ必要)

## ビルド(dist 再生成)

- `bun run dist`(= `bun scripts/package.ts`。7ハーネス: claude/codex/cursor/opencode/kimi/kiro/kiro-ide)
- `bun run promote:self`(セルフインストールツリー同期)

## ビルド検証

- `bun run dist:check` — 生成物ドリフト 0 を確認(exit 0)
- `bun run promote:self:check` — self-install 同期を確認(exit 0)
- `bun run typecheck` / `bun run lint`

## トラブルシューティング

- dist:check 赤: 正本(packages/framework/)編集後の再生成漏れ — `bun run dist` を再実行(dist 手編集は禁止)
- t258-boundary-guard 赤: core/tools に repo-only `scripts/<file>` トークンが混入 — reword で除去(cid:code-generation:c1-1569-shipped-comment-vocab)
