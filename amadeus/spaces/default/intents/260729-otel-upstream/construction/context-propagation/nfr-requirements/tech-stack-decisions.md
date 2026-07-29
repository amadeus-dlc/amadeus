# Tech Stack Decisions — U5: context-propagation

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun・TypeScript・Biome・bun test）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規依存 | 追加なし。carrier は W3C `traceparent`／`tracestate` の env 文字列で、生成・解析は U1 が導入する `@opentelemetry/api` 面の propagator を利用する | BR-2、BR-7 |
| Context Manager | U1 の検証結果（`@opentelemetry/context-async-hooks` または Amadeus Adapter）をそのまま利用し、U5 で差し替えない | BR-7、仮説 A-1 |
| carrier 形式 | W3C Trace Context のみ。独自形式・独自 env キー・`tracestate` vendor エントリを持たない | BR-2、BR-4 |
| 配置 | 実装は U1 新設の `packages/framework/core/otel/`（context.ts API surface）と、inject/extract 呼出し側の core tools／hooks に載る | functional-design services.md 通信契約 |
| 配布 | `packages/framework/core/` 変更のため FR-DST-2 が適用される: 各 harness の manifest マッピングへ登録し、`bun scripts/package.ts` で全生成面（dist 7 面＋self-install 5 面）を再生成、`package.ts --check`／`promote:self:check` の drift guards を通過する | FR-DST-2 |

## 既存スタックとの整合

- env 注入は `env: process.env` を明示する既存 spawn 様式（cid:code-generation:bun-spawn-env-snapshot）へ carrier キーを加える形で行い、spawn 機構自体は変更しない
- テストは red-green 同一コミット、3 段チェーン・fail-open・後方互換の各検証を integration 層へ配置する（VER-3 のテスト先行順序に従う）
- コメントは英語、team-practices の Code Style に従う
