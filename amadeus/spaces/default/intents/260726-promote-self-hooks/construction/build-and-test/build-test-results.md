# Build & Test Results — 260726-promote-self-hooks

上流入力 (consumes 全数): code-generation-plan.md, code-summary.md

実測日時: 2026-07-26T14:20Z。実施場所: bolt worktree `.amadeus/worktrees/bolt-promote-self-hooks-wiring`。

## ビルド系

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint` | PASS (exit 0。既存の complexity 警告 307 件は変更前からの既存分、変更ファイルに新規指摘なし) |
| dist 再生成 (7ハーネス: claude/codex/cursor/opencode/kimi/kiro/kiro-ide) | PASS |
| `bun run dist:check` | PASS (全7ハーネス in sync) |
| `bun scripts/promote-self.ts --apply` (WT) | PASS — **新規マージステップの実地発火を確認**: `Kimi config: /Users/j5ik2o/.kimi-code/config.toml is already up to date (managed block unchanged).` (本セッション応急処置で手動マージ済のため冪等 noop。FR-1 の本番経路が設計どおり動作) |
| `bun run promote:self:check` | PASS (project-local self install is in sync) |

## 全量テストスイート

`bash tests/run-tests.sh --ci`:

- Test files: **573** / Failed files: **0**
- Total assertions: **8017** / Failed assertions: **0**
- **RESULT: PASS**
- SKIP 1件: t72-stage-reverse-engineering (Claude substrate 不在のため、既存の環境依存スキップ)
- wall-clock drift 2件: t-codex-hooks-migration (medium→large 39.2s), t225-upstream-v2-migration-preflight (medium→large 30.8s) — いずれも本変更と無関係の既存ファイル。サイズ宣言の更新は本 intent のスコープ外

## 対象変更の個別検証 (code-generation ステージで実施済)

- t299 / t209 / t200 / t227 / t-kimi-doctor-arm: 58 pass / 0 fail (FR-3a/3b の4+3経路をカバー)

## 初回失敗と是正 (記録)

1. 初回 dist 再生成が5ハーネスのみで kiro/kiro-ide が抜け dist:check FAILED → 7ハーネス再生成で是正
2. dist 再生成後、self-install ツリー未反映で promote:self:check FAILED (DIFFERS 5件) → promote-self --apply で是正 (この --apply が新マージステップの実地検証になった)
