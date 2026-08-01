# Tech Stack Decisions — U9: metrics-subset

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun・TypeScript・Biome・bun test）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規依存 | なし。OTel Metrics API subset は U1 が導入する `@opentelemetry/api` の Meter 面をそのまま利用し、本 Unit は依存を追加しない | FR-EXP-1、FR-EXP-5、U1 tech-stack-decisions |
| exporter | U4 hardened `LocalMetricExporter`（`export(metric): void` fail-open）をそのまま利用し、差し替え・再実装しない | BR-8、unit-of-work U9 依存関係 |
| instrument subset | Counter／Histogram のみ生成可能とし、Observable callback・任意 aggregation の生成経路を型上持たない | BR-1、FR-EXP-5 |
| 標準 NodeSDK 等 | 導入しない（U1 と同一方針） | FR-EXP-6 |

## 配置と配布（FR-DST-2）

- `meter-provider.ts`・`local-metric-exporter.ts` の配線は `packages/framework/core/otel/`（U1 の配置決定）に従う
- `packages/framework/core/` への変更は manifest マッピングへの登録＋`bun scripts/package.ts` による全生成面（dist 7 harness・self-install 5 面）の再生成を必須とし、`bun scripts/package.ts --check`／`bun run promote:self:check` の drift guards を通過する（FR-DST-2）
- コメントは英語、1ファイル1責務、判別ユニオン Result＋不変条件例外（team-practices ## Code Style）に従う
- テストは同一コミットで red-green、VER-3 のテスト先行契約（U1 所有）を引用して fail-open 検証を先行させる
