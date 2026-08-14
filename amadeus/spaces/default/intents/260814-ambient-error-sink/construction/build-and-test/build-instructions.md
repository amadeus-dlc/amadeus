# Build Instructions — 260814-ambient-error-sink

> 上流: `construction/ambient-error-sink/code-generation/code-generation-plan.md` と `code-summary.md` を消費。`packages/framework/core/tools/amadeus-orchestrate.ts` を変更したため `bun run build` による全ハーネス dist 再生成が必須(実施済み、追跡ファイル不変を実測)。

## 依存とビルド

- `bun install` → `bun run build`(dist + self-install 面再生成)
- 注意: t214 は dist から import するため、core 変更後は build してから実行する(codekb 制約7条)

## 付随する台帳同期(同一変更で必須)

- `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only` — model-map.json が orchestrate.ts の実装ハッシュをピンしているため(SOURCE_DRIFT 是正)
- `tests/.coverage-patch-allowlist.json` の handlePark セレクタ2件を coverage gate 自身の `createSemanticSelector` で再アンカー(本体不変・+31 行シフト、署名行の型狭めで fingerprint 不一致化したもの)
