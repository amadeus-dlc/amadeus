# Tech Stack Decisions — U4: local-exporters

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun 1.3.13・TypeScript ESM・Biome・bun test、現 HEAD で `@opentelemetry` 依存ゼロ）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規依存 | なし。OTel API ファミリーの導入・version pin・bundle 取込は U1 が実施済み。本 Unit は U1 の Provider／`core/otel/` 基盤と U3 の schema v2 codec を利用するのみ | BR-13、technology-stack.md |
| 配置 | 本番 Exporter（AuditLogExporter・LocalSpanExporter・LocalLogExporter・LocalMetricExporter）は `packages/framework/core/otel/` 配下に配置。`amadeus-lib.ts` には追加しない | U1 ADR-4 の踏襲 |
| codec | Journal 永続化の encode は U3 の schema v2 codec を呼ぶ。本 Unit で独自 serialize 形式を持たない（U4→U3 の一方向依存） | BR-13、FR-JRN-1 |
| Registry 検証 | 受理集合の検証は U2 の Event Registry（`getEventDef`）を呼ぶ。Registry の複製・独自語彙を持たない | BR-10、FR-EVT-2 |
| 配布（FR-DST-2） | `packages/framework/core/otel/` への本番 Exporter 追加に伴い、各 harness の manifest マッピングへ登録し、`bun scripts/package.ts` で全生成面（7 harness dist＋self-install 面）を再生成、`package.ts --check`／`promote:self:check` の drift guards を通過する | FR-DST-2 |
| 標準 NodeSDK 等 | 導入しない（BatchSpanProcessor・標準 OTLP Exporter を短命 process に入れない） | FR-EXP-6 |

## 既存スタックとの整合

- コメントは英語、1ファイル1責務、判別ユニオン Result＋不変条件例外（team-practices の Code Style）
- テストは実装に先行（#1678 の先行順序）: Exporter 契約テスト→失敗契約テスト→受理集合テスト→redaction テスト→VER-2 ゲート配線。red-green を同一コミットで行う（VER-3）
- 検査パターンの語彙源は redaction policy（FR-DST-3/4/5）と同一に揃える（BR-16）
