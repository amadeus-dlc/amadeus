# Build Instructions — 260726-grant-scope-gate

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## ビルド手順

本 intent の変更(code-generation-plan.md の計画どおり `packages/framework/core/tools/amadeus-lib.ts` 正本+テスト)にビルド工程は不要(Bun 直接実行)。配布物同期のみが「ビルド」に相当する:

1. `bun scripts/package.ts` — dist 6 ツリーの再生成
2. `bun run promote:self` — self-install 4 ツリーの同期

## 検証コマンド

- `bun run typecheck`(tsc --noEmit ×2 プロジェクト)
- `bun run lint`(Biome)
- `bun run dist:check` / `bun run promote:self:check`(ドリフトガード)

いずれも 2026-07-26 の B&T 実行で exit 0(build-test-results.md 参照)。
