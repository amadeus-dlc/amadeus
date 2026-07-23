# Build Instructions — 260723-marker-heading-exemption

上流入力(consumes 全数): code-generation-plan、code-summary

## ビルド手順

code-generation-plan が確定した正本編集(amadeus-lib.ts / amadeus-graph.ts / amadeus-sensor-required-sections.ts / sensors manifest)に対し、本リポジトリの標準ビルドは配布物生成である:

1. `bun scripts/package.ts` — dist 6 ツリーの再生成
2. `bun run promote:self` — self-install 4 ツリーへの反映
3. ドリフトガード: `bun run dist:check`+`bun run promote:self:check`(いずれも exit 0 を要求)

## 型・静的検査

- `bun run typecheck`(tsc --noEmit ×2 tsconfig)
- `bun run lint`(Biome、フォーマッタ無効)

いずれも PR #1405 で実測 exit 0(code-summary の検証コマンド表参照)。マージ着地後の本線 merge 断面でも build-test-results.md で再実測する。
