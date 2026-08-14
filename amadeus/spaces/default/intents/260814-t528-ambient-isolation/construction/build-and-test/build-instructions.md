# Build Instructions — 260814-t528-ambient-isolation

> 上流: `construction/t528-ambient-isolation/code-generation/code-generation-plan.md` と `code-summary.md` を消費。変更はテストファイル1本(`tests/integration/t528-report-ack-kind.integration.test.ts`)で `packages/framework/core/` 不変のため、追跡ファイルへ影響する再ビルドは不要(dist 再生成の全ハーネス要件は core 変更時のみ — project.md Mandated)。

## 依存とビルド

- 依存: `bun install`
- ビルド(未追跡 `dist/` とセルフインストール面の生成): `bun run build`
- 本 intent のテストは `dist/claude/.claude/tools/data/stage-graph.json` を前提とする(t528 の前提検査が不在時に `bun run build` を名指して fail する — FR-4)

## 環境変数

- `TEST_TIME_FACTOR`: CI 既定 2(scaleTestTime 経由)
- テストは `CLAUDE_PROJECT_DIR` の有無に依存しない(本 intent の修正点)
