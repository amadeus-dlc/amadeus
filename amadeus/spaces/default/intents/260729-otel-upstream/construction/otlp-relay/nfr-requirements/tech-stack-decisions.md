# Tech Stack Decisions — U11: otlp-relay

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun・TypeScript・Biome・bun test）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| OTLP 送信の実装方式 | 旧 Projector 由来の OTLP/HTTP JSON wire format 自前組立て + `fetch` POST を維持する。標準 OTLP Exporter SDK は導入しない（FR-EXP-6） | technology-stack.md 現行断面、#1672 採用方針 |
| 新規依存 | なし。`@opentelemetry/api` ファミリーの追加は U1（otel-walking-skeleton）の責務で、Relay は OTLP 変換に Store record の型のみを使い API 依存を追加しない | FR-DST-1（依存取込の最小化） |
| timeout 機構 | 送信に `AbortSignal.timeout` を適用（既存スタックの実測済み様式、`packages/setup/src/ports/http.ts` 先例）。標準ライブラリのみで追加依存なし | technology-stack.md |
| 配置 | `packages/framework/core/otel/relay.ts` へ責務移譲。旧 `tools/amadeus-otel-projector.ts` を縮退させる | business-logic-model.md、FR-RLY-1 |
| 配布 | `packages/framework/core/` 内の変更であるため FR-DST-2 が適用される: 各 harness の manifest マッピングへ `otel/relay.ts` を登録し、`bun scripts/package.ts` で全 7 harness 生成面を再生成、`bun scripts/package.ts --check`／`bun run promote:self:check` を通過する | FR-DST-2、VER-6 |

## 既存スタックとの整合

- コメントは英語、1ファイル1責務、判別ユニオン Result（team-practices ## Code Style）
- テストは cursor 前進・部分失敗 retry・idempotency・Collector 停止の各観点を同一コミット red-green で整備する（BR-15、VER-3）
- 既存 Projector の lock/retry/cursor 機構を再利用し、A-4 仮説の検証を Phase 1 で判定する（requirements.md Assumptions）
