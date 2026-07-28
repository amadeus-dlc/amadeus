# Build Instructions — 260727-mirror-project-status

上流入力(consumes 全数): code-generation-plan, code-summary(u1-project-sync-skeleton / u2-state-reconcile-hardening / u3-lifecycle-integration / u4-config-overrides-and-diagnostics / u5-docs-and-distribution の全5ユニット)

## 依存インストール

- Bun(>= 1.3)が唯一のランタイム依存。`curl -fsSL https://bun.sh/install | bash`
- リポジトリ直下で `bun install`(package.json の devDependencies を取得)

## 環境セットアップ

- 追加の env 変数・ローカルサービスは不要。gh CLI はミラー実操作の任意依存(テストは FakeGateway で不要)
- 作業ブランチ: bolt/u5-docs-and-distribution(HEAD 45a09c9a0)— u1〜u5 の stacked 全実装を含む

## ビルドコマンド

本プロジェクトはトランスパイルせず bun 直接実行のため、「ビルド」= 配布物生成:

1. `bun scripts/package.ts` — 正本(packages/framework/core, harness)→ dist 7面(claude/codex/cursor/opencode/kimi/kiro/kiro-ide)
2. `bun run promote:self` — セルフインストール5ツリーへ反映

## ビルド検証

- `bun run typecheck`(tsc --noEmit ×2 tsconfig)= exit 0
- `bun run lint`(Biome)= exit 0
- `bun run dist:check` / `bun run promote:self:check` = exit 0(drift guard)

## トラブルシューティング

- dist:check 赤: 正本を修正して再生成(dist 手編集は禁止 — project.md Forbidden)
- typecheck が worktree で module not found: node_modules symlink の有無を確認(bun install で解消)

## 実測(測定 ref = 45a09c9a0)

package=0 / promote:self=0 / dist:check=0 / promote:self:check=0 / typecheck=0 / lint=0(u5 code-summary+conductor 再実測 2026-07-28)
