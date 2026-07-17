# Build Instructions — 260715-opencode-cursor-harness

上流入力: 各 unit の code-generation-plan.md / code-summary.md(U1〜U4)。

## ビルド手順(正本 → 生成物)

1. 正本編集面: `packages/framework/harness/opencode/`・`packages/framework/harness/cursor/`(core/scripts/installer 変更ゼロ — AC-4d)
2. `bun scripts/package.ts` — discoverHarnessNames(package.ts:68-73)が manifest を発見し dist/opencode/・dist/cursor/ を生成(package.ts 無編集 = open-set seam)
3. `bun run dist:check` ×2(冪等確認)/ `bun run promote:self:check`(self-install ツリーは両ハーネス非対象 — manifest 選定どおり)
4. 注意: `dist/<tree>/amadeus/active-space` は shipped dot-gitignore の live-ignore 対象 — コミット時は `git add -f`(codex 前例、U1/U3 で実測)

## 検証コマンド(CI 基準)

`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` / coverage 生成+`bun tests/coverage-patch-gate.ts --check`(#1060 以降の自己完結ゲート)
