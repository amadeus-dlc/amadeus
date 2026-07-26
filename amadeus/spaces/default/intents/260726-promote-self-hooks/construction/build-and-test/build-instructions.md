# Build Instructions — 260726-promote-self-hooks

上流入力 (consumes 全数): code-generation-plan.md, code-summary.md (construction/promote-self-hooks-wiring/code-generation/)

## 前提

- 作業場所: bolt worktree `.amadeus/worktrees/bolt-promote-self-hooks-wiring` (以下 WT)
- ランタイム: bun (プロジェクト標準)。WT 初回は `bun install` が必要

## ビルド手順

1. `bun install` — 依存導入 (WT 初回のみ)
2. `bun run typecheck` — TypeScript 型検査 (正本変更: scripts/promote-self.ts, packages/framework/core/tools/amadeus-utility.ts)
3. `bun run lint` — biome lint
4. `for h in claude codex cursor opencode kimi; do bun scripts/package.ts $h; done` — dist 再生成 (framework core 変更の配布物反映)
5. `bun run dist:check` — dist ドリフト検査
6. `bun run promote:self:check` — self-install ツリー parity 検査 (WT 内で完結。ユーザー級 config は検査対象外 — FR-1f の hermetic 維持を t299 がピン)

## 検証コマンド (プロジェクト標準、project.md ## Testing Posture)

`bash tests/run-tests.sh --ci` — 全テストスイート (CI モード)

## トラブルシューティング

- dist 再生成前に `promote:self:check` を回すと DIFFERS で失敗する (framework core 正本と dist の乖離)。必ず package.ts → dist:check → promote:self:check の順
- テストが実ユーザーの `~/.kimi-code/config.toml` に触れる場合は `KIMI_CODE_HOME` を mkdtemp に向けること (t209/t227/t299 の save/restore 様式)
