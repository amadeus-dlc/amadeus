# Build Instructions — 260723-fixture-shard-pollution（#1389）

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

本 B&T は code-generation-plan.md が定めた修正設計(根 = `recordEngineError` の projectDir 貫通 / 増幅 = clone-id の projectDir キー化)とテスト追加方針、および code-summary.md の実装内容・検証結果を検査対象とする(requirements.md の FR/NFR は上位の受け入れ基準として併せて参照)。

## ビルド手順

本 intent は bugfix / Minimal であり、独立したアプリケーションビルド基盤を持たない（project.md Deployment: デプロイ基盤なし、リリースは release.yml の workflow_dispatch 一本）。ビルド = 正本編集 → 生成物(dist / self-install)再生成の同期であり、以下の決定的コマンドで構成する。

正本は `packages/framework/core/tools/`（`amadeus-orchestrate.ts` / `amadeus-lib.ts`）。生成物は `dist/<harness>/` と self-install ツリー（`.claude` / `.codex` / `.cursor` / `.opencode`）。

| ステップ | コマンド | 役割 |
|---|---|---|
| 型検査 | `bun run typecheck`（`tsc --noEmit -p tsconfig.json && -p tsconfig.tests.json`） | 正本・テストの型健全性 |
| リント | `bun run lint`（Biome、フォーマッタ無効） | 静的品質 |
| dist 再生成 | `bun scripts/package.ts` | 6 harness の dist 生成 |
| self-install 再生成 | `bun run promote:self` | project-local self install 同期 |
| dist ドリフトガード | `bun run dist:check` | 正本 ↔ 全 harness dist 一致 |
| self ドリフトガード | `bun run promote:self:check` | 正本 ↔ self install 一致 |

作業ディレクトリ: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/runs/20260722-233519-0637/engineer-4`

実行結果(exit code)は build-test-results.md の検証コマンド表に転記する。

## 前提と再実行条件

- ランタイムは Bun(TypeScript / ESM)。新規 runtime dependency は追加しない(requirements NFR-3)。
- 本 B&T は origin/main(#1407 fix landed)を本 worktree へマージ解消した後のツリーで実行する。マージ解消により core(`amadeus-sensor-required-sections.ts` / `amadeus-graph.ts` / `amadeus-lib.ts`、#1296 由来)と各 harness dist が同時に更新されているため、`dist:check` / `promote:self:check` は正本と生成物の整合を新たに検証し直す必要がある。
- 正本(`packages/framework/core/tools/` または `packages/framework/harness/<name>/`)を再度触った場合は `bun scripts/package.ts` + `bun run promote:self` を再実行し、`dist:check` / `promote:self:check` を exit 0 で再確認してから完了扱いにする(project.md Mandated)。
