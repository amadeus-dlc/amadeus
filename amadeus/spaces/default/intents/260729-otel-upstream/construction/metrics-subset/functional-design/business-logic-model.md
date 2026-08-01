# Business Logic Model — U9: metrics-subset

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 処理シーケンス

### Meter Provider の登録と Meter 取得

1. process 起動時に `meter-provider.ts`（components.md どおり OTel Metrics API subset）を global へ登録し、U4 hardened `local-metric-exporter.ts` を配線する

   > **申告（2026-07-30 conductor 執行裁定）**: 本 Unit（U9）は Meter Provider の実装と登録契約までを担い、**global 登録の配線自体は metric 計測 callsite を導入する Unit へ委譲する**。根拠は production 側の計測 callsite ゼロの実測（`grep -rn "getAmadeusMeter" --include='*.ts' packages/framework/core scripts | grep -v vendor` → 定義行を除き 0 件、`registerMeterProvider` も同 0 件、tests 側のみ 22 件）。計測 callsite の無い登録は観測手段を持たない dead wiring となり、org.md Forbidden（検証劇場）と construction phase 規範（どのコードも消費しない配線を持たせない）に抵触する。対照として logger/tracer は production 配線を持つ（`amadeus-log.ts:78`、`amadeus-session-end.ts:76`）。本 Unit の登録契約は t369 で固定済み（BR-10 二重登録例外・登録前取得例外）。
2. 二重登録は不変条件違反として例外（tracer-provider と同じ登録契約に揃える）
3. 計測側は global から Meter を取得し、Counter／Histogram のみを生成する。Observable callback・任意 aggregation は生成経路自体を持たない（FR-EXP-5）

### Counter／Histogram の計測と Trace Context 相関

1. 計測呼出し（Counter の increment／Histogram の record）は、呼出し時点の active Context から trace ID・span ID を取得して metric record に付与する（FR-MLM-1）
2. active Context が存在しない場合は相関フィールドを空のまま計測を継続する（欠落を欠陥とはせず、fail-open 側の挙動として許容）
3. 計測は短命 process 内で完結し、batch timer・network flush を持たない（services.md の telemetry 経路どおり）

### Metric Store への出力（fail-open）

1. 計測値は Meter Provider から `local-metric-exporter.ts` の `export(metric): void` へ同期的に渡る
2. exporter は machine-local JSONL（Metric Store）へ同期 append する（FR-EXP-5）
3. 保存失敗（I/O エラー等）は握りつぶして処理継続する。fatal latch を set せず、workflow を止めない（FR-EVT-6）
4. redaction は U4 の二層 policy（write-time＋export 境界）が既に担うため、本 Unit は policy を追加実装しない

## 検証フロー（テスト先行、VER-3（U1 所有のテスト先行契約）を引用）

1. **fail-open 契約**: Metric Store への append を強制失敗させ、例外が呼出し側へ伝播しないこと・fatal latch が set されないこと・後続計測が継続することを検証観点としてテストで確認（VER-3 の telemetry fail-open 検証に相当）
2. **Trace Context 相関**: active Span 配下で Counter／Histogram を計測し、出力 record の trace ID・span ID が一致することをテストで固定（FR-MLM-1）。Context 非存在時は相関フィールドが空であることを固定
3. **subset 制約**: Counter／Histogram 以外の instrument 生成経路が存在しないことを型・テストで固定（FR-EXP-5）
4. **exporter 契約**: U4 hardened exporter を実 fixture として接続し、計測完了時に同一 process 内で Metric Store から record を観測できることを確認（FR-JRN-3 と同じ即時観測性の考え方）

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:42:16Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: coverage and failure-contract clean; MAJOR — meter-provider and local-metric-exporter signatures missing from component-methods.md; MINOR — verification flow reads as prescribed order.

### Findings

- MAJOR business-logic-model.md/domain-entities.md: meter registration/acquisition and export(metric) signatures not declared in component-methods.md — add meter-provider.ts (registerMeterProvider/getAmadeusMeter) and local-metric-exporter.ts (export(metric): void fail-open) sections to component-methods.md as source of truth, then reference them
- MINOR business-logic-model.md: verification flow reads as prescribed implementation order — reword as unordered verification checklist citing VER-3 as the owning contract

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:48:03Z
- **Iteration:** 2
- **Scope decision:** none

READY: MAJOR fixed (component-methods.md now declares meter-provider.ts registerMeterProvider/getAmadeusMeter and local-metric-exporter.ts export(metric)); verification flow reworded as checklist citing VER-3; passing criteria hold.

### Findings

- None
