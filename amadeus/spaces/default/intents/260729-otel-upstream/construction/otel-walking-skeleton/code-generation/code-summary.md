# Code Summary — U1: otel-walking-skeleton

上流入力: code-generation-plan.md（全 13 Step 完了）および consumes 全数。

## Files created

- `packages/framework/core/otel/` — Amadeus Provider 層（12 ファイル）:
  `fatal-latch.ts`（process-local latch＋read-only health probe）、`redaction.ts`（write-time default-deny filter）、`event-registry.ts`（代表 4 event の最小 Registry）、`audit-log-exporter.ts`（同期 append＋失敗時 throw＋latch）、`local-span-exporter.ts`／`local-log-exporter.ts`／`local-metric-exporter.ts`（fail-open telemetry stores）、`tracer-provider.ts`／`logger-provider.ts`／`meter-provider.ts`（OTel API 実装、api-logs bridge 付き）、`context.ts`（AsyncLocalStorage ContextManager・Intent Context persist/restore・W3C inject/extract）、`shadow-compare.ts`（shadow 比較原型）
- `packages/framework/core/vendor/opentelemetry/` — `@opentelemetry/api@1.9.1`・`@opentelemetry/api-logs@0.221.0` の esm build を byte 同一 vendor（LICENSE・README 付き、FR-DST-1）
- `tests/unit/otel/` — 4 テストファイル 38 件（failure-contract 13・context 10・exporter-contract 12・shadow-compare 2＋singleton 2 他）
- `tests/helpers/otel-emit-child.ts` — 即時終了子 process 検証用
- `scripts/otel-phase1-measure.ts` — cold/warm append・bundle size 計測

## Files modified

- `packages/framework/core/tools/amadeus-log.ts` — decision/answer を emitEvent 経由に差替え（代表接続、BR-1）。bootstrap で provider 登録・anchor restore・health probe、latch 拒否を両 entrypoint に配線（FR-EVT-4/5）
- `packages/framework/core/hooks/amadeus-session-end.ts` — projector spawn を startActiveSpan＋injectToSubprocess で包む（finally span.end()、FR-TRC-2/5）。SESSION_ENDED 自体は現行経路のまま（代表接続の範囲外）
- `packages/framework/harness/*/manifest.ts`（7 面）— `otel`・`vendor` マッピング追加（FR-DST-2）
- `package.json`／`bun.lock` — pinned devDependencies（@opentelemetry/api 1.9.1、api-logs 0.221.0）
- `tsconfig.json`（core/otel include）、`biome.json`（vendor 除外）
- 生成面: `dist/` 7 harness＋self-install（`bun scripts/package.ts`、`promote-self.ts --apply` で再生成、`--check` 両 guard 通過）
- 記録: `decisions.md` に Phase 1 ADR-7〜11 追記、`requirements.md` NFR-1 数値予算確定・Open Questions 3 件クローズ

## Key implementation decisions

- **Logs API 採用**（ADR-7）: spike で Bun 成立を確認し version pin vendor。独自 EventRecord Interface は fallback として不採用
- **Context Manager は AsyncLocalStorage 直接実装**（ADR-8）: context-async-hooks は機能成立したが CJS＋bare require で vendor 不適のため
- **AuditLogExporter は現行 locked append を再利用**（NFR-1 を構造で担保、同構造）。schema v2 codec への移行は U3/U4
- **health probe は read-only**（ADR-9）: lock round-trip＋全行 parse＋seq 単調性。試行 append 不採用
- **測定結果**（ADR-11 で予算確定、全項目予算内）: cold 現行 2.01ms／新 0.92ms、warm p95 現行 0.92ms／新 0.99ms（+0.07ms）、bundle 237,933 bytes

## Test coverage summary

- テスト先行順序どおり 4 群（失敗契約→Context→Exporter 契約→shadow 原型）を実装に先行して作成し red → green
- `bun test tests/unit/otel/`: 38/38 pass。代表接続の回帰: t09・t188（amadeus-log）・t30（session-end）・t28/t170/t204/t352（audit/journal）全 pass
- `tsc --noEmit`（app＋tests 両 config）・`biome check`（新規ファイル warning ゼロ）・`package.ts --check`・`promote:self:check` 全通過

## Deviations from the plan

- なし（計画 13 Step を順どおり完了）。spike 結果の ADR 記録は計画 Step 11 どおり decisions.md に集約
