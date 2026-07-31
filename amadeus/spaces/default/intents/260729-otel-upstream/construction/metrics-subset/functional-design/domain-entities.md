# Domain Entities — U9: metrics-subset

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## MetricInstrument（Counter／Histogram の限定 subset）

Meter Provider が生成する計測器。OTel Metrics API subset（components.md の `meter-provider.ts`）に準拠する。

| 属性 | 説明 |
|---|---|
| kind | `counter` または `histogram` のみ（BR-1。FR-EXP-5） |
| name | instrument 名（event registry の78語彙とは別空間。registry 登録は不要） |
| unit | 任意の単位文字列（省略可） |
| description | 任意の説明（省略可） |

ライフサイクル: Meter 取得時に生成 → process 生存期間中は再利用 → process 終了とともに破棄（永続化しない）。

## MetricRecord（Metric Store JSONL の1行）

`local-metric-exporter.ts` の `export(metric): void` が受け取り、Metric Store へ同期 append する単位。

| 属性 | 説明 |
|---|---|
| name | 計測した instrument 名 |
| kind | `counter` または `histogram` |
| value | 計測値（counter は累積増分、histogram は観測値） |
| attributes | 計測時のラベル（機微情報を含めない。BR-9） |
| timestamp | 計測時刻 |
| traceId | 発行時点の active Context の trace ID（相関。FR-MLM-1。非存在時は空、BR-6） |
| spanId | 同上の span ID |
| intentId | 対象 intent の識別子（他 Signal Store の record と同一の identity 付与方針） |

ライフサイクル: 計測 → export（同期 append）→ Store 内で reader／Relay から観測可能。更新・削除は行わない（append-only）。

## Metric Store

machine-local JSONL ファイル。audit JSONL・Span Store・Log Store と並ぶ Local Signal Store の1つ。

| 属性 | 説明 |
|---|---|
| 形式 | 1行1 MetricRecord の JSONL（append-only） |
| 書込み | 同一 process 内の同期 append。lock・retry・batch は持たない（BR-3/BR-7） |
| 読取り | U11 Relay が cursor ベースで読み OTLP 変換する（本 Unit では読取りを実装しない） |

## 関係

- MetricInstrument 1 — N MetricRecord（計測ごとに1 record）
- MetricRecord の traceId・spanId は U1 の SpanRecord／CanonicalEventRecord と同一 trace 空間で相関する（FR-MLM-1）
- MetricRecord は CanonicalEventRecord（audit JSONL）とは別 Store に置き、混入しない（BR-5）
