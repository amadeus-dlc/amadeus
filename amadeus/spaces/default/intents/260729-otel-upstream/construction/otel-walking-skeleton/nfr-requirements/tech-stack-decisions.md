# Tech Stack Decisions — U1: otel-walking-skeleton

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`（参照済み）

`technology-stack.md` の現行スタック（Bun・TypeScript・biome・bun test）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| OTel API 依存 | `@opentelemetry/api`（＋採否次第で `@opentelemetry/api-logs`）を version pin で追加。bundle 取込 | FR-DST-1、feasibility F-3 |
| Logs API 採否 | api-logs を先に spike、不成立・不適なら最小 EventRecord Interface（Q2-A）。Phase 1 ADR で確定 | #1678 ADR 事項 |
| Context Manager | `@opentelemetry/context-async-hooks` を検証し、不成立時のみ Amadeus Adapter（feasibility F-2） | #1678 ADR 事項 |
| 配置 | `packages/framework/core/otel/` 新設。`amadeus-lib.ts` には追加しない | ADR-4 |
| 配布 | `core/otel/` 追加に伴い各 harness の manifest マッピングへ登録し、`bun scripts/package.ts` で全生成面を再生成、`package.ts --check`／`promote:self:check` を通過する（FR-DST-2、BR-14） | FR-DST-2 |
| 標準 NodeSDK 等 | 導入しない（FR-EXP-6） | #1672 採用方針 |

## 既存スタックとの整合

- コメントは英語、1ファイル1責務、判別ユニオン Result＋不変条件例外（team-practices ## Code Style）
- テストは同一コミットで red-green、テスト先行順序（失敗契約→Context→Exporter 契約→shadow 原型）に従う（VER-3）
