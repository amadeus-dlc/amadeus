# Tech Stack Decisions — U10: diagnostic-logs

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun 1.3.13・TypeScript・Biome・bun test）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規依存 | なし。OTel API 依存（`@opentelemetry/api` 等）は U1（otel-walking-skeleton）が追加済みのものを利用し、本 Unit は独自に version pin・bundle 取込を行わない | FR-DST-1、unit 依存宣言 |
| 配置 | 正本 `packages/framework/core/otel/`（U1 が新設）配下の logger-provider.ts／local-log-exporter.ts。`amadeus-lib.ts` には追加しない | U1 ADR-4 踏襲 |
| Exporter 実装 | U4 で hardening 済みの LocalLogExporter をそのまま利用し、複製・改変しない | BR-11 |
| redaction | U4 の `redaction.ts` policy を利用。本 Unit 独自の redaction 実装は持たない | BR-5、FR-DST-3 |
| 配布 | `core/otel/` への追加・変更は正本編集後に各 harness manifest マッピングへ登録し、`bun scripts/package.ts` で全生成面（7 harness dist + 5 self-install 面）を再生成、`package.ts --check`／`promote:self:check` の drift guards を通過する | FR-DST-2、VER-6 |

## 既存スタックとの整合

- コメントは英語、1 ファイル 1 責務、既存 code style（team-practices）に従う
- テストは Bun test の unit/integration 層で、同一コミット red-green（VER-3 の失敗契約テスト先行順序に準拠）
