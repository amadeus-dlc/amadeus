# Build Instructions — 260810-tla-applicability-wiring

上流入力（consumes 全数）: `code-generation-plan.md`（Step 7 の同期・検証手順を建付けの正本として消費）、`code-summary.md`（対象コミット列と検証実測を消費）

## ビルド手順

1. `bun install --frozen-lockfile` — 依存導入（実測 261 packages）
2. `bun run build` — self-install 面（`.claude/` ほか manifest が発見する全ハーネス）を正本（`packages/framework/core/` / `plugins/`）から再生成。実行後 `git status --porcelain` で tracked 不変を確認する（code-summary の検証どおり exit 0・意図した変更のみ）
3. `bun run typecheck`（`tsc --noEmit` ×2 プロジェクト）/ `bun run lint`（Biome）

## 成果物と検証面

- 編集正本: `plugins/formal-model-check/`（tla-authoring.ts / tla-evidence.ts / plugin.json）+ `packages/framework/core/tools/`（advisory-declaration / advisory-choice / directive）— code-generation-plan.md D1〜D5 の配置どおり
- 生成物（dist / self-install）は未追跡のローカル生成物であり、コミット対象ではない（source-only 境界）
