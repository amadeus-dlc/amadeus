# Code Summary — U9: metrics-subset

上流入力: 本 unit の functional-design（business-logic-model.md / business-rules.md / domain-entities.md）／nfr-requirements（performance / security / scalability / reliability / tech-stack-decisions）／nfr-design（logical-components / performance / reliability / scalability / security）、および上流の components.md・component-methods.md・services.md（全数参照済み）。

## Files created

- `tests/integration/t369-otel-metrics-subset.test.ts`（15 tests）: Counter／Histogram subset の契約固定 — BR-1（Counter／Histogram 以外の全生成経路＋batch observable callback の例外）、BR-10／NFR-3（二重登録・登録前取得の例外）、BR-2／BR-7（store 書込失敗の非 throw・fatal latch 非 set・後続計測継続を書込試行回数で実測）、BR-4／BR-6（active span 配下の trace／span ID 一致、span 不在時は空）、BR-9／FR-DST-3（計測時属性の export 境界 redaction）、BR-5（canonical journal への非混入）

## Files modified

- `packages/framework/core/otel/meter-provider.ts` — 任意 aggregation（`MetricOptions.advice`）の無言破棄を不変条件例外へ（`rejectAggregationAdvice`、BR-1／FR-EXP-5）。`add`／`record` の第3引数 Context を相関に反映（`correlation(ctx)`、FR-MLM-1）。`_options?: unknown` を `MetricOptions` へ型付け
- `packages/framework/core/otel/local-metric-exporter.ts` — 永続化 record へ intent identity を付与（`PersistedMetricRecord` = MetricRecord ＋ `intentId`、domain-entities.md § MetricRecord）。identity は export 境界で解決し exporter ごとに1回 memo 化
- 生成面: dist 7 harness ＋ self-install（`bun scripts/package.ts` / `bun scripts/promote-self.ts --apply`、FR-DST-2）

## Key implementation decisions

- identity の解決点は**書込境界**（exporter）とした。domain-entities.md が `intentId` を「他 Signal Store の record と同一の identity 付与方針」と規定し、canonical journal が同方針（`audit-log-exporter.ts` の "Identity fields are resolved at emit"、`logger-provider.ts:70` の `activeIntent`）を採るため。producer 側に持たせると component-methods.md 宣言の `registerMeterProvider(options: { metricExporter })` 契約を変える必要が生じる
- identity は exporter ごとに1回 memo（`??=`、`amadeus-harness.ts:101` と同一 idiom）。計測は hot path であり、短命 process は生存期間中 identity 不変（BR-3）
- 相関 fallback は置かない。`trace.getSpan(ctx ?? context.active())` のみとし、tracer-provider の `processParentSpanContext()` fallback は採らない — BR-4「相関情報を後付けで推測しない」／BR-6 に従い、sibling の `logger-provider.ts` と同一の解決規則に揃えた
- Metric 名の allowlist 機構は導入していない。scalability 系成果物の「固定の列挙集合」は callsite 側の規律であり、語彙を宣言した Unit が無い段階で allowlist を新設すると U10／U11 との cross-unit 契約を単独で発明することになる

## Test coverage summary

- t369 = 15 pass / 0 fail（exit 0）
- 影響既存スイート すべて exit 0: t-otel-exporter-contract 10 / t-otel-telemetry-stores 7 / t-otel-credential-free-gate 2 / t-otel-failure-contract 14 / t-otel-context 12 / t-otel-context-propagation 14 / t358-otel-projector 9 / t-otel-redaction 10
- ローカル: `typecheck` 0 / `lint` 0 / `dist:check` 0 / `promote:self:check` 0
- PR #1732 CI: Tests・Coverage Report（head／base／集約）・Dist and self-install drift・Typecheck・Lint and complexity・Plugin conformance E2E を含む全チェック SUCCESS、mergeable=MERGEABLE
- テスト自己検査で2件の偽合格を実測除去: BR-5 の初版は監査 journal 不存在（probe で `<MISSING DIR>` / 0 bytes を実測）により無条件合格だったため canonical event を実発行して populate してから不在確認する形へ是正。redaction テストは安全属性の残存確認を追加し、属性バッグ全体の脱落による合格を排除

## Deviations from the plan

- **production 起動時の global 登録を実装せず、実装前に停止して裁定を仰いだ**。business-logic-model.md § Meter Provider の登録と Meter 取得 1 は「process 起動時に global 登録」を求めるが、production 側に計測 callsite が存在しない: `grep -rn "getAmadeusMeter" --include='*.ts' packages/framework/core scripts | grep -v vendor` は定義行（`core/otel/meter-provider.ts`）を除き **0 件**、`registerMeterProvider` も同条件で **0 件**、tests 側のみ 22 件。`bootstrapOtel`（`amadeus-log.ts:78` で logger を登録）も metric を計測しない。callsite の無い登録は観測手段を持たない dead wiring で、org.md Forbidden（検証劇場）と construction phase 規範（どのコードも消費しない配線を持たせない）に抵触する。また `unit-of-work.md` U9 の責務は「Meter Provider 実装と Metric Store 出力」で、どの Unit も metric 計測 callsite を宣言していない（U11 relay は Store 読取のみ）
  - **裁定（2026-07-30 conductor 執行裁定 — 既決契約からの一意導出、選挙不要）**: 案 (a) を採用。U9 を provider ＋契約完成として受理し、global 登録の配線は計測 callsite を導入する Unit へ委譲する。business-logic-model.md の当該文へ申告追記済み
- 上記以外は承認済み設計の範囲内。`MetricOptions.advice` の例外化と明示 Context の相関反映は、いずれも設計が禁じた「無言の受理」を閉じる実装であり、`meter-provider.ts` 冒頭コメントの既存契約（"asking for one is an invariant exception, not a silent no-op"）に一致する
