# Build Instructions — 260805-cross-harness-resume

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## ビルド手順

対象は code-summary.md の変更ファイル(正本 = `packages/framework/core/` と `packages/framework/harness/kimi/`)。

1. `bun install --frozen-lockfile` — 依存の再現インストール
2. `bun run typecheck` — strict `tsc --noEmit`(tsconfig.json + tsconfig.tests.json の2面)
3. `bun run lint` — Biome check(formatter 無効、lint のみ)
4. `bun run build` — `scripts/package.ts` で全ハーネス dist を再生成し、`scripts/promote-self.ts --apply` で self-install 面を更新(dist は未追跡のローカル生成物 — 追跡ファイルが不変であることを `git status` で確認)

## 合否

- typecheck / lint / build すべて exit 0
- `bun run source-only:check` exit 0(生成物境界の維持)
- 追跡ファイルへの意図外の diff なし
