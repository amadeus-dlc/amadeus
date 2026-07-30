# Code Summary — U2: event-registry

上流入力: unit の functional-design / nfr 成果物（全数参照済み）。

## Files created

- `packages/framework/core/otel/event-registry.ts` — 全78 event 語彙の型付き Event Registry（RegisteredEventName union、EventDef{name, durability, category, requiredAttributes, schemaVersion}）。FR-EVT-7 どおり exception Span Event は telemetry 固定、canonical failure は amadeus.operation.failed ↔ ERROR_LOGGED
- `packages/framework/core/otel/event-registry-drift.ts` — 4集合抽出（state machine 参照・canonical Registry・Exporter 受理・Journal reader decode）と findRegistryDrift。段階稼働: (a)(b) は本 Unit で強制、完全な相等は U4 完了時から
- `.kimi-code/sensors/amadeus-event-registry-drift.md` — drift guard sensor（code-generation に配線）
- `tests/integration/event-registry-drift.test.ts`（後に t-otel-event-registry.test.ts へ flat 化）＋ drift guard 単体テスト群

## Files modified

- 各 harness manifest — registry 関連の生成面同期（package/promote 経路）

## Key implementation decisions

- 78 語彙は既存 audit 語彙の実測棚卸しと一致（#1672 のカウントを実コードで検証）
- drift guard は compile-time 型・unit test（78基数の vacuous equality 禁止）・sensor の3層
- 防御的不変条件（const テーブル上の重複・誤分類 throw）は公開 API から到達不能のため coverage allowlist（理由＋期限付き）

## Test coverage summary

- 134 tests pass（event-registry-drift suite 含む）。typecheck・lint・package.ts --check・promote:self:check 全 green
- designer export golden を新 sensor 分で更新

## Deviations from the plan

- drift guard の4集合完全相等は U4 依存のため段階稼働（計画どおり incremental activation）