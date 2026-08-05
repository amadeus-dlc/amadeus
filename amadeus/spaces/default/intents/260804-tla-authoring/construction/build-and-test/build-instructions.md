# Build Instructions — 260804-tla-authoring

上流入力(consumes 全数): 各 unit の code-generation-plan.md(全6 unit の検証コマンド宣言の照合元)と code-summary.md(実測 exit code の転記元)。

## ビルド手順

- 正本編集面: `plugins/formal-model-check/`(tools / stages / plugin.json)と `packages/framework/core/tools/`(amadeus-formal-verif-model-map.ts / amadeus-sensor-model-completeness.ts ほか)。生成物は `bun run build` で再生成(dist は未追跡のローカル生成物)
- 手順: `bun install --frozen-lockfile` → `bun run build` → 追跡ファイル差分なしを `git status --porcelain` で確認
- 実測(U5 着地断面): build exit 0・追跡差分なし(各 unit の code-summary.md に PR ごとの実測 exit code を記録済み — U2 #2268 / U3 #2269 / U4 #2287 / U5 #2312)

## 検証ゲート

- `bun run typecheck`(tsc --noEmit ×2 プロジェクト)/ `bun run lint`(Biome)/ `bun run source-only:check` / `bun tests/complexity-gate.ts --check` — 全 Bolt で exit 0 を実測(code-summary.md 転記)
